import cors from "cors";

const allowedOrigins = [
  "http://localhost:5173",
  "http://localhost:5174",
  "http://localhost:5175",
  "http://localhost:3000",
  "https://1293801u8dj1k2oksd091213-production.up.railway.app", // <- URL do Railway
  "https://painele.shop",
  "https://www.painele.shop",
  "https://nuvuria.com",
  "https://www.nuvuria.com",
  "https://painele.com.br",
  "https://www.painele.com.br",
  "https://nuvuria.shop",
  "https://www.nuvuria.shop"
];

export const corsOptions = {
  origin: function (origin, callback) {
    // Permite chamadas do mesmo domínio (ex: server para server sem "origin")
    if (!origin) return callback(null, true);

    if (allowedOrigins.includes(origin)) {
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