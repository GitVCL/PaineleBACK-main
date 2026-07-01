// src/scripts/executar-verificacao.js
// Script para executar verificação manual de assinaturas expiradas

import { executarVerificacaoManual } from './verificar-assinaturas.js';

console.log('🔧 Iniciando verificação manual de assinaturas expiradas...');
console.log('⏰ Data/Hora:', new Date().toLocaleString('pt-BR'));
console.log('=' .repeat(50));

executarVerificacaoManual()
  .then(() => {
    console.log('=' .repeat(50));
    console.log('✅ Verificação manual concluída com sucesso!');
    console.log('⏰ Finalizada em:', new Date().toLocaleString('pt-BR'));
    process.exit(0);
  })
  .catch((error) => {
    console.log('=' .repeat(50));
    console.error('❌ Erro na verificação manual:', error);
    console.log('⏰ Erro em:', new Date().toLocaleString('pt-BR'));
    process.exit(1);
  });