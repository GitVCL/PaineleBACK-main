// src/controllers/dashboard.controller.js
import prisma from '../services/prisma.service.js';

// Função para unificar automaticamente lotes com 0 unidades
const unificarLotesAutomaticamente = async (usuarioId) => {
  try {
    const produtos = await prisma.produto.findMany({
      where: { usuarioId },
      orderBy: { nome: 'asc' }
    });

    // Agrupar produtos por nome (case insensitive)
    const gruposProdutos = {};
    produtos.forEach(produto => {
      const nomeKey = produto.nome.toLowerCase().trim();
      if (!gruposProdutos[nomeKey]) {
        gruposProdutos[nomeKey] = [];
      }
      gruposProdutos[nomeKey].push(produto);
    });

    let unificacoesSucesso = 0;

    // Processar cada grupo de produtos
    for (const [nome, grupo] of Object.entries(gruposProdutos)) {
      if (grupo.length > 1) {
        // Separar produtos com quantidade 0 e com estoque
        const produtosComEstoque = grupo.filter(p => p.quantidade > 0);
        const produtosSemEstoque = grupo.filter(p => p.quantidade === 0);

        if (produtosComEstoque.length > 0 && produtosSemEstoque.length > 0) {
          // Escolher o produto com maior estoque como principal
          const produtoPrincipal = produtosComEstoque.reduce((prev, current) => 
            (prev.quantidade > current.quantidade) ? prev : current
          );

          // Unificar todos os produtos sem estoque com o principal
          for (const produtoSemEstoque of produtosSemEstoque) {
            try {
              // Atualizar itens de venda do produto sem estoque para o principal
              await prisma.itemVenda.updateMany({
                where: { produtoId: produtoSemEstoque.id },
                data: { produtoId: produtoPrincipal.id },
              });

              // Somar vendidos do produto sem estoque ao principal
              await prisma.produto.update({
                where: { id: produtoPrincipal.id },
                data: {
                  vendidos: {
                    increment: produtoSemEstoque.vendidos || 0
                  }
                },
              });

              // Deletar o produto sem estoque
              await prisma.produto.delete({ 
                where: { id: produtoSemEstoque.id } 
              });

              unificacoesSucesso++;
              console.log(`✅ Produto ${produtoSemEstoque.nome} (${produtoSemEstoque.id}) unificado automaticamente com ${produtoPrincipal.id}`);
            } catch (err) {
              console.error(`❌ Erro ao unificar produto ${produtoSemEstoque.id}:`, err);
            }
          }
        }
      }
    }

    if (unificacoesSucesso > 0) {
      console.log(`🔄 Unificação automática concluída: ${unificacoesSucesso} produtos unificados`);
    }

    return unificacoesSucesso;
  } catch (err) {
    console.error('❌ Erro na unificação automática:', err);
    return 0;
  }
};

