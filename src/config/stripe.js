import Stripe from 'stripe';

// Inicializar Stripe com a chave secreta
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// Configurações do Stripe
const config = {
    currency: 'brl',
    successUrl: `https://painele.shop/sucesso?session_id={CHECKOUT_SESSION_ID}`,
    cancelUrl: `https://painele.shop/falha`,
    
    // Preços dos planos (em centavos)
    precos: {
      TESTE: 0, // Gratuito
      BASICO: 8999, // R$ 89,99
      PREMIUM: 14999, // R$ 149,99
      EMPRESARIAL: 4990 // R$ 49,90
    },
    
    // Descrições dos planos
    descricoes: {
      TESTE: 'Plano de Teste - 30 dias grátis',
      BASICO: 'Painele plano BASICO',
      PREMIUM: 'Painele plano PREMIUM',
      EMPRESARIAL: 'Plano Empresarial - Para grandes negócios'
    }
  };

export { stripe, config };