import prisma from '../services/prisma.service.js';
import auditService from '../services/audit.service.js';

export const listar = async (req, res) => {
  try {
    const despesas = await prisma.despesa.findMany({
      where: { usuarioId: req.usuarioId },
      orderBy: { data: 'desc' },
    });
    res.json(despesas);
  } catch (err) {
    console.error('Erro ao listar despesas:', err);
    res.status(500).json({ error: 'Erro ao buscar despesas' });
  }
};

export const criar = async (req, res) => {
  const { descricao, valor, categoria, data } = req.body;

  if (!descricao || !valor || !categoria || !data) {
    return res.status(400).json({ error: 'Preencha todos os campos' });
  }

  try {
    // Se a criação vier de um funcionário, incluir autor na descrição
    const autor = req.funcionario?.nome || null;
    const descricaoComAutor = autor && !String(descricao).includes('(por:')
      ? `${descricao} (por: ${autor})`
      : descricao;

    const novaDespesa = await prisma.despesa.create({
      data: {
        descricao: descricaoComAutor,
        valor: parseFloat(valor),
        categoria,
        data: new Date(data),
        usuarioId: req.usuarioId,
      },
    });

    // Registrar movimentação no console (auditoria)
    await auditService.registrar(req, {
      acao: 'CRIAR_DESPESA',
      categoria: 'DESPESAS',
      entidade: 'Despesa',
      entidadeId: novaDespesa.id,
      descricao: `Despesa criada: ${descricaoComAutor}`,
      metadata: {
        valor: parseFloat(valor),
        categoria,
        data
      }
    });

    // Log de registro da despesa
    if (req.funcionario) {
      console.log(`Despesa criada por funcionário: ${req.funcionario.nome} (ID: ${req.funcionario.id}) - Despesa: ${descricao} - Valor: R$ ${valor} - ID: ${novaDespesa.id}`);
    } else if (req.user) {
      console.log(`Despesa criada por usuário: ${req.user.nome} (ID: ${req.user.id}) - Despesa: ${descricao} - Valor: R$ ${valor} - ID: ${novaDespesa.id}`);
    }

    res.status(201).json({ message: 'Despesa criada com sucesso', despesa: novaDespesa });
  } catch (err) {
    console.error('Erro ao criar despesa:', err);
    res.status(500).json({ error: 'Erro ao criar despesa' });
  }
};

export const atualizar = async (req, res) => {
  const despesaId = req.params.id;
  const { descricao, valor, categoria, data } = req.body;

  try {
    const despesa = await prisma.despesa.findUnique({ where: { id: despesaId } });
    if (!despesa || despesa.usuarioId !== req.usuarioId) {
      return res.status(403).json({ error: 'Acesso negado' });
    }

    const despesaAtualizada = await prisma.despesa.update({
      where: { id: despesaId },
      data: {
        descricao,
        valor: parseFloat(valor),
        categoria,
        data: new Date(data),
      },
    });

    // Registrar movimentação no console (auditoria)
    await auditService.registrar(req, {
      acao: 'ATUALIZAR_DESPESA',
      categoria: 'DESPESAS',
      entidade: 'Despesa',
      entidadeId: despesaId,
      descricao: `Despesa atualizada: ${descricao}`,
      metadata: {
        valor: parseFloat(valor),
        categoria,
        data
      }
    });

    // Log de atualização da despesa
    if (req.funcionario) {
      console.log(`Despesa atualizada por funcionário: ${req.funcionario.nome} (ID: ${req.funcionario.id}) - Despesa: ${descricao} - Valor: R$ ${valor} - ID: ${despesaId}`);
    } else if (req.user) {
      console.log(`Despesa atualizada por usuário: ${req.user.nome} (ID: ${req.user.id}) - Despesa: ${descricao} - Valor: R$ ${valor} - ID: ${despesaId}`);
    }

    res.json({ message: 'Despesa atualizada com sucesso', despesa: despesaAtualizada });
  } catch (err) {
    console.error('Erro ao atualizar despesa:', err);
    res.status(500).json({ error: 'Erro interno' });
  }
};

