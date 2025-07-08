# 💰 FinanceApp - Gestão Financeira Inteligente

Uma aplicação moderna e completa para gestão de finanças pessoais, desenvolvida com React, TypeScript, Tailwind CSS e Supabase.

## 🚀 Funcionalidades

### ✅ Gestão de Contas
- Criação e edição de contas bancárias, carteiras e cartões de crédito
- Suporte a diferentes tipos: Corrente, Poupança, Investimento, Carteira, Cartão de Crédito
- Controle de saldo inicial, limite de crédito e valor investido
- Visualização de utilização de cartão de crédito com alertas

### 💸 Lançamentos Inteligentes
- Registro de receitas e despesas com categorização
- Sistema de parcelas para compras no cartão
- Status de transações: Pendente, Confirmado, Cancelado
- Alertas personalizáveis por vencimento (1, 3 ou 7 dias)
- Observações e tags para melhor organização

### 🔁 Transferências entre Contas
- Transferências internas entre suas contas
- Histórico completo de movimentações
- Controle automático de saldos

### 🎯 Metas Financeiras
- Definição de metas de economia, gastos máximos e receitas mínimas
- Acompanhamento visual do progresso
- Notificações de progresso

### 📊 Relatórios Avançados
- **Fluxo de Caixa**: Evolução temporal de receitas, despesas e saldo
- **Comparativo Mensal**: Análise lado a lado de diferentes períodos
- **Onde meu dinheiro foi?**: Visualização treemap das categorias de gastos
- Exportação de relatórios em JSON

### 🔔 Sistema de Notificações
- Alertas de vencimentos próximos
- Notificações de metas atingidas
- Avisos de limite de cartão de crédito

### 🤖 Assistente IA Integrado
- Chat inteligente com Azure OpenAI (GPT-4)
- Análise automática de gastos
- Sugestões personalizadas de economia
- Categorização automática de despesas

### 🎨 Interface Moderna
- Design responsivo e intuitivo
- Navegação horizontal adaptativa
- Tema claro com gradientes elegantes
- Micro-interações e animações suaves

## 🛠️ Tecnologias Utilizadas

- **Frontend**: React 18, TypeScript, Tailwind CSS
- **Backend**: Supabase (PostgreSQL, Auth, RLS)
- **Gráficos**: Recharts
- **IA**: Azure OpenAI GPT-4
- **Ícones**: Lucide React
- **Estado**: Zustand (para cache local)
- **Datas**: date-fns

## 🏗️ Arquitetura

### Banco de Dados (Supabase)
```sql
-- Principais tabelas
- profiles: Perfis de usuário
- categorias: Categorias de receitas/despesas
- contas: Contas bancárias e carteiras
- lancamentos: Transações financeiras
- metas_financeiras: Metas e objetivos
- orcamentos: Orçamentos mensais
- lembretes: Lembretes de vencimentos
```

### Estrutura de Componentes
```
src/
├── components/
│   ├── Auth/           # Autenticação
│   ├── ChatBot/        # Assistente IA
│   ├── Notifications/  # Sistema de notificações
│   ├── Metas/         # Gestão de metas
│   ├── Transferencias/ # Transferências
│   ├── Relatorios/    # Relatórios avançados
│   └── Common/        # Componentes reutilizáveis
├── lib/
│   ├── auth.ts        # Serviços de autenticação
│   ├── database.ts    # Operações de banco
│   ├── supabase.ts    # Cliente Supabase
│   ├── azureOpenAI.ts # Integração IA
│   └── utils.ts       # Utilitários
```

## 🤖 Aplicações de IA Implementadas

### 1. **Categorização Automática de Despesas**
```typescript
// Exemplo de uso
const categoria = await AzureOpenAIService.categorizarDespesa(
  "Supermercado Extra", 
  ["Alimentação", "Casa", "Transporte"]
);
```

### 2. **Análise Inteligente de Gastos**
```typescript
// Análise automática dos padrões financeiros
const analise = await AzureOpenAIService.analisarGastos({
  receitas: 5000,
  despesas: 4200,
  saldo: 800,
  categorias: ["Alimentação", "Transporte", "Lazer"]
});
```

### 3. **Previsão de Gastos Futuros**
```typescript
// Previsão baseada em histórico
const previsao = await AzureOpenAIService.preverGastos([
  3200, 3400, 3100, 3600, 3300, 3500
]);
```

### 4. **Chat Inteligente para Consultoria Financeira**
- Assistente disponível 24/7 via chat flutuante
- Respostas contextualizadas sobre finanças pessoais
- Sugestões personalizadas baseadas nos dados do usuário

## 🚀 Sugestões de Melhorias com IA

### 1. **Detecção de Anomalias**
Implementar algoritmos para detectar gastos incomuns:
```typescript
// Localização sugerida: src/lib/aiAnalytics.ts
export class AnomalyDetection {
  static detectUnusualSpending(transactions: Transaction[]): Alert[] {
    // Detectar gastos 2x acima da média
    // Alertar sobre categorias com crescimento > 50%
    // Identificar padrões suspeitos
  }
}
```

### 2. **Recomendações de Investimento**
Sistema de sugestões baseado no perfil financeiro:
```typescript
// Localização sugerida: src/lib/investmentAI.ts
export class InvestmentRecommendations {
  static async getRecommendations(profile: FinancialProfile): Promise<Investment[]> {
    // Analisar sobra mensal
    // Considerar perfil de risco
    // Sugerir produtos financeiros adequados
  }
}
```

### 3. **Otimização Automática de Orçamento**
IA para sugerir ajustes no orçamento:
```typescript
// Localização sugerida: src/lib/budgetOptimizer.ts
export class BudgetOptimizer {
  static optimizeBudget(currentBudget: Budget, goals: Goal[]): BudgetSuggestion[] {
    // Analisar gastos vs orçamento
    // Identificar categorias com potencial de economia
    // Sugerir realocação de recursos
  }
}
```

## 📱 Instalação e Configuração

### Pré-requisitos
- Node.js 18+
- Conta no Supabase
- Conta no Azure OpenAI

### Configuração
1. Clone o repositório
2. Instale as dependências: `npm install`
3. Configure as variáveis de ambiente no `.env`:
```env
VITE_SUPABASE_URL=sua_url_supabase
VITE_SUPABASE_ANON_KEY=sua_chave_anonima
```

4. Execute as migrações do banco de dados no Supabase
5. Inicie o projeto: `npm run dev`

## 🔐 Segurança

- **Row Level Security (RLS)** habilitado em todas as tabelas
- Autenticação via Supabase Auth
- Isolamento completo de dados por usuário
- Validação de dados no frontend e backend

## 📈 Performance

- Lazy loading de componentes
- Otimização de queries com índices
- Cache inteligente com Zustand
- Debounce em operações de busca

## 🎯 Roadmap

- [ ] App mobile com React Native
- [ ] Integração com Open Banking
- [ ] Machine Learning para previsões mais precisas
- [ ] Relatórios em PDF
- [ ] Modo offline com sincronização
- [ ] Integração com bancos via API

## 📄 Licença

MIT License - veja o arquivo LICENSE para detalhes.

---

**Desenvolvido com ❤️ para revolucionar sua gestão financeira pessoal**