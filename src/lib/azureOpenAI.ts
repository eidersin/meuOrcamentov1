import { DatabaseService } from './database';
import { supabase } from './supabase';

interface AzureOpenAIConfig {
  endpoint: string;
  apiKey: string;
  deploymentName: string;
  apiVersion: string;
}

const config: AzureOpenAIConfig = {
  endpoint: "https://reconheceai-chat-resource.cognitiveservices.azure.com/",
  apiKey: "9uMxhg6a9u1Qrk1ttVAAG51XnCSJ1yUim86DczJkMl9nzjpqazUyJQQJ99BFACHYHv6XJ3w3AAAAACOGeSL5",
  deploymentName: "gpt-4.1-mini",
  apiVersion: "2024-12-01-preview"
};

export class AzureOpenAIService {
  private static systemPrompt = `
Você é um assistente financeiro inteligente especializado em gestão de finanças pessoais.
Seu objetivo é ajudar usuários a entender e gerenciar suas finanças de forma inteligente e educativa.

INSTRUÇÕES IMPORTANTES:
1. Responda de forma clara, objetiva e educativa
2. Use um tom amigável e profissional
3. Sempre que usar dados para responder, mencione isso (ex: "Consultando seus dados...", "De acordo com seus lançamentos...")
4. Se não houver dados no contexto para responder, informe ao usuário de forma clara
5. Limite suas respostas a tópicos relacionados a finanças pessoais
6. Forneça insights valiosos e sugestões práticas
7. Use emojis moderadamente para tornar a conversa mais amigável
8. Seja proativo em sugerir melhorias financeiras quando apropriado

CAPACIDADES ESPECIAIS:
- Análise de padrões de gastos
- Sugestões de economia
- Alertas sobre gastos anômalos
- Previsões financeiras
- Educação financeira personalizada
- Comparações e benchmarks
`;

