import jwt from 'jsonwebtoken';

export const gerarToken = (payload) => {
  // Se payload for apenas um ID (compatibilidade com código existente)
  if (typeof payload === 'string' || typeof payload === 'number') {
    return jwt.sign({ usuarioId: payload }, process.env.JWT_SECRET, { expiresIn: '12h' });
  }
  
  // Se payload for um objeto com dados completos
  return jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '12h' });
};
