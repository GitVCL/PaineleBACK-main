// src/services/prisma.service.js
import { PrismaClient } from '@prisma/client';

// Implementação do padrão Singleton para o PrismaClient
// Isso garante que apenas uma instância do cliente seja criada
// e reutilizada em toda a aplicação, evitando múltiplas conexões

// Declaração global para desenvolvimento
const globalForPrisma = global;

// Verificar se já existe uma instância do PrismaClient no objeto global
const prisma = globalForPrisma.prisma || new PrismaClient({
  log: ['query', 'error', 'warn'], // Opcional: para logging em desenvolvimento
});

// Em ambiente de desenvolvimento (não-produção), salvamos a instância no objeto global
// para evitar a criação de múltiplas instâncias durante hot-reloads
if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

export default prisma;