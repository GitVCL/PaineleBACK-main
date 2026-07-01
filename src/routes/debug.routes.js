import express from 'express';
import verificaToken from '../middlewares/verificaToken.js';

const router = express.Router();

// Rota de debug para verificar o que está em req.user após o middleware
router.get('/user-info', verificaToken, (req, res) => {
  console.log('🔍 Debug - req.user:', req.user);
  console.log('🔍 Debug - req.funcionario:', req.funcionario);
  console.log('🔍 Debug - req.funcionarioId:', req.funcionarioId);
  console.log('🔍 Debug - req.usuarioId:', req.usuarioId);
  
  res.json({
    user: req.user,
    funcionario: req.funcionario,
    funcionarioId: req.funcionarioId,
    usuarioId: req.usuarioId
  });
});

export default router;