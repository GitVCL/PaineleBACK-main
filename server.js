import 'dotenv/config';
import express from 'express';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import helmet from 'helmet';
import { corsOptions } from './src/config/cors.js';

// Configurar timezone para Recife/PE (UTC-3)
process.env.TZ = 'America/Recife';
console.log('🌍 Timezone configurado para:', process.env.TZ);
console.log('⏰ Horário atual do sistema:', new Date().toLocaleString('pt-BR', { timeZone: 'America/Recife' }));

// Importar rotas
import authRoutes from './src/routes/auth.routes.js';
import produtoRoutes from './src/routes/produto.routes.js';
import vendaRoutes from './src/routes/venda.routes.js';
import dashboardRoutes from './src/routes/dashboard.routes.js';
import relatorioRoutes from './src/routes/relatorio.routes.js';
import userRoutes from './src/routes/user.routes.js';
import despesaRoutes from './src/routes/despesa.routes.js';
import funcionariosRoutes from './src/routes/funcionarios.routes.js';

import usuariosRoutes from './src/routes/usuarios.routes.js';
import codigoBarrasRoutes from './src/routes/codigoBarras.routes.js';
import notificacoesFuncionarioRoutes from './src/routes/notificacoesFuncionario.routes.js';
import consoleRoutes from './src/routes/console.routes.js';
const app = express();
const PORT = process.env.PORT || 3001;

// Middlewares globais - CORS primeiro
// Configuração CORS importada do arquivo de configuração
console.log('🔧 CORS configurado com origens específicas para desenvolvimento e produção');
app.use(cors(corsOptions));

// Middleware extra para lidar com requisições OPTIONS (preflight)
app.options('*', cors(corsOptions));

app.use(express.json());
app.use(cookieParser());
app.use(helmet());

// Middleware para configurar headers de cache
app.use((req, res, next) => {
  // Cache busting para index.html - sempre revalidar
  if (req.url === '/' || req.url.endsWith('.html')) {
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
  }
  // Cache longo para arquivos estáticos com hash (JS, CSS, imagens)
  else if (req.url.match(/\.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$/)) {
    // Se o arquivo tem hash no nome, pode ser cacheado por muito tempo
    if (req.url.match(/\.[a-f0-9]{8,}\./)) {
      res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    } else {
      // Arquivos sem hash - cache moderado
      res.setHeader('Cache-Control', 'public, max-age=3600');
    }
  }
  next();
});

// Middleware de debug para cookies (apenas em produção)
if (process.env.NODE_ENV === 'production') {
  app.use((req, res, next) => {
    console.log('🍪 Cookie Debug:', {
      cookies: req.cookies,
      headers: {
        origin: req.headers.origin,
        'user-agent': req.headers['user-agent']?.substring(0, 50),
        cookie: req.headers.cookie ? 'Present' : 'Missing'
      },
      url: req.url,
      method: req.method
    });
    next();
  });
}

// Configurar rotas
app.use('/api/auth', authRoutes);
app.use('/api/produtos', produtoRoutes);
app.use('/api/vendas', vendaRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/relatorios', relatorioRoutes);
app.use('/api/user', userRoutes);
app.use('/api/despesas', despesaRoutes);
app.use('/api/funcionarios', funcionariosRoutes);
app.use('/api/usuarios', usuariosRoutes);
app.use('/api/codigos-barras', codigoBarrasRoutes);
app.use('/api/notificacoes-funcionario', notificacoesFuncionarioRoutes);
app.use('/api/console', consoleRoutes);



// Rota pública de verificação
app.get('/', (req, res) => {
  res.json({
    message: 'API Painelé rodando com sucesso ✅',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    port: PORT
  });
});

// Rota de health check (OBRIGATÓRIA PARA RAILWAY)
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    service: 'Painelé API',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development'
  });
});



// Middleware de tratamento de erros
app.use((err, req, res, next) => {
  console.error('Erro não tratado:', err);
  res.status(500).json({
    message: 'Erro interno do servidor',
    error: process.env.NODE_ENV === 'development' ? err.message : 'Algo deu errado'
  });
});

// Middleware para rotas não encontradas
app.use('*', (req, res) => {
  res.status(404).json({
    message: 'Rota não encontrada',
    path: req.originalUrl
  });
});

// Debug: Listar todas as rotas registradas
const listRoutes = (app) => {
  const routes = [];
  app._router.stack.forEach((middleware) => {
    if (middleware.route) {
      routes.push({
        path: middleware.route.path,
        methods: Object.keys(middleware.route.methods)
      });
    } else if (middleware.name === 'router') {
      middleware.handle.stack.forEach((handler) => {
        if (handler.route) {
          routes.push({
            path: middleware.regexp.source.replace('\\/?', '').replace('(?=\\/|$)', '') + handler.route.path,
            methods: Object.keys(handler.route.methods)
          });
        }
      });
    }
  });
  return routes;
};

// Inicialização para desenvolvimento e produção
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Servidor Painelé rodando na porta ${PORT}`);
  console.log(`🌍 Ambiente: ${process.env.NODE_ENV || 'development'}`);
  console.log(`📊 Dashboard: /api/dashboard`);
  console.log(`❤️ Health: /health`);
  console.log(`🎯 API pronta para produção!`);
  

});
