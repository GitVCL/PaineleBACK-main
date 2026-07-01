-- Script para deletar usuários específicos do sistema
-- IMPORTANTE: Este script deleta os usuários e todos os dados relacionados

-- Primeiro, vamos verificar se os usuários existem
SELECT id, nome, email, tipo, assinatura 
FROM "User" 
WHERE email IN ('teste33@painele.com', 'camila@teste.com', 'andre1@painele.com');

-- Deletar dados relacionados primeiro para evitar violação de foreign key

-- Deletar ItemVenda relacionados aos produtos dos usuários
DELETE FROM "ItemVenda" 
WHERE "produtoId" IN (
    SELECT id FROM "Produto" 
    WHERE "usuarioId" IN (
        SELECT id FROM "User" 
        WHERE email IN ('teste33@painele.com', 'camila@teste.com', 'andre1@painele.com')
    )
);

-- Deletar ItemVenda relacionados às vendas dos usuários
DELETE FROM "ItemVenda" 
WHERE "vendaId" IN (
    SELECT id FROM "Venda" 
    WHERE "usuarioId" IN (
        SELECT id FROM "User" 
        WHERE email IN ('teste33@painele.com', 'camila@teste.com', 'andre1@painele.com')
    )
);

-- Deletar Vendas dos usuários
DELETE FROM "Venda" 
WHERE "usuarioId" IN (
    SELECT id FROM "User" 
    WHERE email IN ('teste33@painele.com', 'camila@teste.com', 'andre1@painele.com')
);

-- Deletar Produtos dos usuários
DELETE FROM "Produto" 
WHERE "usuarioId" IN (
    SELECT id FROM "User" 
    WHERE email IN ('teste33@painele.com', 'camila@teste.com', 'andre1@painele.com')
);

-- Deletar Despesas dos usuários
DELETE FROM "Despesa" 
WHERE "usuarioId" IN (
    SELECT id FROM "User" 
    WHERE email IN ('teste33@painele.com', 'camila@teste.com', 'andre1@painele.com')
);

-- Deletar Pagamentos dos usuários
DELETE FROM "Pagamento" 
WHERE "usuarioId" IN (
    SELECT id FROM "User" 
    WHERE email IN ('teste33@painele.com', 'camila@teste.com', 'andre1@painele.com')
);

-- Deletar Assinaturas dos usuários
DELETE FROM "Assinatura" 
WHERE "usuarioId" IN (
    SELECT id FROM "User" 
    WHERE email IN ('teste33@painele.com', 'camila@teste.com', 'andre1@painele.com')
);

-- Deletar Funcionarios dos usuários
DELETE FROM "Funcionario" 
WHERE "usuarioId" IN (
    SELECT id FROM "User" 
    WHERE email IN ('teste33@painele.com', 'camila@teste.com', 'andre1@painele.com')
);

-- Finalmente, deletar os usuários
DELETE FROM "User" WHERE email = 'teste33@painele.com';
DELETE FROM "User" WHERE email = 'camila@teste.com';
DELETE FROM "User" WHERE email = 'andre1@painele.com';

-- Verificar se os usuários foram deletados
SELECT id, nome, email, tipo, assinatura 
FROM "User" 
WHERE email IN ('teste33@painele.com', 'camila@teste.com', 'andre1@painele.com');