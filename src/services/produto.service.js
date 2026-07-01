const express = require('express');
const router = express.Router();
const verificaToken = require('../middlewares/verificaToken');
const ProdutoService = require('../services/produto.service');

// 🔒 Middleware de autenticação
router.use(verificaToken);

// GET /api/produtos → Listar produtos do usuário
router.get('/', async (req, res) => {
  try {
    const produtos = await ProdutoService.listar(req.usuarioId);
    res.json(produtos);
  } catch (error) {
    console.error('Erro ao listar produtos:', error);
    res.status(500).json({ message: 'Erro interno ao listar produtos' });
  }
});

// POST /api/produtos → Criar novo produto
router.post('/', async (req, res) => {
  try {
    const { status, message, produto } = await ProdutoService.criar(
      req.usuarioId,
      req.body
    );

    return res.status(status).json(produto ? { message, produto } : { message });
  } catch (error) {
    console.error('Erro ao criar produto:', error);
    res.status(500).json({ message: 'Erro interno ao criar produto' });
  }
});

// PUT /api/produtos/:id → Atualizar produto existente
router.put('/:id', async (req, res) => {
  try {
    const produtoId = req.params.id;
    const { status, message, produto } = await ProdutoService.atualizar(
      req.usuarioId,
      produtoId,
      req.body
    );

    return res.status(status).json(produto ? { message, produto } : { message });
  } catch (error) {
    console.error('Erro ao atualizar produto:', error);
    res.status(500).json({ message: 'Erro interno ao atualizar produto' });
  }
});

// DELETE /api/produtos/:id → Deletar produto
router.delete('/:id', async (req, res) => {
  try {
    const produtoId = req.params.id;
    const { status, message } = await ProdutoService.deletar(
      req.usuarioId,
      produtoId
    );

    return res.status(status).json({ message });
  } catch (error) {
    console.error('Erro ao deletar produto:', error);
    res.status(500).json({ message: 'Erro interno ao deletar produto' });
  }
});

module.exports = router;
