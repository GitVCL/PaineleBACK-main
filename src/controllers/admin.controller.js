import prisma from '../services/prisma.service.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

// Registrar um novo administrador
export const registrarAdmin = async (req, res) => {
  try {
    const { nome, email, senha, telefone, cargo, permissoes } = req.body;

    // Verificar se o email já existe
    const adminExistente = await prisma.admin.findUnique({
      where: { email }
    });

    if (adminExistente) {
      return res.status(400).json({
        status: 400,
        message: 'Email já está em uso por outro administrador'
      });
    }

    // Criptografar a senha
    const senhaHash = await bcrypt.hash(senha, 10);

    // Criar o administrador
    const novoAdmin = await prisma.admin.create({
      data: {
        nome,
        email,
        senha: senhaHash,
        telefone,
        cargo,
        permissoes: permissoes || ["gerenciar_colaboradores", "dashboard", "relatorios"]
      },
      select: {
        id: true,
        nome: true,
        email: true,
        telefone: true,
        cargo: true,
        permissoes: true,
        ativo: true,
        criadoEm: true
      }
    });

    res.status(201).json({
      status: 201,
      message: 'Administrador registrado com sucesso',
      admin: novoAdmin
    });
  } catch (error) {
    console.error('Erro ao registrar administrador:', error);
    res.status(500).json({
      status: 500,
      message: 'Erro interno do servidor'
    });
  }
};

// Login de administrador
export const loginAdmin = async (req, res) => {
  try {
    const { email, senha } = req.body;

    // Buscar o administrador
    const admin = await prisma.admin.findUnique({
      where: { email }
    });

    if (!admin) {
      return res.status(401).json({
        status: 401,
        message: 'Credenciais inválidas'
      });
    }

    // Verificar se o admin está ativo
    if (!admin.ativo) {
      return res.status(401).json({
        status: 401,
        message: 'Conta de administrador desativada'
      });
    }

    // Verificar a senha
    const senhaValida = await bcrypt.compare(senha, admin.senha);
    if (!senhaValida) {
      return res.status(401).json({
        status: 401,
        message: 'Credenciais inválidas'
      });
    }

    // Atualizar último login
    await prisma.admin.update({
      where: { id: admin.id },
      data: { ultimoLogin: new Date() }
    });

    // Gerar token JWT
    const token = jwt.sign(
      { 
        id: admin.id, 
        email: admin.email, 
        tipo: 'ADMIN',
        permissoes: admin.permissoes 
      },
      process.env.JWT_SECRET,
      { expiresIn: '12h' }
    );

    // Configurar cookie
    res.cookie('adminToken', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'None' : 'Lax',
      maxAge: 1000 * 60 * 60 * 12, // 12 horas
      ...(process.env.NODE_ENV !== 'production' && { domain: 'localhost' })
    });

    res.status(200).json({
      status: 200,
      message: 'Login realizado com sucesso',
      admin: {
        id: admin.id,
        nome: admin.nome,
        email: admin.email,
        cargo: admin.cargo,
        permissoes: admin.permissoes
      },
      token
    });
  } catch (error) {
    console.error('Erro no login do administrador:', error);
    res.status(500).json({
      status: 500,
      message: 'Erro interno do servidor'
    });
  }
};

// Listar todos os administradores
export const listarAdmins = async (req, res) => {
  try {
    const admins = await prisma.admin.findMany({
      select: {
        id: true,
        nome: true,
        email: true,
        telefone: true,
        cargo: true,
        permissoes: true,
        ativo: true,
        ultimoLogin: true,
        criadoEm: true,
        _count: {
          select: {
            colaboradoresCriados: true
          }
        }
      },
      orderBy: {
        criadoEm: 'desc'
      }
    });

    res.status(200).json({
      status: 200,
      admins
    });
  } catch (error) {
    console.error('Erro ao listar administradores:', error);
    res.status(500).json({
      status: 500,
      message: 'Erro interno do servidor'
    });
  }
};

// Obter perfil do administrador logado
export const obterPerfilAdmin = async (req, res) => {
  try {
    const adminId = req.adminId;

    const admin = await prisma.admin.findUnique({
      where: { id: adminId },
      select: {
        id: true,
        nome: true,
        email: true,
        telefone: true,
        cargo: true,
        permissoes: true,
        ativo: true,
        ultimoLogin: true,
        criadoEm: true,
        _count: {
          select: {
            colaboradoresCriados: true
          }
        }
      }
    });

    if (!admin) {
      return res.status(404).json({
        status: 404,
        message: 'Administrador não encontrado'
      });
    }

    res.status(200).json({
      status: 200,
      admin
    });
  } catch (error) {
    console.error('Erro ao obter perfil do administrador:', error);
    res.status(500).json({
      status: 500,
      message: 'Erro interno do servidor'
    });
  }
};

