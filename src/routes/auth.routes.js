import express from 'express';
import * as authController from '../controllers/auth.controller.js';
import verificaToken from '../middlewares/verificaToken.js';

const router = express.Router();

router.post('/register', authController.register);
router.post('/login', authController.login);
router.post('/logout', authController.logout);
router.post('/forgot-password', authController.forgotPassword);
router.post('/reset-password', authController.resetPassword);
router.get('/status', authController.checkStatus);

// 🧪 Rota de teste de autenticação
router.get('/test', verificaToken, (req, res) => {
  res.json({ 
    ok: true, 
    message: 'Token válido',
    usuarioId: req.usuarioId,
    timestamp: new Date().toISOString()
  });
});

// 🧪 Rota de teste de email
router.post('/test-email', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ message: 'Email é obrigatório' });
    }

    console.log('🧪 Testando envio de email para:', email);
    
    // Importar o emailService
    const emailService = await import('../services/email.service.js');
    const result = await emailService.default.enviarEmailRecuperacao(email, 'test-token-123');
    
    res.json({
      success: result,
      message: result ? 'Email de teste enviado com sucesso' : 'Falha ao enviar email de teste',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('🚨 Erro no teste de email:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno no teste de email',
      error: error.message
    });
  }
});

export default router;
