import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Função para exibir um erro visível na tela em caso de falha de configuração.
function showConfigurationError() {
  const root = document.getElementById('root');
  if (root) {
    root.innerHTML = `
      <div style="font-family: sans-serif; padding: 2rem; text-align: center; background-color: #fef2f2; color: #991b1b; border: 1px solid #fecaca; border-radius: 8px; margin: 2rem;">
        <h1 style="font-size: 1.5rem; font-weight: bold;">Erro de Configuração</h1>
        <p style="margin-top: 1rem;">
          As variáveis de ambiente do Supabase (VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY) não foram encontradas.
        </p>
        <p style="margin-top: 0.5rem;">
          Por favor, crie um arquivo <code>.env</code> na raiz do projeto e adicione as suas credenciais do Supabase.
        </p>
        <p style="margin-top: 1rem; font-size: 0.875rem; color: #7f1d1d;">
          Lembre-se de reiniciar o servidor de desenvolvimento após criar o arquivo.
        </p>
      </div>
    `;
  }
}

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Erro: Variáveis de ambiente do Supabase não configuradas.');
  showConfigurationError();
  // Lançar o erro impede o resto do código de ser executado com uma configuração inválida.
  throw new Error('Missing Supabase environment variables. Check the on-screen message.');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true
  }
});

