// src/controllers/webhook.controller.js
import Stripe from "stripe";
import { atualizarAssinaturaUsuario } from "../services/assinatura.service.js";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export const handleWebhook = async (req, res) => {
  const sig = req.headers["stripe-signature"];

  let event;

  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET // ⚠️ copie esse valor do Dashboard do Stripe
    );
  } catch (err) {
    console.error("❌ Erro no webhook:", err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // 🔎 Aqui você trata os eventos do Stripe
  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object;
      console.log("💰 Pagamento confirmado:", session.id);
      console.log("📋 Metadados:", session.metadata);
      console.log("📧 Email do cliente:", session.customer_details?.email);
      console.log("🔗 Subscription ID:", session.subscription);

      // Verificar se é pagamento único (sem subscription) com metadados
      const usuarioId = session.metadata?.usuarioId;
      const planoId = session.metadata?.planoId;
      const customerEmail = session.customer_details?.email;
      const subscriptionId = session.subscription;

      if (usuarioId && planoId) {
        // Pagamento único com metadados - usar usuarioId diretamente
        console.log(`🎯 Atualizando assinatura para plano: ${planoId}`);
        try {
          await atualizarAssinaturaUsuario(usuarioId, planoId, "ativa", "metadata");
          console.log("✅ Assinatura atualizada via metadados");
        } catch (error) {
          console.error("❌ Erro ao processar via metadados:", error);
        }
      } else if (customerEmail && subscriptionId) {
        // Assinatura recorrente - usar email
        console.log("🔄 Processando assinatura recorrente com email:", customerEmail);
        try {
          await atualizarAssinaturaUsuario(customerEmail, subscriptionId, "ativa", "email");
          console.log("✅ Assinatura atualizada via email");
        } catch (error) {
          console.error("❌ Erro ao processar via email:", error);
        }
      } else {
        console.error("❌ Dados insuficientes para processar pagamento:", {
          usuarioId,
          planoId,
          customerEmail,
          subscriptionId
        });
      }
      break;
    }

    case "invoice.payment_failed": {
      const invoice = event.data.object;
      console.log("⚠️ Pagamento falhou:", invoice.id);
      // 👉 Atualizar assinatura como "inativa" ou "pendente"
      break;
    }

    case "customer.subscription.deleted": {
      const subscription = event.data.object;
      console.log("❌ Assinatura cancelada:", subscription.id);
      // 👉 Atualizar assinatura no banco
      break;
    }

    default:
      console.log(`ℹ️ Evento não tratado: ${event.type}`);
  }

  res.json({ received: true });
};