export const deletar = async (req, res) => {
  const despesaId = req.params.id;

  try {
    const despesa = await prisma.despesa.findUnique({ where: { id: despesaId } });
    if (!despesa || despesa.usuarioId !== req.usuarioId) {
      return res.status(403).json({ error: 'Acesso negado' });
    }

    // Log de exclusão da despesa (antes de deletar para ter acesso aos dados)
    if (req.funcionario) {
      console.log(`Despesa excluída por funcionário: ${req.funcionario.nome} (ID: ${req.funcionario.id}) - Despesa: ${despesa.descricao} - Valor: R$ ${despesa.valor} - ID: ${despesaId}`);
    } else if (req.user) {
      console.log(`Despesa excluída por usuário: ${req.user.nome} (ID: ${req.user.id}) - Despesa: ${despesa.descricao} - Valor: R$ ${despesa.valor} - ID: ${despesaId}`);
    }

    await prisma.despesa.delete({ where: { id: despesaId } });

    // Registrar movimentação no console (auditoria)
    await auditService.registrar(req, {
      acao: 'EXCLUIR_DESPESA',
      categoria: 'DESPESAS',
      entidade: 'Despesa',
      entidadeId: despesaId,
      descricao: `Despesa excluída: ${despesa.descricao}`,
      metadata: {
        valor: despesa.valor,
        categoria: despesa.categoria,
        data: despesa.data
      }
    });
    res.json({ message: 'Despesa deletada com sucesso' });
  } catch (err) {
    console.error('Erro ao deletar despesa:', err);
    res.status(500).json({ error: 'Erro interno' });
  }
};

export const relatorio = async (req, res) => {
  try {
    const { periodo, dataInicio: dataInicioQuery, dataFim: dataFimQuery } = req.query; // hoje, semana, mes, ou datas personalizadas
    const usuarioId = req.usuarioId;
    
    let dataInicio = new Date();
    let dataFim = undefined;

    if (dataInicioQuery) {
      dataInicio = new Date(dataInicioQuery);
      if (dataFimQuery) {
        dataFim = new Date(dataFimQuery);
      }
    } else {
      switch (periodo) {
        case 'dia':
        case 'hoje':
          dataInicio.setHours(0, 0, 0, 0);
          break;
        case 'semana':
          dataInicio.setDate(dataInicio.getDate() - dataInicio.getDay());
          dataInicio.setHours(0, 0, 0, 0);
          break;
        case 'mes':
          dataInicio = new Date(dataInicio.getFullYear(), dataInicio.getMonth(), 1);
          break;
        case 'ano':
          dataInicio = new Date(dataInicio.getFullYear(), 0, 1);
          break;
        default:
          dataInicio = new Date(0); // Todas as despesas
      }
    }

    const whereClause = {
      usuarioId,
      data: {
        gte: dataInicio,
      },
    };

    if (dataFim) {
      whereClause.data.lte = dataFim;
    }

    const despesas = await prisma.despesa.findMany({
      where: whereClause,
      include: {
        usuario: {
          select: {
            id: true,
            nome: true,
            email: true
          }
        }
      },
      orderBy: { data: 'desc' },
    });

    // Calcular totais por categoria
    const totalPorCategoria = despesas.reduce((acc, despesa) => {
      acc[despesa.categoria] = (acc[despesa.categoria] || 0) + despesa.valor;
      return acc;
    }, {});

    // Total geral
    const totalGeral = despesas.reduce((acc, despesa) => acc + despesa.valor, 0);

    res.json({
      despesas,
      totalPorCategoria,
      totalGeral,
      periodo,
      quantidade: despesas.length,
    });
  } catch (err) {
    console.error('Erro ao gerar relatório de despesas:', err);
    res.status(500).json({ error: 'Erro ao gerar relatório' });
  }
};

export default {
  listar,
  criar,
  atualizar,
  deletar,
  relatorio,
};