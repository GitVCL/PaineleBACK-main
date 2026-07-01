import jwt from 'jsonwebtoken';
import prisma from '../services/prisma.service.js';

const verificaAdmin = async (req, res, next) => {
  try {
    // Busca o token nos cookies ou no header Authorization
    const token = req.cookies.adminToken || req.headers.authorization?.replace('Bearer ', '');

    if (!token) {
      console.log('❌ Token de admin ausente');
      return res.status(401).json({ 
        status: 401,
        message: 'Token de autenticação de administrador não encontrado' 
      });
    }

    // Verificar e decodificar o token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    console.log('✅ Token de admin decodificado:', { id: decoded.id, email: decoded.email, tipo: decoded.tipo });

    // Verificar se é um token de admin
    if (decoded.tipo !== 'ADMIN') {
      console.log('❌ Token não é de administrador');
      return res.status(403).json({ 
        status: 403,
        message: 'Acesso negado. Token não é de administrador' 
      });
    }

    // Buscar dados do administrador no banco
    const admin = await prisma.admin.findUnique({
      where: { id: decoded.id },
      select: {
        id: true,
        nome: true,
        email: true,
        ativo: true,
        permissoes: true,
        cargo: true
      }
    });

    if (!admin) {
      console.log('❌ Administrador não encontrado no banco');
      return res.status(401).json({ 
        status: 401,
        message: 'Token inválido - administrador não encontrado' 
      });
    }

    // Verificar se o admin está ativo
    if (!admin.ativo) {
      console.log('❌ Administrador desativado');
      return res.status(403).json({ 
        status: 403,
        message: 'Conta de administrador desativada' 
      });
    }

    // Adicionar dados do admin à requisição
    req.adminId = admin.id;
    req.admin = admin;

    console.log('✅ Admin autenticado:', { id: admin.id, nome: admin.nome, email: admin.email });
    next();

  } catch (error) {
    console.error('❌ Erro na verificação do token de admin:', error);

    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ 
        status: 401,
        message: 'Token de administrador inválido' 
      });
    }

    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ 
        status: 401,
        message: 'Token de administrador expirado' 
      });
    }

    return res.status(500).json({ 
      status: 500,
      message: 'Erro interno na verificação de autenticação' 
    });
  }
};

export default verificaAdmin;