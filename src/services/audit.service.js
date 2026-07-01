import prisma from './prisma.service.js';

/**
 * Serviço de auditoria para registrar movimentações no console do proprietário.
 * Sempre grava no contexto do usuário PRINCIPAL (req.usuarioId).
 */
const auditService = {
  /**
   * Registrar uma movimentação.
   * @param {object} req Express Request, com user/tipo preenchido pelo middleware
   * @param {object} params Dados da movimentação
   * @returns {Promise<void>}
   */
  async registrar(req, {
    acao,
    categoria,
    entidade,
    entidadeId,
    descricao,
    metadata
  } = {}) {
    try {
      const usuarioId = req?.usuarioId; // Dono da conta
      if (!usuarioId) {
        // Sem contexto de dono, não registra
        return;
      }

      const actorTipo = req?.user?.tipo || 'PRINCIPAL';
      const ip = req?.headers?.['x-forwarded-for'] || req?.ip || null;
      const userAgent = req?.headers?.['user-agent'] || null;

      const data = {
        usuarioId,
        actorTipo,
        acao: acao || 'AÇÃO',
        categoria: categoria || null,
        entidade: entidade || null,
        entidadeId: entidadeId || null,
        descricao: descricao || null,
        metadata: metadata || null,
        ip,
        userAgent
      };

      // Atores opcionais
      if (actorTipo === 'FUNCIONARIO' && req.funcionarioId) {
        data.actorFuncionarioId = req.funcionarioId;
      }
      if (actorTipo === 'PRINCIPAL' && req.usuarioId) {
        data.actorUsuarioId = req.usuarioId;
      }
      if (actorTipo === 'ADMIN' && req.adminId) {
        data.actorAdminId = req.adminId;
      }
      if (actorTipo === 'COLABORADOR' && req.colaboradorId) {
        data.actorColaboradorId = req.colaboradorId;
      }

      await prisma.movimentacaoConsole.create({
        data
      });
    } catch (err) {
      // Não quebrar fluxo da aplicação por falha de log
      console.warn('⚠️ Falha ao registrar movimentação no console:', err?.message);
    }
  }
};

export default auditService;