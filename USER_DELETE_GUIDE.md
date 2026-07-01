# 🗑️ Guia de Exclusão de Usuário - Painelé

## ✅ Problema Resolvido

Agora você pode excluir usuários diretamente do sistema, e **TODOS os dados relacionados serão excluídos automaticamente** em cascata.

## 🔧 O que foi implementado:

### 1. **Schema do Banco Atualizado**
- Adicionado `onDelete: Cascade` em todas as relações do usuário
- Produtos, Vendas, Assinaturas e Pagamentos são excluídos automaticamente

### 2. **Novas Rotas de API**

#### **GET /api/user/perfil**
Obter informações do perfil do usuário logado
```json
{
  "id": "uuid",
  "nome": "Nome do Usuário",
  "email": "email@exemplo.com",
  "criadoEm": "2025-01-08T...",
  "assinatura": "premium",
  "planoExpiraEm": "2025-02-08T...",
  "_count": {
    "produtos": 15,
    "vendas": 8,
    "assinaturas": 1,
    "pagamentos": 3
  }
}
```

#### **PUT /api/user/perfil**
Atualizar informações do perfil
```json
{
  "nome": "Novo Nome",
  "email": "novoemail@exemplo.com"
}
```

#### **GET /api/user/estatisticas**
Obter estatísticas completas da conta
```json
{
  "usuario": { ... },
  "contadores": { ... },
  "resumo": {
    "totalProdutosVendidos": 150,
    "valorTotalEstoque": 25000.00,
    "faturamentoTotal": 45000.00,
    "vendasFinalizadas": 8
  }
}
```

#### **DELETE /api/user/conta** ⚠️
**EXCLUIR CONTA E TODOS OS DADOS**
```json
{
  "confirmacao": "EXCLUIR_MINHA_CONTA"
}
```

**Resposta:**
```json
{
  "message": "Conta excluída com sucesso. Todos os dados relacionados foram removidos.",
  "dadosExcluidos": {
    "produtos": 15,
    "vendas": 8,
    "assinaturas": 1,
    "pagamentos": 3
  }
}
```

## 🚀 Como usar:

### **Exemplo com cURL:**

```bash
# Excluir usuário (precisa estar logado)
curl -X DELETE http://localhost:3001/api/user/conta \
  -H "Content-Type: application/json" \
  -H "Cookie: token=SEU_TOKEN_JWT" \
  -d '{"confirmacao": "EXCLUIR_MINHA_CONTA"}'
```

### **Exemplo com JavaScript (Frontend):**

```javascript
// Excluir conta do usuário
const excluirConta = async () => {
  try {
    const response = await fetch('/api/user/conta', {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include', // Para enviar cookies
      body: JSON.stringify({
        confirmacao: 'EXCLUIR_MINHA_CONTA'
      })
    });

    const result = await response.json();
    
    if (response.ok) {
      console.log('✅ Conta excluída:', result);
      // Redirecionar para página de login
      window.location.href = '/login';
    } else {
      console.error('❌ Erro:', result.error);
    }
  } catch (error) {
    console.error('❌ Erro na requisição:', error);
  }
};
```

## 🛡️ Segurança Implementada:

1. **Autenticação obrigatória** - Todas as rotas exigem token JWT válido
2. **Confirmação explícita** - Para excluir, deve enviar `"EXCLUIR_MINHA_CONTA"`
3. **Logs detalhados** - Todas as exclusões são registradas no console
4. **Limpeza de cookies** - Token de autenticação é removido após exclusão

## ⚠️ IMPORTANTE:

- **A exclusão é IRREVERSÍVEL**
- **TODOS os dados relacionados são excluídos:**
  - Produtos do usuário
  - Vendas e itens de venda
  - Assinaturas ativas
  - Histórico de pagamentos
  - Tokens de recuperação de senha

## 🔍 Logs do Sistema:

Quando um usuário é excluído, você verá logs como:
```
🗑️ Iniciando exclusão do usuário teste@gmail.com
📊 Dados a serem excluídos: { produtos: 15, vendas: 8, assinaturas: 1, pagamentos: 3 }
✅ Usuário teste@gmail.com e todos os dados relacionados foram excluídos com sucesso
```

## 🎯 Próximos Passos:

1. **Implementar no Frontend** - Criar interface para exclusão de conta
2. **Backup antes da exclusão** - Opcional: criar backup dos dados antes de excluir
3. **Período de carência** - Opcional: implementar exclusão com delay de 30 dias

---

**🚀 Agora você tem controle total sobre a exclusão de usuários no Painelé!**