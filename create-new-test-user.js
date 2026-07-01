import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function createTestUser() {
  try {
    // Hash da senha
    const hashedPassword = await bcrypt.hash('123456', 10);
    
    // Criar usuário de teste
    const user = await prisma.user.create({
      data: {
        nome: 'Usuario Teste API',
        email: 'testeapi@teste.com',
        senha: hashedPassword,
        tipo: 'PRINCIPAL',
        assinatura: 'gratuito',
        assinaturaPaga: false,
        statusPagamento: 'TESTE',
        diasTestRestantes: 7,
        empresa: 'Empresa Teste API'
      }
    });
    
    console.log('Usuário criado com sucesso:', user);
  } catch (error) {
    if (error.code === 'P2002') {
      console.log('Usuário já existe com este email');
    } else {
      console.error('Erro ao criar usuário:', error);
    }
  } finally {
    await prisma.$disconnect();
  }
}

createTestUser();