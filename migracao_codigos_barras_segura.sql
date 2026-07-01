-- Script de migração SEGURA para códigos de barras
-- Migra dados existentes da coluna codigoBarras para a nova tabela codigos_barras
-- Trata duplicados ANTES da inserção para evitar erro de constraint

-- 1. Ativar extensão pgcrypto para usar gen_random_uuid()
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. Inserir apenas códigos únicos (evita duplicados)
-- Usa DISTINCT ON para pegar apenas o primeiro produto de cada código
INSERT INTO codigos_barras (id, codigo, "produtoId")
SELECT 
    gen_random_uuid(), 
    "codigoBarras", 
    id
FROM (
    SELECT DISTINCT ON ("codigoBarras") 
        "codigoBarras", 
        id
    FROM "Produto"
    WHERE "codigoBarras" IS NOT NULL
    ORDER BY "codigoBarras", id
) AS produtos_unicos
WHERE NOT EXISTS (
    SELECT 1 FROM codigos_barras cb 
    WHERE cb.codigo = produtos_unicos."codigoBarras"
);

-- 3. Verificação: Contar quantos códigos foram migrados
SELECT 
    COUNT(*) as total_codigos_migrados,
    COUNT(DISTINCT codigo) as codigos_unicos
FROM codigos_barras;

-- 4. Verificação: Ver produtos que têm códigos duplicados (não migrados)
SELECT 
    "codigoBarras",
    COUNT(*) as quantidade_produtos
FROM "Produto"
WHERE "codigoBarras" IS NOT NULL
GROUP BY "codigoBarras"
HAVING COUNT(*) > 1
ORDER BY quantidade_produtos DESC;

-- 5. Verificação: Ver alguns exemplos dos dados migrados
SELECT 
    p.nome as produto_nome,
    p."codigoBarras" as codigo_antigo,
    cb.codigo as codigo_novo,
    cb.id as codigo_id
FROM "Produto" p
INNER JOIN codigos_barras cb ON cb."produtoId" = p.id
LIMIT 10;