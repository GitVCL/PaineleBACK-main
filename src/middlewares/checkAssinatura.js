import prisma from '../services/prisma.service.js';

/**
 * Middleware para verificar se o usuário possui assinatura ativa
 * MODIFICADO: Verificação de assinatura removida conforme solicitação
 */
const checkAssinatura = async (req, res, next) => {
  // Pass-through: sempre permite acesso
  req.assinatura = {
    plano: 'premium',
    ativa: true,
    expiraEm: null,
    gratuito: false
  };
  return next();
};

/**
 * Middleware mais flexível que permite acesso mas adiciona avisos
 * MODIFICADO: Pass-through
 */
const checkAssinaturaFlexivel = async (req, res, next) => {
  req.assinatura = {
    plano: 'premium',
    ativa: true,
    expiraEm: null,
    gratuito: false
  };
  return next();
};

/**
 * Middleware que bloqueia completamente usuários sem assinatura ativa
 * MODIFICADO: Pass-through
 */
const requireAssinaturaPremium = async (req, res, next) => {
  req.assinatura = {
    plano: 'premium',
    ativa: true,
    expiraEm: null,
    gratuito: false
  };
  return next();
};

export {
  checkAssinatura,
  checkAssinaturaFlexivel,
  requireAssinaturaPremium
};
