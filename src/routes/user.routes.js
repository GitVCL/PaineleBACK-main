import { Router } from 'express';
import { obterPerfil, atualizarPerfil, excluirConta, estatisticasConta, obterUsuariosPorColaborador } from '../controllers/user.controller.js';
import verificaToken from '../middlewares/verificaToken.js';

const router = Router();

// Aplicar middleware de autenticação em todas as rotas
router.use(verificaToken);

// GET /api/user/perfil - Obter informações do perfil
router.get('/perfil', obterPerfil);

// PUT /api/user/perfil - Atualizar informações do perfil
router.put('/perfil', atualizarPerfil);

// GET /api/user/estatisticas - Obter estatísticas da conta
router.get('/estatisticas', estatisticasConta);

// DELETE /api/user/conta - Excluir conta e todos os dados relacionados
router.delete('/conta', excluirConta);

// GET /api/user/colaborador - Obter usuários vinculados ao colaborador
router.get('/colaborador', obterUsuariosPorColaborador);

export default router;