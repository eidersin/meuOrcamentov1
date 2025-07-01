import { format, startOfMonth, endOfMonth, addMonths, parseISO, subMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Lancamento, Categoria } from './store';

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
}

export function formatDate(date: string | Date): string {
  const dateObj = typeof date === 'string' ? parseISO(date) : date;
  return format(dateObj, 'dd/MM/yyyy', { locale: ptBR });
}

export function formatDateForInput(date: string | Date): string {
  const dateObj = typeof date === 'string' ? parseISO(date) : date;
  return format(dateObj, 'yyyy-MM-dd');
}

export function getCurrentMonthTransactions(lancamentos: Lancamento[]): Lancamento[] {
  const hoje = new Date();
  const inicioMes = startOfMonth(hoje);
  const fimMes = endOfMonth(hoje);
  
  return lancamentos.filter((lancamento) => {
    const dataLancamento = parseISO(lancamento.data);
    return dataLancamento >= inicioMes && dataLancamento <= fimMes;
  });
}

export function calculateFinancialSummary(lancamentos: Lancamento[]) {
  const receitas = lancamentos
    .filter((l) => l.tipo === 'RECEITA')
    .reduce((sum, l) => sum + l.valor, 0);
    
  const despesas = lancamentos
    .filter((l) => l.tipo === 'DESPESA')
    .reduce((sum, l) => sum + l.valor, 0);
    
  const saldo = receitas - despesas;
  
  return { receitas, despesas, saldo };
}

export function groupExpensesByCategory(
  lancamentos: Lancamento[],
  categorias: Categoria[]
): Array<{ nome: string; valor: number; cor: string; porcentagem: number }> {
  const despesas = lancamentos.filter((l) => l.tipo === 'DESPESA');
  const totalDespesas = despesas.reduce((sum, l) => sum + l.valor, 0);
  
  if (totalDespesas === 0) return [];
  
  const grupos = despesas.reduce((acc, lancamento) => {
    const categoria = categorias.find((c) => c.id === lancamento.categoriaId);
    if (!categoria) return acc;
    
    if (!acc[categoria.id]) {
      acc[categoria.id] = {
        nome: categoria.nome,
        valor: 0,
        cor: categoria.cor,
        porcentagem: 0,
      };
    }
    
    acc[categoria.id].valor += lancamento.valor;
    return acc;
  }, {} as Record<string, { nome: string; valor: number; cor: string; porcentagem: number }>);
  
  return Object.values(grupos)
    .map((grupo) => ({
      ...grupo,
      porcentagem: (grupo.valor / totalDespesas) * 100,
    }))
    .sort((a, b) => b.valor - a.valor);
}

export function getMonthlyEvolution(lancamentos: Lancamento[]): Array<{
  mes: string;
  receitas: number;
  despesas: number;
  saldo: number;
}> {
  const hoje = new Date();
  const meses: Array<{ mes: string; receitas: number; despesas: number; saldo: number }> = [];
  
  // Últimos 6 meses
  for (let i = 5; i >= 0; i--) {
    const mesAtual = subMonths(hoje, i);
    const inicioMes = startOfMonth(mesAtual);
    const fimMes = endOfMonth(mesAtual);
    
    const transacoesMes = lancamentos.filter((lancamento) => {
      const dataLancamento = parseISO(lancamento.data);
      return dataLancamento >= inicioMes && dataLancamento <= fimMes;
    });
    
    const { receitas, despesas, saldo } = calculateFinancialSummary(transacoesMes);
    
    meses.push({
      mes: format(mesAtual, 'MMM/yy', { locale: ptBR }),
      receitas,
      despesas,
      saldo,
    });
  }
  
  return meses;
}

export function getTopCategories(
  lancamentos: Lancamento[],
  categorias: Categoria[],
  limit: number = 5
): Array<{ nome: string; valor: number; cor: string }> {
  const despesas = lancamentos.filter((l) => l.tipo === 'DESPESA');
  
  const grupos = despesas.reduce((acc, lancamento) => {
    const categoria = categorias.find((c) => c.id === lancamento.categoriaId);
    if (!categoria) return acc;
    
    if (!acc[categoria.id]) {
      acc[categoria.id] = {
        nome: categoria.nome,
        valor: 0,
        cor: categoria.cor,
      };
    }
    
    acc[categoria.id].valor += lancamento.valor;
    return acc;
  }, {} as Record<string, { nome: string; valor: number; cor: string }>);
  
  return Object.values(grupos)
    .sort((a, b) => b.valor - a.valor)
    .slice(0, limit);
}

export function createParcelaLancamentos(
  dadosBase: Omit<Lancamento, 'id' | 'compraParceladaId' | 'parcelaAtual' | 'totalParcelas'>,
  numeroParcelas: number
): Omit<Lancamento, 'id'>[] {
  const compraParceladaId = crypto.randomUUID();
  const valorParcela = Math.round((dadosBase.valor / numeroParcelas) * 100) / 100; // Arredonda para 2 casas decimais
  const dataBase = parseISO(dadosBase.data);
  
  const parcelas: Omit<Lancamento, 'id'>[] = [];
  
  for (let i = 0; i < numeroParcelas; i++) {
    const dataParcela = addMonths(dataBase, i);
    
    // Para a última parcela, ajusta o valor para compensar arredondamentos
    const valorFinal = i === numeroParcelas - 1 
      ? dadosBase.valor - (valorParcela * (numeroParcelas - 1))
      : valorParcela;
    
    parcelas.push({
      ...dadosBase,
      valor: valorFinal,
      data: format(dataParcela, 'yyyy-MM-dd'),
      descricao: `${dadosBase.descricao} (${i + 1}/${numeroParcelas})`,
      compraParceladaId,
      parcelaAtual: i + 1,
      totalParcelas: numeroParcelas,
    });
  }
  
  return parcelas;
}

export function exportToJson(data: any, filename: string): void {
  const dataStr = JSON.stringify(data, null, 2);
  const blob = new Blob([dataStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  
  URL.revokeObjectURL(url);
}

export function importFromJson(file: File): Promise<any> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target?.result as string);
        resolve(data);
      } catch (error) {
        reject(new Error('Arquivo JSON inválido'));
      }
    };
    
    reader.onerror = () => reject(new Error('Erro ao ler o arquivo'));
    reader.readAsText(file);
  });
}

export function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

export function validateCurrency(value: string): boolean {
  const numValue = parseFloat(value);
  return !isNaN(numValue) && numValue > 0;
}

export function formatPercentage(value: number): string {
  return `${value.toFixed(1)}%`;
}

export function calculateGrowthRate(current: number, previous: number): number {
  if (previous === 0) return current > 0 ? 100 : 0;
  return ((current - previous) / previous) * 100;
}