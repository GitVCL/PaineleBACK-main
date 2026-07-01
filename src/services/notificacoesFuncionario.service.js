import prisma from './prisma.service.js';

const notificacoesFuncionarioService = {
  // Criar notificação para funcionário
  criarNotificacao: async (funcionarioId, titulo, mensagem, tipo = 'INFO') => {
    try {
      const notificacao = await prisma.notificacaoFuncionario.create({
        data: {
          funcionarioId,
          titulo,
          mensagem,
          tipo
        }
      });
      return notificacao;
    } catch (error) {
      console.error('Erro ao criar notificação para funcionário:', error);
      throw error;
    }
  },

  // Criar notificações para todos os funcionários de um usuário
  criarNotificacaoParaTodosFuncionarios: async (usuarioId, titulo, mensagem, tipo = 'INFO') => {
    try {
      // Buscar todos os funcionários ativos do usuário
      const funcionarios = await prisma.funcionario.findMany({
        where: {
          usuarioId,
          ativo: true
        },
        select: {
          id: true
        }
      });

      // Criar notificações para todos os funcionários
      const notificacoes = await Promise.all(
        funcionarios.map(funcionario => 
          prisma.notificacaoFuncionario.create({
            data: {
              funcionarioId: funcionario.id,
              titulo,
              mensagem,
              tipo
            }
          })
        )
      );

      return notificacoes;
    } catch (error) {
      console.error('Erro ao criar notificações para todos os funcionários:', error);
      throw error;
    }
  },

  // Obter notificações de um funcionário
  obterNotificacoesFuncionario: async (funcionarioId, limite = 50) => {
    try {
      const notificacoes = await prisma.notificacaoFuncionario.findMany({
        where: {
          funcionarioId
        },
        orderBy: {
          criadoEm: 'desc'
        },
        take: limite
      });
      return notificacoes;
    } catch (error) {
      console.error('Erro ao obter notificações do funcionário:', error);
      throw error;
    }
  },

  // Marcar notificação como lida
  marcarComoLida: async (notificacaoId, funcionarioId) => {
    try {
      const notificacao = await prisma.notificacaoFuncionario.update({
        where: {
          id: notificacaoId,
          funcionarioId // Garantir que a notificação pertence ao funcionário
        },
        data: {
          lida: true
        }
      });
      return notificacao;
    } catch (error) {
      console.error('Erro ao marcar notificação como lida:', error);
      throw error;
    }
  },

  // Contar notificações não lidas
  contarNaoLidas: async (funcionarioId) => {
    try {
      const count = await prisma.notificacaoFuncionario.count({
        where: {
          funcionarioId,
          lida: false
        }
      });
      return count;
    } catch (error) {
      console.error('Erro ao contar notificações não lidas:', error);
      throw error;
    }
  }
};

export default notificacoesFuncionarioService;