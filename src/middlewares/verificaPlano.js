import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Middleware para verificar o plano do usuário e controlar acesso às funcionalidades
 * MODIFICADO: Verificações de plano removidas conforme solicitação
 */

/**
 * Middleware que bloqueia usuários com plano expirado
 * MODIFICADO: Pass-through
 */
const verificaPlanoExpirado = async (req, res, next) => {
  req.plano = {
    tipo: 'premium',
    expiraEm: null,
    ativo: true
  };
  next();
};

/**
 * Middleware que verifica se o usuário tem acesso à categoria "funcionários"
 * MODIFICADO: Pass-through
 */
const verificaAcessoFuncionarios = async (req, res, next) => {
  next();
};

/**
 * Middleware flexível que adiciona informações do plano ao request
 * MODIFICADO: Pass-through
 */
const adicionarInfoPlano = async (req, res, next) => {
  req.plano = {
    tipo: 'premium',
    ativo: true,
    expiraEm: null,
    temAcessoFuncionarios: true,
    temAcessoCompleto: true
  };
  next();
};

export {
  verificaPlanoExpirado,
  verificaAcessoFuncionarios,
  adicionarInfoPlano
};

export default verificaPlanoExpirado;
