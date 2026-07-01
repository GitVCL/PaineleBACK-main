// src/scripts/verificar-assinaturas.js
import { PrismaClient } from '@prisma/client';
import cron from 'node-cron';
import Stripe from 'stripe';
import dotenv from 'dotenv';

dotenv.config();

const prisma = new PrismaClient();
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

/**
 * Verifica se o usuário pagou a assinatura consultando o Stripe
 */
const verificarPagamentoNoStripe = async (stripeSubscriptionId) => {
  try {
    if (!stripeSubscriptionId) {
      return { pago: false, status: 'sem_stripe_id' };
    }

    const subscription = await stripe.subscriptions.retrieve(stripeSubscriptionId);
    
    const statusPago = ['active', 'trialing'].includes(subscription.status);
    
    return {
      pago: statusPago,
      status: subscription.status,
      current_period_end: new Date(subscription.current_period_end * 1000),
      cancel_at_period_end: subscription.cancel_at_period_end
    };
  } catch (error) {
    console.error(`❌ Erro ao verificar assinatura ${stripeSubscriptionId} no Stripe:`, error.message);
    return { pago: false, status: 'erro_stripe', erro: error.message };
  }
};

/**
 * Função principal para verificar usuários em teste que fizeram upgrade para premium
 */
export const verificarAssinaturasExpiradas = async () => {
  try {
    console.log('🔍 Iniciando verificação de upgrades de teste para premium...');
    
    // Verificar conexão com o banco
    await prisma.$connect();
    console.log('✅ Conectado ao banco de dados');
    
    // Buscar usuários com assinatura "teste" que podem ter feito upgrade
    const usuariosTeste = await prisma.user.findMany({
      where: {
        assinatura: 'teste',
        status: 'ATIVO'
      },
      include: {
        assinaturas: {
          where: {
            status: 'ATIVA'
          }
        }
      }
    });
    
    console.log(`🔍 Verificando ${usuariosTeste.length} usuários em modo teste...`);
    
    let upgradesDetectados = 0;
    let assinaturasExpiradas = 0;
    
    for (const usuario of usuariosTeste) {
      console.log(`👤 Verificando usuário: ${usuario.nome} (${usuario.email})`);
      
      // Verificar se tem assinaturas ativas no Stripe
      let temAssinaturaPremiumAtiva = false;
      let novaDataExpiracao = null;
      
      for (const assinatura of usuario.assinaturas) {
        if (assinatura.stripeSubscriptionId) {
          console.log(`🔍 Verificando assinatura Stripe: ${assinatura.stripeSubscriptionId}`);
          
          const statusStripe = await verificarPagamentoNoStripe(assinatura.stripeSubscriptionId);
          
          if (statusStripe.pago && statusStripe.status === 'active') {
            temAssinaturaPremiumAtiva = true;
            novaDataExpiracao = statusStripe.current_period_end;
            
            console.log(`✅ Assinatura premium ativa encontrada no Stripe!`);
            console.log(`📅 Período final: ${statusStripe.current_period_end}`);
            
            // Atualizar dados da assinatura no banco
            await prisma.assinatura.update({
              where: { id: assinatura.id },
              data: {
                dataExpiracao: novaDataExpiracao,
                status: 'ATIVA'
              }
            });
            
            break; // Encontrou uma assinatura ativa, não precisa verificar outras
          } else {
            console.log(`❌ Assinatura inativa no Stripe: ${statusStripe.status}`);
            
            // Marcar assinatura como expirada se não está ativa no Stripe
            await prisma.assinatura.update({
              where: { id: assinatura.id },
              data: { status: 'EXPIRADA' }
            });
            assinaturasExpiradas++;
          }
        }
      }
      
      if (temAssinaturaPremiumAtiva) {
        // Fazer upgrade do usuário de "teste" para "premium"
        await prisma.user.update({
          where: { id: usuario.id },
          data: {
            assinatura: 'premium',
            planoExpiraEm: novaDataExpiracao,
            status: 'ATIVO'
          }
        });
        
        console.log(`🎉 UPGRADE DETECTADO! Usuário ${usuario.nome} foi promovido de TESTE para PREMIUM`);
        console.log(`📅 Nova data de expiração: ${novaDataExpiracao}`);
        upgradesDetectados++;
      } else {
        // Verificar se o período de teste expirou
        const agora = new Date();
        if (usuario.planoExpiraEm && new Date(usuario.planoExpiraEm) <= agora) {
          await prisma.user.update({
            where: { id: usuario.id },
            data: {
              status: 'PENDENTE',
              assinatura: 'gratuito'
            }
          });
          
          console.log(`⏰ Período de teste expirado para ${usuario.nome}. Status alterado para PENDENTE.`);
        }
      }
    }
    
    // Também verificar assinaturas premium existentes que podem ter expirado
    await verificarAssinaturasPremiumExpiradas(prisma);
    
    if (upgradesDetectados === 0 && assinaturasExpiradas === 0) {
      console.log('✅ Nenhum upgrade ou expiração detectada.');
    } else {
      console.log(`✅ Verificação concluída: ${upgradesDetectados} upgrades detectados, ${assinaturasExpiradas} assinaturas expiradas.`);
    }
    
  } catch (error) {
    console.error('❌ Erro na verificação de upgrades:', error.message);
    
    if (error.code === 'P1001') {
      console.error('🔌 Erro de conexão: Verifique se o banco de dados está rodando e se a DATABASE_URL está correta no .env');
    } else if (error.code === 'P2002') {
      console.error('🔑 Erro de constraint: Violação de chave única');
    } else {
      console.error('📋 Detalhes do erro:', error);
    }
  } finally {
    await prisma.$disconnect();
    console.log('🔌 Desconectado do banco de dados');
  }
};

