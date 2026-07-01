import nodemailer from 'nodemailer';
import { Resend } from 'resend';

class EmailService {
  constructor() {
    this.provider = process.env.EMAIL_PROVIDER || 'smtp'; // 'smtp' ou 'resend'
    
    if (this.provider === 'resend') {
      console.log('📧 Configurando serviço de email com Resend');
      if (!process.env.RESEND_API_KEY) {
        console.error('❌ RESEND_API_KEY não configurada!');
      }
      this.resend = new Resend(process.env.RESEND_API_KEY);
    } else {
      // Configuração SMTP (Legado/Fallback)
      const port = Number(process.env.EMAIL_PORT) || 587;
      
      // Configuração robusta para SMTP (especialmente para Gmail/Railway)
      // Evitamos usar service: 'gmail' para ter controle total sobre timeouts e IP
      const config = {
        host: process.env.EMAIL_HOST || 'smtp.gmail.com',
        port: port,
        secure: port === 465, // true para 465, false para outras portas
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASS,
        },
        family: 4, // Forçar IPv4 (crucial para evitar timeouts em alguns containers)
        tls: {
          rejectUnauthorized: false, // Aceitar certificados auto-assinados se necessário
          // Removido ciphers: 'SSLv3' pois Gmail exige TLS 1.2+
        },
        // Logs detalhados para debug
        debug: true,
        logger: true,
        // Aumentando timeouts para conexões lentas
        connectionTimeout: 20000, // 20 segundos
        greetingTimeout: 20000,
        socketTimeout: 20000
      };

      console.log('📧 Configurando SMTP com:', {
        host: config.host,
        port: config.port,
        secure: config.secure,
        user: config.auth.user ? '***' : 'missing',
        family: config.family
      });

      this.transporter = nodemailer.createTransport(config);

      // Testar conexão apenas se for SMTP
      this.testConnection();
    }
  }

  async testConnection() {
    if (this.provider === 'resend') {
      console.log('🔌 Resend configurado. Teste de conexão implícito no envio.');
      return;
    }
    
    try {
      console.log('🔌 Testando conexão SMTP...');
      await this.transporter.verify();
      console.log('✅ Conexão SMTP estabelecida com sucesso!');
    } catch (error) {
      console.error('❌ Erro na conexão SMTP:', {
        message: error.message,
        code: error.code,
        response: error.response
      });

      if (error.code === 'ETIMEDOUT') {
        console.log('\n⚠️  ALERTA DE TIMEOUT NA RAILWAY (Porta ' + this.transporter.options.port + ')');
        
        if (this.transporter.options.port === 587) {
            console.log('🔄 Tentando diagnóstico automático com porta 465 (SSL)...');
            try {
                const config465 = { ...this.transporter.options, port: 465, secure: true };
                const transporter465 = nodemailer.createTransport(config465);
                await transporter465.verify();
                console.log('✅ SUCESSO NA PORTA 465! O Gmail aceitou a conexão via SSL.');
                console.log('👉 AÇÃO NECESSÁRIA: Altere a variável EMAIL_PORT para 465 na Railway.\n');
                return;
            } catch (err465) {
                console.log('❌ Porta 465 também falhou:', err465.code);
            }
        }

        console.log('O Gmail bloqueia IPs de nuvem (como Railway/AWS) na porta 587/465.');
        console.log('Se isso persistir, a única solução é usar uma API de email (Resend/SendGrid) ou um relay.\n');
      }
    }
  }

  async sendEmail({ to, subject, html }) {
    const from = process.env.EMAIL_FROM || 'Painelé <nao-responda@painele.shop>';

    if (this.provider === 'resend') {
      try {
        const data = await this.resend.emails.send({
          from,
          to,
          subject,
          html
        });
        console.log('✅ Email enviado via Resend:', data);
        return data;
      } catch (error) {
        console.error('❌ Erro ao enviar email via Resend:', error);
        throw error;
      }
    } else {
      try {
        const info = await this.transporter.sendMail({
          from,
          to,
          subject,
          html
        });
        console.log('✅ Email enviado via SMTP:', info.messageId);
        return info;
      } catch (error) {
        console.error('❌ Erro no envio SMTP:', error);
        throw error;
      }
    }
  }

  async enviarEmailRecuperacao(email, token) {
    try {
      console.log('📧 Iniciando envio de email de recuperação...');
      
      const baseUrl = process.env.FRONTEND_URL 
        || (process.env.NODE_ENV === 'production' 
          ? 'https://painele.shop' 
          : 'http://localhost:5173');
      
      const resetUrl = `${baseUrl}/resetsenha?token=${token}&email=${encodeURIComponent(email)}`;
      
      const html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #f8f9fa; padding: 20px;">
          <div style="background: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
            <div style="text-align: center; margin-bottom: 30px;">
              <h1 style="color: #1e1b4b; margin: 0; font-size: 28px;">🔐 Painelé</h1>
              <p style="color: #666; margin: 10px 0 0 0;">Sistema de Gestão</p>
            </div>
            
            <h2 style="color: #333; margin-bottom: 20px;">Recuperação de Senha</h2>
            <p style="color: #555; line-height: 1.6;">Olá! Você solicitou a recuperação de sua senha.</p>
            <p style="color: #555; line-height: 1.6;">Clique no botão abaixo para redefinir sua senha:</p>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${resetUrl}" style="background: linear-gradient(135deg, #1e1b4b, #4c1d95); color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; display: inline-block; font-weight: bold; font-size: 16px;">
                🔑 Redefinir Senha
              </a>
            </div>
            
            <div style="background: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 5px; margin: 20px 0;">
              <p style="margin: 0; color: #856404; font-size: 14px;">
                ⚠️ <strong>Importante:</strong> Este link expira em 10 minutos.<br>
                Se você não solicitou esta recuperação, ignore este email.
              </p>
            </div>
            
            <p style="color: #888; font-size: 12px; margin-top: 30px; text-align: center;">
              Se o botão não funcionar, copie e cole este link no seu navegador:<br>
              <a href="${resetUrl}" style="color: #4c1d95;">${resetUrl}</a>
            </p>
          </div>
          <div style="text-align: center; margin-top: 20px; color: #999; font-size: 12px;">
            &copy; ${new Date().getFullYear()} Painelé. Todos os direitos reservados.
          </div>
        </div>
      `;

      await this.sendEmail({ to: email, subject: '🔐 Recuperação de Senha - Painelé', html });
      return true;
    } catch (error) {
      console.error('❌ Erro ao enviar email:', error);
      return false;
    }
  }

  async enviarEmailBoasVindas(email, nome) {
    try {
      console.log('📧 Iniciando envio de email de boas-vindas...');
      
      const baseUrl = process.env.FRONTEND_URL 
        || (process.env.NODE_ENV === 'production' 
          ? 'https://painele.shop' 
          : 'http://localhost:5173');
      
      const html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #f8f9fa; padding: 20px;">
          <div style="background: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
            <div style="text-align: center; margin-bottom: 30px;">
              <h1 style="color: #1e1b4b; margin: 0; font-size: 28px;">✨ Painelé</h1>
              <p style="color: #666; margin: 10px 0 0 0;">Bem-vindo(a)!</p>
            </div>
            
            <h2 style="color: #333; margin-bottom: 20px;">Olá, ${nome}!</h2>
            <p style="color: #555; line-height: 1.6;">Obrigado por criar sua conta no Painelé. Sua conta já está ativa e pronta para uso.</p>
            <p style="color: #555; line-height: 1.6;">Aproveite todos os recursos do nosso plano B2B Gratuito.</p>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${baseUrl}" style="background: linear-gradient(135deg, #1e1b4b, #4c1d95); color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; display: inline-block; font-weight: bold; font-size: 16px;">
                🚀 Acessar Painel
              </a>
            </div>
            
            <div style="text-align: center; margin-top: 20px; color: #999; font-size: 12px;">
              &copy; ${new Date().getFullYear()} Painelé. Todos os direitos reservados.
            </div>
          </div>
        </div>
      `;

      await this.sendEmail({ to: email, subject: '✨ Bem-vindo ao Painelé', html });
      return true;
    } catch (error) {
      console.error('❌ Erro ao enviar email de boas-vindas:', error);
      return false;
    }
  }


}

export default new EmailService();
