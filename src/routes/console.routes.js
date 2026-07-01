import express from 'express';
import { listarMovimentacoes } from '../controllers/console.controller.js';
import verificaToken from '../middlewares/verificaToken.js';

const router = express.Router();

// Todas as rotas deste módulo exigem autenticação
router.use(verificaToken);

// GET /api/console/movimentacoes - Lista logs do console
router.get('/movimentacoes', listarMovimentacoes);

export default router;