import cors from "cors";

const staticAllowedOrigins = [
  "http://localhost:5173",
  "http://localhost:5174",
  "http://localhost:5175",
  "http://localhost:3000",
  "https://painele.shop",
  "https://www.painele.shop",
  "https://nuvuria.com",
  "https://www.nuvuria.com",
  "https://painele.com.br",
  "https://www.painele.com.br",
  "https://nuvuria.shop",
  "https://www.nuvuria.shop"
];

function sanitizeOrigin(origin) {
  return String(origin)
    .trim()
    .replace(/^['"`\s]+|['"`\s]+$/g, '')
    .replace(/\/+$/, '');
}

function getEnvOrigins() {
  const rawOrigins = process.env.FRONTEND_URL || '';

  if (!rawOrigins) {
    return [];
  }

  return rawOrigins
    .split(',')
    .map((origin) => sanitizeOrigin(origin))
    .filter(Boolean);
}

const allowedOrigins = new Set([
  ...staticAllowedOrigins.map((origin) => sanitizeOrigin(origin)),
  ...getEnvOrigins()
]);

export const corsOptions = {
  origin: function (origin, callback) {
    // Permite chamadas do mesmo domínio (ex: server para server sem "origin")
    if (!origin) return callback(null, true);

    const sanitizedOrigin = sanitizeOrigin(origin);

    if (allowedOrigins.has(sanitizedOrigin)) {
      return callback(null, true);
    } else {
      return callback(new Error("❌ Origem não permitida pelo CORS"));
    }
  },
  credentials: true, // Permite cookies (HTTP-only)
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: [
    'Content-Type', 
    'Authorization', 
    'Cookie',
    'X-Requested-With',
    'Accept',
    'Origin',
    'X-Request-Token'
  ],
  exposedHeaders: ['Set-Cookie'],
  optionsSuccessStatus: 200
};
