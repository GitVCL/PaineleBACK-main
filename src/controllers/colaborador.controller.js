import colaboradorService from '../services/colaborador.service.js';

export const registrarColaborador = async (req, res) => {
  const response = await colaboradorService.registrar(req.body);
  res.status(response.status).json(response);
};

export const loginColaborador = async (req, res) => {
  const { response, token } = await colaboradorService.login(req.body);

  if (token) {
    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'None' : 'Lax',
      maxAge: 1000 * 60 * 60 * 12, // 12 horas
      ...(process.env.NODE_ENV !== 'production' && { domain: 'localhost' })
    });
    
    // Incluir token na resposta para o frontend salvar no localStorage
    response.token = token;
    
    // Garantir que o tipo de usuário seja definido corretamente
    if (response.colaborador) {
      response.usuario = {
        ...response.colaborador,
        tipo: 'COLABORADOR'
      };
      delete response.colaborador;
    }
  }

  res.status(response.status).json(response);
};

// Novas funcionalidades migradas do backend do colaborador
export const obterMetricas = async (req, res) => {
  try {
    const colaboradorId = req.colaborador.id;
    const metricas = await colaboradorService.calcularMetricas(colaboradorId);
    
    res.json(metricas);
  } catch (error) {
    console.error('Erro ao obter métricas:', error);
    res.status(500).json({ message: 'Erro interno do servidor' });
  }
};

export const obterVendas = async (req, res) => {
  try {
    const colaboradorId = req.colaborador.id;
    const { page = 1, limit = 10 } = req.query;
    
    const vendas = await colaboradorService.obterVendas(colaboradorId, page, limit);
    
    res.json(vendas);
  } catch (error) {
    console.error('Erro ao obter vendas:', error);
    res.status(500).json({ message: 'Erro interno do servidor' });
  }
};

export const obterClientes = async (req, res) => {
  try {
    const colaboradorId = req.colaborador.id;
    const clientes = await colaboradorService.obterClientes(colaboradorId);
    
    res.json(clientes);
  } catch (error) {
    console.error('Erro ao obter clientes:', error);
    res.status(500).json({ message: 'Erro interno do servidor' });
  }
};

export const obterRelatorios = async (req, res) => {
  try {
    const colaboradorId = req.colaborador.id;
    const { periodo = 'mensal' } = req.query;
    
    const relatorios = await colaboradorService.gerarRelatorios(colaboradorId, periodo);
    
    res.json(relatorios);
  } catch (error) {
    console.error('Erro ao obter relatórios:', error);
    res.status(500).json({ message: 'Erro interno do servidor' });
  }
};

export const obterNotificacoes = async (req, res) => {
  try {
    const colaboradorId = req.colaborador.id;
    const notificacoes = await colaboradorService.obterNotificacoes(colaboradorId);
    
    res.json(notificacoes);
  } catch (error) {
    console.error('Erro ao obter notificações:', error);
    res.status(500).json({ message: 'Erro interno do servidor' });
  }
};

export const marcarNotificacaoLida = async (req, res) => {
  try {
    const colaboradorId = req.colaborador.id;
    const { id } = req.params;
    
    await colaboradorService.marcarNotificacaoLida(colaboradorId, id);
    
    res.json({ message: 'Notificação marcada como lida' });
  } catch (error) {
    console.error('Erro ao marcar notificação como lida:', error);
    res.status(500).json({ message: 'Erro interno do servidor' });
  }
};