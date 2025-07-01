import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

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
        };
        Update: {
          nome?: string;
          tipo?: 'RECEITA' | 'DESPESA';
          cor?: string;
          icone?: string;
          descricao?: string | null;
          ativa?: boolean;
          ordem?: number;
        };
      };
      contas: {
        Row: {
          id: string;
          user_id: string;
          nome: string;
          tipo: 'CORRENTE' | 'POUPANCA' | 'INVESTIMENTO' | 'CARTEIRA' | 'CARTAO_CREDITO';
          saldo_inicial: number;
          saldo_atual: number;
          limite_credito: number | null;
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
          tipo?: 'CORRENTE' | 'POUPANCA' | 'INVESTIMENTO' | 'CARTEIRA' | 'CARTAO_CREDITO';
          saldo_inicial?: number;
          limite_credito?: number | null;
          banco?: string | null;
          agencia?: string | null;
          conta?: string | null;
          ativa?: boolean;
          incluir_relatorios?: boolean;
          cor?: string;
        };
        Update: {
          nome?: string;
          tipo?: 'CORRENTE' | 'POUPANCA' | 'INVESTIMENTO' | 'CARTEIRA' | 'CARTAO_CREDITO';
          saldo_inicial?: number;
          limite_credito?: number | null;
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
    };
  };
}