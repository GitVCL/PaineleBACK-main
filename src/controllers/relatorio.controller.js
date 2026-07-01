// src/controllers/relatorio.controller.js
import prisma from '../services/prisma.service.js';

export const dashboardRelatorios = async (req, res) => {
  try {
    const usuarioId = req.usuarioId;
    
    // Definir períodos para análise - PERÍODO PRINCIPAL: DIA
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    
    const inicioDia = new Date(hoje); // Início do dia atual
    const inicioMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
    const inicioAno = new Date(hoje.getFullYear(), 0, 1);

    // Buscar todas as vendas finalizadas do usuário
    const vendas = await prisma.venda.findMany({
      where: {
        usuarioId,
        finalizada: true,
      },
      include: { itensVenda: true },
      orderBy: { createdAt: 'desc' },
    });

    // Calcular faturamento total
    const faturamentoTotal = vendas.reduce((total, venda) => {
      return total + venda.itensVenda.reduce(
        (subtotal, item) => subtotal + (item.preco * item.quantidade),
        0
      );
    }, 0);

    // Calcular faturamento do dia atual (PERÍODO PRINCIPAL)
    const vendasDia = vendas.filter(venda => new Date(venda.createdAt) >= inicioDia);
    const faturamentoDia = vendasDia.reduce((total, venda) => {
      return total + venda.itensVenda.reduce(
        (subtotal, item) => subtotal + (item.preco * item.quantidade),
        0
      );
    }, 0);

    // Calcular faturamento do mês atual
    const vendasMes = vendas.filter(venda => new Date(venda.createdAt) >= inicioMes);
    const faturamentoMes = vendasMes.reduce((total, venda) => {
      return total + venda.itensVenda.reduce(
        (subtotal, item) => subtotal + (item.preco * item.quantidade),
        0
      );
    }, 0);

    // Buscar todos os produtos
    const produtos = await prisma.produto.findMany({
      where: { usuarioId },
    });

    // Calcular total de produtos registrados
    const totalProdutos = produtos.length;

    // Calcular total de vendas
    const totalVendas = vendas.length;

    // Buscar dados de assinatura do usuário
    const usuario = await prisma.user.findUnique({
      where: { id: usuarioId },
      select: {
        assinatura: true,
        planoExpiraEm: true,
      },
    });

    // Dados para o gráfico de linha (vendas por dia nos últimos 7 dias - PERÍODO PRINCIPAL)
    const ultimosSeteDias = [];
    for (let i = 6; i >= 0; i--) {
      const data = new Date();
      data.setDate(data.getDate() - i);
      data.setHours(0, 0, 0, 0);
      ultimosSeteDias.push({
        name: data.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
        date: new Date(data),
      });
    }

    const vendasPorDia = ultimosSeteDias.map(dia => {
      const inicioDia = dia.date;
      const fimDia = new Date(inicioDia);
      fimDia.setHours(23, 59, 59, 999);
      
      const vendasNoDia = vendas.filter(venda => {
        const dataVenda = new Date(venda.createdAt);
        return dataVenda >= inicioDia && dataVenda <= fimDia;
      });

      const faturamentoDia = vendasNoDia.reduce((total, venda) => {
        return total + venda.itensVenda.reduce(
          (subtotal, item) => subtotal + (item.preco * item.quantidade),
          0
        );
      }, 0);

      return {
        name: dia.name,
        vendas: faturamentoDia,
      };
    });

    // Dados para o gráfico de pizza (categorias de produtos vendidos)
    const categoriasProdutos = {};
    vendas.forEach(venda => {
      venda.itensVenda.forEach(item => {
        const produto = produtos.find(p => p.id === item.produtoId);
        if (produto) {
          const categoria = produto.categoria;
          if (!categoriasProdutos[categoria]) {
            categoriasProdutos[categoria] = 0;
          }
          categoriasProdutos[categoria] += item.quantidade;
        }
      });
    });

    const dadosGraficoPizza = Object.entries(categoriasProdutos).map(([name, value]) => ({
      name,
      value,
    }));

    // Produtos mais vendidos
    const produtosMaisVendidos = {};
    vendas.forEach(venda => {
      venda.itensVenda.forEach(item => {
        const produto = produtos.find(p => p.id === item.produtoId);
        if (produto) {
          if (!produtosMaisVendidos[produto.id]) {
            produtosMaisVendidos[produto.id] = {
              produto: produto,
              quantidadeVendida: 0
            };
          }
          produtosMaisVendidos[produto.id].quantidadeVendida += item.quantidade;
        }
      });
    });

    const produtosMaisVendidosArray = Object.values(produtosMaisVendidos)
      .sort((a, b) => b.quantidadeVendida - a.quantidadeVendida)
      .slice(0, 5)
      .map(({ produto, quantidadeVendida }) => {
        const revenueTotal = produto.vendidos * produto.valor;
        const profitTotal = produto.vendidos * produto.valor * 0.3;
        const estoqueTotal = produto.quantidade;
        const vendidosTotal = produto.vendidos;
        
        return {
          name: produto.nome,
          sales: quantidadeVendida,
          revenue: Number(revenueTotal.toFixed(2)),
          profit: Number(profitTotal.toFixed(2)),
          portfolio: Number((estoqueTotal / (estoqueTotal + vendidosTotal) * 100).toFixed(2)),
        };
      });

    // Formatar valores para exibição
    const formatarValor = (valor) => {
      if (valor >= 1000) {
        return `${(valor / 1000).toFixed(2)}K`;
      }
      return valor.toFixed(2);
    };

    // Preparar dados para cards
    const cardData = [
      {
        title: 'Faturamento',
        value: formatarValor(faturamentoTotal),
        subtitle: 'Total',
        change: formatarValor(faturamentoDia),
        isPositive: true,
      },
      {
        title: 'Vendas',
        value: totalVendas.toString(),
        subtitle: 'Total',
        change: vendasDia.length.toString(),
      },
      {
        title: 'Assinatura',
        value: usuario?.assinatura ? usuario.assinatura.charAt(0).toUpperCase() + usuario.assinatura.slice(1) : 'Gratuito',
        subtitle: 'Mensal',
      },
      {
        title: 'DIA',
        value: formatarValor(faturamentoDia),
        subtitle: new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'long' }),
      },
    ];

    res.json({
      cardData,
      lineChartData: vendasPorDia,
      pieChartData: dadosGraficoPizza,
      productData: produtosMaisVendidosArray,
    });
  } catch (err) {
    console.error("Erro no dashboardRelatorios:", err);
    res.status(500).json({ message: 'Erro ao carregar dados do relatório' });
  }
};

