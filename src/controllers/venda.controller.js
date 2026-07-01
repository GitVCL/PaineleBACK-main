// src/controllers/venda.controller.js
import prisma from '../services/prisma.service.js';
import auditService from '../services/audit.service.js';

const criarVenda = async (req, res) => {
  try {
    // 🔍 DEBUG: Logando dados recebidos
    console.log("📥 Body recebido:", req.body);
    console.log("👤 Usuario ID:", req.usuarioId);
    console.log("🔍 Headers:", req.headers);

    const { tipo, identificador, itens, taxaGarcom } = req.body;
    const usuarioId = req.usuarioId;

    // Validação básica dos dados de entrada
    if (!tipo || !identificador || !itens || !Array.isArray(itens) || itens.length === 0) {
      console.log("❌ Validação falhou:", { tipo, identificador, itens, usuarioId });
      return res.status(400).json({ 
        message: 'Dados inválidos para criação da venda',
        detalhes: {
          tipo: !!tipo,
          identificador: !!identificador,
          itens: !!itens && Array.isArray(itens),
          itensLength: itens?.length || 0,
          usuarioId: !!usuarioId
        }
      });
    }

    // Processar itens e adicionar taxa de serviço se solicitada
    let itensProcessados = [...itens];
    
    if (taxaGarcom) {
      // Calcular valor total dos itens
      const valorTotal = itens.reduce((total, item) => {
        return total + (item.preco * item.quantidade);
      }, 0);
      
      // Calcular 10% de taxa de serviço
      const taxaServico = valorTotal * 0.10;
      
      // Criar um produto temporário para a taxa de serviço ou usar um produto existente
      // Por enquanto, vamos criar a venda sem a taxa e adicionar depois
      console.log('Taxa de garçom solicitada:', taxaServico);
    }

    const novaVenda = await prisma.venda.create({
      data: {
        tipo,
        identificador,
        usuarioId,
        funcionarioId: req.funcionarioId || null, // Incluir funcionarioId se disponível
        finalizada: tipo === 'VENDAS',
        itensVenda: {
          create: itens.map(item => ({
            nome: item.nome,
            preco: item.preco,
            quantidade: item.quantidade,
            produtoId: item.produtoId,
          })),
        },
      },
      include: { itensVenda: true },
    });

    // Log de criação de venda
    await auditService.registrar(req, {
      acao: 'CRIAR_VENDA',
      categoria: 'VENDAS',
      entidade: 'Venda',
      entidadeId: novaVenda.id,
      descricao: `Venda criada (${tipo}) ${identificador || ''}`.trim(),
      metadata: {
        itens: novaVenda.itensVenda.map(i => ({ nome: i.nome, preco: i.preco, quantidade: i.quantidade, produtoId: i.produtoId })),
        finalizada: novaVenda.finalizada
      }
    });

    // Adicionar taxa de serviço como item separado se solicitada
    if (taxaGarcom) {
      const valorTotal = itens.reduce((total, item) => {
        return total + (item.preco * item.quantidade);
      }, 0);
      
      const taxaServico = valorTotal * 0.10;
      
      // Buscar um produto genérico para taxa de serviço ou criar um item sem produto
      // Por enquanto, vamos apenas registrar no log
      console.log('Taxa de serviço calculada:', taxaServico, 'mas não adicionada devido à limitação do schema');
    }

    // Se for venda direta (VENDAS), atualizar o estoque e vendidos imediatamente
    if (tipo === 'VENDAS') {
      for (const item of novaVenda.itensVenda) {
        // Só atualizar estoque para produtos físicos (não para taxa de serviço)
        if (item.produtoId) {
          await prisma.produto.update({
            where: { id: item.produtoId },
            data: {
              quantidade: {
                decrement: item.quantidade,
              },
              vendidos: {
                increment: item.quantidade,
              },
            },
          });
        }
      }
    }

    // Resposta com possível aviso de assinatura
    const resposta = {
      ...novaVenda,
      sucesso: true
    };

    // Adicionar aviso se existir
    if (req.avisoAssinatura) {
      resposta.aviso = req.avisoAssinatura;
    }

    res.status(201).json(resposta);
  } catch (err) {
    console.error("❌ ERRO AO REGISTRAR VENDA:", err);
    res.status(500).json({ message: 'Erro ao registrar venda', sucesso: false });
  }
};


const listarVendas = async (req, res) => {
  try {
    const vendas = await prisma.venda.findMany({
      where: { usuarioId: req.usuarioId },
      include: { itensVenda: true }
    });
    res.json(vendas);
  } catch (err) {
    console.error("Erro ao listar vendas:", err);
    res.status(500).json({ message: 'Erro ao buscar vendas' });
  }
};

