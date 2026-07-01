import bcrypt from 'bcrypt';
import prisma from '../services/prisma.service.js';
import axios from 'axios';

const integracaoController = {
  // Criar usuário via integração externa (colaboradores)
  criarUsuario: async (req, res) => {
    try {
      const { nome, email, telefone, colaboradorId_externo } = req.body;

      // Validar dados obrigatórios
      if (!nome || !email || !colaboradorId_externo) {
        return res.status(400).json({
          status: 400,
          message: 'Nome, email e colaboradorId_externo são obrigatórios'
        });
      }

      // Verificar se o e-mail já existe
      const usuarioExistente = await prisma.user.findUnique({
        where: { email }
      });

      if (usuarioExistente) {
        return res.status(400).json({
          status: 400,
          message: 'E-mail já cadastrado no sistema'
        });
      }

      // Verificar se já existe integração para este colaborador externo
      const integracaoExistente = await prisma.integracaoColaborador.findFirst({
        where: { colaboradorId_externo }
      });

      if (integracaoExistente) {
        return res.status(400).json({
          status: 400,
          message: 'Colaborador externo já possui usuário vinculado'
        });
      }

      // Gerar senha temporária
      const senhaTemporaria = Math.random().toString(36).slice(-8);
      const senhaHash = await bcrypt.hash(senhaTemporaria, 10);
      
      // Data de expiração do plano (30 dias de teste)
      const planoExpiraEm = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

      // Criar usuário no Painele
      const novoUsuario = await prisma.user.create({
        data: {
          nome,
          email,
          senha: senhaHash,
          telefone: telefone || null,
          tipo: 'PRINCIPAL',
          assinatura: 'teste',
          planoExpiraEm,
          statusPagamento: 'TESTE',
          colaboradorId: colaboradorId_externo // Salvar ID externo para referência
        }
      });

      // Criar registro de integração
      await prisma.integracaoColaborador.create({
        data: {
          userId_painele: novoUsuario.id,
          colaboradorId_externo
        }
      });

      console.log('✅ Usuário criado via integração:', {
        userId: novoUsuario.id,
        email: novoUsuario.email,
        colaboradorId_externo
      });

      // Retornar apenas o ID do usuário criado
      return res.status(201).json({
        userId_painele: novoUsuario.id
      });

    } catch (error) {
      console.error('🚨 Erro ao criar usuário via integração:', error);
      return res.status(500).json({
        status: 500,
        message: 'Erro interno do servidor'
      });
    }
  },

  // Webhook para notificar colaboradores sobre pagamentos
  notificarPagamento: async (userId_painele, valor, status) => {
    try {
      // Buscar integração do usuário
      const integracao = await prisma.integracaoColaborador.findUnique({
        where: { userId_painele }
      });

      if (!integracao) {
        console.log('⚠️ Usuário não possui integração com colaborador:', userId_painele);
        return;
      }

      // URL do webhook do sistema de colaboradores (configurável via env)
      const webhookUrl = process.env.COLABORADORES_WEBHOOK_URL || 'https://api.colaboradores.com/webhooks/pagamento';

      const payload = {
        userId_painele,
        colaboradorId_externo: integracao.colaboradorId_externo,
        valor,
        status
      };

      console.log('📡 Enviando webhook para colaboradores:', payload);

      // Enviar webhook
      const response = await axios.post(webhookUrl, payload, {
        timeout: 10000, // 10 segundos
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.COLABORADORES_WEBHOOK_TOKEN || ''}` // Token de autenticação se necessário
        }
      });

      console.log('✅ Webhook enviado com sucesso:', response.status);
      return true;

    } catch (error) {
      console.error('🚨 Erro ao enviar webhook para colaboradores:', {
        userId_painele,
        error: error.message,
        response: error.response?.data
      });
      return false;
    }
  },

  // Buscar usuário por colaborador externo
  buscarUsuarioPorColaborador: async (req, res) => {
    try {
      const { colaboradorId_externo } = req.params;

      const integracao = await prisma.integracaoColaborador.findFirst({
        where: { colaboradorId_externo },
        include: {
          user: {
            select: {
              id: true,
              nome: true,
              email: true,
              assinatura: true,
              statusPagamento: true,
              planoExpiraEm: true,
              criadoEm: true
            }
          }
        }
      });

      if (!integracao) {
        return res.status(404).json({
          status: 404,
          message: 'Usuário não encontrado para este colaborador'
        });
      }

      return res.status(200).json({
        userId_painele: integracao.userId_painele,
        colaboradorId_externo: integracao.colaboradorId_externo,
        usuario: integracao.user
      });

    } catch (error) {
      console.error('🚨 Erro ao buscar usuário por colaborador:', error);
      return res.status(500).json({
        status: 500,
        message: 'Erro interno do servidor'
      });
    }
  }
};

export default integracaoController;