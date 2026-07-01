import express from 'express';
import comissaoController from '../controllers/comissao.controller.js';
import verificaToken from '../middlewares/verificaToken.js';

const router = express.Router();

// Middleware de autenticação para todas as rotas
router.use(verificaToken);

/**
 * @route GET /api/comissao/carteira
 * @desc Obter dados da carteira do colaborador
 * @access Private
 */
router.get('/carteira', comissaoController.obterCarteira);

/**
 * @route GET /api/comissao/calcular
 * @desc Calcular comissão atual do colaborador
 * @access Private
 */
router.get('/calcular', comissaoController.calcularComissao);

/**
 * @route PUT /api/comissao/atualizar
 * @desc Atualizar carteira do colaborador
 * @access Private
 */
router.put('/atualizar', comissaoController.atualizarCarteira);

/**
 * @route GET /api/comissao/historico
 * @desc Obter histórico de comissões
 * @access Private
 */
router.get('/historico', comissaoController.obterHistorico);

/**
 * @route POST /api/comissao/processar-mensal
 * @desc Processar comissão mensal do colaborador
 * @access Private
 */
router.post('/processar-mensal', comissaoController.processarComissaoMensal);

/**
 * @route POST /api/comissao/processar-todas
 * @desc Processar comissões de todos os colaboradores (admin)
 * @access Private (Admin)
 */
router.post('/processar-todas', comissaoController.processarTodasComissoes);

export default router;