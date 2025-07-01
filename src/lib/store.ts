import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface Categoria {
  id: string;
  nome: string;
  tipo: 'RECEITA' | 'DESPESA';
  cor: string;
}

export interface Conta {
  id: string;
  nome: string;
  saldoInicial: number;
}

export interface Lancamento {
  id: string;
  descricao: string;
  valor: number;
  data: string; // ISO format (YYYY-MM-DD)
  tipo: 'RECEITA' | 'DESPESA';
  contaId: string;
  categoriaId: string;
  
  // Campos para controle de parcelas
  compraParceladaId?: string;
  parcelaAtual?: number;
  totalParcelas?: number;
}

interface BudgetStore {
  categorias: Categoria[];
  contas: Conta[];
  lancamentos: Lancamento[];
  
  // Actions para categorias
  adicionarCategoria: (categoria: Omit<Categoria, 'id'>) => void;
  editarCategoria: (id: string, categoria: Partial<Categoria>) => void;
  removerCategoria: (id: string) => void;
  
  // Actions para contas
  adicionarConta: (conta: Omit<Conta, 'id'>) => void;
  editarConta: (id: string, conta: Partial<Conta>) => void;
  removerConta: (id: string) => void;
  
  // Actions para lançamentos
  adicionarLancamento: (lancamento: Omit<Lancamento, 'id'>) => void;
  editarLancamento: (id: string, lancamento: Partial<Lancamento>) => void;
  removerLancamento: (id: string) => void;
  
  // Utility actions
  importarDados: (dados: { categorias: Categoria[]; contas: Conta[]; lancamentos: Lancamento[] }) => void;
  limparTodosDados: () => void;
}

const categoriasDefault: Categoria[] = [
  { id: '1', nome: 'Alimentação', tipo: 'DESPESA', cor: '#EF4444' },
  { id: '2', nome: 'Transporte', tipo: 'DESPESA', cor: '#F97316' },
  { id: '3', nome: 'Casa', tipo: 'DESPESA', cor: '#8B5CF6' },
  { id: '4', nome: 'Saúde', tipo: 'DESPESA', cor: '#EC4899' },
  { id: '5', nome: 'Lazer', tipo: 'DESPESA', cor: '#06B6D4' },
  { id: '6', nome: 'Salário', tipo: 'RECEITA', cor: '#10B981' },
  { id: '7', nome: 'Freelance', tipo: 'RECEITA', cor: '#84CC16' },
];

const contasDefault: Conta[] = [
  { id: '1', nome: 'Conta Corrente', saldoInicial: 0 },
  { id: '2', nome: 'Poupança', saldoInicial: 0 },
];

export const useBudgetStore = create<BudgetStore>()(
  persist(
    (set, get) => ({
      categorias: categoriasDefault,
      contas: contasDefault,
      lancamentos: [],
      
      adicionarCategoria: (categoria) => {
        const novaCategoria: Categoria = {
          ...categoria,
          id: crypto.randomUUID(),
        };
        set((state) => ({
          categorias: [...state.categorias, novaCategoria],
        }));
      },
      
      editarCategoria: (id, categoria) => {
        set((state) => ({
          categorias: state.categorias.map((cat) =>
            cat.id === id ? { ...cat, ...categoria } : cat
          ),
        }));
      },
      
      removerCategoria: (id) => {
        set((state) => ({
          categorias: state.categorias.filter((cat) => cat.id !== id),
        }));
      },
      
      adicionarConta: (conta) => {
        const novaConta: Conta = {
          ...conta,
          id: crypto.randomUUID(),
        };
        set((state) => ({
          contas: [...state.contas, novaConta],
        }));
      },
      
      editarConta: (id, conta) => {
        set((state) => ({
          contas: state.contas.map((acc) =>
            acc.id === id ? { ...acc, ...conta } : acc
          ),
        }));
      },
      
      removerConta: (id) => {
        set((state) => ({
          contas: state.contas.filter((acc) => acc.id !== id),
        }));
      },
      
      adicionarLancamento: (lancamento) => {
        const novoLancamento: Lancamento = {
          ...lancamento,
          id: crypto.randomUUID(),
        };
        set((state) => ({
          lancamentos: [...state.lancamentos, novoLancamento],
        }));
      },
      
      editarLancamento: (id, lancamento) => {
        set((state) => ({
          lancamentos: state.lancamentos.map((lanc) =>
            lanc.id === id ? { ...lanc, ...lancamento } : lanc
          ),
        }));
      },
      
      removerLancamento: (id) => {
        set((state) => ({
          lancamentos: state.lancamentos.filter((lanc) => lanc.id !== id),
        }));
      },
      
      importarDados: (dados) => {
        set({
          categorias: dados.categorias,
          contas: dados.contas,
          lancamentos: dados.lancamentos,
        });
      },
      
      limparTodosDados: () => {
        set({
          categorias: categoriasDefault,
          contas: contasDefault,
          lancamentos: [],
        });
      },
    }),
    {
      name: 'meu-orcamento-storage',
      version: 1,
    }
  )
);