// Atualizar administrador
export const atualizarAdmin = async (req, res) => {
  try {
    const { id } = req.params;
    const { nome, email, telefone, cargo, permissoes, ativo } = req.body;

    // Verificar se o admin existe
    const adminExistente = await prisma.admin.findUnique({
      where: { id }
    });

    if (!adminExistente) {
      return res.status(404).json({
        status: 404,
        message: 'Administrador não encontrado'
      });
    }

    // Verificar se o email já está em uso por outro admin
    if (email && email !== adminExistente.email) {
      const emailEmUso = await prisma.admin.findUnique({
        where: { email }
      });

      if (emailEmUso) {
        return res.status(400).json({
          status: 400,
          message: 'Email já está em uso por outro administrador'
        });
      }
    }

    // Atualizar o administrador
    const adminAtualizado = await prisma.admin.update({
      where: { id },
      data: {
        ...(nome && { nome }),
        ...(email && { email }),
        ...(telefone && { telefone }),
        ...(cargo && { cargo }),
        ...(permissoes && { permissoes }),
        ...(typeof ativo === 'boolean' && { ativo })
      },
      select: {
        id: true,
        nome: true,
        email: true,
        telefone: true,
        cargo: true,
        permissoes: true,
        ativo: true,
        criadoEm: true,
        atualizadoEm: true
      }
    });

    res.status(200).json({
      status: 200,
      message: 'Administrador atualizado com sucesso',
      admin: adminAtualizado
    });
  } catch (error) {
    console.error('Erro ao atualizar administrador:', error);
    res.status(500).json({
      status: 500,
      message: 'Erro interno do servidor'
    });
  }
};

// Registrar colaborador (função específica do admin)
export const registrarColaborador = async (req, res) => {
  try {
    const { nome, email, senha, telefone, empresa } = req.body;

    // Validar campos obrigatórios
    if (!nome || !email || !senha) {
      return res.status(400).json({
        status: 400,
        message: 'Nome, email e senha são obrigatórios'
      });
    }

    // Verificar se o email já existe
    const usuarioExistente = await prisma.user.findUnique({
      where: { email }
    });

    if (usuarioExistente) {
      return res.status(400).json({
        status: 400,
        message: 'Email já está em uso'
      });
    }

    // Criptografar a senha
    const senhaHash = await bcrypt.hash(senha, 10);

    // Criar o colaborador sem adminId
    const novoColaborador = await prisma.user.create({
      data: {
        nome,
        email,
        senha: senhaHash,
        telefone,
        empresa,
        tipo: 'COLABORADOR'
      },
      select: {
        id: true,
        nome: true,
        email: true,
        telefone: true,
        empresa: true,
        tipo: true,
        criadoEm: true
      }
    });

    res.status(201).json({
      status: 201,
      message: 'Colaborador registrado com sucesso',
      success: true,
      colaborador: novoColaborador
    });
  } catch (error) {
    console.error('Erro ao registrar colaborador:', error);
    res.status(500).json({
      status: 500,
      message: 'Erro interno do servidor',
      success: false
    });
  }
};

// Listar colaboradores criados pelo admin
export const listarColaboradores = async (req, res) => {
  try {
    // Buscar todos os colaboradores do sistema
    const colaboradores = await prisma.user.findMany({
      where: {
        tipo: 'COLABORADOR'
      },
      select: {
        id: true,
        nome: true,
        email: true,
        telefone: true,
        empresa: true,
        tipo: true,
        criadoEm: true,
        statusPagamento: true,
        assinaturaPaga: true
      },
      orderBy: {
        criadoEm: 'desc'
      }
    });

    res.status(200).json({
      status: 200,
      colaboradores
    });
  } catch (error) {
    console.error('Erro ao listar colaboradores:', error);
    res.status(500).json({
      status: 500,
      message: 'Erro interno do servidor'
    });
  }
};

// Logout do administrador
export const logoutAdmin = async (req, res) => {
  try {
    res.clearCookie('adminToken');
    res.status(200).json({
      status: 200,
      message: 'Logout realizado com sucesso'
    });
  } catch (error) {
    console.error('Erro no logout do administrador:', error);
    res.status(500).json({
      status: 500,
      message: 'Erro interno do servidor'
    });
  }
};