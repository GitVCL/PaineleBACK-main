import prisma from '../services/prisma.service.js';

// Listar movimentações do console do proprietário
export const listarMovimentacoes = async (req, res) => {
  try {
    const usuarioId = req.usuarioId;
    const { limit = 50, cursor = null, categoria = null, acao = null } = req.query;

    const where = {
      usuarioId,
      ...(categoria ? { categoria } : {}),
      ...(acao ? { acao } : {})
    };

    const take = Math.min(Number(limit) || 50, 100);

    const logs = await prisma.movimentacaoConsole.findMany({
      where,
      orderBy: { criadoEm: 'desc' },
      ...(cursor ? { cursor: { id: String(cursor) }, skip: 1 } : {}),
      take
    });

    res.json({
      status: 200,
      logs,
      hasMore: logs.length === take,
      nextCursor: logs.length ? logs[logs.length - 1].id : null
    });
  } catch (error) {
    console.error('Erro ao listar movimentações do console:', error);
    res.status(500).json({ status: 500, message: 'Erro interno do servidor' });
  }
};