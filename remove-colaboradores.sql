-- Script para remover todas as tabelas relacionadas aos colaboradores
-- Execute este script no banco de dados para limpar completamente a lógica de colaboradores

-- Remover tabelas dependentes primeiro (devido às foreign keys)
DROP TABLE IF EXISTS "CarteiraColaborador" CASCADE;
DROP TABLE IF EXISTS "SaqueColaborador" CASCADE;
DROP TABLE IF EXISTS "NotificacaoColaborador" CASCADE;
DROP TABLE IF EXISTS "MetricaColaborador" CASCADE;

-- Remover a tabela principal de colaboradores
DROP TABLE IF EXISTS "Colaborador" CASCADE;

-- Remover o enum StatusSaque se não for usado em outras tabelas
DROP TYPE IF EXISTS "StatusSaque";

-- Confirmar remoção
SELECT 'Tabelas de colaboradores removidas com sucesso!' as resultado;