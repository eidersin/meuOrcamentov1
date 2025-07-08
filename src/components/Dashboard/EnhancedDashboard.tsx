import React, { useState, useEffect, useMemo } from 'react';
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign,
  PieChart as PieChartIcon,
  Target,
  CreditCard,
  AlertCircle,
  Calendar,
  Zap,
  Wallet,
  TrendingUp as Growth,
  Percent,
  Plus,
  ArrowLeftRight,
  BarChart3,
  Eye,
  Clock,
  CheckCircle,
  // <<< MUDANÇA: Ícones adicionados para os novos insights.
  PiggyBank,
  Info,
  Scale
} from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, LineChart, Line, XAxis, YAxis, CartesianGrid, BarChart, Bar } from 'recharts';
import { DatabaseService } from '../../lib/database';
import { AuthService } from '../../lib/auth';
import { formatCurrency, formatDate } from '../../lib/utils';
import { CHART_COLORS } from '../../constants';
import type { DashboardData, FinancialSummary, KPI } from '../../types';

// <<< MUDANÇA: Novo tipo para definir a estrutura de cada insight da IA.
interface AiInsight {
  title: string;
  description: string;
  type: 'positivo' | 'atencao' | 'informativo';
  icon: string;
}

interface EnhancedDashboardProps {
  onNavigate?: (page: string) => void;
}