// Tipos TypeScript para o banco
export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          email: string | null;
          nome: string | null;
          avatar_url: string | null;
          moeda: string;
          fuso_horario: string;
          tema: string;
          notificacoes_email: boolean;
          notificacoes_push: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          email?: string | null;
          nome?: string | null;
          avatar_url?: string | null;
          moeda?: string;
          fuso_horario?: string;
          tema?: string;
          notificacoes_email?: boolean;
          notificacoes_push?: boolean;
        };
        Update: {
          email?: string | null;
          nome?: string | null;
          avatar_url?: string | null;
          moeda?: string;
          fuso_horario?: string;
          tema?: string;
          notificacoes_email?: boolean;
          notificacoes_push?: boolean;
        };
      };
      categorias: {
        Row: {
          id: string;
          user_id: string;
          nome: string;
          tipo: 'RECEITA' | 'DESPESA';
          cor: string;
          icone: string;
          descricao: string | null;
          ativa: boolean;
          ordem: number;
          categoria_pai_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          user_id: string;
          nome: string;
          tipo: 'RECEITA' | 'DESPESA';
          cor?: string;
          icone?: string;
          descricao?: string | null;
          ativa?: boolean;
          ordem?: number;
          categoria_pai_id?: string | null;
        };
        Update: {
          nome?: string;
          tipo?: 'RECEITA' | 'DESPESA';
          cor?: string;
          icone?: string;
          descricao?: string | null;
          ativa?: boolean;
          ordem?: number;
          categoria_pai_id?: string | null;
        };
      };
      contas: {
        Row: {
          id: string;
          user_id: string;
          nome: string;
          tipo: 'CORRENTE' | 'POUPANCA' | 'INVESTIMENTO' | 'CARTEIRA';
          saldo_inicial: number;
          saldo_atual: number;
          limite_credito: number | null;
          valor_investido: number | null;
          banco: string | null;
          agencia: string | null;
          conta: string | null;
          ativa: boolean;
          incluir_relatorios: boolean;
          cor: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          user_id: string;
          nome: string;
          tipo?: 'CORRENTE' | 'POUPANCA' | 'INVESTIMENTO' | 'CARTEIRA';
          saldo_inicial: number;
          limite_credito?: number | null;
          valor_investido?: number | null;
          banco?: string | null;
          agencia?: string | null;
          conta?: string | null;
          ativa?: boolean;
          incluir_relatorios?: boolean;
          cor?: string;
        };
        Update: {
          nome?: string;
          tipo?: 'CORRENTE' | 'POUPANCA' | 'INVESTIMENTO' | 'CARTEIRA';
          saldo_inicial?: number;
          limite_credito?: number | null;
          valor_investido?: number | null;
          banco?: string | null;
          agencia?: string | null;
          conta?: string | null;
          ativa?: boolean;
          incluir_relatorios?: boolean;
          cor?: string;
        };
      };
      lancamentos: {
        Row: {
          id: string;
          user_id: string;
          conta_id: string;
          categoria_id: string;
          descricao: string;
          valor: number;
          data: string;
          tipo: 'RECEITA' | 'DESPESA';
          status: 'PENDENTE' | 'CONFIRMADO' | 'CANCELADO';
          observacoes: string | null;
          tags: string[] | null;
          compra_parcelada_id: string | null;
          parcela_atual: number | null;
          total_parcelas: number | null;
          transferencia_id: string | null;
          conta_destino_id: string | null;
          recorrente: boolean;
          frequencia: 'SEMANAL' | 'MENSAL' | 'BIMESTRAL' | 'TRIMESTRAL' | 'SEMESTRAL' | 'ANUAL' | null;
          proximo_vencimento: string | null;
          latitude: number | null;
          longitude: number | null;
          local: string | null;
          antecedencia_notificacao: number | null;
          arquivo_comprovante: string | null;
          cartao_credito_usado: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          user_id: string;
          conta_id: string;
          categoria_id: string;
          descricao: string;
          valor: number;
          data: string;
          tipo: 'RECEITA' | 'DESPESA';
          status?: 'PENDENTE' | 'CONFIRMADO' | 'CANCELADO';
          observacoes?: string | null;
          tags?: string[] | null;
          compra_parcelada_id?: string | null;
          parcela_atual?: number | null;
          total_parcelas?: number | null;
          transferencia_id?: string | null;
          conta_destino_id?: string | null;
          recorrente?: boolean;
          frequencia?: 'SEMANAL' | 'MENSAL' | 'BIMESTRAL' | 'TRIMESTRAL' | 'SEMESTRAL' | 'ANUAL' | null;
          proximo_vencimento?: string | null;
          latitude?: number | null;
          longitude?: number | null;
          local?: string | null;
          antecedencia_notificacao?: number | null;
          arquivo_comprovante?: string | null;
          cartao_credito_usado?: string | null;
        };
        Update: {
          conta_id?: string;
          categoria_id?: string;
          descricao?: string;
          valor?: number;
          data?: string;
          tipo?: 'RECEITA' | 'DESPESA';
          status?: 'PENDENTE' | 'CONFIRMADO' | 'CANCELADO';
          observacoes?: string | null;
          tags?: string[] | null;
          compra_parcelada_id?: string | null;
          parcela_atual?: number | null;
          total_parcelas?: number | null;
          transferencia_id?: string | null;
          conta_destino_id?: string | null;
          recorrente?: boolean;
          frequencia?: 'SEMANAL' | 'MENSAL' | 'BIMESTRAL' | 'TRIMESTRAL' | 'SEMESTRAL' | 'ANUAL' | null;
          proximo_vencimento?: string | null;
          latitude?: number | null;
          longitude?: number | null;
          local?: string | null;
          antecedencia_notificacao?: number | null;
          arquivo_comprovante?: string | null;
          cartao_credito_usado?: string | null;
        };
      };
      metas_financeiras: {
        Row: {
          id: string;
          user_id: string;
          categoria_id: string | null;
          nome: string;
          descricao: string | null;
          tipo: 'ECONOMIA' | 'GASTO_MAXIMO' | 'RECEITA_MINIMA';
          valor_meta: number;
          valor_atual: number;
          data_inicio: string;
          data_fim: string;
          status: 'ATIVA' | 'PAUSADA' | 'CONCLUIDA' | 'CANCELADA';
          cor: string;
          notificar_progresso: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          user_id: string;
          categoria_id?: string | null;
          nome: string;
          descricao?: string | null;
          tipo: 'ECONOMIA' | 'GASTO_MAXIMO' | 'RECEITA_MINIMA';
          valor_meta: number;
          data_inicio: string;
          data_fim: string;
          status?: 'ATIVA' | 'PAUSADA' | 'CONCLUIDA' | 'CANCELADA';
          cor?: string;
          notificar_progresso?: boolean;
        };
        Update: {
          categoria_id?: string | null;
          nome?: string;
          descricao?: string | null;
          tipo?: 'ECONOMIA' | 'GASTO_MAXIMO' | 'RECEITA_MINIMA';
          valor_meta?: number;
          data_inicio?: string;
          data_fim?: string;
          status?: 'ATIVA' | 'PAUSADA' | 'CONCLUIDA' | 'CANCELADA';
          cor?: string;
          notificar_progresso?: boolean;
        };
      };
      orcamentos: {
        Row: {
          id: string;
          user_id: string;
          categoria_id: string;
          ano: number;
          mes: number;
          valor_orcado: number;
          valor_gasto: number;
          alerta_percentual: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          user_id: string;
          categoria_id: string;
          ano: number;
          mes: number;
          valor_orcado: number;
          alerta_percentual?: number;
        };
        Update: {
          categoria_id?: string;
          ano?: number;
          mes?: number;
          valor_orcado?: number;
          alerta_percentual?: number;
        };
      };
      lembretes: {
        Row: {
          id: string;
          user_id: string;
          categoria_id: string | null;
          titulo: string;
          descricao: string | null;
          valor: number | null;
          data_vencimento: string;
          tipo: 'PAGAMENTO' | 'RECEBIMENTO' | 'META' | 'ORCAMENTO';
          frequencia: 'UNICO' | 'SEMANAL' | 'MENSAL' | 'ANUAL' | null;
          status: 'PENDENTE' | 'NOTIFICADO' | 'CONCLUIDO' | 'CANCELADO';
          antecedencia_dias: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          user_id: string;
          categoria_id?: string | null;
          titulo: string;
          descricao?: string | null;
          valor?: number | null;
          data_vencimento: string;
          tipo: 'PAGAMENTO' | 'RECEBIMENTO' | 'META' | 'ORCAMENTO';
          frequencia?: 'UNICO' | 'SEMANAL' | 'MENSAL' | 'ANUAL' | null;
          status?: 'PENDENTE' | 'NOTIFICADO' | 'CONCLUIDO' | 'CANCELADO';
          antecedencia_dias?: number;
        };
        Update: {
          categoria_id?: string | null;
          titulo?: string;
          descricao?: string | null;
          valor?: number | null;
          data_vencimento?: string;
          tipo?: 'PAGAMENTO' | 'RECEBIMENTO' | 'META' | 'ORCAMENTO';
          frequencia?: 'UNICO' | 'SEMANAL' | 'MENSAL' | 'ANUAL' | null;
          status?: 'PENDENTE' | 'NOTIFICADO' | 'CONCLUIDO' | 'CANCELADO';
          antecedencia_dias?: number;
        };
      };
      patrimonio: {
        Row: {
          id: string;
          user_id: string;
          nome: string;
          tipo: 'IMOVEL' | 'VEICULO' | 'INVESTIMENTO' | 'OUTRO';
          valor_atual: number;
          valor_compra: number | null;
          data_aquisicao: string | null;
          descricao: string | null;
          ativo: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          user_id: string;
          nome: string;
          tipo: 'IMOVEL' | 'VEICULO' | 'INVESTIMENTO' | 'OUTRO';
          valor_atual: number;
          valor_compra?: number | null;
          data_aquisicao?: string | null;
          descricao?: string | null;
          ativo?: boolean;
        };
        Update: {
          nome?: string;
          tipo?: 'IMOVEL' | 'VEICULO' | 'INVESTIMENTO' | 'OUTRO';
          valor_atual?: number;
          valor_compra?: number | null;
          data_aquisicao?: string | null;
          descricao?: string | null;
          ativo?: boolean;
        };
      };
    };
  };
}