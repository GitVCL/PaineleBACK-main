import prisma from './prisma.service.js';
import crypto from 'crypto';
import { stripe, config } from '../config/stripe.js';
import integracaoController from '../controllers/integracao.controller.js';

// Definição dos planos disponíveis
const PLANOS = {
  GRATUITO: {
    id: 'gratuito',
    nome: 'Plano Gratuito',
    preco: 0,
    duracao: 30, // dias
    descricao: 'Teste gratuito por 30 dias',
    recursos: [
      'Acesso completo por 30 dias',
      'Todas as funcionalidades',
      'Suporte por email',
      'Backup diário'
    ]
  },
  BASICO: {
    id: 'basico',
    nome: 'Plano Básico',
    preco: 89.99,
    descricao: 'Painele plano BASICO',
    recursos: [
      'Suporte via whatsapp',
      'Controle de estoque',
      'Vendas ilimitadas',
      'Registro de despesas',
      'Relatórios avançados',
      'Estoque mapeado'
    ]
  },
  PREMIUM: {
    id: 'premium',
    nome: 'Plano Premium',
    preco: 149.99,
    descricao: 'Painele plano PREMIUM',
    recursos: [
      'Suporte via whatsapp e presencial',
      'Controle de estoque',
      'Vendas ilimitadas',
      'Registro de despesas',
      'Relatórios avançados',
      'Estoque mapeado',
      'DIFERENCIAL: Múltiplos Funcionarios'
    ]
  }
};