export function EnhancedDashboard({ onNavigate }: EnhancedDashboardProps) {
  const [data, setData] = useState<DashboardData>({
    kpis: [],
    lancamentos: [],
    categorias: [],
    contas: [],
    metas: [],
    orcamentos: []
  });
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState('month');
  
  // <<< MUDANÇA: O estado agora armazena um array de objetos AiInsight, não uma string.
  const [aiInsights, setAiInsights] = useState<AiInsight[]>([]);
  const [loadingInsights, setLoadingInsights] = useState(false);

  useEffect(() => {
    loadDashboardData();
  }, [timeRange]);

  useEffect(() => {
    // <<< MUDANÇA: Lógica ajustada para chamar apenas uma vez quando os dados estiverem prontos.
    if (data.lancamentos.length > 0 && !loading && aiInsights.length === 0) {
      loadAIInsights();
    }
  }, [data.lancamentos, loading]);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      console.log('🔄 Carregando dados do dashboard...');
      
      const hoje = new Date();
      let dataInicio: string;
      
      switch (timeRange) {
        case 'quarter':
          dataInicio = new Date(hoje.getFullYear(), hoje.getMonth() - 3, 1).toISOString().split('T')[0];
          break;
        case 'year':
          dataInicio = new Date(hoje.getFullYear(), 0, 1).toISOString().split('T')[0];
          break;
        default:
          dataInicio = new Date(hoje.getFullYear(), hoje.getMonth(), 1).toISOString().split('T')[0];
      }
      
      const dataFim = hoje.toISOString().split('T')[0];
      console.log('📅 Período:', { dataInicio, dataFim });

      const [lancamentos, categorias, contas, metas, orcamentos] = await Promise.all([
        DatabaseService.getLancamentos({ dataInicio, dataFim }),
        DatabaseService.getCategorias(),
        DatabaseService.getContas(),
        DatabaseService.getMetas(),
        DatabaseService.getOrcamentos(hoje.getFullYear(), hoje.getMonth() + 1)
      ]);

      console.log('📊 Dados carregados:', {
        lancamentos: lancamentos.length,
        categorias: categorias.length,
        contas: contas.length,
        metas: metas.length,
        orcamentos: orcamentos.length
      });

      setData({ 
        kpis: calculateKPIs({ lancamentos, categorias, contas, metas, orcamentos }),
        lancamentos, 
        categorias, 
        contas, 
        metas, 
        orcamentos 
      });
      
    } catch (error) {
      console.error('❌ Erro ao carregar dados do dashboard:', error);
      if (error instanceof Error && error.message === 'Usuário não autenticado') {
        await AuthService.signOut();
        return;
      }
    } finally {
      setLoading(false);
    }
  };

  // <<< MUDANÇA: Função atualizada para processar a resposta JSON da IA.
  const loadAIInsights = async () => {
    if (loadingInsights) return; // Evita chamadas duplicadas
    try {
      setLoadingInsights(true);
      
      const dadosFinanceiros = {
        receitas: resumoFinanceiro.receitas,
        despesas: resumoFinanceiro.despesas,
        saldo: resumoFinanceiro.saldo,
        taxaPoupanca: resumoFinanceiro.taxaPoupanca,
        gastoDiarioMedio: resumoFinanceiro.gastoDiarioMedio,
        patrimonioLiquido: resumoFinanceiro.patrimonioLiquido,
        totalContas: data.contas.length,
        totalLancamentos: data.lancamentos.length,
        categoriasMaisGastas: dadosGraficoPizza.slice(0, 3).map(c => c.nome),
        periodo: timeRange === 'month' ? 'mês atual' : timeRange === 'quarter' ? 'últimos 3 meses' : 'ano atual'
      };

      const { AzureOpenAIService } = await import('../../lib/azureOpenAI');
      const insightsString = await AzureOpenAIService.analisarGastos(dadosFinanceiros);
      
      const insightsArray = JSON.parse(insightsString);
      setAiInsights(insightsArray);

    } catch (error) {
      console.error('Erro ao carregar ou processar insights da IA:', error);
      setAiInsights([{ 
          title: "Insights em breve", 
          description: "Continue registrando suas finanças para receber análises detalhadas.", 
          type: 'informativo', 
          icon: 'Info' 
      }]);
    } finally {
      setLoadingInsights(false);
    }
  };

  const calculateKPIs = (dashboardData: Omit<DashboardData, 'kpis'>): KPI[] => {
    const { lancamentos, contas } = dashboardData;
    
    const receitas = lancamentos
      .filter(l => l.tipo === 'RECEITA' && l.status === 'CONFIRMADO')
      .reduce((sum, l) => sum + l.valor, 0);
      
    const despesas = lancamentos
      .filter(l => l.tipo === 'DESPESA' && l.status === 'CONFIRMADO')
      .reduce((sum, l) => sum + l.valor, 0);
      
    const saldo = receitas - despesas;
    
    const saldoLiquidoTotal = contas.reduce((sum, conta) => sum + conta.saldo_atual, 0);
    
    return [
      { label: 'Receitas do Período', value: formatCurrency(receitas), change: receitas > 0 ? 1 : 0, trend: receitas > 0 ? 'up' : 'stable', color: 'text-green-600', icon: 'TrendingUp' },
      { label: 'Despesas do Período', value: formatCurrency(despesas), change: despesas > 0 ? -1 : 0, trend: despesas > 0 ? 'down' : 'stable', color: 'text-red-600', icon: 'TrendingDown' },
      { label: 'Saldo do Período', value: formatCurrency(saldo), change: saldo >= 0 ? 1 : -1, trend: saldo >= 0 ? 'up' : 'down', color: saldo >= 0 ? 'text-green-600' : 'text-red-600', icon: 'DollarSign' },
      { label: 'Saldo Total das Contas', value: formatCurrency(saldoLiquidoTotal), change: saldoLiquidoTotal >= 0 ? 1 : -1, trend: saldoLiquidoTotal >= 0 ? 'up' : 'down', color: saldoLiquidoTotal >= 0 ? 'text-green-600' : 'text-red-600', icon: 'Wallet' }
    ];
  };

  const resumoFinanceiro = useMemo((): FinancialSummary => {
    const receitas = data.lancamentos
      .filter(l => l.tipo === 'RECEITA' && l.status === 'CONFIRMADO')
      .reduce((sum, l) => sum + l.valor, 0);
      
    const despesas = data.lancamentos
      .filter(l => l.tipo === 'DESPESA' && l.status === 'CONFIRMADO')
      .reduce((sum, l) => sum + l.valor, 0);
      
    const saldo = receitas - despesas;
    const taxaPoupanca = receitas > 0 ? ((receitas - despesas) / receitas) * 100 : 0;
    
    const diasNoMes = new Date().getDate();
    const gastoDiarioMedio = despesas / diasNoMes;
    
    const patrimonioLiquido = data.contas.reduce((sum, conta) => sum + conta.saldo_atual, 0);
    
    const totalLimiteCredito = data.contas.reduce((sum, conta) => {
      return sum + (conta.limite_credito || 0);
    }, 0);
    
    const totalUsadoCartao = data.lancamentos
      .filter(l => l.tipo === 'DESPESA' && l.status === 'CONFIRMADO' && l.cartao_credito_usado)
      .reduce((sum, l) => sum + l.valor, 0);
    
    const limiteDisponivelCartao = totalLimiteCredito - totalUsadoCartao;
    
    return {
      receitas,
      despesas,
      saldo,
      taxaPoupanca,
      gastoDiarioMedio,
      patrimonioLiquido,
      totalLimiteCredito,
      totalUsadoCartao,
      limiteDisponivelCartao
    };
  }, [data.lancamentos, data.contas]);

  const dadosGraficoPizza = useMemo(() => {
    const despesas = data.lancamentos.filter(l => l.tipo === 'DESPESA' && l.status === 'CONFIRMADO');
    const totalDespesas = despesas.reduce((sum, l) => sum + l.valor, 0);
    
    if (totalDespesas === 0) return [];
    
    const grupos = despesas.reduce((acc, lancamento) => {
      const categoria = data.categorias.find(c => c.id === lancamento.categoria_id);
      if (!categoria) return acc;
      
      if (!acc[categoria.id]) {
        acc[categoria.id] = {
          nome: categoria.nome,
          valor: 0,
          cor: categoria.cor || '#cccccc', // Adicionado fallback de cor
        };
      }
      
      acc[categoria.id].valor += lancamento.valor;
      return acc;
    }, {} as Record<string, { nome: string; valor: number; cor: string }>);
    
    return Object.values(grupos)
      .map(grupo => ({
        ...grupo,
        porcentagem: (grupo.valor / totalDespesas) * 100,
      }))
      .sort((a, b) => b.valor - a.valor)
      .slice(0, 6);
  }, [data.lancamentos, data.categorias]);

  // <<< MUDANÇA: Função expandida para incluir os novos ícones.
  const getIconComponent = (iconName: string) => {
    const icons = {
      DollarSign,
      Percent,
      Calendar,
      Wallet,
      TrendingUp: Growth,
      TrendingDown,
      Target,
      CreditCard,
      AlertCircle,
      PiggyBank,
      Info,
      Scale
    };
    return icons[iconName as keyof typeof icons] || Info;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 lg:space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl lg:text-4xl font-bold text-gray-900 dark:text-white">Dashboard Financeiro</h1>
          <p className="text-gray-600 dark:text-gray-300 mt-2">Visão completa das suas finanças</p>
        </div>
        
        <select
          value={timeRange}
          onChange={(e) => setTimeRange(e.target.value)}
          className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
        >
          <option value="month">Este mês</option>
          <option value="quarter">Últimos 3 meses</option>
          <option value="year">Este ano</option>
        </select>
      </div>

      {/* Ações Rápidas */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-4 lg:p-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">⚡ Ações Rápidas</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 lg:gap-4">
          <button
            onClick={() => onNavigate?.('lancamentos')}
            className="flex flex-col items-center p-4 bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/30 rounded-xl transition-all duration-200 group"
          >
            <Plus className="w-6 h-6 text-blue-600 mb-2 group-hover:scale-110 transition-transform" />
            <span className="text-sm font-medium text-blue-700 dark:text-blue-300 text-center">Novo Lançamento</span>
          </button>
          
          <button
            onClick={() => onNavigate?.('transferencias')}
            className="flex flex-col items-center p-4 bg-green-50 dark:bg-green-900/20 hover:bg-green-100 dark:hover:bg-green-900/30 rounded-xl transition-all duration-200 group"
          >
            <ArrowLeftRight className="w-6 h-6 text-green-600 mb-2 group-hover:scale-110 transition-transform" />
            <span className="text-sm font-medium text-green-700 dark:text-green-300 text-center">Transferência</span>
          </button>
          
          <button
            onClick={() => onNavigate?.('relatorios')}
            className="flex flex-col items-center p-4 bg-purple-50 dark:bg-purple-900/20 hover:bg-purple-100 dark:hover:bg-purple-900/30 rounded-xl transition-all duration-200 group"
          >
            <BarChart3 className="w-6 h-6 text-purple-600 mb-2 group-hover:scale-110 transition-transform" />
            <span className="text-sm font-medium text-purple-700 dark:text-purple-300 text-center">Relatórios</span>
          </button>
          
          <button
            onClick={() => onNavigate?.('metas')}
            className="flex flex-col items-center p-4 bg-orange-50 dark:bg-orange-900/20 hover:bg-orange-100 dark:hover:bg-orange-900/30 rounded-xl transition-all duration-200 group"
          >
            <Target className="w-6 h-6 text-orange-600 mb-2 group-hover:scale-110 transition-transform" />
            <span className="text-sm font-medium text-orange-700 dark:text-orange-300 text-center">Metas</span>
          </button>
        </div>
      </div>

      {/* KPIs Principais */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
        {data.kpis.map((kpi, index) => {
          const IconComponent = getIconComponent(kpi.icon || 'DollarSign');
          
          return (
            <div key={index} className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-4 lg:p-6 hover:shadow-lg transition-all duration-300">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-300 mb-1">{kpi.label}</p>
                  <p className={`text-2xl lg:text-3xl font-bold ${kpi.color} dark:${kpi.color.replace('text-', 'text-')}`}>{kpi.value}</p>
                  {kpi.change !== undefined && (
                    <div className="flex items-center space-x-1 mt-2">
                      {kpi.trend === 'up' && <TrendingUp className="w-4 h-4 text-green-600" />}
                      {kpi.trend === 'down' && <TrendingDown className="w-4 h-4 text-red-600" />}
                      {kpi.trend === 'stable' && <div className="w-4 h-4" />}
                      <span className={`text-xs ${
                        kpi.trend === 'up' ? 'text-green-600' : 
                        kpi.trend === 'down' ? 'text-red-600' : 'text-gray-600 dark:text-gray-400'
                      }`}>
                        {kpi.trend === 'up' ? 'Positivo' : 
                          kpi.trend === 'down' ? 'Negativo' : 'Estável'}
                      </span>
                    </div>
                  )}
                </div>
                <div className={`w-12 h-12 lg:w-14 lg:h-14 rounded-xl flex items-center justify-center ${
                  kpi.trend === 'up' ? 'bg-green-50 dark:bg-green-900/20' : 
                  kpi.trend === 'down' ? 'bg-red-50 dark:bg-red-900/20' : 'bg-blue-50 dark:bg-blue-900/20'
                }`}>
                  <IconComponent className={`w-6 h-6 lg:w-7 lg:h-7 ${
                    kpi.trend === 'up' ? 'text-green-600' : 
                    kpi.trend === 'down' ? 'text-red-600' : 'text-blue-600'
                  }`} />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* <<< MUDANÇA: Bloco de renderização dos Insights Inteligentes completamente atualizado */}
      <div className="bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 rounded-xl border border-purple-200 dark:border-purple-800 p-4 lg:p-6">
        <div className="flex items-center space-x-2 mb-4">
          <Zap className="w-5 h-5 text-purple-600" />
          <h2 className="text-lg lg:text-xl font-semibold text-gray-900 dark:text-white">🤖 Insights Inteligentes</h2>
        </div>
        
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-purple-200 dark:border-purple-700 min-h-[120px] flex items-center">
          {loadingInsights ? (
            <div className="flex items-center space-x-3">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-purple-600"></div>
              <span className="text-gray-600 dark:text-gray-300">Analisando suas finanças com IA...</span>
            </div>
          ) : (
            <div className="flex flex-col lg:flex-row flex-wrap gap-4 w-full">
              {Array.isArray(aiInsights) && aiInsights.length > 0 ? aiInsights.map((insight, index) => {
                
                const styleConfig = {
                  positivo: {
                    container: 'bg-green-50 dark:bg-green-900/30 border-green-200 dark:border-green-700',
                    icon: 'text-green-600 dark:text-green-400',
                    text: 'text-green-800 dark:text-green-200'
                  },
                  atencao: {
                    container: 'bg-yellow-50 dark:bg-yellow-900/30 border-yellow-200 dark:border-yellow-700',
                    icon: 'text-yellow-600 dark:text-yellow-400',
                    text: 'text-yellow-800 dark:text-yellow-200'
                  },
                  informativo: {
                    container: 'bg-blue-50 dark:bg-blue-900/30 border-blue-200 dark:border-blue-700',
                    icon: 'text-blue-600 dark:text-blue-400',
                    text: 'text-blue-800 dark:text-blue-200'
                  },
                };

                const currentStyle = styleConfig[insight.type] || styleConfig.informativo;
                const IconComponent = getIconComponent(insight.icon);

                return (
                  <div key={index} className={`flex-1 min-w-[240px] p-4 rounded-xl border ${currentStyle.container} transition-all`}>
                    <div className={`flex items-center gap-3 mb-1`}>
                      <IconComponent className={`w-6 h-6 flex-shrink-0 ${currentStyle.icon}`} />
                      <h4 className={`font-semibold ${currentStyle.text}`}>{insight.title}</h4>
                    </div>
                    <p className={`text-sm pl-9 ${currentStyle.text}`}>{insight.description}</p>
                  </div>
                );
              }) : (
                <p className="text-gray-500">Não há insights disponíveis no momento.</p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Gráficos */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 lg:gap-8">
        {/* Gráfico de Despesas por Categoria */}
        {/* Gráfico de Despesas por Categoria */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-4 lg:p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Despesas por Categoria</h3>
          
          {dadosGraficoPizza.length > 0 ? (
            <div className="w-full">
              <div className="h-48 sm:h-64 w-full mb-4">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={dadosGraficoPizza}
                      cx="50%"
                      cy="50%"
                      innerRadius={40}
                      outerRadius={80}
                      paddingAngle={2}
                      dataKey="valor"
                      nameKey="nome" // <<< CORREÇÃO APLICADA AQUI
                    >
                      {dadosGraficoPizza.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.cor} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value: number) => formatCurrency(value)}
                      contentStyle={{ backgroundColor: 'rgba(255, 255, 255, 0.8)', border: '1px solid #ccc', borderRadius: '8px' }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              
              <div className="w-full">
                <div className="max-h-32 sm:max-h-40 overflow-y-auto space-y-2 pr-2">
                  {dadosGraficoPizza.map((item, index) => (
                    <div key={index} className="flex items-center justify-between text-sm py-1">
                      <div className="flex items-center space-x-2 flex-1 min-w-0">
                        <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: item.cor }} />
                        <span className="text-gray-700 dark:text-gray-300 truncate font-medium">{item.nome}</span>
                      </div>
                      <div className="text-right flex-shrink-0 ml-3">
                        <div className="font-semibold text-gray-900 dark:text-white">{formatCurrency(item.valor)}</div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">{item.porcentagem.toFixed(1)}%</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="h-64 sm:h-80 flex items-center justify-center text-gray-500 dark:text-gray-400">
              <div className="text-center">
                <PieChartIcon className="w-12 h-12 mx-auto mb-4 text-gray-300 dark:text-gray-600" />
                <p>Nenhuma despesa encontrada neste período</p>
              </div>
            </div>
          )}
        </div>

        {/* Últimos Lançamentos */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-4 lg:p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Últimos Lançamentos</h3>
            <button onClick={() => onNavigate?.('lancamentos')} className="text-sm text-blue-600 hover:text-blue-700 flex items-center space-x-1">
              <Eye className="w-4 h-4" />
              <span>Ver todos</span>
            </button>
          </div>
          
          {data.lancamentos.length > 0 ? (
            <div className="space-y-3">
              {data.lancamentos.slice(0, 5).map((lancamento) => {
                const categoria = data.categorias.find(c => c.id === lancamento.categoria_id);
                const conta = data.contas.find(c => c.id === lancamento.conta_id);
                
                return (
                  <div key={lancamento.id} className="flex items-center justify-between p-3 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg transition-colors">
                    <div className="flex items-center space-x-3 flex-1 min-w-0">
                      <div className={`w-8 h-8 lg:w-10 lg:h-10 rounded-lg flex items-center justify-center ${
                        lancamento.tipo === 'RECEITA' ? 'bg-green-50 dark:bg-green-900/20' : 'bg-red-50 dark:bg-red-900/20'
                      }`}>
                        {lancamento.tipo === 'RECEITA' ? (
                          <TrendingUp className="w-4 h-4 lg:w-5 lg:h-5 text-green-600" />
                        ) : (
                          <TrendingDown className="w-4 h-4 lg:w-5 lg:h-5 text-red-600" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-2">
                          <p className="font-medium text-gray-900 dark:text-white truncate">{lancamento.descricao}</p>
                          {lancamento.status === 'PENDENTE' && <Clock className="w-4 h-4 text-yellow-500 flex-shrink-0" />}
                          {lancamento.status === 'CONFIRMADO' && <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />}
                        </div>
                        <div className="flex items-center space-x-2 text-sm text-gray-500 dark:text-gray-400">
                          <span>{categoria?.nome}</span>
                          <span>•</span>
                          <span>{conta?.nome}</span>
                          <span>•</span>
                          <span>{formatDate(lancamento.data)}</span>
                        </div>
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className={`font-semibold ${
                        lancamento.tipo === 'RECEITA' ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {lancamento.tipo === 'RECEITA' ? '+' : '-'} {formatCurrency(lancamento.valor)}
                      </p>
                    </div>
                  </div>
                );
              })}
              
              {data.lancamentos.length > 5 && (
                <div className="text-center pt-2">
                  <button onClick={() => onNavigate?.('lancamentos')} className="text-sm text-blue-600 hover:text-blue-700">
                    Ver todos os lançamentos ({data.lancamentos.length})
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center text-gray-500 dark:text-gray-400 py-8">
              <DollarSign className="w-12 h-12 mx-auto mb-4 text-gray-300 dark:text-gray-600" />
              <p>Nenhum lançamento encontrado</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}