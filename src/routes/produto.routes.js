import express from 'express';
import produtoController from '../controllers/produto.controller.js';
import verificaToken from '../middlewares/verificaToken.js';

const router = express.Router();

router.use(verificaToken); // Aplica JWT em todas as rotas

router.get('/', produtoController.listar);
router.get('/barcode/:codigo', produtoController.buscarPorCodigoBarras);
router.post('/', produtoController.criar);
router.put('/:id', produtoController.atualizar);
router.delete('/:id', produtoController.deletar);

// Rota para fundir produtos duplicados
router.post('/fundir', produtoController.fundirDuplicado);

// Rota para fusão automática de produtos duplicados
router.post('/fundir-automatico', produtoController.fundirDuplicadosAutomatico);

// Rota para unificação automática de lotes com 0 unidades
router.post('/unificar-lotes-automatico', produtoController.unificarLotesAutomatico);

export default router;