// Nova função para relatório por período específico
export const relatorioPorPeriodo = async (req, res) => {
  try {
    const usuarioId = req.usuarioId;
    const { dataInicio, dataFim } = req.query;

    console.log('🔍 Relatório por período - Iniciando');
    console.log('📅 Data início:', dataInicio);
    console.log('📅 Data fim:', dataFim);
    console.log('👤 Usuario ID:', usuarioId);

    if (!dataInicio || !dataFim) {
      return res.status(400).json({ 
        message: 'As datas de início e fim são obrigatórias' 
      });
    }

    // Converter strings ISO para objetos Date (já incluem hora)
    const inicio = new Date(dataInicio);
    const fim = new Date(dataFim);

    console.log('📅 Período processado:', { inicio, fim });

    // Buscar vendas no período especificado
    const vendas = await prisma.venda.findMany({
      where: {
        usuarioId,
        finalizada: true,
        createdAt: {
          gte: inicio,
          lte: fim,
        },
      },
      include: { 
        itensVenda: true 
      },
      orderBy: { createdAt: 'desc' },
    });

    console.log('✅ Vendas encontradas:', vendas.length);

    // Calcular faturamento total do período
    const faturamentoTotal = vendas.reduce((total, venda) => {
      return total + venda.itensVenda.reduce(
        (subtotal, item) => subtotal + (item.preco * item.quantidade),
        0
      );
    }, 0);

    // Agrupar vendas por dia e hora
    const vendasPorDia = {};
    
    vendas.forEach(venda => {
      const dataVenda = new Date(venda.createdAt);
      const chaveData = dataVenda.toISOString().split('T')[0]; // YYYY-MM-DD
      const hora = dataVenda.getHours();
      
      if (!vendasPorDia[chaveData]) {
        vendasPorDia[chaveData] = {
          data: chaveData,
          totalVendas: 0,
          faturamento: 0,
          vendasPorHora: {},
        };
      }
      
      if (!vendasPorDia[chaveData].vendasPorHora[hora]) {
        vendasPorDia[chaveData].vendasPorHora[hora] = {
          hora: `${hora.toString().padStart(2, '0')}:00`,
          vendas: 0,
          faturamento: 0,
        };
      }
      
      const valorVenda = venda.itensVenda.reduce(
        (subtotal, item) => subtotal + (item.preco * item.quantidade),
        0
      );
      
      vendasPorDia[chaveData].totalVendas += 1;
      vendasPorDia[chaveData].faturamento += valorVenda;
      vendasPorDia[chaveData].vendasPorHora[hora].vendas += 1;
      vendasPorDia[chaveData].vendasPorHora[hora].faturamento += valorVenda;
    });

    // Converter objeto para array e ordenar por data
    const vendasPorDiaArray = Object.values(vendasPorDia).map(dia => ({
      ...dia,
      vendasPorHora: Object.values(dia.vendasPorHora).sort((a, b) => 
        parseInt(a.hora.split(':')[0]) - parseInt(b.hora.split(':')[0])
      )
    })).sort((a, b) => new Date(a.data) - new Date(b.data))

    console.log('✅ Relatório processado:', {
      totalVendas: vendas.length,
      faturamentoTotal,
      diasComVendas: vendasPorDiaArray.length
    });

    res.json({
      totalVendas: vendas.length,
      faturamentoTotal,
      vendasPorDia: vendasPorDiaArray,
      periodo: {
        inicio: dataInicio,
        fim: dataFim,
      },
    });

  } catch (err) {
    console.error("❌ Erro no relatorioPorPeriodo:", err);
    res.status(500).json({ 
      message: 'Erro ao gerar relatório por período',
      error: err.message 
    });
  }
};