// src/middlewares/antiDuplicacao.js
import { v4 as uuidv4 } from 'uuid';

// Cache em memória para tokens únicos e vendas recentes
const tokensUsados = new Set();
const vendasRecentes = new Map();

// Limpar tokens antigos a cada 10 minutos
setInterval(() => {
  tokensUsados.clear();
  console.log('🧹 Cache de tokens únicos limpo');
}, 10 * 60 * 1000);

// Limpar vendas antigas a cada 30 segundos
setInterval(() => {
  const agora = Date.now();
  const tempoLimite = 5000; // 5 segundos
  
  for (const [chave, timestamp] of vendasRecentes.entries()) {
    if (agora - timestamp > tempoLimite) {
      vendasRecentes.delete(chave);
    }
  }
}, 30 * 1000);

/**
 * Middleware para gerar token único na requisição
 */
export const gerarTokenUnico = (req, res, next) => {
  // Verificar se já existe um token no header
  let token = req.headers['x-request-token'];
  
  if (!token) {
    // Gerar novo token se não existir
    token = uuidv4();
    console.log('🔑 Novo token gerado:', token);
  }
  
  // Adicionar token ao request para uso posterior
  req.requestToken = token;
  
  next();
};

/**
 * Middleware para validar duplicação de vendas
 */
export const validarDuplicacao = (req, res, next) => {
  const { requestToken } = req;
  const { tipo, identificador, itens } = req.body;
  const usuarioId = req.usuarioId;
  
  // Verificar se o token já foi usado
  if (tokensUsados.has(requestToken)) {
    console.log('⚠️ Token já utilizado:', requestToken);
    return res.status(409).json({ 
      message: 'Requisição duplicada detectada (token já usado)',
      codigo: 'TOKEN_DUPLICADO'
    });
  }
  
  // Criar chave única para a venda baseada nos dados
  const chaveVenda = `${usuarioId}-${tipo}-${JSON.stringify(itens.map(item => ({
    produtoId: item.produtoId,
    quantidade: item.quantidade,
    preco: item.preco
  })))}`;
  
  // Verificar se uma venda idêntica foi feita recentemente
  const agora = Date.now();
  const timestampVendaRecente = vendasRecentes.get(chaveVenda);
  
  if (timestampVendaRecente && (agora - timestampVendaRecente) < 5000) {
    console.log('⚠️ Venda duplicada detectada em menos de 5 segundos:', chaveVenda);
    return res.status(409).json({ 
      message: 'Venda duplicada detectada. Aguarde alguns segundos antes de tentar novamente.',
      codigo: 'VENDA_DUPLICADA_TEMPORAL'
    });
  }
  
  // Marcar token como usado
  tokensUsados.add(requestToken);
  
  // Registrar venda recente
  vendasRecentes.set(chaveVenda, agora);
  
  console.log('✅ Validação de duplicação passou:', {
    token: requestToken,
    chaveVenda: chaveVenda.substring(0, 50) + '...'
  });
  
  next();
};

/**
 * Middleware combinado para facilitar o uso
 */
export const antiDuplicacao = [gerarTokenUnico, validarDuplicacao];

export default antiDuplicacao;