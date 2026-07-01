import prisma from '../services/prisma.service.js';

async function seedColaboradorData() {
  try {
    console.log('Iniciando seed de dados para colaboradores...');

    // Buscar um colaborador existente
    const colaborador = await prisma.colaborador.findFirst();
    
    if (!colaborador) {
      console.log('Nenhum colaborador encontrado. Criando um colaborador de exemplo...');
      
      const novoColaborador = await prisma.colaborador.create({
        data: {
          nome: 'João Silva',
          email: 'joao@exemplo.com',
          senha: '$2b$10$example.hash.here', // Hash de exemplo
          telefone: '(11) 99999-9999',
          ativo: true
        }
      });
      
      console.log('Colaborador criado:', novoColaborador.nome);
      
      // Usar o novo colaborador
      await createSampleData(novoColaborador.id);
    } else {
      console.log('Usando colaborador existente:', colaborador.nome);
      await createSampleData(colaborador.id);
    }

    console.log('Seed concluído com sucesso!');
  } catch (error) {
    console.error('Erro durante o seed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

async function createSampleData(colaboradorId) {
  // Criar usuários (clientes) de exemplo
  const cliente1 = await prisma.user.create({
    data: {
      nome: 'Maria Santos',
      email: 'maria@cliente.com',
      senha: '$2b$10$example.hash.here',
      telefone: '(11) 88888-8888',
      assinatura: 'premium',
      planoExpiraEm: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 dias
      colaboradorId
    }
  });
  
  const cliente2 = await prisma.user.create({
    data: {
      nome: 'Pedro Oliveira',
      email: 'pedro@cliente.com',
      senha: '$2b$10$example.hash.here',
      telefone: '(11) 77777-7777',
      assinatura: 'basico',
      planoExpiraEm: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000), // 15 dias
      colaboradorId
    }
  });
  
  const cliente3 = await prisma.user.create({
    data: {
      nome: 'Ana Costa',
      email: 'ana@cliente.com',
      senha: '$2b$10$example.hash.here',
      telefone: '(11) 66666-6666',
      assinatura: 'premium',
      planoExpiraEm: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000), // 5 dias atrás (expirado)
      colaboradorId
    }
  });
  
  console.log('3 clientes criados');

  // Criar métricas de exemplo
  const metricas = await prisma.metricaColaborador.createMany({
    data: [
      {
        colaboradorId,
        tipo: 'VENDAS',
        periodo: 'MENSAL',
        valor: 749.97, // Total dos 3 clientes
        descricao: 'Vendas do mês atual'
      },
      {
        colaboradorId,
        tipo: 'COMISSAO',
        periodo: 'MENSAL',
        valor: 374.99, // 50% das vendas
        descricao: 'Comissão do mês atual'
      },
      {
        colaboradorId,
        tipo: 'VENDAS',
        periodo: 'SEMANAL',
        valor: 449.98, // 2 clientes ativos
        descricao: 'Vendas da semana atual'
      }
    ]
  });
  
  console.log(`${metricas.count} métricas criadas`);

  // Criar notificações de exemplo
  const notificacoes = await prisma.notificacaoColaborador.createMany({
    data: [
      {
        colaboradorId,
        titulo: 'Bem-vindo ao sistema!',
        mensagem: 'Você foi cadastrado como colaborador. Comece a gerenciar seus clientes.',
        tipo: 'INFO',
        lida: false
      },
      {
        colaboradorId,
        titulo: 'Nova venda realizada',
        mensagem: 'Parabéns! Você realizou uma nova venda para Maria Santos.',
        tipo: 'SUCESSO',
        lida: false
      },
      {
        colaboradorId,
        titulo: 'Cliente com vencimento próximo',
        mensagem: 'O plano de Pedro Oliveira vence em 15 dias. Entre em contato para renovação.',
        tipo: 'ALERTA',
        lida: true
      },
      {
        colaboradorId,
        titulo: 'Meta mensal atingida',
        mensagem: 'Parabéns! Você atingiu sua meta de vendas do mês.',
        tipo: 'SUCESSO',
        lida: false
      }
    ]
  });
  
  console.log(`${notificacoes.count} notificações criadas`);
}

// Executar o seed
seedColaboradorData();