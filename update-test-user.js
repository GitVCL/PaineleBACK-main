import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function atualizarUsuarioTeste() {
  try {
    // Criar hash da nova senha
    const senhaHash = await bcrypt.hash('123456', 10);

    // Atualizar usuário
    const usuario = await prisma.user.update({
      where: { email: 'teste@teste.com' },
      data: {
        senha: senhaHash,
        emailVerificado: true
      }
    });

    console.log('Senha do usuário de teste atualizada com sucesso:');
    console.log(`- Email: ${usuario.email}`);
    console.log(`- Nome: ${usuario.nome}`);
    
    await prisma.$disconnect();
  } catch (error) {
    console.error('Erro ao atualizar usuário de teste:', error);
    await prisma.$disconnect();
  }
}

atualizarUsuarioTeste();