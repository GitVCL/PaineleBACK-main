import assinaturaService from '../services/assinatura.service.js';
import prisma from '../services/prisma.service.js';
import crypto from 'crypto';

const assinaturaController = {
  // GET /api/assinaturas/planos - Listar planos disponíveis
  listarPlanos: async (req, res) => {
    try {
      const response = assinaturaService.listarPlanos();
      res.status(response.status).json(response);
    } catch (error) {
      console.error('❌ Erro ao listar planos:', error);
      res.status(500).json({
        status: 500,
        message: 'Erro interno do servidor'
      });
    }
  },

  // GET /api/assinaturas/config - Retornar configurações públicas do Stripe
  obterConfig: async (req, res) => {
    try {
      res.status(200).json({
        status: 200,
        data: {
          publicKey: process.env.STRIPE_PUBLISHABLE_KEY
        }
      });
    } catch (error) {
      console.error('❌ Erro ao obter configurações:', error);
      res.status(500).json({
        status: 500,
        message: 'Erro interno do servidor'
      });
    }
  },

  // POST /api/assinaturas/criar-checkout - Criar sessão de checkout do Stripe
  criarCheckout: async (req, res) => {
    try {
      const { planoId, metodoPagamento = 'cartao' } = req.body;
      const usuarioId = req.usuarioId;

      if (!planoId) {
        return res.status(400).json({
          status: 400,
          message: 'ID do plano é obrigatório'
        });
      }

      if (!['cartao', 'boleto'].includes(metodoPagamento)) {
        return res.status(400).json({
          status: 400,
          message: 'Método de pagamento deve ser "cartao" ou "boleto"'
        });
      }

      const response = await assinaturaService.criarSessaoCheckout(usuarioId, planoId, metodoPagamento);
      res.status(response.status).json(response);
    } catch (error) {
      console.error('❌ Erro ao criar checkout:', error);
      res.status(500).json({
        status: 500,
        message: 'Erro interno do servidor'
      });
    }
  },

  // POST /api/assinaturas/webhook - Webhook do Stripe
  webhook: async (req, res) => {
    try {
      console.log('🔔 Webhook do Stripe recebido');
      
      const response = await assinaturaService.processarWebhook(req);
      res.status(response.status).json(response);
    } catch (error) {
      console.error('❌ Erro no webhook:', error);
      res.status(500).json({
        status: 500,
        message: 'Erro ao processar webhook'
      });
    }
  },

  // GET /api/assinaturas/verificar-pagamento/:sessionId - Verificar status do pagamento
  verificarPagamento: async (req, res) => {
    try {
      const { sessionId } = req.params;
      
      if (!sessionId) {
        return res.status(400).json({
          status: 400,
          message: 'ID da sessão é obrigatório'
        });
      }

      const response = await assinaturaService.verificarStatusPagamento(sessionId);
      res.status(response.status).json(response);
    } catch (error) {
      console.error('❌ Erro ao verificar pagamento:', error);
      res.status(500).json({
        status: 500,
        message: 'Erro interno do servidor'
      });
    }
  },

  // GET /api/assinaturas/status - Obter status da assinatura do usuário
  obterStatus: async (req, res) => {
    try {
      const usuarioId = req.usuarioId;
      
      const usuario = await prisma.user.findUnique({
        where: { id: usuarioId },
        include: {
          assinaturas: {
            where: { status: 'ATIVA' },
            orderBy: { criadoEm: 'desc' },
            take: 1
          }
        }
      });

      if (!usuario) {
        return res.status(404).json({
          status: 404,
          message: 'Usuário não encontrado'
        });
      }

      const assinaturaAtiva = usuario.assinaturas[0];
      const planoAtual = usuario.assinatura || 'gratuito';
      const expiraEm = usuario.planoExpiraEm;
      const ativo = expiraEm ? new Date(expiraEm) > new Date() : false;

      res.status(200).json({
        status: 200,
        statusAssinatura: {
          assinatura: {
            plano: planoAtual
          },
          status: ativo ? 'ATIVA' : 'EXPIRADA',
          proximoVencimento: expiraEm
        },
        assinatura: {
          plano: planoAtual,
          ativo,
          expiraEm,
          assinaturaId: assinaturaAtiva?.id
        }
      });
    } catch (error) {
      console.error('❌ Erro ao obter status:', error);
      res.status(500).json({
        status: 500,
        message: 'Erro interno do servidor'
      });
    }
  },

  // DELETE /api/assinaturas/cancelar - Cancelar assinatura
  cancelarAssinatura: async (req, res) => {
    try {
      const usuarioId = req.usuarioId;
      
      const assinatura = await prisma.assinatura.findFirst({
        where: {
          usuarioId,
          status: 'ATIVA'
        }
      });

      if (!assinatura) {
        return res.status(404).json({
          status: 404,
          message: 'Assinatura ativa não encontrada'
        });
      }

      await prisma.assinatura.update({
        where: { id: assinatura.id },
        data: { status: 'CANCELADA' }
      });

      await prisma.user.update({
        where: { id: usuarioId },
        data: {
          assinatura: 'gratuito',
          planoExpiraEm: null
        }
      });

      res.status(200).json({
        status: 200,
        message: 'Assinatura cancelada com sucesso'
      });
    } catch (error) {
      console.error('❌ Erro ao cancelar assinatura:', error);
      res.status(500).json({
        status: 500,
        message: 'Erro interno do servidor'
      });
    }
  },

  // GET /api/assinaturas/verificar-expiradas - Verificar assinaturas expiradas (rota administrativa)
  verificarExpiradas: async (req, res) => {
    try {
      const response = await assinaturaService.verificarAssinaturasExpiradas();
      res.status(response.status).json(response);
    } catch (error) {
      console.error('❌ Erro ao verificar expiradas:', error);
      res.status(500).json({
        status: 500,
        message: 'Erro interno do servidor'
      });
    }
  },

  // GET /api/assinaturas/historico - Obter histórico de assinaturas do usuário
  obterHistorico: async (req, res) => {
    try {
      const usuarioId = req.usuarioId;
      
      // Buscar assinaturas com pagamentos associados
      const assinaturas = await prisma.assinatura.findMany({
        where: { usuarioId },
        include: {
          pagamentos: true
        },
        orderBy: { criadoEm: 'desc' }
      });

      // Buscar pagamentos diretos (sem assinatura)
      const pagamentosDiretos = await prisma.pagamento.findMany({
        where: { usuarioId, assinaturaId: null },
        orderBy: { criadoEm: 'desc' }
      });

      const todosPagamentos = [];

      // Assinaturas + pagamentos vinculados
      assinaturas.forEach(assinatura => {
        if (assinatura.pagamentos.length > 0) {
          assinatura.pagamentos.forEach(pagamento => {
            todosPagamentos.push({
              id: pagamento.id,
              plano: assinatura.plano,
              valor: pagamento.valor,
              status: pagamento.status,
              metodoPagamento: pagamento.metodoPagamento,
              dataCompra: pagamento.dataPagamento || assinatura.dataInicio,
              criadoEm: pagamento.criadoEm
            });
          });
        } else {
          todosPagamentos.push({
            id: assinatura.id,
            plano: assinatura.plano,
            valor: assinatura.precoMensal || 0,
            status: assinatura.status,
            metodoPagamento: "DESCONHECIDO",
            dataCompra: assinatura.dataInicio,
            criadoEm: assinatura.criadoEm
          });
        }
      });

      // Pagamentos diretos
      pagamentosDiretos.forEach(pagamento => {
        todosPagamentos.push({
          id: pagamento.id,
          plano: "PREMIUM",
          valor: pagamento.valor,
          status: pagamento.status,
          metodoPagamento: pagamento.metodoPagamento,
          dataCompra: pagamento.dataPagamento,
          criadoEm: pagamento.criadoEm
        });
      });

      // Ordenar por mais recente
      todosPagamentos.sort((a, b) => new Date(b.criadoEm) - new Date(a.criadoEm));

      res.status(200).json({
        status: 200,
        historico: todosPagamentos
      });
    } catch (error) {
      console.error('❌ Erro ao obter histórico:', error);
      res.status(500).json({
        status: 500,
        message: 'Erro interno do servidor'
      });
    }
  },

  // PUT /api/assinaturas/atualizar-plano-usuario - Atualizar plano de usuário (para colaboradores)
  atualizarPlanoUsuario: async (req, res) => {
    try {
      const { usuarioId, plano, diasValidade } = req.body;
      const colaboradorId = req.colaboradorId;

      if (!usuarioId || !plano) {
        return res.status(400).json({
          status: 400,
          message: 'ID do usuário e plano são obrigatórios'
        });
      }

      // Buscar o usuário e verificar se pertence ao colaborador
      const usuario = await prisma.user.findFirst({
        where: { 
          id: usuarioId,
          colaboradorId: req.user.id
        }
      });

      if (!usuario) {
        return res.status(404).json({
          status: 404,
          message: 'Usuário não encontrado ou não pertence a este colaborador'
        });
      }

      // Cancelar assinaturas ativas existentes
      await prisma.assinatura.updateMany({
        where: {
          usuarioId,
          status: 'ATIVA'
        },
        data: { status: 'CANCELADA' }
      });

      // Calcular data de expiração
      let dataFim = null;
      if (plano !== 'Gratuito' && diasValidade) {
        dataFim = new Date();
        dataFim.setDate(dataFim.getDate() + parseInt(diasValidade));
      }

      // Definir preço baseado no plano
      let precoMensal = 0;
      if (plano === 'TESTE') {
        precoMensal = 0; // Plano teste é gratuito
      } else if (plano === 'PREMIUM') {
        precoMensal = 149.99; // Preço atualizado
      } else if (plano === 'BASICO') {
        precoMensal = 89.99;
      } else if (plano === 'EMPRESARIAL') {
        precoMensal = 99.90;
      }

      // Criar nova assinatura
      const novaAssinatura = await prisma.assinatura.create({
        data: {
          usuarioId,
          plano: plano.toUpperCase(),
          status: 'ATIVA',
          dataFim,
          precoMensal
        }
      });

      // Definir status de pagamento baseado no plano
      let statusPagamento = 'TESTE';
      let assinaturaPaga = false;
      
      if (plano === 'TESTE') {
        statusPagamento = 'TESTE';
        assinaturaPaga = false;
      } else if (plano === 'PREMIUM') {
        statusPagamento = 'PAGO';
        assinaturaPaga = true;
      } else if (plano === 'Gratuito') {
        statusPagamento = 'TESTE';
        assinaturaPaga = false;
      }

      // Atualizar dados do usuário
      await prisma.user.update({
        where: { id: usuarioId },
        data: {
          assinatura: plano.toLowerCase(),
          planoExpiraEm: dataFim,
          statusPagamento,
          assinaturaPaga
        }
      });

      // Criar pagamento automaticamente para planos pagos
      if (plano === 'PREMIUM' || plano === 'BASICO') {
        let valorPagamento = 0;
        if (plano === 'PREMIUM') {
          valorPagamento = 149.99;
        } else if (plano === 'BASICO') {
          valorPagamento = 89.99;
        }

        await prisma.pagamento.create({
          data: {
            usuarioId: usuarioId,
            assinaturaId: novaAssinatura.id,
            status: 'APROVADO',
            valor: valorPagamento,
            moeda: 'BRL',
            metodoPagamento: 'MANUAL_COLABORADOR',
            dataVencimento: new Date(),
            dataPagamento: new Date()
          }
        });

        console.log(`✅ Pagamento automático criado: R$ ${valorPagamento} para plano ${plano}`);
      }

      res.status(200).json({
        status: 200,
        message: 'Plano do usuário atualizado com sucesso',
        assinatura: novaAssinatura
      });
    } catch (error) {
      console.error('❌ Erro ao atualizar plano do usuário:', error);
      res.status(500).json({
        status: 500,
        message: 'Erro interno do servidor'
      });
    }
  }
};

export default assinaturaController;