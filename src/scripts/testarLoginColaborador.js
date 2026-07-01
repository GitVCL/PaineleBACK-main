import colaboradorService from '../services/colaborador.service.js';

async function testarLoginColaborador() {
  try {
    const loginData = {
      email: 'teste@colaborador.com',
      senha: '123456'
    };

    console.log('🔄 Tentando login com:', {
      email: loginData.email,
      senha: '******' // Ocultar senha no log
    });

    const response = await colaboradorService.login(loginData);
    console.log('📝 Resposta do serviço:', response);

    if (response.response.status === 200) {
      console.log('✅ Login efetuado com sucesso!');
      console.log('🆔 ID:', response.response.colaborador?.id);
      console.log('👤 Nome:', response.response.colaborador?.nome);
      console.log('📧 Email:', response.response.colaborador?.email);
      console.log('🏷️ Tipo:', response.response.colaborador?.tipo);
      console.log('🔑 Token gerado:', response.token ? 'Sim' : 'Não');
    } else {
      console.error('❌ Erro ao fazer login:', response.response.message);
    }
  } catch (error) {
    console.error('❌ Erro ao executar script:', error);
  } finally {
    process.exit(0);
  }
}

testarLoginColaborador();