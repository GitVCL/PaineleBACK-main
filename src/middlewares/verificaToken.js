import jwt from 'jsonwebtoken';
import prisma from '../services/prisma.service.js';

const verificaToken = async (req, res, next) => {
  // Busca o token nos cookies ou no header Authorization
  const token = req.cookies.token || req.headers.authorization?.replace('Bearer ', '');

  if (!token) {
    console.log('❌ Token ausente');
    return res.status(401).json({ message: 'Token de autenticação não encontrado' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    console.log('✅ Token decodificado:', decoded);

    // Verificar se é um funcionário (token contém funcionarioId)
    if (decoded.funcionarioId && decoded.tipo === 'FUNCIONARIO') {
      console.log('🔍 Identificado como funcionário, buscando dados...');
      
      // Buscar dados do funcionário
      const funcionario = await prisma.funcionario.findUnique({
        where: { id: decoded.funcionarioId },
        include: {
          usuario: {
            select: {
              id: true,
              nome: true,
              email: true,
              assinatura: true,
              statusPagamento: true,
              planoExpiraEm: true
            }
          }
        }
      });

      if (!funcionario) {
        console.log('❌ Funcionário não encontrado');
        return res.status(401).json({ message: 'Token inválido - funcionário não encontrado' });
      }

      // Verificar se o usuário principal ainda existe e tem assinatura ativa
      if (!funcionario.usuario) {
        console.log('❌ Usuário principal do funcionário não encontrado');
        return res.status(401).json({ message: 'Conta principal não encontrada' });
      }

      // REMOVIDO: Verificações de assinatura e pagamento para funcionários
      
      // Configurar dados do funcionário no request
      req.user = {
        id: funcionario.id,
        nome: funcionario.nome,
        email: funcionario.email,
        tipo: 'FUNCIONARIO',
        assinatura: 'eterna', // Override
        statusPagamento: 'PAGO', // Override
        planoExpiraEm: null, // Override
        usuarioPrincipalId: funcionario.usuarioId
      };
      
      req.funcionario = funcionario;
      req.funcionarioId = funcionario.id;
      req.usuarioId = funcionario.usuarioId;
      
      console.log('✅ Funcionário autenticado:', {
        funcionarioId: funcionario.id,
        nome: funcionario.nome,
        usuarioPrincipalId: funcionario.usuarioId
      });
      
      return next();
    }

    // Formato novo: token sempre contém usuarioId
    const usuarioId = decoded.usuarioId || decoded.id;
    
    if (!usuarioId) {
      return res.status(401).json({ message: 'Token inválido: usuarioId ausente' });
    }

    // Primeiro, tentar encontrar na tabela User
    let usuario = await prisma.user.findUnique({
      where: { id: usuarioId },
      select: {
        id: true,
        nome: true,
        email: true,
        tipo: true,
        assinatura: true,
        statusPagamento: true,
        planoExpiraEm: true
      }
    });

    if (usuario) {
      // Verificar se o token foi gerado para um funcionário específico
      // Isso é determinado pela presença de funcionarioId no token
      if (decoded.funcionarioId) {
        // Token de funcionário - buscar dados do funcionário
        const funcionario = await prisma.funcionario.findUnique({
          where: { id: decoded.funcionarioId },
          select: {
            id: true,
            nome: true,
            email: true,
            ativo: true,
            permissoes: true,
            usuarioId: true,
            usuario: {
              select: {
                id: true,
                nome: true,
                assinatura: true,
                planoExpiraEm: true
              }
            }
          }
        });

        if (!funcionario || !funcionario.ativo) {
          return res.status(403).json({ 
            message: 'Funcionário inativo ou não encontrado.',
            inactive: true 
          });
        }

        // Definir dados do funcionário
        req.user = {
          id: funcionario.id,
          nome: funcionario.nome,
          email: funcionario.email,
          tipo: 'FUNCIONARIO',
          assinatura: funcionario.usuario.assinatura,
          planoExpiraEm: funcionario.usuario.planoExpiraEm,
          usuarioPrincipalId: funcionario.usuarioId,
          permissoes: funcionario.permissoes || []
        };
        req.funcionario = req.user;
        req.funcionarioId = funcionario.id;
        req.usuarioId = funcionario.usuarioId; // ID do usuário principal
      } else {
        // Token de usuário principal - verificar status da assinatura
        if (usuario.assinatura === 'bloqueado' || usuario.statusPagamento === 'BLOQUEADO') {
          return res.status(403).json({ 
            message: 'Conta bloqueada permanentemente. Entre em contato com o suporte.',
            blocked: true 
          });
        }

        if (usuario.assinatura === 'inativa' || usuario.statusPagamento === 'INATIVO') {
          return res.status(403).json({ 
            message: 'Entre em contato com suporte, sua assinatura expirou.',
            expired: true 
          });
        }

        req.user = {
          id: usuario.id,
          nome: usuario.nome,
          email: usuario.email,
          tipo: usuario.tipo,
          assinatura: usuario.assinatura,
          statusPagamento: usuario.statusPagamento,
          planoExpiraEm: usuario.planoExpiraEm
        };
        req.usuarioId = usuario.id;
      }
    } else {
      // Se não encontrou na tabela User, tentar na tabela Colaborador
      const colaborador = await prisma.colaborador.findUnique({
        where: { id: usuarioId },
        select: {
          id: true,
          nome: true,
          email: true,
          ativo: true,
          telefone: true,
          dataAdmissao: true
        }
      });

      if (colaborador) {
        if (!colaborador.ativo) {
          return res.status(403).json({ message: 'Colaborador inativo' });
        }

        // Definir dados do colaborador
        req.user = {
          ...colaborador,
          tipo: 'COLABORADOR'
        };
        req.colaborador = req.user;
        req.colaboradorId = colaborador.id;
        req.usuarioId = colaborador.id; // Para compatibilidade
      } else {
        // Se não encontrou nem User nem Colaborador, verificar se é um funcionário
        // Para funcionários, o token contém o usuarioId da empresa, não o ID do funcionário
        // Precisamos buscar o funcionário pelo email que foi usado no login
        
        // Buscar funcionário que pertence a este usuário principal
        const funcionario = await prisma.funcionario.findFirst({
          where: {
            usuarioId: usuarioId, // ID do usuário principal
            ativo: true
          },
          select: {
            id: true,
            nome: true,
            email: true,
            ativo: true,
            permissoes: true,
            usuarioId: true,
            usuario: {
              select: {
                id: true,
                nome: true,
                assinatura: true,
                planoExpiraEm: true
              }
            }
          }
        });

        if (!funcionario) {
          return res.status(401).json({ message: 'Usuário não encontrado' });
        }

        if (!funcionario.ativo) {
          return res.status(403).json({ message: 'Funcionário inativo' });
        }

        // Definir dados do funcionário
        req.user = {
          id: funcionario.id,
          nome: funcionario.nome,
          email: funcionario.email,
          tipo: 'FUNCIONARIO',
          assinatura: funcionario.usuario.assinatura,
          planoExpiraEm: funcionario.usuario.planoExpiraEm,
          usuarioPrincipalId: funcionario.usuarioId,
          permissoes: funcionario.permissoes || []
        };
        req.funcionario = req.user;
        req.funcionarioId = funcionario.id;
        req.usuarioId = funcionario.usuarioId; // ID do usuário principal
      }
    }
    
    next();
  } catch (error) {
    console.log('❌ Token inválido:', error.message);
    return res.status(401).json({ message: 'Token inválido ou expirado' });
  }
};

export default verificaToken;
