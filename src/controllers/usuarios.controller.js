import bcrypt from 'bcrypt';
import prisma from '../services/prisma.service.js';
import emailService from '../services/email.service.js';
import { v4 as uuidv4 } from 'uuid';

const usuariosController = {
  // Listar todos os usuários da conta principal
  listar: async (req, res) => {
    try {
      const contaPrincipalId = req.usuarioId; // ID da conta principal

      const usuarios = await prisma.user.findMany({
        where: {
          id: contaPrincipalId // Buscar usuários com o mesmo ID da conta principal
        },
        select: {
          id: true,
          nome: true,
          email: true,
          telefone: true,
          tipo: true,
          criadoEm: true,
          assinatura: true,
          assinaturaPaga: true,
          planoExpiraEm: true
        },
        orderBy: {
          criadoEm: 'desc'
        }
      });

      res.json({
        status: 200,
        message: 'Usuários listados com sucesso',
        usuarios
      });
    } catch (error) {
      console.error('Erro ao listar usuários:', error);
      res.status(500).json({
        status: 500,
        message: 'Erro interno do servidor'
      });
    }
  },

  // Listar usuários cadastrados por um colaborador específico
  listarPorColaborador: async (req, res) => {
    try {
      const { colaboradorId } = req.params;
      
      if (!colaboradorId) {
        return res.status(400).json({
          status: 400,
          message: 'ID do colaborador é obrigatório'
        });
      }

      // Buscar usuários que foram cadastrados por este colaborador
      const usuarios = await prisma.user.findMany({
        where: {
          colaboradorId: colaboradorId // Campo que armazena quem cadastrou o usuário
        },
        select: {
          id: true,
          nome: true,
          email: true,
          telefone: true,
          tipo: true,
          criadoEm: true,
          assinatura: true,
          assinaturaPaga: true,
          planoExpiraEm: true
        },
        orderBy: {
          criadoEm: 'desc'
        }
      });

      res.json({
        status: 200,
        message: 'Usuários do colaborador listados com sucesso',
        usuarios
      });
    } catch (error) {
      console.error('Erro ao listar usuários do colaborador:', error);
      res.status(500).json({
        status: 500,
        message: 'Erro interno do servidor'
      });
    }
  },

  // Criar novo usuário com mesmo ID da conta principal
  criar: async (req, res) => {
    try {
      const { nome, email, senha, telefone, colaboradorId } = req.body;
      const contaPrincipalId = req.usuarioId; // ID da conta principal
      const usuarioLogado = req.user; // Dados do usuário logado

      // Validações básicas
      if (!nome || !email || !senha) {
        return res.status(400).json({
          status: 400,
          message: 'Nome, email e senha são obrigatórios'
        });
      }

      // Verificar se email já existe
      const emailExiste = await prisma.user.findUnique({
        where: { email }
      });

      if (emailExiste) {
        return res.status(409).json({
          status: 409,
          message: 'Email já está em uso'
        });
      }

      // Buscar dados da conta principal para copiar assinatura e plano
      let contaPrincipal;
      
      // Se é usuário principal, usar seus próprios dados
      contaPrincipal = await prisma.user.findUnique({
        where: { id: contaPrincipalId },
        select: {
          id: true,
          assinatura: true,
          planoExpiraEm: true
        }
      });
      
      if (!contaPrincipal) {
        return res.status(404).json({
          status: 404,
          message: 'Conta principal não encontrada'
        });
      }

      // Hash da senha
      const senhaHash = await bcrypt.hash(senha, 10);

      // Criar usuário vinculado à conta principal (B2B gratuito: sem verificação de email)
      const usuario = await prisma.user.create({
        data: {
          nome,
          email,
          senha: senhaHash,
          telefone: telefone || null,
          tipo: 'PRINCIPAL', // Criar usuário normal
          principalId: contaPrincipal.id, // Vincular à conta principal
          assinatura: 'eterna', // Plano eterno
          planoExpiraEm: null, // Sem expiração
          emailVerificado: true,
          verificationToken: null,
          verificationCode: null,
          verificationTokenExpiry: null
        },
        select: {
          id: true,
          nome: true,
          email: true,
          telefone: true,
          tipo: true,
          criadoEm: true
        }
      });

      res.status(201).json({
        status: 201,
        message: 'Usuário criado com sucesso.',
        usuario
      });
    } catch (error) {
      console.error('Erro ao criar usuário:', error);
      
      // Verificar se é erro de ID duplicado
      if (error.code === 'P2002') {
        return res.status(409).json({
          status: 409,
          message: 'Já existe um usuário com essas credenciais'
        });
      }
      
      res.status(500).json({
        status: 500,
        message: 'Erro interno do servidor'
      });
    }
  },

  // Atualizar usuário
  atualizar: async (req, res) => {
    try {
      const { id } = req.params;
      const { nome, email, telefone } = req.body;
      const contaPrincipalId = req.usuarioId;

      // Verificar se usuário existe
      const usuarioExiste = await prisma.user.findUnique({
        where: {
          email: id // Usar email como identificador único
        }
      });

      if (!usuarioExiste) {
        return res.status(404).json({
          status: 404,
          message: 'Usuário não encontrado'
        });
      }

      // Se email foi alterado, verificar se não está em uso
      if (email && email !== usuarioExiste.email) {
        const emailEmUso = await prisma.user.findUnique({
          where: { email }
        });

        if (emailEmUso) {
          return res.status(409).json({
            status: 409,
            message: 'Email já está em uso'
          });
        }
      }

      // Atualizar usuário
      const usuarioAtualizado = await prisma.user.update({
        where: { email: id },
        data: {
          ...(nome && { nome }),
          ...(email && { email }),
          ...(telefone !== undefined && { telefone })
        },
        select: {
          id: true,
          nome: true,
          email: true,
          telefone: true,
          tipo: true,
          criadoEm: true
        }
      });

      res.json({
        status: 200,
        message: 'Usuário atualizado com sucesso',
        usuario: usuarioAtualizado
      });
    } catch (error) {
      console.error('Erro ao atualizar usuário:', error);
      res.status(500).json({
        status: 500,
        message: 'Erro interno do servidor'
      });
    }
  },

  // Deletar usuário
  deletar: async (req, res) => {
    try {
      const { id } = req.params;
      const contaPrincipalId = req.usuarioId;

      // Verificar se usuário existe e pertence à conta
      const usuario = await prisma.user.findFirst({
        where: {
          id: contaPrincipalId,
          email: id // Usar email como identificador
        }
      });

      if (!usuario) {
        return res.status(404).json({
          status: 404,
          message: 'Usuário não encontrado'
        });
      }

      // Deletar usuário
      await prisma.user.delete({
        where: { email: id }
      });

      res.json({
        status: 200,
        message: 'Usuário deletado com sucesso'
      });
    } catch (error) {
      console.error('Erro ao deletar usuário:', error);
      res.status(500).json({
        status: 500,
        message: 'Erro interno do servidor'
      });
    }
  },

  // Alterar senha do usuário
  alterarSenha: async (req, res) => {
    try {
      const { id } = req.params;
      const { novaSenha } = req.body;
      const contaPrincipalId = req.usuarioId;

      if (!novaSenha) {
        return res.status(400).json({
          status: 400,
          message: 'Nova senha é obrigatória'
        });
      }

      // Verificar se usuário existe e pertence à conta
      const usuario = await prisma.user.findFirst({
        where: {
          id: contaPrincipalId,
          email: id
        }
      });

      if (!usuario) {
        return res.status(404).json({
          status: 404,
          message: 'Usuário não encontrado'
        });
      }

      // Hash da nova senha
      const senhaHash = await bcrypt.hash(novaSenha, 10);

      // Atualizar senha
      await prisma.user.update({
        where: { email: id },
        data: { senha: senhaHash }
      });

      res.json({
        status: 200,
        message: 'Senha alterada com sucesso'
      });
    } catch (error) {
      console.error('Erro ao alterar senha:', error);
      res.status(500).json({
        status: 500,
        message: 'Erro interno do servidor'
      });
    }
  }
};

export default usuariosController;
