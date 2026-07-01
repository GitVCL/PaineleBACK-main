import express from 'express';
import verificaToken from '../middlewares/verificaToken.js';
import { listar, criar, atualizar, deletar, relatorio } from '../controllers/despesa.controller.js';

const router = express.Router();

// 🔒 Middleware de autenticação
router.use(verificaToken);

// GET /api/despesas → Listar despesas do usuário
router.get('/', listar);

// GET /api/despesas/relatorio → Relatório de despesas
router.get('/relatorio', relatorio);

// POST /api/despesas → Criar nova despesa
router.post('/', criar);

// PUT /api/despesas/:id → Atualizar despesa existente
router.put('/:id', atualizar);

// DELETE /api/despesas/:id → Deletar despesa
router.delete('/:id', deletar);

export default router;