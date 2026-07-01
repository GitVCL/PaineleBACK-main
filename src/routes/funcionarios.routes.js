import express from 'express';
import funcionariosController from '../controllers/funcionarios.controller.js';
import verificaToken from '../middlewares/verificaToken.js';

const router = express.Router();

// Middleware de autenticação para todas as rotas
router.use(verificaToken);

// Middleware para verificar se é usuário principal (empresa)
const verificarEmpresa = (req, res, next) => {
  if (req.user.tipo !== 'PRINCIPAL') {
    return res.status(403).json({
      status: 403,
      message: 'Acesso negado. Apenas empresas podem gerenciar funcionários.'
    });
  }
  next();
};

// Aplicar middleware de verificação de empresa em todas as rotas
router.use(verificarEmpresa);

// Rotas CRUD de funcionários
router.get('/', funcionariosController.listar);
router.get('/:id', funcionariosController.buscarPorId);
router.post('/', funcionariosController.criar);
router.put('/:id', funcionariosController.atualizar);
router.delete('/:id', funcionariosController.deletar);

export default router;