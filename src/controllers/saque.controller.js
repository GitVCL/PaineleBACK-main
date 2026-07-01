import { PrismaClient } from '@prisma/client';
import saqueService from '../services/saque.service.js';

const prisma = new PrismaClient();

// =============================
// FUNÇÃO DE CÁLCULO DO SALDO
// =============================
const calcularSaldoColaborador = async (colaboradorId) => {
  try {
    // Buscar clientes do colaborador com assinaturas ativas
    const clientesComAssinaturas = await prisma.user.findMany({
      where: { colaboradorId },
      include: {
        assinaturas: {
          where: { status: 'ATIVA' }
        }
      }
    });

    let saldoTotal = 0;
    let clientesAtivos = 0;

    clientesComAssinaturas.forEach(cliente => {
      cliente.assinaturas.forEach(assinatura => {
        clientesAtivos++;

        // Definir valor do plano
        let valorPlano = 0;
        switch (assinatura.plano) {
          case 'BASICO':
            valorPlano = 89.99;
            break;
          case 'PREMIUM':
            valorPlano = 149.99;
            break;
          case 'ENTERPRISE':
            valorPlano = 299.99;
            break;
          default:
            valorPlano = 0;
        }

        // Comissão = 50% do valor do plano
        saldoTotal += valorPlano * 0.5;
      });
    });

    // Subtrair saques já realizados (pendentes + aprovados + processando)
    const saquesRealizados = await prisma.saqueColaborador.aggregate({
      where: {
        colaboradorId,
        status: { in: ['APROVADO', 'PROCESSANDO', 'PENDENTE'] }
      },
      _sum: { valor: true }
    });

    const totalSaques = saquesRealizados._sum.valor || 0;
    const saldoDisponivel = saldoTotal - totalSaques;

    const resumoSaques = await saqueService.obterResumoSaques(colaboradorId);

    return {
      saldoDisponivel: Math.max(0, saldoDisponivel),
      totalComissoes: saldoTotal,
      totalSacado: resumoSaques.totalSacado,
      totalPendente: resumoSaques.totalPendente,
      clientesAtivos,
      comissaoTotal: saldoTotal, // compatibilidade
      clientesComAssinatura: clientesAtivos, // compatibilidade
      clientesEmTeste: 0,
      clientesExpirados: 0
    };
  } catch (error) {
    console.error('Erro ao calcular saldo do colaborador:', error);
    return {
      saldoDisponivel: 0,
      totalComissoes: 0,
      totalSacado: 0,
      totalPendente: 0,
      clientesAtivos: 0,
      comissaoTotal: 0,
      clientesComAssinatura: 0,
      clientesEmTeste: 0,
      clientesExpirados: 0
    };
  }
};

// =============================
// CONTROLLERS
// =============================

export const listarSaques = async (req, res) => {
  try {
    const colaboradorId = req.colaboradorId;
    const saques = await prisma.saqueColaborador.findMany({
      where: { colaboradorId },
      orderBy: { criadoEm: 'desc' }
    });

    const saldoInfo = await calcularSaldoColaborador(colaboradorId);

    res.json({
      status: 200,
      message: 'Saques listados com sucesso',
      data: { saques, saldo: saldoInfo }
    });
  } catch (error) {
    console.error('Erro ao listar saques:', error);
    res.status(500).json({ status: 500, message: 'Erro interno do servidor' });
  }
};

export const solicitarSaque = async (req, res) => {
  try {
    const colaboradorId = req.colaboradorId;
    const { valor, chavePix, observacoes } = req.body;

    const resultado = await saqueService.criarSolicitacaoSaque(
      colaboradorId,
      parseFloat(valor),
      chavePix?.trim(),
      observacoes?.trim() || null
    );

    res.status(201).json({
      status: 201,
      message: 'Solicitação de saque criada com sucesso',
      data: resultado
    });
  } catch (error) {
    console.error('Erro ao solicitar saque:', error);
    res.status(400).json({
      status: 400,
      message: error.message || 'Erro ao criar solicitação de saque'
    });
  }
};

