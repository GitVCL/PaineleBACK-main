import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function verificarUsuarios() {
  try {
    const usuarios = await prisma.usuario.findMany({
      select: {
        id: true,
        nome: true,
        email: true,
        senha: true
      }
    });
    
    console.log('Usuários encontrados:');
    usuarios.forEach(user => {
      console.log(`- ID: ${user.id}`);
      console.log(`  Nome: ${user.nome}`);
      console.log(`  Email: ${user.email}`);
      console.log(`  Senha (hash): ${user.senha.substring(0, 20)}...`);
      console.log('');
    });
    
    await prisma.$disconnect();
  } catch (error) {
    console.error('Erro:', error);
    await prisma.$disconnect();
  }
}

verificarUsuarios();