import express from 'express';
import usuariosController from '../controllers/usuarios.controller.js';
import verificaToken from '../middlewares/verificaToken.js';

const router = express.Router();

// Middleware de autenticação para todas as rotas
router.use(verificaToken);

// Middleware para verificar se é usuário principal ou colaborador
const verificarPrincipal = (req, res, next) => {
  // Verificação desativada para permitir acesso total
  next();
};

// Rota pública para colaboradores listarem seus usuários (sem middleware principal)
// router.get('/colaborador/:colaboradorId', usuariosController.listarPorColaborador);

// Aplicar middleware de verificação nas demais rotas
router.use(verificarPrincipal);

// Rotas CRUD de usuários
router.get('/', usuariosController.listar);
router.post('/', usuariosController.criar);
router.put('/:id', usuariosController.atualizar);
router.delete('/:id', usuariosController.deletar);

// Rotas específicas
router.patch('/:id/senha', usuariosController.alterarSenha);

export default router;