/**
 * Função auxiliar para verificar assinaturas premium que podem ter expirado
 */
const verificarAssinaturasPremiumExpiradas = async (prisma) => {
  console.log('🔍 Verificando assinaturas premium expiradas...');
  
  const assinaturasPremium = await prisma.assinatura.findMany({
    where: {
      status: 'ATIVA'
    },
    include: {
      usuario: {
        select: {
          id: true,
          nome: true,
          email: true,
          assinatura: true
        }
      }
    }
  });
  
  const agora = new Date();
  
  for (const assinatura of assinaturasPremium) {
    // Verificar se expirou por data
    const expiradaPorData = assinatura.dataExpiracao < agora;
    
    // Verificar no Stripe se tem stripeSubscriptionId
    let statusStripe = null;
    if (assinatura.stripeSubscriptionId) {
      statusStripe = await verificarPagamentoNoStripe(assinatura.stripeSubscriptionId);
    }
    
    const deveExpirar = expiradaPorData || (statusStripe && !statusStripe.pago);
    
    if (deveExpirar) {
      // Expirar assinatura
      await prisma.assinatura.update({
        where: { id: assinatura.id },
        data: { status: 'EXPIRADA' }
      });
      
      // Verificar se o usuário ainda tem outras assinaturas ativas
      const outrasAssinaturasAtivas = await prisma.assinatura.count({
        where: {
          usuarioId: assinatura.usuarioId,
          status: 'ATIVA',
          id: { not: assinatura.id }
        }
      });
      
      // Se não tem mais assinaturas ativas, voltar para pendente
      if (outrasAssinaturasAtivas === 0) {
        await prisma.user.update({
          where: { id: assinatura.usuarioId },
          data: {
            status: 'PENDENTE',
            assinatura: 'gratuito'
          }
        });
        
        console.log(`📉 Usuário ${assinatura.usuario.nome} voltou para PENDENTE (assinatura premium expirada)`);
      }
    }
  }
};

/**
 * Configura o cron job para executar a verificação automaticamente
 * Executa a cada hora (0 minutos de cada hora)
 */
