# Sistema de Verificação Automática de Assinaturas

## 📋 Descrição

Sistema automatizado para verificar e atualizar assinaturas expiradas no banco de dados. O sistema executa automaticamente a cada hora e pode ser executado manualmente quando necessário.

## 🚀 Funcionalidades

### ✅ Verificação Automática
- **Execução**: A cada hora (cron job)
- **Início**: Automaticamente quando o servidor inicia
- **Delay inicial**: 5 segundos após o servidor iniciar

### 🔍 O que o sistema faz:
1. **Busca assinaturas expiradas**: Localiza assinaturas com status 'ATIVA' e data de expiração anterior à data atual
2. **Atualiza status das assinaturas**: Marca assinaturas expiradas como 'EXPIRADA'
3. **Verifica usuários**: Identifica usuários que não possuem mais assinaturas ativas
4. **Atualiza status dos usuários**: Altera o statusPagamento para 'PENDENTE' para usuários sem assinaturas ativas
5. **Logs detalhados**: Registra todas as operações e resultados

### 📡 APIs de Verificação

#### 1. Verificação Individual por ID
- **Endpoint**: `/api/verificar-pagamento/:usuarioId`
- **Método**: GET
- **Uso**: Verificar se um usuário específico pagou a assinatura
- **Autenticação**: Requer token JWT

#### 2. Verificação por Email
- **Endpoint**: `/api/verificar-pagamento/email`
- **Método**: POST
- **Payload**: `{ "email": "usuario@email.com" }`
- **Uso**: Verificar pagamento usando email do usuário

#### 3. Verificação Geral (Admin)
- **Endpoint**: `/api/verificar-pagamento/executar/verificacao-geral`
- **Método**: GET
- **Uso**: Executar verificação de todas as assinaturas (apenas admin)
- **Autenticação**: Requer token JWT de administrador

## 📁 Arquivos do Sistema

```
src/scripts/
├── verificar-assinaturas.js     # Script principal com todas as funções
└── executar-verificacao.js      # Script para execução manual
```

## 🛠️ Como Usar

### Execução Manual
```bash
# Executar verificação manual
npm run verificar-assinaturas
```

### Verificação Automática
O sistema inicia automaticamente quando o servidor é executado:
```bash
npm run dev
# ou
npm start
```

### Uso da API

#### Verificar usuário por ID
```javascript
// GET /api/verificar-pagamento/123
// Headers: Authorization: Bearer <token>

// Resposta:
{
  "success": true,
  "pago": true,
  "usuario": {
    "id": "123",
    "nome": "João Silva",
    "email": "joao@email.com",
    "status": "ATIVO"
  },
  "assinaturas": [
    {
      "id": "sub_456",
      "stripeSubscriptionId": "sub_1234567890",
      "status": "ATIVA",
      "dataExpiracao": "2024-02-15T10:30:00.000Z"
    }
  ],
  "statusAtual": "ATIVO",
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

#### Verificar usuário por email
```javascript
// POST /api/verificar-pagamento/email
// Headers: Authorization: Bearer <token>
// Body:
{
  "email": "joao@email.com"
}

// Resposta igual ao exemplo acima
```

#### Executar verificação geral (Admin)
```javascript
// GET /api/verificar-pagamento/executar/verificacao-geral
// Headers: Authorization: Bearer <admin_token>

// Resposta:
{
  "success": true,
  "message": "Verificação geral executada com sucesso",
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

## 📊 Logs do Sistema

O sistema fornece logs detalhados:

```
🔍 Iniciando verificação de assinaturas expiradas...
✅ Conectado ao banco de dados
⚠️ Encontradas 3 assinaturas expiradas:
📝 Usuário João Silva (joao@email.com) será atualizado para PENDENTE
✅ 1 usuários atualizados para status PENDENTE
✅ 3 assinaturas marcadas como EXPIRADA
🎯 Verificação de assinaturas concluída com sucesso!
🔌 Desconectado do banco de dados
```

## ⚙️ Configuração

### Pré-requisitos
1. **Banco de dados configurado**: DATABASE_URL no arquivo .env
2. **Prisma Client gerado**: `npx prisma generate`
3. **Dependência instalada**: `npm install node-cron`

### Variáveis de Ambiente
```env
DATABASE_URL="sua_url_do_banco_de_dados"
```

## 🔧 Personalização

### Alterar Frequência de Execução
No arquivo `src/scripts/verificar-assinaturas.js`, linha 108:
```javascript
// Executa a cada hora (padrão)
cron.schedule('0 * * * *', async () => {

// Exemplos de outras frequências:
// A cada 30 minutos: '*/30 * * * *'
// A cada 6 horas: '0 */6 * * *'
// Diariamente às 2h: '0 2 * * *'
```

### Alterar Delay Inicial
No arquivo `src/scripts/verificar-assinaturas.js`, linha 113:
```javascript
// Aguarda 5 segundos (padrão)
setTimeout(async () => {
  // ...
}, 5000); // Altere este valor em milissegundos
```

## 🚨 Tratamento de Erros

O sistema inclui tratamento específico para:
- **P1001**: Erro de conexão com banco de dados
- **P2002**: Violação de chave única
- **Outros erros**: Log detalhado para debug

## 📈 Monitoramento

### Verificar se está funcionando
1. **Logs do servidor**: Verifique os logs quando o servidor iniciar
2. **Execução manual**: Execute `npm run verificar-assinaturas`
3. **Banco de dados**: Verifique se assinaturas expiradas estão sendo atualizadas

### Indicadores de Sucesso
- ✅ "Conectado ao banco de dados"
- ✅ "Verificação automática configurada"
- ✅ "X assinaturas marcadas como EXPIRADA"
- ✅ "X usuários atualizados para status PENDENTE"

## 🔄 Integração com o Sistema

O sistema está integrado no `server.js` e inicia automaticamente:
```javascript
// Iniciar verificação automática de assinaturas
iniciarVerificacaoAutomatica();
```

## 📞 Suporte

Em caso de problemas:
1. Verifique se a DATABASE_URL está correta
2. Execute `npx prisma generate` para atualizar o cliente
3. Teste a conexão com `npm run verificar-assinaturas`
4. Verifique os logs do servidor para erros específicos