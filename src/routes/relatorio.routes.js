// src/routes/relatorio.routes.js
import express from 'express';
import verificaToken from '../middlewares/verificaToken.js';
import { dashboardRelatorios, relatorioPorPeriodo } from '../controllers/relatorio.controller.js';

const router = express.Router();

// Middleware global para proteger todas as rotas
router.use(verificaToken);

// Rota para obter dados do dashboard de relatórios
router.get('/dashboard', dashboardRelatorios);

// Nova rota para relatório por período específico
router.get('/periodo', relatorioPorPeriodo);

export default router;