const atualizarVenda = async (req, res) => {
  try {
    const { id } = req.params;
    const { itens, taxaGarcom } = req.body;

    await prisma.itemVenda.deleteMany({ where: { vendaId: id } });

    // Processar itens e adicionar taxa de serviço se solicitada
    let itensProcessados = [...itens];
    
    if (taxaGarcom) {
      // Calcular valor total dos itens
      const valorTotal = itens.reduce((total, item) => {
        return total + (item.preco * item.quantidade);
      }, 0);
      
      // Calcular 10% de taxa de serviço
      const taxaServico = valorTotal * 0.10;
      
      // Adicionar item da taxa de serviço
      itensProcessados.push({
        nome: 'Taxa de Serviço',
        preco: taxaServico,
        quantidade: 1,
        produtoId: null // Taxa de serviço não é um produto físico
      });
    }

    const novaVenda = await prisma.venda.update({
      where: { id },
      data: {
        itensVenda: {
          create: itensProcessados.map(item => ({
            nome: item.nome,
            preco: item.preco,
            quantidade: item.quantidade,
            produtoId: item.produtoId,
          }))
        }
      },
      include: { itensVenda: true }
    });

    res.json(novaVenda);
  } catch (err) {
    console.error("Erro ao atualizar venda:", err);
    res.status(500).json({ message: 'Erro ao atualizar venda' });
  }
};

const encerrarVenda = async (req, res) => {
  try {
    const { id } = req.params;

    const venda = await prisma.venda.findUnique({
      where: { id },
      include: { itensVenda: true },
    });

    if (!venda) {
      return res.status(404).json({ message: "Venda não encontrada" });
    }

    // Atualiza estoque e vendidos
    for (const item of venda.itensVenda) {
      try {
        await prisma.produto.update({
          where: { id: item.produtoId },
          data: {
            quantidade: {
              decrement: item.quantidade,
            },
            vendidos: {
              increment: item.quantidade,
            },
          },
        });
      } catch (err) {
        console.error("Erro ao atualizar produto:", item.produtoId, err);
      }
    }

    const vendaFinalizada = await prisma.venda.update({
      where: { id },
      data: {
        finalizada: true,
      },
    });

    // Log de encerramento de venda
    await auditService.registrar(req, {
      acao: 'ENCERRAR_VENDA',
      categoria: 'VENDAS',
      entidade: 'Venda',
      entidadeId: vendaFinalizada.id,
      descricao: 'Venda encerrada',
      metadata: {
        itens: venda.itensVenda.map(i => ({ nome: i.nome, quantidade: i.quantidade, produtoId: i.produtoId }))
      }
    });

    res.json(vendaFinalizada);
  } catch (err) {
    console.error("Erro ao encerrar venda:", err);
    res.status(500).json({ message: "Erro ao encerrar venda" });
  }
};

const excluirVenda = async (req, res) => {
  try {
    const { id } = req.params;
    const usuarioId = req.usuarioId;

    // Verificar se a venda existe e pertence ao usuário
    const venda = await prisma.venda.findFirst({
      where: { 
        id,
        usuarioId 
      },
      include: { itensVenda: true }
    });

    if (!venda) {
      return res.status(404).json({ message: "Venda não encontrada ou não autorizada" });
    }

    // Se a venda foi finalizada, reverter o estoque
    if (venda.finalizada) {
      for (const item of venda.itensVenda) {
        // Só reverter estoque para produtos físicos (não para taxa de serviço)
        if (item.produtoId) {
          try {
            await prisma.produto.update({
              where: { id: item.produtoId },
              data: {
                quantidade: {
                  increment: item.quantidade, // Devolver ao estoque
                },
                vendidos: {
                  decrement: item.quantidade, // Diminuir dos vendidos
                },
              },
            });
          } catch (err) {
            console.error("Erro ao reverter produto:", item.produtoId, err);
          }
        }
      }
    }

    // Excluir a venda (os itens serão excluídos automaticamente devido ao onDelete: Cascade)
    await prisma.venda.delete({
      where: { id }
    });

    res.json({ message: "Venda excluída com sucesso" });
  } catch (err) {
    console.error("Erro ao excluir venda:", err);
    res.status(500).json({ message: "Erro ao excluir venda" });
  }
};

export default {
  criarVenda,
  listarVendas,
  atualizarVenda,
  encerrarVenda,
  excluirVenda
};