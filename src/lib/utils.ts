import { format, startOfMonth, endOfMonth, addMonths, parseISO, subMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
}

export function formatCurrencyInput(value: string | number): string {
  // Se for número, converte para string formatada
  if (typeof value === 'number') {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  }

  // Remove tudo que não é dígito
  const numericValue = value.replace(/\D/g, '');
  
  // Se vazio, retorna vazio
  if (!numericValue) return '';
  
  // Converte para número (centavos)
  const numberValue = parseInt(numericValue) / 100;
  
  // Formata como moeda brasileira
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(numberValue);
}

export function parseCurrencyInput(value: string | number): number {
  // Se o valor já for um número, podemos simplesmente retorná-lo.
  if (typeof value === 'number') {
    return value;
  }

  // Se for uma string, continuamos com a lógica original.
  // Remove tudo que não é dígito
  const numericValue = value.replace(/\D/g, '');
  
  // Se vazio, retorna 0
  if (!numericValue) return 0;
  
  // Converte para número (centavos para reais)
  return parseInt(numericValue) / 100;
}

export function formatDate(date: string | Date): string {
  const dateObj = typeof date === 'string' ? parseISO(date) : date;
  return format(dateObj, 'dd/MM/yyyy', { locale: ptBR });
}

export function formatDateForInput(date: string | Date): string {
  const dateObj = typeof date === 'string' ? parseISO(date) : date;
  return format(dateObj, 'yyyy-MM-dd');
}

export function formatDateTime(date: string | Date): string {
  const dateObj = typeof date === 'string' ? parseISO(date) : date;
  return format(dateObj, 'dd/MM/yyyy HH:mm', { locale: ptBR });
}

export function formatRelativeDate(date: string | Date): string {
  const dateObj = typeof date === 'string' ? parseISO(date) : date;
  const now = new Date();
  const diffInDays = Math.floor((now.getTime() - dateObj.getTime()) / (1000 * 60 * 60 * 24));
  
  if (diffInDays === 0) return 'Hoje';
  if (diffInDays === 1) return 'Ontem';
  if (diffInDays < 7) return `${diffInDays} dias atrás`;
  if (diffInDays < 30) return `${Math.floor(diffInDays / 7)} semanas atrás`;
  if (diffInDays < 365) return `${Math.floor(diffInDays / 30)} meses atrás`;
  return `${Math.floor(diffInDays / 365)} anos atrás`;
}

export function getCurrentMonthTransactions(lancamentos: any[]): any[] {
  const hoje = new Date();
  const inicioMes = startOfMonth(hoje);
  const fimMes = endOfMonth(hoje);
  
  return lancamentos.filter((lancamento) => {
    const dataLancamento = parseISO(lancamento.data);
    return dataLancamento >= inicioMes && dataLancamento <= fimMes;
  });
}

export function calculateFinancialSummary(lancamentos: any[]) {
  const receitas = lancamentos
    .filter((l) => l.tipo === 'RECEITA' && l.status === 'CONFIRMADO')
    .reduce((sum, l) => sum + l.valor, 0);
    
  const despesas = lancamentos
    .filter((l) => l.tipo === 'DESPESA' && l.status === 'CONFIRMADO')
    .reduce((sum, l) => sum + l.valor, 0);
    
  const saldo = receitas - despesas;
  
  return { receitas, despesas, saldo };
}

export function groupExpensesByCategory(
  lancamentos: any[],
  categorias: any[]
): Array<{ nome: string; valor: number; cor: string; porcentagem: number }> {
  const despesas = lancamentos.filter((l) => l.tipo === 'DESPESA' && l.status === 'CONFIRMADO');
  const totalDespesas = despesas.reduce((sum, l) => sum + l.valor, 0);
  
  if (totalDespesas === 0) return [];
  
  const grupos = despesas.reduce((acc, lancamento) => {
    const categoria = categorias.find((c) => c.id === lancamento.categoria_id);
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

export function getMonthlyEvolution(lancamentos: any[]): Array<{
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
      return dataLancamento >= inicioMes && dataLancamento <= fimMes && lancamento.status === 'CONFIRMADO';
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
  lancamentos: any[],
  categorias: any[],
  limit: number = 5
): Array<{ nome: string; valor: number; cor: string }> {
  const despesas = lancamentos.filter((l) => l.tipo === 'DESPESA' && l.status === 'CONFIRMADO');
  
  const grupos = despesas.reduce((acc, lancamento) => {
    const categoria = categorias.find((c) => c.id === lancamento.categoria_id);
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
  dadosBase: any,
  numeroParcelas: number
): any[] {
  const compraParceladaId = crypto.randomUUID();
  const valorParcela = Math.round((dadosBase.valor / numeroParcelas) * 100) / 100;
  const dataBase = parseISO(dadosBase.data);
  
  const parcelas: any[] = [];
  
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
      compra_parcelada_id: compraParceladaId,
      parcela_atual: i + 1,
      total_parcelas: numeroParcelas,
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

export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout;
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

export function generateId(): string {
  return crypto.randomUUID();
}

export function classNames(...classes: (string | undefined | null | false)[]): string {
  return classes.filter(Boolean).join(' ');
}

export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength) + '...';
}

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

export function isValidDate(date: any): boolean {
  return date instanceof Date && !isNaN(date.getTime());
}

export function getInitials(name: string): string {
  return name
    .split(' ')
    .map(word => word.charAt(0))
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

export function generateColor(): string {
  const colors = [
    '#EF4444', '#F97316', '#F59E0B', '#EAB308', '#84CC16', '#22C55E',
    '#10B981', '#14B8A6', '#06B6D4', '#0EA5E9', '#3B82F6', '#6366F1',
    '#8B5CF6', '#A855F7', '#D946EF', '#EC4899', '#F43F5E', '#64748B'
  ];
  return colors[Math.floor(Math.random() * colors.length)];
}