export const obterSaldo = async (req, res) => {
  try {
    const colaboradorId = req.colaboradorId;
    const saldoInfo = await calcularSaldoColaborador(colaboradorId);

    res.json({
      status: 200,
      message: 'Saldo obtido com sucesso',
      saldoDisponivel: saldoInfo.saldoDisponivel,
      data: saldoInfo
    });
  } catch (error) {
    console.error('Erro ao obter saldo:', error);
    res.status(500).json({ status: 500, message: 'Erro interno do servidor' });
  }
};

export const cancelarSaque = async (req, res) => {
  try {
    const colaboradorId = req.colaboradorId;
    const { saqueId } = req.params;

    const saque = await prisma.saqueColaborador.findFirst({
      where: { id: saqueId, colaboradorId, status: 'PENDENTE' }
    });

    if (!saque) {
      return res.status(404).json({
        status: 404,
        message: 'Saque não encontrado ou não pode ser cancelado'
      });
    }

    await prisma.saqueColaborador.update({
      where: { id: saqueId },
      data: { status: 'REJEITADO' }
    });

    res.json({ status: 200, message: 'Saque cancelado com sucesso' });
  } catch (error) {
    console.error('Erro ao cancelar saque:', error);
    res.status(500).json({ status: 500, message: 'Erro interno do servidor' });
  }
};

export const atualizarStatusAssinaturaCliente = async (req, res) => {
  try {
    const colaboradorId = req.colaboradorId;
    const { clienteId, assinaturaPaga } = req.body;

    const cliente = await prisma.user.findFirst({
      where: { id: clienteId, colaboradorId }
    });

    if (!cliente) {
      return res.status(404).json({ status: 404, message: 'Cliente não encontrado' });
    }

    await prisma.user.update({
      where: { id: clienteId },
      data: {
        assinaturaPaga,
        statusPagamento: assinaturaPaga ? 'PAGO' : 'TESTE'
      }
    });

    const saldoInfo = await calcularSaldoColaborador(colaboradorId);

    res.json({
      status: 200,
      message: 'Status da assinatura do cliente atualizado com sucesso',
      data: { saldo: saldoInfo }
    });
  } catch (error) {
    console.error('Erro ao atualizar status da assinatura do cliente:', error);
    res.status(500).json({ status: 500, message: 'Erro interno do servidor' });
  }
};

export const obterDadosPaginaSaque = async (req, res) => {
  try {
    const colaboradorId = req.colaboradorId;
    const saldoInfo = await calcularSaldoColaborador(colaboradorId);

    const saquesRecentes = await prisma.saqueColaborador.findMany({
      where: { colaboradorId },
      orderBy: { criadoEm: 'desc' },
      take: 5,
      select: { id: true, valor: true, status: true, criadoEm: true }
    });

    const totalClientes = await prisma.user.count({ where: { colaboradorId } });

    const clientesGratuitos = await prisma.user.count({
      where: {
        colaboradorId,
        OR: [
          { assinaturas: { none: {} } },
          { assinaturas: { every: { status: { not: 'ATIVA' } } } }
        ]
      }
    });

    res.json({
      saldo: {
        disponivel: saldoInfo.saldoDisponivel,
        bloqueado: saldoInfo.totalPendente,
        valorMinimo: 40.0
      },
      resumoSaques: {
        totalSacado: saldoInfo.totalSacado,
        totalPendente: saldoInfo.totalPendente,
        quantidadeSaques: await prisma.saqueColaborador.count({ where: { colaboradorId } })
      },
      saquesRecentes,
      estatisticasClientes: {
        total: totalClientes,
        pagos: saldoInfo.clientesAtivos,
        gratuitos: clientesGratuitos
      }
    });
  } catch (error) {
    console.error('Erro ao obter dados da página de saque:', error);
    res.status(500).json({
      error: 'Erro interno do servidor',
      message: 'Não foi possível carregar os dados da página de saque'
    });
  }
};

export default {
  listarSaques,
  solicitarSaque,
  obterSaldo,
  cancelarSaque,
  atualizarStatusAssinaturaCliente,
  obterDadosPaginaSaque
};
