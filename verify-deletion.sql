-- Script para verificar se os usuários foram deletados com sucesso

-- Verificar se os usuários ainda existem
SELECT id, nome, email, tipo, assinatura 
FROM "User" 
WHERE email IN ('teste33@painele.com', 'camila@teste.com', 'andre1@painele.com');

-- Se não retornar nenhum resultado, os usuários foram deletados com sucesso