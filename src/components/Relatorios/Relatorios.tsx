import React, { useState, useEffect, useMemo } from 'react';
import { BarChart3, PieChart, TrendingUp, Calendar, Download, Filter } from 'lucide-react';
import { DatabaseService } from '../../lib/database';
import { AuthService } from '../../lib/auth';
import { formatCurrency, formatDate } from '../../lib/utils';
import { 
  ResponsiveContainer, 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend,
  BarChart,
  Bar,
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  Treemap
} from 'recharts';

export function Relatorios() {
  const [lancamentos, setLancamentos] = useState<any[]>([]);
  const [categorias, setCategorias] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [periodo, setPeriodo] = useState('6meses');
  const [tipoRelatorio, setTipoRelatorio] = useState('fluxo-caixa');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [lancamentosData, categoriasData] = await Promise.all([
        DatabaseService.getLancamentos(),
        DatabaseService.getCategorias()
      ]);
      setLancamentos(lancamentosData);
      setCategorias(categoriasData);
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
      // Handle authentication errors
      if (error instanceof Error && error.message === 'Usuário não autenticado') {
        await AuthService.signOut();
        return;
      }
    } finally {
      setLoading(false);
    }
  };

  const dadosFluxoCaixa = useMemo(() => {
    const hoje = new Date();
    let mesesAtras = 6;
    
    switch (periodo) {
      case '3meses':
        mesesAtras = 3;
        break;
      case '12meses':
        mesesAtras = 12;
        break;
      default:
        mesesAtras = 6;
    }

    const dados = [];
    
    for (let i = mesesAtras - 1; i >= 0; i--) {
      const data = new Date(hoje.getFullYear(), hoje.getMonth() - i, 1);
      const inicioMes = new Date(data.getFullYear(), data.getMonth(), 1);
      const fimMes = new Date(data.getFullYear(), data.getMonth() + 1, 0);
      
      const lancamentosMes = lancamentos.filter(l => {
        const dataLancamento = new Date(l.data);
        return dataLancamento >= inicioMes && dataLancamento <= fimMes && l.status === 'CONFIRMADO';
      });
      
      const receitas = lancamentosMes
        .filter(l => l.tipo === 'RECEITA')
        .reduce((sum, l) => sum + l.valor, 0);
        
      const despesas = lancamentosMes
        .filter(l => l.tipo === 'DESPESA')
        .reduce((sum, l) => sum + l.valor, 0);
      
      dados.push({
        mes: data.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' }),
        receitas,
        despesas,
        saldo: receitas - despesas
      });
    }
    
    return dados;
  }, [lancamentos, periodo]);

  const dadosCategoriasTreemap = useMemo(() => {
    const despesas = lancamentos.filter(l => l.tipo === 'DESPESA' && l.status === 'CONFIRMADO');
    
    const grupos = despesas.reduce((acc, lancamento) => {
      const categoria = categorias.find(c => c.id === lancamento.categoria_id);
      const nomeCategoria = categoria?.nome || 'Sem categoria';
      
      if (!acc[nomeCategoria]) {
        acc[nomeCategoria] = {
          name: nomeCategoria,
          value: 0,
          color: categoria?.cor || '#6B7280'
        };
      }
      
      acc[nomeCategoria].value += lancamento.valor;
      return acc;
    }, {} as Record<string, any>);
    
    return Object.values(grupos).sort((a: any, b: any) => b.value - a.value);
  }, [lancamentos, categorias]);

  const dadosComparativoMensal = useMemo(() => {
    const hoje = new Date();
    const dados = [];
    
    for (let i = 5; i >= 0; i--) {
      const data = new Date(hoje.getFullYear(), hoje.getMonth() - i, 1);
      const inicioMes = new Date(data.getFullYear(), data.getMonth(), 1);
      const fimMes = new Date(data.getFullYear(), data.getMonth() + 1, 0);
      
      const lancamentosMes = lancamentos.filter(l => {
        const dataLancamento = new Date(l.data);
        return dataLancamento >= inicioMes && dataLancamento <= fimMes && l.status === 'CONFIRMADO';
      });
      
      const receitas = lancamentosMes
        .filter(l => l.tipo === 'RECEITA')
        .reduce((sum, l) => sum + l.valor, 0);
        
      const despesas = lancamentosMes
        .filter(l => l.tipo === 'DESPESA')
        .reduce((sum, l) => sum + l.valor, 0);
      
      dados.push({
        mes: data.toLocaleDateString('pt-BR', { month: 'short' }),
        receitas,
        despesas
      });
    }
    
    return dados;
  }, [lancamentos]);

  const renderFluxoCaixa = () => (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Fluxo de Caixa</h3>
      <div className="h-80">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={dadosFluxoCaixa}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="mes" />
            <YAxis tickFormatter={(value) => formatCurrency(value)} />
            <Tooltip 
              formatter={(value: number, name: string) => [formatCurrency(value), name]}
              labelFormatter={(label) => `Mês: ${label}`}
            />
            <Legend />
            <Line 
              type="monotone" 
              dataKey="receitas" 
              stroke="#10B981" 
              strokeWidth={3}
              name="Receitas"
            />
            <Line 
              type="monotone" 
              dataKey="despesas" 
              stroke="#EF4444" 
              strokeWidth={3}
              name="Despesas"
            />
            <Line 
              type="monotone" 
              dataKey="saldo" 
              stroke="#3B82F6" 
              strokeWidth={3}
              name="Saldo"
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );

  const renderComparativoMensal = () => (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Comparativo Mensal</h3>
      <div className="h-80">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={dadosComparativoMensal}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="mes" />
            <YAxis tickFormatter={(value) => formatCurrency(value)} />
            <Tooltip 
              formatter={(value: number, name: string) => [formatCurrency(value), name]}
            />
            <Legend />
            <Bar dataKey="receitas" fill="#10B981" name="Receitas" />
            <Bar dataKey="despesas" fill="#EF4444" name="Despesas" />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );

  const renderOndeVaiDinheiro = () => (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Onde meu dinheiro foi?</h3>
      <div className="h-80">
        <ResponsiveContainer width="100%" height="100%">
          <Treemap
            data={dadosCategoriasTreemap}
            dataKey="value"
            aspectRatio={4/3}
            stroke="#fff"
            fill="#8884d8"
          >
            <Tooltip 
              formatter={(value: number) => formatCurrency(value)}
              labelFormatter={(label) => `Categoria: ${label}`}
            />
          </Treemap>
        </ResponsiveContainer>
      </div>
      
      {/* Lista das categorias */}
      <div className="mt-4 grid grid-cols-2 gap-2">
        {dadosCategoriasTreemap.slice(0, 8).map((item: any, index) => (
          <div key={index} className="flex items-center space-x-2 text-sm">
            <div 
              className="w-3 h-3 rounded-full" 
              style={{ backgroundColor: item.color }}
            />
            <span className="text-gray-700 truncate">{item.name}</span>
            <span className="font-medium text-gray-900">{formatCurrency(item.value)}</span>
          </div>
        ))}
      </div>
    </div>
  );

  const exportarRelatorio = () => {
    const dados = {
      tipo: tipoRelatorio,
      periodo: periodo,
      dataGeracao: new Date().toISOString(),
      fluxoCaixa: dadosFluxoCaixa,
      comparativoMensal: dadosComparativoMensal,
      categorias: dadosCategoriasTreemap
    };
    
    const dataStr = JSON.stringify(dados, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = `relatorio-${tipoRelatorio}-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Relatórios</h1>
          <p className="text-gray-600 mt-2">Análises detalhadas das suas finanças</p>
        </div>
        
        <div className="flex items-center space-x-3">
          <button
            onClick={exportarRelatorio}
            className="flex items-center space-x-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors"
          >
            <Download className="w-4 h-4" />
            <span>Exportar</span>
          </button>
        </div>
      </div>

      {/* Filtros */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Tipo de Relatório
            </label>
            <select
              value={tipoRelatorio}
              onChange={(e) => setTipoRelatorio(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="fluxo-caixa">Fluxo de Caixa</option>
              <option value="comparativo-mensal">Comparativo Mensal</option>
              <option value="onde-vai-dinheiro">Onde meu dinheiro foi?</option>
            </select>
          </div>
          
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Período
            </label>
            <select
              value={periodo}
              onChange={(e) => setPeriodo(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="3meses">Últimos 3 meses</option>
              <option value="6meses">Últimos 6 meses</option>
              <option value="12meses">Últimos 12 meses</option>
            </select>
          </div>
        </div>
      </div>

      {/* Relatórios */}
      <div className="space-y-8">
        {tipoRelatorio === 'fluxo-caixa' && renderFluxoCaixa()}
        {tipoRelatorio === 'comparativo-mensal' && renderComparativoMensal()}
        {tipoRelatorio === 'onde-vai-dinheiro' && renderOndeVaiDinheiro()}
      </div>

      {/* Resumo Estatístico */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Resumo do Período</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="text-center p-4 bg-green-50 rounded-lg">
            <div className="text-2xl font-bold text-green-600">
              {formatCurrency(dadosFluxoCaixa.reduce((sum, item) => sum + item.receitas, 0))}
            </div>
            <div className="text-sm text-gray-600">Total Receitas</div>
          </div>
          
          <div className="text-center p-4 bg-red-50 rounded-lg">
            <div className="text-2xl font-bold text-red-600">
              {formatCurrency(dadosFluxoCaixa.reduce((sum, item) => sum + item.despesas, 0))}
            </div>
            <div className="text-sm text-gray-600">Total Despesas</div>
          </div>
          
          <div className="text-center p-4 bg-blue-50 rounded-lg">
            <div className="text-2xl font-bold text-blue-600">
              {formatCurrency(dadosFluxoCaixa.reduce((sum, item) => sum + item.saldo, 0))}
            </div>
            <div className="text-sm text-gray-600">Saldo Líquido</div>
          </div>
          
          <div className="text-center p-4 bg-purple-50 rounded-lg">
            <div className="text-2xl font-bold text-purple-600">
              {formatCurrency(dadosFluxoCaixa.reduce((sum, item) => sum + item.receitas, 0) / dadosFluxoCaixa.length)}
            </div>
            <div className="text-sm text-gray-600">Média Mensal</div>
          </div>
        </div>
      </div>
    </div>
  );
}