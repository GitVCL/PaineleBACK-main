import express from 'express';
import notificacoesFuncionarioController from '../controllers/notificacoesFuncionario.controller.js';
import verificaToken from '../middlewares/verificaToken.js';

const router = express.Router();

// Aplicar middleware de autenticação em todas as rotas
router.use(verificaToken);

// Rotas para notificações de funcionários
router.get('/', notificacoesFuncionarioController.obterNotificacoes);
router.put('/:id/lida', notificacoesFuncionarioController.marcarComoLida);
router.get('/nao-lidas/count', notificacoesFuncionarioController.contarNaoLidas);

export default router;