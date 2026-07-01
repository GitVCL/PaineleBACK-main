import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function criarUsuarioTeste() {
  try {
    // Verificar se já existe
    const usuarioExistente = await prisma.user.findUnique({
      where: { email: 'teste@teste.com' }
    });

    if (usuarioExistente) {
      console.log('Usuário de teste já existe:', usuarioExistente.email);
      return usuarioExistente;
    }

    // Criar hash da senha
    const senhaHash = await bcrypt.hash('123456', 10);

    // Criar usuário
    const usuario = await prisma.user.create({
      data: {
        nome: 'Usuário Teste',
        email: 'teste@teste.com',
        senha: senhaHash,
        tipo: 'PRINCIPAL',
        assinatura: 'gratuito',
        planoExpiraEm: null
      }
    });

    console.log('Usuário de teste criado com sucesso:');
    console.log(`- ID: ${usuario.id}`);
    console.log(`- Nome: ${usuario.nome}`);
    console.log(`- Email: ${usuario.email}`);
    console.log(`- Tipo: ${usuario.tipo}`);
    
    await prisma.$disconnect();
    return usuario;
  } catch (error) {
    console.error('Erro ao criar usuário de teste:', error);
    await prisma.$disconnect();
  }
}

criarUsuarioTeste();