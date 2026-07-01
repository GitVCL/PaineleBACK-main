import prisma from '../services/prisma.service.js';

/**
 * Middleware para verificar se o funcionário existe e está ativo
 * Usado nas rotas do app de funcionários
 */
const verificaFuncionario = async (req, res, next) => {
  try {
    console.log('🔍 Verificando funcionário...');
    console.log('Body:', req.body);
    console.log('Headers:', req.headers);

    // Obter funcionarioId do body ou headers
    const funcionarioId = req.body.funcionarioId || req.headers['funcionario-id'];

    if (!funcionarioId) {
      console.log('❌ FuncionarioId não fornecido');
      return res.status(400).json({
        error: 'ID do funcionário é obrigatório',
        codigo: 'FUNCIONARIO_ID_OBRIGATORIO'
      });
    }

    console.log('🔍 Buscando funcionário:', funcionarioId);

    // Buscar funcionário no banco
    const funcionario = await prisma.funcionario.findUnique({
      where: { id: funcionarioId },
      include: {
        usuario: {
          select: {
            id: true,
            nome: true,
            email: true,
            assinatura: true,
            planoExpiraEm: true
          }
        }
      }
    });

    if (!funcionario) {
      console.log('❌ Funcionário não encontrado:', funcionarioId);
      return res.status(404).json({
        error: 'Funcionário não encontrado',
        codigo: 'FUNCIONARIO_NAO_ENCONTRADO'
      });
    }

    if (!funcionario.ativo) {
      console.log('❌ Funcionário inativo:', funcionarioId);
      return res.status(403).json({
        error: 'Funcionário inativo',
        codigo: 'FUNCIONARIO_INATIVO'
      });
    }

    console.log('✅ Funcionário válido:', funcionario.nome);

    // Adicionar dados do funcionário e usuário principal ao request
    req.funcionario = funcionario;
    req.funcionarioId = funcionario.id;
    req.usuarioPrincipal = funcionario.usuario;
    req.usuarioId = funcionario.usuario.id; // ID do usuário principal (empresa)

    next();
  } catch (error) {
    console.error('❌ Erro no middleware verificaFuncionario:', error);
    res.status(500).json({
      error: 'Erro interno do servidor',
      codigo: 'ERRO_INTERNO'
    });
  }
};

export default verificaFuncionario;