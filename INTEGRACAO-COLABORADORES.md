# API de Integração com Colaboradores

## 📋 Descrição

Sistema de integração que permite que sistemas externos de colaboradores criem usuários no Painele e recebam notificações sobre pagamentos aprovados.

## 🏗️ Arquitetura

### Modelo de Dados

```prisma
model IntegracaoColaborador {
  id                    String   @id @default(uuid())
  userId_painele        String   @unique // ID do usuário no Painele
  colaboradorId_externo String   // ID do colaborador no sistema externo
  user                  User     @relation(fields: [userId_painele], references: [id], onDelete: Cascade)
  criadoEm              DateTime @default(now())
  atualizadoEm          DateTime @updatedAt

  @@unique([colaboradorId_externo, userId_painele])
}
```

### Fluxo de Integração

1. **Sistema de Colaboradores** → Cria usuário no Painele
2. **Painele** → Cria usuário e mapeia ID externo
3. **Painele** → Notifica colaboradores sobre pagamentos aprovados

## 🚀 Endpoints

### 1. Criar Usuário via Colaborador

**POST** `/api/integracao/usuarios`

#### Headers
```http
Content-Type: application/json
Authorization: Bearer {INTEGRACAO_TOKEN}
```

#### Body
```json
{
  "nome": "Maria Silva",
  "email": "maria@teste.com",
  "telefone": "11999999999",
  "colaboradorId_externo": "colab_123"
}
```

#### Resposta de Sucesso (201)
```json
{
  "userId_painele": "f48a40b2-fbc4-447e-b9e7-39687db6dcec"
}
```

#### Possíveis Erros
- **400**: Dados obrigatórios ausentes
- **400**: E-mail já cadastrado
- **400**: Colaborador já possui usuário vinculado
- **401**: Token de integração inválido
- **500**: Erro interno do servidor

### 2. Buscar Usuário por Colaborador

**GET** `/api/integracao/usuarios/{colaboradorId_externo}`

#### Headers
```http
Authorization: Bearer {INTEGRACAO_TOKEN}
```

#### Resposta de Sucesso (200)
```json
{
  "userId_painele": "f48a40b2-fbc4-447e-b9e7-39687db6dcec",
  "colaboradorId_externo": "colab_123",
  "usuario": {
    "id": "f48a40b2-fbc4-447e-b9e7-39687db6dcec",
    "nome": "Maria Silva",
    "email": "maria@teste.com",
    "assinatura": "teste",
    "statusPagamento": "TESTE",
    "planoExpiraEm": "2024-02-15T10:30:00.000Z",
    "criadoEm": "2024-01-15T10:30:00.000Z"
  }
}
```

#### Possíveis Erros
- **404**: Usuário não encontrado para este colaborador
- **401**: Token de integração inválido
- **500**: Erro interno do servidor

## 📡 Webhook de Pagamentos

### Configuração

O Painele enviará automaticamente webhooks quando pagamentos forem aprovados.

#### Variáveis de Ambiente
```env
# URL do webhook do sistema de colaboradores
COLABORADORES_WEBHOOK_URL=https://api.colaboradores.com/webhooks/pagamento

# Token de autenticação para o webhook (opcional)
COLABORADORES_WEBHOOK_TOKEN=seu_token_secreto

# Token para autenticação da API de integração
INTEGRACAO_TOKEN=token_para_api_integracao
```

### Payload do Webhook

Quando um pagamento for aprovado, o Painele enviará:

**POST** `{COLABORADORES_WEBHOOK_URL}`

#### Headers
```http
Content-Type: application/json
Authorization: Bearer {COLABORADORES_WEBHOOK_TOKEN}
```

#### Body
```json
{
  "userId_painele": "f48a40b2-fbc4-447e-b9e7-39687db6dcec",
  "colaboradorId_externo": "colab_123",
  "valor": 149.99,
  "status": "APROVADO"
}
```

### Implementação no Sistema de Colaboradores

O sistema de colaboradores deve implementar um endpoint para receber os webhooks:

```javascript
// Exemplo de implementação
app.post('/webhooks/pagamento', (req, res) => {
  const { userId_painele, colaboradorId_externo, valor, status } = req.body;
  
  if (status === 'APROVADO') {
    // Processar comissão do colaborador
    // Atualizar métricas
    // Enviar notificações
  }
  
  res.json({ received: true });
});
```

## 🔒 Segurança

### Autenticação

- **API de Integração**: Usa token Bearer configurado em `INTEGRACAO_TOKEN`
- **Webhook**: Usa token Bearer configurado em `COLABORADORES_WEBHOOK_TOKEN`

### Validações

- E-mail único por usuário
- Colaborador externo único por usuário
- Dados obrigatórios validados
- Timeout de 10 segundos para webhooks

## 🧪 Testes

### Executar Testes Automatizados

```bash
# Instalar dependências
npm install

# Configurar variáveis de ambiente
cp .env.example .env
# Editar .env com suas configurações

# Executar testes
node test-integracao.js
```

### Testes Manuais com cURL

#### Criar Usuário
```bash
curl -X POST http://localhost:3001/api/integracao/usuarios \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer seu_token" \
  -d '{
    "nome": "João Silva",
    "email": "joao@teste.com",
    "telefone": "11999999999",
    "colaboradorId_externo": "colab_456"
  }'
```

#### Buscar Usuário
```bash
curl -X GET http://localhost:3001/api/integracao/usuarios/colab_456 \
  -H "Authorization: Bearer seu_token"
```

## 📊 Monitoramento

### Logs

O sistema gera logs detalhados para:
- Criação de usuários via integração
- Envio de webhooks
- Erros de autenticação
- Falhas de comunicação

### Métricas Importantes

- Taxa de sucesso na criação de usuários
- Taxa de entrega de webhooks
- Tempo de resposta dos endpoints
- Erros de autenticação

## 🚨 Tratamento de Erros

### Webhook com Falha

- O sistema não falha a operação principal se o webhook falhar
- Logs detalhados são gerados para debugging
- Recomenda-se implementar retry no sistema de colaboradores

### Usuário Duplicado

- Validação por e-mail único
- Validação por colaborador externo único
- Mensagens de erro claras

## 📝 Changelog

### v1.0.0 (2024-01-15)
- ✅ Criação inicial da API de integração
- ✅ Modelo IntegracaoColaborador
- ✅ Endpoints de criação e busca de usuários
- ✅ Webhook automático para pagamentos aprovados
- ✅ Sistema de autenticação por token
- ✅ Testes automatizados
- ✅ Documentação completa

## 🤝 Suporte

Para dúvidas ou problemas:
1. Verifique os logs do servidor
2. Execute os testes automatizados
3. Consulte esta documentação
4. Entre em contato com a equipe de desenvolvimento