const assinaturaService = {
  // Listar planos disponíveis
  listarPlanos: () => {
    return {
      status: 200,
      planos: Object.values(PLANOS)
    };
  },

  // Criar sessão de checkout do Stripe
  criarSessaoCheckout: async (usuarioId, planoId, metodoPagamento = 'cartao') => {
    try {
      const plano = PLANOS[planoId.toUpperCase()];
      if (!plano) {
        return {
          status: 400,
          message: 'Plano não encontrado'
        };
      }

      // Buscar dados do usuário
      const usuario = await prisma.user.findUnique({
        where: { id: usuarioId },
        select: { id: true, nome: true, email: true }
      });

      if (!usuario) {
        return {
          status: 404,
          message: 'Usuário não encontrado'
        };
      }

      // URL específica do Stripe com 30 dias grátis
      const stripeCheckoutUrl = 'https://buy.stripe.com/cNi4gz7z23fudqV6wH4ow02';

      // Para planos gratuitos ou de teste, usar o link específico
      if (planoId.toUpperCase() === 'GRATUITO' || planoId.toUpperCase() === 'TESTE') {
        return {
          status: 200,
          message: 'Redirecionando para checkout do Stripe',
          checkoutUrl: stripeCheckoutUrl,
          sessionId: 'stripe_direct_checkout'
        };
      }

      // Definir métodos de pagamento baseado na escolha do usuário
      const paymentMethodTypes = metodoPagamento === 'boleto' 
        ? ['boleto'] 
        : ['card'];

      // Para outros planos, criar sessão personalizada
      const sessionConfig = {
        payment_method_types: paymentMethodTypes,
        line_items: [{
          price_data: {
            currency: config.currency,
            product_data: {
              name: plano.nome,
              description: plano.descricao,
            },
            unit_amount: config.precos[planoId.toUpperCase()] || Math.round(plano.preco * 100),
          },
          quantity: 1,
        }],
        mode: 'payment',
        success_url: config.successUrl,
        cancel_url: config.cancelUrl,
        metadata: {
          usuarioId: usuario.id,
          planoId: plano.id,
          metodoPagamento: metodoPagamento
        }
      };

      // Configurações específicas para boleto
      if (metodoPagamento === 'boleto') {
        sessionConfig.payment_method_options = {
          boleto: {
            expires_after_days: 3
          }
        };
      }

      const session = await stripe.checkout.sessions.create(sessionConfig);

      return {
        status: 200,
        message: 'Sessão de checkout criada com sucesso',
        checkoutUrl: session.url,
        sessionId: session.id
      };
    } catch (error) {
      console.error('❌ Erro ao criar sessão de checkout:', error);
      return {
        status: 500,
        message: 'Erro interno do servidor'
      };
    }
  },

  // Processar webhook do Stripe
  processarWebhook: async (req) => {
    try {
      const sig = req.headers['stripe-signature'];
      
      console.log('🔍 Debug webhook - Headers:', {
        'stripe-signature': sig ? 'Present' : 'Missing',
        'content-type': req.headers['content-type']
      });
      
      // Verificação de assinatura do Stripe
      const event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);

      console.log('📥 Webhook do Stripe recebido:', event.type);
      console.log('🔍 Event data:', JSON.stringify(event.data.object, null, 2));

      // Processar diferentes tipos de eventos
      switch (event.type) {
        case 'checkout.session.completed':
          const session = event.data.object;
          console.log('🔍 Session metadata:', session.metadata);
          console.log('🔍 Session details:', {
            id: session.id,
            amount_total: session.amount_total,
            payment_status: session.payment_status
          });
          
          await assinaturaService.ativarAssinaturaPorCheckout(session);
          console.log('✅ Assinatura ativada com sucesso');
          break;
        case 'payment_intent.succeeded':
          console.log('💰 Pagamento confirmado:', event.data.object.id);
          break;
        default:
          console.log('ℹ️ Evento não tratado:', event.type);
      }

      return {
        status: 200,
        message: 'Webhook processado com sucesso'
      };
    } catch (error) {
      console.error('❌ Erro ao processar webhook:', error);
      console.error('❌ Stack trace:', error.stack);
      return {
        status: 400,
        message: 'Erro ao processar webhook'
      };
    }
  },

  // Verificar status do pagamento
  verificarStatusPagamento: async (sessionId) => {
    try {
      const session = await stripe.checkout.sessions.retrieve(sessionId);
      
      return {
        status: 200,
        pagamento: {
          id: session.id,
          status: session.payment_status,
          valor: session.amount_total / 100,
          metadata: session.metadata
        }
      };
    } catch (error) {
      console.error('❌ Erro ao verificar status do pagamento:', error);
      return {
        status: 500,
        message: 'Erro ao verificar status do pagamento'
      };
    }
  },

  // Ativar assinatura após checkout bem-sucedido
  ativarAssinaturaPorCheckout: async (session) => {
    try {
      console.log('🔍 Iniciando ativação de assinatura para session:', session.id);
      
      const { usuarioId, planoId } = session.metadata;
      console.log('🔍 Metadata extraída:', { usuarioId, planoId });
      
      if (!usuarioId || !planoId) {
        throw new Error(`Metadata inválida: usuarioId=${usuarioId}, planoId=${planoId}`);
      }
      
      // Calcular data de expiração
      const agora = new Date();
      const dataExpiracao = new Date(agora);
      
      if (planoId === 'TESTE') {
        dataExpiracao.setDate(agora.getDate() + 30); // 30 dias
      } else {
        dataExpiracao.setDate(agora.getDate() + 30); // 30 dias
      }
      
      console.log('🔍 Datas calculadas:', { agora, dataExpiracao });

      // Cancelar assinaturas ativas existentes
      console.log('🔍 Cancelando assinaturas ativas existentes...');
      const cancelResult = await prisma.assinatura.updateMany({
        where: {
          usuarioId: usuarioId,
          status: 'ATIVA'
        },
        data: {
          status: 'CANCELADA'
        }
      });
      console.log('🔍 Assinaturas canceladas:', cancelResult.count);

      // Criar nova assinatura
      console.log('🔍 Criando nova assinatura...');
      const novaAssinatura = await prisma.assinatura.create({
        data: {
          usuarioId: usuarioId,
          plano: planoId,
          status: 'ATIVA',
          dataInicio: agora,
          dataFim: dataExpiracao,
          precoMensal: session.amount_total / 100
        }
      });
      console.log('🔍 Nova assinatura criada:', novaAssinatura.id);

      // Definir status de pagamento baseado no plano
      let statusPagamento = 'TESTE';
      let assinaturaPaga = false;
      
      if (planoId === 'PREMIUM') {
        statusPagamento = 'PAGO';
        assinaturaPaga = true;
      } else if (planoId === 'TESTE') {
        statusPagamento = 'TESTE';
        assinaturaPaga = false;
      }
      
      console.log('🔍 Status de pagamento definido:', { statusPagamento, assinaturaPaga });

      // Atualizar dados do usuário
      console.log('🔍 Atualizando dados do usuário...');
      const updateResult = await prisma.user.update({
        where: { id: usuarioId },
        data: {
          assinatura: planoId.toLowerCase(),
          planoExpiraEm: dataExpiracao,
          statusPagamento,
          assinaturaPaga
        }
      });
      console.log('🔍 Usuário atualizado:', updateResult.id);

      console.log('✅ Assinatura ativada:', novaAssinatura.id);
      return novaAssinatura;
    } catch (error) {
      console.error('❌ Erro ao ativar assinatura:', error);
      console.error('❌ Stack trace completo:', error.stack);
      throw error;
    }
  },

  // Placeholder para manter compatibilidade
  verificarStatusPagamentoPlaceholder: async (sessionId) => {
    try {
      return {
        status: 200,
        pagamento: {
          id: sessionId,
          status: 'paid', // Placeholder
          valor: 1.99,
          metadata: {}
        }
      };
    } catch (error) {
      console.error('❌ Erro ao verificar status do pagamento:', error);
      return {
        status: 500,
        message: 'Erro interno do servidor'
      };
    }
  },

  // Verificar assinaturas expiradas (para executar via cron)
  verificarAssinaturasExpiradas: async () => {
    try {
      const agora = new Date();
      
      const assinaturasExpiradas = await prisma.assinatura.findMany({
        where: {
          status: 'ATIVA',
          dataFim: {
            lt: agora
          }
        },
        include: { usuario: true }
      });

      for (const assinatura of assinaturasExpiradas) {
        await prisma.assinatura.update({
          where: { id: assinatura.id },
          data: { status: 'EXPIRADA' }
        });

        // Aplicar regras específicas baseadas no plano
        let novoStatus = 'gratuito';
        let statusPagamento = 'TESTE';
        let assinaturaPaga = false;
        
        if (assinatura.plano === 'TESTE') {
          // Plano TESTE: bloquear permanentemente após expirar
          novoStatus = 'bloqueado';
          statusPagamento = 'BLOQUEADO';
          assinaturaPaga = false;
        } else if (assinatura.plano === 'PREMIUM') {
          // Plano PREMIUM: vira INATIVA após expirar
          novoStatus = 'inativa';
          statusPagamento = 'INATIVO';
          assinaturaPaga = false;
        }

        await prisma.user.update({
          where: { id: assinatura.usuarioId },
          data: {
            assinatura: novoStatus,
            planoExpiraEm: null,
            statusPagamento,
            assinaturaPaga
          }
        });

        console.log(`⏰ Assinatura expirada: ${assinatura.usuario.email} - Plano: ${assinatura.plano} - Novo status: ${novoStatus}`);
      }

      return {
        status: 200,
        expiradas: assinaturasExpiradas.length
      };
    } catch (error) {
      console.error('❌ Erro ao verificar assinaturas expiradas:', error);
      return {
        status: 500,
        message: 'Erro interno do servidor'
      };
    }
  },

  // Função para atualizar assinatura do usuário via webhook
  atualizarAssinaturaUsuario: async (identifier, planoId, status, tipo = 'email') => {
    try {
      console.log(`🔄 Atualizando assinatura (${tipo}):`, { identifier, planoId, status });

      let usuario;
      
      if (tipo === 'metadata') {
        // Buscar usuário pelo ID (UUID)
        usuario = await prisma.user.findUnique({
          where: { id: identifier }
        });
        console.log(`🔍 Buscando usuário por ID: ${identifier}`);
      } else {
        // Buscar usuário pelo email
        usuario = await prisma.user.findUnique({
          where: { email: identifier }
        });
        console.log(`🔍 Buscando usuário por email: ${identifier}`);
      }

      if (!usuario) {
        console.error(`❌ Usuário não encontrado (${tipo}): ${identifier}`);
        return { success: false, message: 'Usuário não encontrado' };
      }
      
      console.log(`✅ Usuário encontrado: ${usuario.id} - ${usuario.email}`);

      // Calcular data de expiração (30 dias a partir de agora)
      const dataInicio = new Date();
      const dataFim = new Date();
      dataFim.setDate(dataInicio.getDate() + 30);

      // Cancelar assinaturas ativas existentes
      await prisma.assinatura.updateMany({
        where: {
          usuarioId: usuario.id,
          status: 'ATIVA'
        },
        data: {
          status: 'CANCELADA'
        }
      });

      // Criar nova assinatura
       const dadosAssinatura = {
         usuarioId: usuario.id,
         plano: planoId.toUpperCase(),
         status: status.toUpperCase(),
         dataInicio,
         dataFim
       };
       
       console.log(`📋 Criando assinatura para plano: ${planoId.toUpperCase()}`);
       
       const novaAssinatura = await prisma.assinatura.create({
         data: dadosAssinatura
       });
       
       console.log(`📝 Nova assinatura criada:`, novaAssinatura);

       // Atualizar status de pagamento do usuário
       await prisma.user.update({
         where: { id: usuario.id },
         data: {
           assinatura: planoId.toLowerCase(),
           statusPagamento: 'PAGO',
           assinaturaPaga: true
         }
       });
       
       console.log(`👤 Status do usuário atualizado para PAGO`);

       // Notificar colaboradores sobre pagamento aprovado
       try {
         // Determinar valor baseado no plano
         let valorPlano = 89.99; // Valor padrão para BASICO
         if (planoId.toUpperCase() === 'PREMIUM') {
           valorPlano = 149.99;
         } else if (planoId.toUpperCase() === 'BASICO') {
           valorPlano = 89.99;
         }
         
         const webhookEnviado = await integracaoController.notificarPagamento(
           usuario.id,
           valorPlano,
           'APROVADO'
         );
         if (webhookEnviado) {
           console.log(`📡 Webhook enviado para colaboradores sobre pagamento de ${usuario.email}`);
         }
       } catch (webhookError) {
         console.error('⚠️ Erro ao enviar webhook para colaboradores:', webhookError.message);
         // Não falhar a operação principal por causa do webhook
       }

       console.log(`✅ Assinatura atualizada com sucesso para ${usuario.email}:`, novaAssinatura.id);
       return { success: true, assinatura: novaAssinatura };

    } catch (error) {
      console.error('❌ Erro ao atualizar assinatura do usuário:', error);
      return { success: false, message: 'Erro interno do servidor', error: error.message };
    }
  }
};

// Exportar a função individualmente para uso no webhook
export const atualizarAssinaturaUsuario = assinaturaService.atualizarAssinaturaUsuario;

export default assinaturaService;