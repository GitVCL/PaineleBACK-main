/**
 * Utilitários para manipulação de dados do colaborador
 */

/**
 * Extrai os dados do colaborador do request (definido pelo middleware de autenticação)
 * @param {Object} req - Request object do Express
 * @returns {Object} Dados do colaborador
 */
export const getColaborador = (req) => {
  if (!req.colaborador) {
    throw new Error('Colaborador não encontrado no request. Verifique se o middleware de autenticação está funcionando.');
  }
  
  return req.colaborador;
};

/**
 * Verifica se o colaborador está ativo
 * @param {Object} colaborador - Dados do colaborador
 * @returns {boolean} True se o colaborador estiver ativo
 */
export const isColaboradorAtivo = (colaborador) => {
  return colaborador && colaborador.ativo === true;
};

/**
 * Formata os dados do colaborador para resposta da API
 * @param {Object} colaborador - Dados do colaborador
 * @returns {Object} Dados formatados
 */
export const formatarColaborador = (colaborador) => {
  if (!colaborador) return null;
  
  return {
    id: colaborador.id,
    nome: colaborador.nome,
    email: colaborador.email,
    telefone: colaborador.telefone,
    ativo: colaborador.ativo,
    dataAdmissao: colaborador.dataAdmissao
  };
};

export default {
  getColaborador,
  isColaboradorAtivo,
  formatarColaborador
};