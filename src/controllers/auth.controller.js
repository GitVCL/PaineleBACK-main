import authService from '../services/auth.service.js';

export const register = async (req, res) => {
  try {
    const { nome, email, senha, colaboradorId } = req.body;
    
    // Validação básica de entrada
    if (!nome || !email || !senha) {
      console.log('⚠️ Tentativa de registro com dados incompletos:', { nome, email: !!email, senha: !!senha });
      return res.status(400).json({ status: 400, message: 'Por favor, preencha nome, email e senha.' });
    }

    const response = await authService.register({ nome, email, senha, colaboradorId });
    
    if (response.status >= 400) {
        console.log(`⚠️ Falha no registro para ${email}:`, response.message);
    }

    res.status(response.status).json(response);
  } catch (error) {
    console.error('Erro no controller de registro:', error);
    res.status(500).json({ status: 500, message: 'Erro interno do servidor ao processar registro' });
  }
};

export const login = async (req, res) => {
  try {
    console.log('🔐 Controller - Iniciando login para:', req.body.email);
    const { response, token } = await authService.login(req.body);
    console.log('🔐 Controller - Resposta do service:', { status: response.status, hasToken: !!token });

    if (token) {
      res.cookie('token', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: process.env.NODE_ENV === 'production' ? 'None' : 'Lax',
        maxAge: 1000 * 60 * 60 * 12, // 12 horas
        ...(process.env.NODE_ENV !== 'production' && { domain: 'localhost' })
      });
      
      // Incluir token na resposta para o frontend salvar no localStorage
      response.token = token;
    }

    console.log('🔐 Controller - Enviando resposta:', response.status);
    res.status(response.status).json(response);
  } catch (error) {
    console.error('🚨 Erro no controller de login:', {
      message: error.message,
      stack: error.stack,
      body: req.body
    });
    res.status(500).json({
      status: 500,
      message: 'Erro interno do servidor durante o login'
    });
  }
};

export const logout = async (_, res) => {
  res.clearCookie('token');
  res.json({ status: 200, message: 'Logout efetuado com sucesso' });
};

export const forgotPassword = async (req, res) => {
  const response = await authService.forgotPassword(req.body.email);
  res.status(response.status).json(response);
};

export const resetPassword = async (req, res) => {
  const response = await authService.resetPassword(req.body);
  res.status(response.status).json(response);
};

export const checkStatus = async (req, res) => {
  const response = await authService.checkStatus(req);
  res.status(response.status).json(response);
};
