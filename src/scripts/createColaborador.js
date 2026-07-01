import colaboradorService from '../services/colaborador.service.js';

async function createColaborador() {
  try {
    const colaboradorData = {
      nome: 'Colaborador Teste',
      email: 'colaborador@teste.com',
      senha: '123456',
      telefone: '11999999999'
    };

    const response = await colaboradorService.registrar(colaboradorData);
    console.log('Resposta:', response);

    if (response.status === 201) {
      console.log('Colaborador criado com sucesso!');
      console.log('ID:', response.colaborador.id);
      console.log('Nome:', response.colaborador.nome);
      console.log('Email:', response.colaborador.email);
    } else {
      console.error('Erro ao criar colaborador:', response.message);
    }
  } catch (error) {
    console.error('Erro ao executar script:', error);
  } finally {
    process.exit(0);
  }
}

createColaborador();