export const resumoDashboard = async (req, res) => {
  try {
    console.log('🔍 Dashboard - Iniciando requisição');
    console.log('🔍 req.usuarioId:', req.usuarioId);
    
    const usuarioId = req.usuarioId;
    
    if (!usuarioId) {
      console.log("❌ Usuário não autenticado");
      return res.status(401).json({ message: "Não autenticado" });
    }

    console.log('✅ UsuarioId válido:', usuarioId);
    
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);

    const agora = new Date();

    // Calcular início da semana (segunda-feira)
    const inicioSemana = new Date(hoje);
    const diaSemana = hoje.getDay(); // 0 = domingo, 1 = segunda, etc.
    const diasParaSegunda = diaSemana === 0 ? -6 : 1 - diaSemana; // Se domingo, volta 6 dias; senão, vai para segunda
    inicioSemana.setDate(hoje.getDate() + diasParaSegunda);
    inicioSemana.setHours(0, 0, 0, 0);

    // Vendas finalizadas da semana
    console.log('🔍 Buscando vendas da semana...');
    console.log('📅 Início da semana:', inicioSemana.toISOString());
    console.log('📅 Agora:', agora.toISOString());
    
    const vendasSemana = await prisma.venda.findMany({
      where: {
        usuarioId,
        finalizada: true,
        createdAt: {
          gte: inicioSemana,
          lte: agora,
        },
      },
      include: { itensVenda: true },
      orderBy: {
        createdAt: 'desc'
      }
    });
    console.log('✅ Vendas da semana encontradas:', vendasSemana.length);

    // Faturamento da semana
    const faturamentoSemana = vendasSemana.reduce((soma, venda) => {
      return (
        soma +
        venda.itensVenda.reduce(
          (subTotal, item) => subTotal + item.preco * item.quantidade,
          0
        )
      );
    }, 0);

    // Contagem de vendas finalizadas da semana
    const contagemVendasSemana = vendasSemana.length;

    // Produtos em baixa (estoque < 40% do estoque inicial)
    console.log('🔍 Buscando produtos...');
    const produtos = await prisma.produto.findMany({
      where: { usuarioId },
    });
    console.log('✅ Produtos encontrados:', produtos.length);

    // Executar unificação automática de lotes com 0 unidades ANTES de processar notificações
    await unificarLotesAutomaticamente(req.usuarioId);

    // Buscar produtos novamente após a unificação
    const produtosAtualizados = await prisma.produto.findMany({
      where: { usuarioId: req.usuarioId },
      orderBy: { nome: 'asc' }
    });

    // Agrupar produtos por nome para análise individual
    const gruposProdutos = {};
    produtosAtualizados.forEach(produto => {
      const nomeKey = produto.nome.toLowerCase().trim();
      if (!gruposProdutos[nomeKey]) {
        gruposProdutos[nomeKey] = [];
      }
      gruposProdutos[nomeKey].push(produto);
    });

    // Gerar notificações específicas para cada produto do mesmo nome
    const notificacoesDetalhadas = [];
    Object.values(gruposProdutos).forEach(grupo => {
      if (grupo.length > 1) {
        // Múltiplos produtos com o mesmo nome
        grupo.forEach((produto, index) => {
          const porcentagemEstoque = produto.estoque > 0 ? (produto.quantidade / produto.estoque) * 100 : 0;
          
          // Regra atualizada: < 40% OU <= 5 unidades
          if (porcentagemEstoque < 40 || produto.quantidade <= 5) {
            const outrosProdutos = grupo.filter(p => p.id !== produto.id);
            
            // Verificar se algum outro lote tem estoque saudável (> 40% E > 5 unidades)
            const temOutroLoteSaudavel = outrosProdutos.some(p => {
              const percOutro = p.estoque > 0 ? (p.quantidade / p.estoque) * 100 : 0;
              return percOutro >= 40 && p.quantidade > 5;
            });
            
            // Só notificar se NÃO houver outros lotes saudáveis
            if (!temOutroLoteSaudavel) {
              const produtoComMaiorEstoque = outrosProdutos.reduce((prev, current) => {
                const prevPerc = prev.estoque > 0 ? (prev.quantidade / prev.estoque) * 100 : 0;
                const currPerc = current.estoque > 0 ? (current.quantidade / current.estoque) * 100 : 0;
                return prevPerc > currPerc ? prev : current;
              });
              
              const porcentagemOutro = produtoComMaiorEstoque.estoque > 0 ? 
                (produtoComMaiorEstoque.quantidade / produtoComMaiorEstoque.estoque) * 100 : 0;
              
              notificacoesDetalhadas.push({
                id: produto.id,
                nome: produto.nome,
                quantidade: produto.quantidade,
                estoque: produto.estoque,
                porcentagem: Math.round(porcentagemEstoque),
                tipo: 'baixo_com_outro',
                mensagem: `O produto ${produto.nome.toUpperCase()} está com ${Math.round(porcentagemEstoque)}% do estoque porém tem outros lotes com porcentagem ${Math.round(porcentagemOutro)}%`
              });
            }
          }
        });
      } else {
        // Produto único com esse nome
        const produto = grupo[0];
        const porcentagemEstoque = produto.estoque > 0 ? (produto.quantidade / produto.estoque) * 100 : 0;
        
        // Regra atualizada: < 40% OU <= 5 unidades
        if (porcentagemEstoque < 40 || produto.quantidade <= 5) {
          notificacoesDetalhadas.push({
            id: produto.id,
            nome: produto.nome,
            quantidade: produto.quantidade,
            estoque: produto.estoque,
            porcentagem: Math.round(porcentagemEstoque),
            tipo: 'baixo_unico',
            mensagem: `O produto ${produto.nome.toUpperCase()} está com ${Math.round(porcentagemEstoque)}% do estoque (${produto.quantidade} un)`
          });
        }
      }
    });

    // Manter compatibilidade com o sistema antigo
    const produtosEmBaixa = produtosAtualizados.filter((produto) => {
      // Regra atualizada: < 40% OU <= 5 unidades
      return produto.estoque > 0 && (produto.quantidade < produto.estoque * 0.4 || produto.quantidade <= 5);
    });

    // Buscar dados do usuário para assinatura
    let usuario = await prisma.user.findUnique({
      where: { id: usuarioId },
      select: {
        assinatura: true,
        planoExpiraEm: true,
      },
    });

    // 🔹 Se não achou em "user", verificar "colaborador"
    if (!usuario) {
      const colaborador = await prisma.colaborador.findUnique({
        where: { id: usuarioId },
        select: { id: true }
      });

      if (colaborador) {
        usuario = {
          assinatura: 'gratuito',
          planoExpiraEm: null
        };
      }
    }

    console.log('✅ Dashboard - Retornando dados');
    res.json({
      faturamento: faturamentoSemana,
      vendas: contagemVendasSemana,
      vendasDetalhadas: vendasSemana.map(venda => ({
        id: venda.id,
        total: venda.itensVenda.reduce((total, item) => total + (item.preco * item.quantidade), 0),
        itens: venda.itensVenda.length,
        createdAt: venda.createdAt,
        cliente: venda.cliente || 'Cliente não informado'
      })),
      inicioSemana: inicioSemana.toISOString(),
      produtosEmBaixa: produtosEmBaixa.length,
      notificacoesDetalhadas: notificacoesDetalhadas,
      assinatura: usuario?.assinatura || 'gratuito',
      planoExpiraEm: usuario?.planoExpiraEm,
    });
  } catch (err) {
    console.error("❌ Erro no resumoDashboard:", err);
    console.error("❌ Stack trace:", err.stack);
    res.status(500).json({ message: 'Erro ao carregar o dashboard', error: err.message });
  }
};

// Função de teste
export const testeConexao = async (req, res) => {
  try {
    console.log('🧪 Teste - Iniciando');
    console.log('🧪 req.usuarioId:', req.usuarioId);
    
    // Teste básico do Prisma
    const count = await prisma.user.count();
    console.log('✅ Usuários no banco:', count);
    
    res.json({
      status: 'OK',
      servidor: 'Funcionando',
      banco: 'Conectado',
      usuarioId: req.usuarioId,
      totalUsuarios: count,
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    console.error('❌ Erro no teste:', err);
    res.status(500).json({ 
      status: 'ERRO',
      message: err.message,
      stack: err.stack
    });
  }
};
