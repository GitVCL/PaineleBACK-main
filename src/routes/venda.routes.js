import express from 'express';
import vendaController from '../controllers/venda.controller.js';
import verificaToken from '../middlewares/verificaToken.js';
import antiDuplicacao from '../middlewares/antiDuplicacao.js';
// import checkAssinatura from '../middlewares/checkAssinatura.js'; // REMOVIDO TEMPORARIAMENTE

const router = express.Router();

// Middleware global para proteger todas as rotas
router.use(verificaToken);

// Criar uma nova venda (COM proteção anti-duplicação)
router.post('/', antiDuplicacao, vendaController.criarVenda);

// Listar vendas do usuário autenticado
router.get('/', vendaController.listarVendas);

// Atualizar uma venda existente
router.put('/:id', vendaController.atualizarVenda);

// Encerrar uma venda existente (SEM verificação de assinatura)
router.put('/:id/encerrar', vendaController.encerrarVenda);

// Excluir uma venda/comanda
router.delete('/:id', vendaController.excluirVenda);

export default router;
