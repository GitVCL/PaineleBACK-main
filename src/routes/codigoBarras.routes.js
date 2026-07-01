import express from 'express';
import codigoBarrasController from '../controllers/codigoBarras.controller.js';
import verificaToken from '../middlewares/verificaToken.js';

const router = express.Router();

// Aplicar middleware de autenticação a todas as rotas
router.use(verificaToken);

// Adicionar código de barras a um produto
router.post('/', codigoBarrasController.adicionarCodigo);

// Remover código de barras
router.delete('/:id', codigoBarrasController.removerCodigo);

// Listar códigos de barras de um produto
router.get('/produto/:produtoId', codigoBarrasController.listarCodigosPorProduto);

export default router;