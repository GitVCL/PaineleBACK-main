import notificacoesFuncionarioService from '../services/notificacoesFuncionario.service.js';

const notificacoesFuncionarioController = {
  // Obter notificações do funcionário logado
  obterNotificacoes: async (req, res) => {
    try {
      const funcionarioId = req.user.id; // ID do funcionário logado
      const limite = parseInt(req.query.limite) || 50;

      const notificacoes = await notificacoesFuncionarioService.obterNotificacoesFuncionario(funcionarioId, limite);
      const naoLidas = await notificacoesFuncionarioService.contarNaoLidas(funcionarioId);

      res.json({
        status: 200,
        message: 'Notificações obtidas com sucesso',
        notificacoes,
        naoLidas
      });
    } catch (error) {
      console.error('Erro ao obter notificações:', error);
      res.status(500).json({
        status: 500,
        message: 'Erro interno do servidor'
      });
    }
  },

  // Marcar notificação como lida
  marcarComoLida: async (req, res) => {
    try {
      const { id } = req.params;
      const funcionarioId = req.user.id;

      const notificacao = await notificacoesFuncionarioService.marcarComoLida(id, funcionarioId);

      res.json({
        status: 200,
        message: 'Notificação marcada como lida',
        notificacao
      });
    } catch (error) {
      console.error('Erro ao marcar notificação como lida:', error);
      res.status(500).json({
        status: 500,
        message: 'Erro interno do servidor'
      });
    }
  },

  // Contar notificações não lidas
  contarNaoLidas: async (req, res) => {
    try {
      const funcionarioId = req.user.id;

      const count = await notificacoesFuncionarioService.contarNaoLidas(funcionarioId);

      res.json({
        status: 200,
        message: 'Contagem obtida com sucesso',
        naoLidas: count
      });
    } catch (error) {
      console.error('Erro ao contar notificações não lidas:', error);
      res.status(500).json({
        status: 500,
        message: 'Erro interno do servidor'
      });
    }
  }
};

export default notificacoesFuncionarioController;