  /**
   * Função privada e centralizada para fazer a chamada final à API da OpenAI.
   * @param userPrompt O prompt completo, já com contexto, a ser enviado.
   */
  private static async _callOpenAI(userPrompt: string): Promise<string> {
    try {
      const url = `${config.endpoint}openai/deployments/${config.deploymentName}/chat/completions?api-version=${config.apiVersion}`;
      
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'api-key': config.apiKey,
        },
        body: JSON.stringify({
          messages: [
            { role: 'system', content: this.systemPrompt },
            { role: 'user', content: userPrompt }
          ],
          max_tokens: 1000,
          temperature: 0.3,
          top_p: 0.95,
          frequency_penalty: 0,
          presence_penalty: 0
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status} ${await response.text()}`);
      }

      const data = await response.json();
      
      if (data.choices && data.choices.length > 0) {
        return data.choices[0].message.content;
      } else {
        throw new Error('Resposta inválida da API');
      }
    } catch (error) {
      console.error('Erro ao chamar Azure OpenAI:', error);
      throw new Error('Erro ao processar sua mensagem. Tente novamente.');
    }
  }

  /**
   * Função principal do chat. Orquestra a busca de dados e a chamada à IA.
   * Analisa a mensagem do usuário, busca dados relevantes no banco se necessário,
   * e então chama a IA com o contexto para gerar uma resposta.
   * @param userMessage A mensagem original do usuário.
   */
  static async getChatResponse(userMessage: string): Promise<string> {
    const lowerCaseMessage = userMessage.toLowerCase();
    let contextPrompt = 'O usuário fez uma pergunta geral sobre finanças.';
    let currency = 'BRL'; // Moeda Padrão

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('moeda')
          .eq('id', user.id)
          .single();
        if (profile?.moeda) {
          currency = profile.moeda;
        }
      }

      // Palavras-chave para diferentes tipos de análise
      const expenseKeywords = ['gasto', 'gastei', 'gastos', 'despesa', 'despesas', 'gastando', 'gastar'];
      const balanceKeywords = ['saldo', 'saldos', 'conta', 'contas', 'dinheiro', 'valor'];
      const summaryKeywords = ['resumo', 'visão geral', 'geral', 'total', 'situação', 'como está', 'como estão'];
      const goalKeywords = ['meta', 'metas', 'objetivo', 'objetivos', 'economizar', 'poupar'];
      const categoryKeywords = ['categoria', 'categorias', 'onde', 'gastando mais', 'maior gasto'];
      const incomeKeywords = ['receita', 'receitas', 'ganho', 'renda', 'salário'];
      const budgetKeywords = ['orçamento', 'orçamentos', 'planejamento', 'planejar'];
      const trendKeywords = ['tendência', 'evolução', 'crescimento', 'comparar', 'mês passado'];
      
      // Buscar dados baseado no contexto da mensagem
      if (expenseKeywords.some(keyword => lowerCaseMessage.includes(keyword))) {
        const data = await DatabaseService.getGastosPorCategoria(
          new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString(),
          new Date().toISOString()
        );
        contextPrompt = `📊 Dados de gastos do usuário para este mês (agrupados por categoria):\n${JSON.stringify(data, null, 2)}`;
      } 
      else if (balanceKeywords.some(keyword => lowerCaseMessage.includes(keyword))) {
        const contas = await DatabaseService.getContas();
        contextPrompt = `💰 Dados de saldo das contas do usuário:\n${JSON.stringify(contas.map(c => ({ 
          nome: c.nome, 
          tipo: c.tipo,
          saldo_atual: c.saldo_atual,
          limite_credito: c.limite_credito 
        })), null, 2)}`;
      } 
      else if (summaryKeywords.some(keyword => lowerCaseMessage.includes(keyword))) {
        const [resumo, gastosPorCategoria, contas] = await Promise.all([
          DatabaseService.getResumoFinanceiro(
            new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString(),
            new Date().toISOString()
          ),
          DatabaseService.getGastosPorCategoria(
            new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString(),
            new Date().toISOString()
          ),
          DatabaseService.getContas()
        ]);
        contextPrompt = `📈 Resumo financeiro completo do usuário para o mês atual:
        
RESUMO GERAL: ${JSON.stringify(resumo, null, 2)}

GASTOS POR CATEGORIA: ${JSON.stringify(gastosPorCategoria, null, 2)}

CONTAS: ${JSON.stringify(contas.map(c => ({ 
          nome: c.nome, 
          tipo: c.tipo,
          saldo_atual: c.saldo_atual 
        })), null, 2)}`;
      } 
      else if (goalKeywords.some(keyword => lowerCaseMessage.includes(keyword))) {
        const metas = await DatabaseService.getMetas();
        contextPrompt = `🎯 Dados sobre as metas financeiras do usuário:\n${JSON.stringify(metas.map(m => ({ 
          nome: m.nome, 
          tipo: m.tipo,
          valor_meta: m.valor_meta, 
          valor_atual: m.valor_atual, 
          status: m.status,
          data_inicio: m.data_inicio,
          data_fim: m.data_fim
        })), null, 2)}`;
      }
      else if (categoryKeywords.some(keyword => lowerCaseMessage.includes(keyword))) {
        const gastosPorCategoria = await DatabaseService.getGastosPorCategoria(
          new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString(),
          new Date().toISOString()
        );
        contextPrompt = `📊 Análise detalhada de gastos por categoria:\n${JSON.stringify(gastosPorCategoria, null, 2)}`;
      }
      else if (incomeKeywords.some(keyword => lowerCaseMessage.includes(keyword))) {
        const lancamentos = await DatabaseService.getLancamentos({
          dataInicio: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString(),
          dataFim: new Date().toISOString(),
          tipo: 'RECEITA'
        });
        contextPrompt = `💵 Dados de receitas do usuário para este mês:\n${JSON.stringify(lancamentos.map(l => ({
          descricao: l.descricao,
          valor: l.valor,
          data: l.data,
          categoria: l.categoria?.nome
        })), null, 2)}`;
      }
      else if (budgetKeywords.some(keyword => lowerCaseMessage.includes(keyword))) {
        const orcamentos = await DatabaseService.getOrcamentos(
          new Date().getFullYear(),
          new Date().getMonth() + 1
        );
        contextPrompt = `📋 Dados de orçamentos do usuário para este mês:\n${JSON.stringify(orcamentos, null, 2)}`;
      }
      else if (trendKeywords.some(keyword => lowerCaseMessage.includes(keyword))) {
        const evolucao = await DatabaseService.getEvolucaoMensal(6);
        contextPrompt = `📈 Evolução financeira dos últimos 6 meses:\n${JSON.stringify(evolucao, null, 2)}`;
      }
    } catch (error) {
      console.error('Erro ao buscar contexto para IA:', error);
      contextPrompt = 'Ocorreu um erro ao tentar buscar os dados financeiros para responder a esta pergunta. Informe o usuário sobre o erro e sugira tentar novamente.';
    }
    
    // Prompt final com instruções de formatação melhoradas
    const finalPrompt = `
      **CONTEXTO FINANCEIRO:**
      ---
      Moeda do usuário: ${currency}
      ${contextPrompt}
      ---
      
      **INSTRUÇÕES DE RESPOSTA:**
      1. **Formatação de Moeda:** Sempre use "R$" para valores em BRL, "$" para USD, "€" para EUR
      2. **Clareza:** Seja específico com números e valores
      3. **Insights:** Forneça análises úteis e sugestões práticas
      4. **Educação:** Explique conceitos quando apropriado
      5. **Ação:** Sugira próximos passos quando relevante
      
      **PERGUNTA DO USUÁRIO:** "${userMessage}"
      
      Responda de forma completa, útil e educativa, usando os dados fornecidos quando disponíveis.
    `;
    
    return this._callOpenAI(finalPrompt);
  }

  // Funções especializadas mantidas para compatibilidade
  static async categorizarDespesa(descricao: string, categorias: string[]): Promise<string> {
    const prompt = `
Baseado na descrição "${descricao}", qual das seguintes categorias melhor se adequa?
Categorias disponíveis: ${categorias.join(', ')}
Responda apenas com o nome da categoria mais apropriada.
`;
    return (await this._callOpenAI(prompt)).trim();
  }

  static async analisarGastos(dadosFinanceiros: any): Promise<string> {
    const prompt = `
Você é um Analista Financeiro Sênior e especialista em visualização de dados. Sua tarefa é analisar os dados financeiros do usuário e retornar *exclusivamente* um array de objetos JSON contendo insights.

**Formato de Saída Obrigatório:**
A sua resposta deve ser um array JSON. Cada objeto no array representa um insight e deve ter a seguinte estrutura:
{
  "title": "Um título curto e impactante para o insight (máx 4 palavras).",
  "description": "Uma frase explicativa, concisa e acionável (máx 20 palavras).",
  "type": "A classificação do insight. Use *exclusivamente* um dos seguintes valores: 'positivo', 'atencao', 'informativo'.",
  "icon": "O nome de um ícone da biblioteca lucide-react que melhor representa o insight. Escolha *exclusivamente* da seguinte lista: ['TrendingUp', 'TrendingDown', 'AlertTriangle', 'PiggyBank', 'CalendarDays', 'Wallet', 'Info', 'Scale']"
}

**Dados Financeiros do Usuário para o Período de "${dadosFinanceiros.periodo}":**
- Receitas: R$ ${dadosFinanceiros.receitas?.toFixed(2) || '0.00'}
- Despesas: R$ ${dadosFinanceiros.despesas?.toFixed(2) || '0.00'}
- Taxa de Poupança: ${dadosFinanceiros.taxaPoupanca?.toFixed(1) || '0'}%
- Gasto Diário Médio: R$ ${dadosFinanceiros.gastoDiarioMedio?.toFixed(2) || '0.00'}
- Patrimônio Líquido: R$ ${dadosFinanceiros.patrimonioLiquido?.toFixed(2) || '0.00'}
- Principais Categorias de Gastos: ${dadosFinanceiros.categoriasMaisGastas?.join(', ') || 'Nenhuma'}

**Regras para Gerar os Insights:**
1.  Gere de 2 a 4 insights no total. O primeiro insight deve ser sempre o mais relevante (o maior ponto positivo ou o maior ponto de atenção).
2.  Se a "Taxa de Poupança" for maior que 20%, crie um insight 'positivo' sobre isso. Se for negativa, crie um de 'atencao'.
3.  Analise o "Gasto Diário Médio". Se for um valor relevante comparado à receita, crie um insight 'informativo' ou de 'atencao'.
4.  Se o saldo for negativo, crie um insight de 'atencao' sobre o déficit.
5.  Use a "Principal Categoria de Gastos" para gerar um insight específico e acionável.
6.  Seja direto, certeiro e use uma linguagem que motive o usuário a agir.

**Exemplo de Saída Esperada (apenas para referência de formato):**
[
  {
    "title": "Excelente Poupança!",
    "type": "positivo",
    "description": "Você está poupando ${dadosFinanceiros.taxaPoupanca?.toFixed(1)}% da sua renda. Continue assim!",
    "icon": "TrendingUp"
  },
  {
    "title": "Atenção ao Gasto Diário",
    "type": "atencao",
    "description": "Seu gasto médio é de R$ ${dadosFinanceiros.gastoDiarioMedio?.toFixed(2)}. Monitore para otimizar.",
    "icon": "AlertTriangle"
  }
]

Lembre-se: sua resposta deve conter APENAS o array JSON, sem nenhum texto adicional, explicação ou formatação como \`\`\`json.
`;
    return this._callOpenAI(prompt);
  }

  static async gerarInsightsPersonalizados(dadosCompletos: any): Promise<string> {
    const prompt = `
Analise os dados financeiros completos do usuário e gere insights personalizados:

DADOS: ${JSON.stringify(dadosCompletos, null, 2)}

Forneça insights sobre:
1. Padrões de comportamento financeiro
2. Oportunidades de economia
3. Riscos identificados
4. Recomendações personalizadas
5. Metas sugeridas

Seja específico e prático nas recomendações.
`;
    return this._callOpenAI(prompt);
  }
}