export const iniciarVerificacaoAutomatica = () => {
  console.log('🤖 Iniciando verificação automática de assinaturas...');
  
  // Executa a cada hora
  cron.schedule('0 * * * *', async () => {
    console.log('⏰ Executando verificação automática de assinaturas...');
    await verificarAssinaturasExpiradas();
  });
  
  // Executa uma vez ao iniciar o servidor
  setTimeout(async () => {
    console.log('🚀 Executando verificação inicial de assinaturas...');
    await verificarAssinaturasExpiradas();
  }, 5000); // Aguarda 5 segundos após o servidor iniciar
  
  console.log('✅ Verificação automática configurada (executa a cada hora)');
};

/**
 * Verifica se um usuário específico pagou a assinatura
 * @param {string} usuarioId - ID do usuário
 * @param {string} email - Email do usuário (opcional, para logs)
 */
export const verificarPagamentoUsuario = async (usuarioId, email = null) => {
  try {
    console.log(`🔍 Verificando pagamento do usuário ${email || usuarioId}...`);
    
    // Conectar ao banco
    await prisma.$connect();
    
    // Buscar assinaturas ativas do usuário
    const assinaturas = await prisma.assinatura.findMany({
      where: {
        usuarioId: usuarioId,
        status: 'ATIVA'
      },
      include: {
        usuario: {
          select: {
            nome: true,
            email: true,
            statusPagamento: true
          }
        }
      }
    });

    if (assinaturas.length === 0) {
      console.log(`❌ Usuário não possui assinaturas ativas`);
      return { pago: false, motivo: 'sem_assinatura_ativa' };
    }

    const agora = new Date();
    let temAssinaturaValida = false;
    const resultados = [];

    for (const assinatura of assinaturas) {
      const expiradaPorData = assinatura.dataExpiracao < agora;
      
      // Verificar no Stripe se tem stripeSubscriptionId
      let statusStripe = null;
      if (assinatura.stripeSubscriptionId) {
        statusStripe = await verificarPagamentoNoStripe(assinatura.stripeSubscriptionId);
        console.log(`💳 Assinatura ${assinatura.id}: Stripe status = ${statusStripe.status}, Pago = ${statusStripe.pago}`);
      }

      const assinaturaValida = !expiradaPorData && (!statusStripe || statusStripe.pago);
      
      if (assinaturaValida) {
        temAssinaturaValida = true;
      }

      resultados.push({
        assinaturaId: assinatura.id,
        dataExpiracao: assinatura.dataExpiracao,
        expiradaPorData,
        statusStripe: statusStripe?.status || 'sem_stripe',
        pagoNoStripe: statusStripe?.pago || false,
        valida: assinaturaValida
      });
    }

    const usuario = assinaturas[0].usuario;
    
    if (temAssinaturaValida) {
      console.log(`✅ Usuário ${usuario.nome} (${usuario.email}) tem pagamento em dia!`);
      return { 
        pago: true, 
        usuario: usuario,
        assinaturas: resultados,
        statusAtual: usuario.statusPagamento
      };
    } else {
      console.log(`❌ Usuário ${usuario.nome} (${usuario.email}) não tem pagamento em dia`);
      return { 
        pago: false, 
        motivo: 'assinatura_expirada_ou_nao_paga',
        usuario: usuario,
        assinaturas: resultados,
        statusAtual: usuario.statusPagamento
      };
    }
    
  } catch (error) {
    console.error('❌ Erro ao verificar pagamento do usuário:', error.message);
    return { pago: false, erro: error.message };
  } finally {
    await prisma.$disconnect();
  }
};

/**
 * Função para executar verificação manual
 */
export const executarVerificacaoManual = async () => {
  console.log('🔧 Executando verificação manual de assinaturas...');
  await verificarAssinaturasExpiradas();
};

// Se o script for executado diretamente
if (import.meta.url === `file://${process.argv[1]}`) {
  executarVerificacaoManual()
    .then(() => {
      console.log('✅ Verificação manual concluída');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Erro na verificação manual:', error);
      process.exit(1);
    });
}