export const getUserInfo = async (req, res) => {
  try {
    // This endpoint will be protected by verificaToken middleware
    // So we can access req.user or req.funcionario
    
    const debugInfo = {
      timestamp: new Date().toISOString(),
      requestHeaders: {
        authorization: req.headers.authorization ? 'Present' : 'Missing',
        cookie: req.headers.cookie ? 'Present' : 'Missing'
      },
      tokenInfo: {
        hasUser: !!req.user,
        hasFuncionario: !!req.funcionario,
        userType: req.user?.tipo || req.funcionario?.tipo || 'Not set',
        userId: req.user?.id || null,
        funcionarioId: req.funcionario?.id || null,
        empresaId: req.user?.empresaId || req.funcionario?.empresaId || null
      },
      userData: req.user ? {
        id: req.user.id,
        nome: req.user.nome,
        email: req.user.email,
        tipo: req.user.tipo,
        empresaId: req.user.empresaId,
        ativo: req.user.ativo,
        planoAtivo: req.user.planoAtivo,
        dataExpiracao: req.user.dataExpiracao
      } : null,
      funcionarioData: req.funcionario ? {
        id: req.funcionario.id,
        nome: req.funcionario.nome,
        email: req.funcionario.email,
        tipo: req.funcionario.tipo,
        empresaId: req.funcionario.empresaId,
        ativo: req.funcionario.ativo,
        permissoes: req.funcionario.permissoes
      } : null
    };

    res.json({
      success: true,
      message: 'Debug info retrieved successfully',
      data: debugInfo
    });

  } catch (error) {
    console.error('Debug endpoint error:', error);
    res.status(500).json({
      success: false,
      message: 'Error retrieving debug info',
      error: error.message
    });
  }
};