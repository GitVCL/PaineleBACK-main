import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import prisma from './prisma.service.js';
import { gerarToken } from '../utils/token.js';
import { v4 as uuidv4 } from 'uuid';
import emailService from './email.service.js';

const authService = {
  register: async ({ nome, email, senha, tipo = 'PRINCIPAL' }) => {
    try {
      const existe = await prisma.user.findUnique({ where: { email } });
      if (existe) return { status: 400, message: 'E-mail já cadastrado' };

      const senhaHash = await bcrypt.hash(senha, 10);
      
      const userData = {
        nome,
        email,
        senha: senhaHash,
        tipo,
        emailVerificado: true, // Auto-verificado (Painelé B2B Gratuito)
        verificationToken: null,
        verificationCode: null,
        verificationTokenExpiry: null
      };

      // Configurar plano GRATUITO ETERNO para TODOS
      userData.assinatura = 'eterna';
      userData.planoExpiraEm = null; // Sem expiração
      userData.statusPagamento = 'PAGO';
      userData.assinaturaPaga = true;

      const user = await prisma.user.create({ data: userData });

      // Email de boas-vindas opcional (sem código de verificação)
      // Se falhar, não afeta o fluxo
      emailService.enviarEmailBoasVindas(user.email, user.nome)
        .catch(error => {
          console.error('⚠️ Erro ao enviar email de boas-vindas (segundo plano):', error.message);
        });

      const token = gerarToken(user);
      
      return { 
        status: 201, 
        message: 'Cadastro realizado com sucesso!', 
        token,
        user: { 
          id: user.id,
          nome: user.nome,
          email: user.email,
          tipo: user.tipo,
          emailVerificado: true
        } 
      };
    } catch (error) {
      console.error('🚨 Erro no Prisma/Database durante registro:', error.message);
      return { status: 500, message: 'Erro de conexão com banco de dados. Tente novamente.' };
    }
  },

  login: async ({ email, senha }) => {
    try {
      console.log('🔍 Tentativa de login para:', email);
      
      let user = null;
      let tipoUsuario = null;
      let usuarioId = null;
      let usuarioPrincipal = null;

      // 1. Primeiro, tentar buscar na tabela User (usuários principais e colaboradores)
      const userPrincipal = await prisma.user.findUnique({ where: { email } });
      console.log('👤 Usuário encontrado na tabela User:', !!userPrincipal);
      
      if (userPrincipal) {
        user = userPrincipal;
        tipoUsuario = userPrincipal.tipo;
        usuarioId = userPrincipal.id;
        
        // Garantir plano eterno para TODOS os usuários (PRINCIPAL ou COLABORADOR)
        // Código simplificado: Apenas define localmente, sem update no banco para performance, 
        // já que a verificação foi removida dos middlewares
        user.assinatura = 'eterna';
        user.planoExpiraEm = null;
      }

      // 2. Se não encontrou na tabela User, buscar na tabela Funcionario
      if (!user) {
        console.log('🔍 Buscando na tabela Funcionario...');
        let funcionario = null;
        try {
          funcionario = await prisma.funcionario.findFirst({
            where: { email },
            select: {
              id: true,
              nome: true,
              email: true,
              senha: true,
              ativo: true,
              permissoes: true,
              usuario: {
                select: {
                  id: true,
                  tipo: true,
                  assinatura: true,
                  planoExpiraEm: true
                }
              }
            }
          });
          console.log('👷 Funcionário encontrado:', !!funcionario);
        } catch (err) {
          console.warn('⚠️ Consulta a tabela Funcionario falhou:', err.code || err.message);
          funcionario = null;
        }
        
        if (funcionario) {
          console.log('✅ Funcionário encontrado, dados:', { id: funcionario.id, nome: funcionario.nome, ativo: funcionario.ativo });
          user = {
             id: funcionario.id,
             nome: funcionario.nome,
             email: funcionario.email,
             senha: funcionario.senha,
             tipo: 'FUNCIONARIO',
             ativo: funcionario.ativo,
             usuarioId: funcionario.usuario?.id,
             usuarioPrincipalId: funcionario.usuario?.id,
             planoExpiraEm: funcionario.usuario?.planoExpiraEm,
             assinatura: funcionario.usuario?.assinatura || 'gratuito',
             permissoes: funcionario.permissoes || []
           };
           tipoUsuario = 'FUNCIONARIO';
           usuarioId = funcionario.id;
           usuarioPrincipal = funcionario.usuario;
        }
      }

      // 3. (Removido) Tabela Colaborador foi descontinuada
      // 4. (Removido) Tabela Admin foi descontinuada

      if (!user) {
        console.log('❌ Usuário não encontrado em nenhuma tabela para email:', email);
        return { response: { status: 401, message: 'Credenciais inválidas' } };
      }
      
      console.log('🔐 Verificando senha para usuário:', user.email, 'tipo:', tipoUsuario);

      // Bloquear login se usuário (tabela User) não tiver email verificado
      if (tipoUsuario !== 'FUNCIONARIO' && tipoUsuario !== 'ADMIN') {
        // Somente para registros da tabela User
        if (userPrincipal && userPrincipal.emailVerificado === false) {
          // Auto-verificar usuários antigos que tentarem logar (Migração B2B Gratuito)
          try {
             await prisma.user.update({
                where: { id: userPrincipal.id },
                data: { 
                  emailVerificado: true,
                  verificationToken: null,
                  verificationCode: null
                }
             });
             userPrincipal.emailVerificado = true;
             console.log('✅ Usuário antigo auto-verificado no login:', userPrincipal.email);
          } catch (err) {
             console.error('⚠️ Falha ao auto-verificar usuário antigo:', err.message);
             // Não bloquear login mesmo se falhar o update
          }
        }
      }

      const senhaOk = await bcrypt.compare(senha, user.senha);
      if (!senhaOk) return { response: { status: 401, message: 'Senha incorreta' } };

      // Verificar se funcionário, colaborador ou administrador está ativo
      // Para colaboradores da tabela User, não há campo ativo, então sempre permitir
      // Para funcionários e colaboradores da tabela Colaborador, verificar o campo ativo
      if (tipoUsuario === 'FUNCIONARIO' && !user.ativo) {
        return {
          response: {
            status: 403,
            message: 'Funcionário inativo. Entre em contato com o administrador.'
          }
        };
      }
      
      // Para colaboradores da tabela Colaborador (não da tabela User), verificar ativo
      // REMOVIDO: Verificação de colaborador inativo
      /*
      if (tipoUsuario === 'COLABORADOR' && user.hasOwnProperty('ativo') && !user.ativo) {
        return {
          response: {
            status: 403,
            message: 'Colaborador inativo. Entre em contato com o administrador.'
          }
        };
      }
      */

      // Para administradores, verificar se está ativo
      if (tipoUsuario === 'ADMIN' && !user.ativo) {
        return {
          response: {
            status: 403,
            message: 'Conta de administrador desativada.'
          }
        };
      }

      // Não bloquear login por plano expirado - deixar o frontend controlar o acesso às páginas
      const planoExpiraEm = tipoUsuario === 'FUNCIONARIO' ? usuarioPrincipal?.planoExpiraEm : user.planoExpiraEm;

      // Para funcionários, incluir o ID do funcionário no token para identificação
      // Para colaboradores, usar o ID do próprio colaborador
      // Para administradores, usar o ID do próprio administrador
      let tokenPayload;
      if (tipoUsuario === 'FUNCIONARIO') {
        tokenPayload = {
          usuarioId: user.usuarioId, // ID do usuário principal
          funcionarioId: user.id,    // ID do funcionário específico
          tipo: 'FUNCIONARIO'
        };
      } else if (tipoUsuario === 'ADMIN') {
        tokenPayload = {
          usuarioId: user.id, // ID do administrador
          adminId: user.id,   // ID do administrador específico
          tipo: 'ADMIN',
          permissoes: user.permissoes || []
        };
      } else {
        tokenPayload = {
          usuarioId: tipoUsuario === 'COLABORADOR' ? user.id : user.id
        };
      }
      
      console.log('🔑 TokenPayload:', tokenPayload, 'TipoUsuario:', tipoUsuario);
      
      if (!tokenPayload.usuarioId) {
        console.error('🚨 TokenPayload.usuarioId é undefined:', { tipoUsuario, userId: user.id, usuarioId: user.usuarioId });
        return { 
          response: { 
            status: 500, 
            message: 'Erro interno: ID de usuário inválido' 
          } 
        };
      }
      
      // Validar variável de ambiente antes de gerar o token
      if (!process.env.JWT_SECRET) {
        console.error('🚨 JWT_SECRET não configurado no ambiente.');
        return {
          response: {
            status: 500,
            message: 'Configuração do servidor ausente (JWT_SECRET)'
          }
        };
      }

      let token;
      try {
        token = gerarToken(tokenPayload);
      } catch (err) {
        console.error('🚨 Falha ao gerar token JWT:', err.message);
        return {
          response: {
            status: 500,
            message: 'Erro ao gerar token de autenticação'
          }
        };
      }
      
      return {
        response: { 
          status: 200, 
          message: 'Login bem-sucedido',
          usuario: {
            id: usuarioId,
            nome: user.nome,
            email: user.email,
            tipo: tipoUsuario,
            assinatura: user.assinatura || 'gratuito',
            planoExpiraEm: planoExpiraEm,
            ...(tipoUsuario === 'FUNCIONARIO' && { 
              usuarioPrincipalId: user.usuarioId,
              permissoes: user.permissoes || []
            }),
            ...(tipoUsuario === 'COLABORADOR' && {
              colaboradorId: user.id, // Adicionar colaboradorId para colaboradores
              telefone: user.telefone,
              dataAdmissao: user.dataAdmissao
            }),
            ...(tipoUsuario === 'ADMIN' && {
              adminId: user.id,
              permissoes: user.permissoes || [],
              cargo: 'Administrador'
            })
          }
        },
        token
      };
    } catch (error) {
      console.error('🚨 Erro no Prisma/Database:', error.message);
      return { 
        response: { 
          status: 500, 
          message: 'Erro de conexão com banco de dados. Tente novamente.' 
        } 
      };
    }
  },

  forgotPassword: async (email) => {
    try {
      console.log('🔍 Iniciando recuperação de senha (link) para:', email);

      const user = await prisma.user.findUnique({ where: { email } });
      if (!user) {
        console.log('❌ Usuário não encontrado:', email);
        return { status: 404, message: 'Usuário não encontrado' };
      }

      // Gerar token de redefinição e expiração em 10 minutos
      const token = uuidv4();
      const expiraEm = new Date(Date.now() + 10 * 60 * 1000);

      await prisma.user.update({
        where: { email },
        data: {
          resetToken: token,
          resetTokenExpiry: expiraEm
        }
      });
      console.log('🔑 Token de reset gerado e salvo:', { token, expiraEm });

      const enviado = await emailService.enviarEmailRecuperacao(email, token);
      if (enviado) {
        console.log('✅ Email de recuperação enviado com sucesso');
        return { status: 200, message: 'Email de recuperação enviado com sucesso' };
      } else {
        console.log('❌ Falha ao enviar email de recuperação');
        return { status: 500, message: 'Erro ao enviar email de recuperação' };
      }
    } catch (error) {
      console.error('🚨 Erro no forgotPassword (link):', {
        message: error.message,
        stack: error.stack,
        email
      });
      return { status: 500, message: 'Erro interno do servidor' };
    }
  },

  resetPassword: async ({ email, resetToken, novaSenha }) => {
    try {
      console.log('🔄 Iniciando reset de senha para:', email);
      console.log('🔑 Token recebido:', resetToken);
      
      const user = await prisma.user.findUnique({ where: { email } });
      
      if (!user) {
        console.log('❌ Usuário não encontrado:', email);
        return { status: 400, message: 'Usuário não encontrado' };
      }
      
      if (!user.resetToken) {
        console.log('❌ Nenhum token de reset encontrado para:', email);
        return { status: 400, message: 'Token inválido ou não solicitado' };
      }
      
      if (user.resetToken !== resetToken) {
        console.log('❌ Token não confere:', { esperado: user.resetToken, recebido: resetToken });
        return { status: 400, message: 'Token inválido' };
      }

      if (new Date(user.resetTokenExpiry) < new Date()) {
        console.log('❌ Token expirado:', { expiraEm: user.resetTokenExpiry, agora: new Date() });
        return { status: 400, message: 'Token expirado. Solicite um novo link de recuperação.' };
      }

      console.log('✅ Token válido, atualizando senha...');
      
      const senhaHash = await bcrypt.hash(novaSenha, 10);
      await prisma.user.update({
        where: { email },
        data: {
          senha: senhaHash,
          resetToken: null,
          resetTokenExpiry: null
        }
      });

      console.log('✅ Senha redefinida com sucesso para:', email);
      return { status: 200, message: 'Senha redefinida com sucesso' };
    } catch (error) {
      console.error('🚨 Erro no resetPassword:', {
        message: error.message,
        stack: error.stack,
        email: email
      });
      return {
        status: 500,
        message: 'Erro interno do servidor'
      };
    }
  },

  checkStatus: async (req) => {
    const userId = req.usuarioId;
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) return { status: 404, message: 'Usuário não encontrado' };

    const ativo = new Date(user.planoExpiraEm) > new Date();
    return {
      status: 200,
      planoValido: ativo,
      expiraEm: user.planoExpiraEm
    };
  }
};

export default authService;
