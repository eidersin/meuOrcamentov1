import React, { useState, useEffect, useMemo } from 'react';
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign,
  PieChart as PieChartIcon,
  BarChart3,
  Calendar,
  Target,
  CreditCard,
  AlertCircle,
  CheckCircle2
} from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, LineChart, Line, XAxis, YAxis, CartesianGrid, BarChart, Bar } from 'recharts';
import { DatabaseService } from '../lib/database';
import { formatCurrency, formatDate } from '../lib/utils';

interface DashboardData {
  lancamentos: any[];
  categorias: any[];
  contas: any[];
  metas: any[];
}

function StatCard({ title, value, icon: Icon, trend, color, subtitle, loading = false }: any) {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 hover:shadow-lg transition-all duration-300">
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-gray-600 mb-1">{title}</p>
          {loading ? (
            <div className="h-8 bg-gray-200 rounded animate-pulse"></div>
          ) : (
            <p className={`text-3xl font-bold ${color}`}>{value}</p>
          )}
          {subtitle && (
            <p className="text-xs text-gray-500 mt-1">{subtitle}</p>
          )}
        </div>
        <div className={`w-14 h-14 rounded-xl flex items-center justify-center ${
          trend === 'up' ? 'bg-green-50' : trend === 'down' ? 'bg-red-50' : 'bg-blue-50'
        }`}>
          <Icon className={`w-7 h-7 ${
            trend === 'up' ? 'text-green-600' : trend === 'down' ? 'text-red-600' : 'text-blue-600'
          }`} />
        </div>
      </div>
    </div>
  );
}

function QuickActionCard({ title, description, icon: Icon, color, onClick }: any) {
  return (
    <button
      onClick={onClick}
      className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 hover:shadow-lg transition-all duration-300 text-left group"
    >
      <div className="flex items-center space-x-4">
        <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${color}`}>
          <Icon className="w-6 h-6 text-white" />
        </div>
        <div>
          <h3 className="font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">{title}</h3>
          <p className="text-sm text-gray-600">{description}</p>
        </div>
      </div>
    </button>
  );
}

export function Dashboard() {
  const [data, setData] = useState<DashboardData>({
    lancamentos: [],
    categorias: [],
    contas: [],
    metas: []
  });
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState('month'); // month, quarter, year

  useEffect(() => {
    loadDashboardData();
  }, [timeRange]);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      
      // Calcular datas baseado no período selecionado
      const hoje = new Date();
      let dataInicio: string;
      
      switch (timeRange) {
        case 'quarter':
          dataInicio = new Date(hoje.getFullYear(), hoje.getMonth() - 3, 1).toISOString().split('T')[0];
          break;
        case 'year':
          dataInicio = new Date(hoje.getFullYear(), 0, 1).toISOString().split('T')[0];
          break;
        default: // month
          dataInicio = new Date(hoje.getFullYear(), hoje.getMonth(), 1).toISOString().split('T')[0];
      }
      
      const dataFim = hoje.toISOString().split('T')[0];

      const [lancamentos, categorias, contas, metas] = await Promise.all([
        DatabaseService.getLancamentos({ dataInicio, dataFim }),
        DatabaseService.getCategorias(),
        DatabaseService.getContas(),
        DatabaseService.getMetas()
      ]);

      setData({ lancamentos, categorias, contas, metas });
    } catch (error) {
      console.error('Erro ao carregar dados do dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const resumoFinanceiro = useMemo(() => {
    const receitas = data.lancamentos
      .filter(l => l.tipo === 'RECEITA' && l.status === 'CONFIRMADO')
      .reduce((sum, l) => sum + l.valor, 0);
      
    const despesas = data.lancamentos
      .filter(l => l.tipo === 'DESPESA' && l.status === 'CONFIRMADO')
      .reduce((sum, l) => sum + l.valor, 0);
      
    const saldo = receitas - despesas;
    
    return { receitas, despesas, saldo };
  }, [data.lancamentos]);

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
          cor: categoria.cor,
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
      .slice(0, 6); // Top 6 categorias
  }, [data.lancamentos, data.categorias]);

  const ultimosLancamentos = useMemo(() => {
    return data.lancamentos
      .sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime())
      .slice(0, 5);
  }, [data.lancamentos]);

  const metasProximas = useMemo(() => {
    const hoje = new Date();
    return data.metas
      .filter(m => m.status === 'ATIVA' && new Date(m.data_fim) > hoje)
      .sort((a, b) => new Date(a.data_fim).getTime() - new Date(b.data_fim).getTime())
      .slice(0, 3);
  }, [data.metas]);

  const saldoTotalContas = useMemo(() => {
    return data.contas.reduce((sum, conta) => sum + conta.saldo_atual, 0);
  }, [data.contas]);

  const getTimeRangeLabel = () => {
    switch (timeRange) {
      case 'quarter': return 'Últimos 3 meses';
      case 'year': return 'Este ano';
      default: return 'Este mês';
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-4xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-600 mt-2">Visão geral das suas finanças pessoais</p>
        </div>
        
        <div className="flex items-center space-x-3">
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
          >
            <option value="month">Este mês</option>
            <option value="quarter">Últimos 3 meses</option>
            <option value="year">Este ano</option>
          </select>
        </div>
      </div>

      {/* Stats Cards */}
      <div>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-gray-900">Resumo Financeiro</h2>
          <span className="text-sm text-gray-500">{getTimeRangeLabel()}</span>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard
            title="Saldo do Período"
            value={formatCurrency(resumoFinanceiro.saldo)}
            icon={DollarSign}
            color={resumoFinanceiro.saldo >= 0 ? 'text-green-600' : 'text-red-600'}
            trend={resumoFinanceiro.saldo >= 0 ? 'up' : 'down'}
            subtitle={`${data.lancamentos.length} transações`}
            loading={loading}
          />
          <StatCard
            title="Receitas"
            value={formatCurrency(resumoFinanceiro.receitas)}
            icon={TrendingUp}
            color="text-green-600"
            trend="up"
            subtitle="Entradas do período"
            loading={loading}
          />
          <StatCard
            title="Despesas"
            value={formatCurrency(resumoFinanceiro.despesas)}
            icon={TrendingDown}
            color="text-red-600"
            trend="down"
            subtitle="Saídas do período"
            loading={loading}
          />
          <StatCard
            title="Saldo Total"
            value={formatCurrency(saldoTotalContas)}
            icon={CreditCard}
            color={saldoTotalContas >= 0 ? 'text-blue-600' : 'text-red-600'}
            subtitle={`${data.contas.length} contas`}
            loading={loading}
          />
        </div>
      </div>

      {/* Quick Actions */}
      <div>
        <h2 className="text-xl font-semibold text-gray-900 mb-6">Ações Rápidas</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <QuickActionCard
            title="Novo Lançamento"
            description="Adicionar receita ou despesa"
            icon={DollarSign}
            color="bg-blue-600"
            onClick={() => {/* Navigate to lancamentos */}}
          />
          <QuickActionCard
            title="Nova Meta"
            description="Definir objetivo financeiro"
            icon={Target}
            color="bg-green-600"
            onClick={() => {/* Navigate to metas */}}
          />
          <QuickActionCard
            title="Nova Conta"
            description="Adicionar conta bancária"
            icon={CreditCard}
            color="bg-purple-600"
            onClick={() => {/* Navigate to contas */}}
          />
          <QuickActionCard
            title="Relatórios"
            description="Ver análises detalhadas"
            icon={BarChart3}
            color="bg-orange-600"
            onClick={() => {/* Navigate to relatorios */}}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
        {/* Gráfico de Despesas por Categoria */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-2">
              <PieChartIcon className="w-5 h-5 text-gray-600" />
              <h2 className="text-xl font-semibold text-gray-900">Despesas por Categoria</h2>
            </div>
            <span className="text-sm text-gray-500">{getTimeRangeLabel()}</span>
          </div>
          
          {loading ? (
            <div className="h-80 flex items-center justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : dadosGraficoPizza.length > 0 ? (
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={dadosGraficoPizza}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={120}
                    paddingAngle={2}
                    dataKey="valor"
                  >
                    {dadosGraficoPizza.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.cor} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value: number) => formatCurrency(value)}
                    labelFormatter={(label) => `Categoria: ${label}`}
                  />
                </PieChart>
              </ResponsiveContainer>
              
              <div className="mt-4 space-y-2 max-h-32 overflow-y-auto">
                {dadosGraficoPizza.map((item, index) => (
                  <div key={index} className="flex items-center justify-between text-sm">
                    <div className="flex items-center space-x-2">
                      <div 
                        className="w-3 h-3 rounded-full flex-shrink-0" 
                        style={{ backgroundColor: item.cor }}
                      />
                      <span className="text-gray-700 truncate">{item.nome}</span>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <div className="font-medium text-gray-900">{formatCurrency(item.valor)}</div>
                      <div className="text-gray-500">{item.porcentagem.toFixed(1)}%</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="h-80 flex items-center justify-center text-gray-500">
              <div className="text-center">
                <PieChartIcon className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                <p>Nenhuma despesa encontrada neste período</p>
              </div>
            </div>
          )}
        </div>

        {/* Últimos Lançamentos */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">Últimos Lançamentos</h2>
          
          {loading ? (
            <div className="space-y-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-gray-200 rounded-lg animate-pulse"></div>
                  <div className="flex-1">
                    <div className="h-4 bg-gray-200 rounded animate-pulse mb-2"></div>
                    <div className="h-3 bg-gray-200 rounded animate-pulse w-2/3"></div>
                  </div>
                  <div className="h-4 bg-gray-200 rounded animate-pulse w-20"></div>
                </div>
              ))}
            </div>
          ) : ultimosLancamentos.length > 0 ? (
            <div className="space-y-4">
              {ultimosLancamentos.map((lancamento) => {
                const categoria = data.categorias.find(c => c.id === lancamento.categoria_id);
                return (
                  <div key={lancamento.id} className="flex items-center justify-between p-3 hover:bg-gray-50 rounded-xl transition-colors">
                    <div className="flex items-center space-x-3">
                      <div 
                        className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
                        style={{ backgroundColor: categoria?.cor + '20' }}
                      >
                        <div 
                          className="w-4 h-4 rounded-full"
                          style={{ backgroundColor: categoria?.cor }}
                        />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-gray-900 truncate">{lancamento.descricao}</p>
                        <p className="text-sm text-gray-500">
                          {formatDate(lancamento.data)} • {categoria?.nome}
                        </p>
                      </div>
                    </div>
                    <div className={`font-semibold flex-shrink-0 ${
                      lancamento.tipo === 'RECEITA' ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {lancamento.tipo === 'RECEITA' ? '+' : '-'} {formatCurrency(lancamento.valor)}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center text-gray-500 py-8">
              <DollarSign className="w-12 h-12 mx-auto mb-4 text-gray-300" />
              <p>Nenhum lançamento encontrado</p>
              <p className="text-sm mt-1">Comece adicionando suas primeiras transações!</p>
            </div>
          )}
        </div>
      </div>

      {/* Metas e Contas */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
        {/* Metas Próximas */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center space-x-2 mb-6">
            <Target className="w-5 h-5 text-gray-600" />
            <h2 className="text-xl font-semibold text-gray-900">Metas em Andamento</h2>
          </div>
          
          {loading ? (
            <div className="space-y-4">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="p-4 border border-gray-200 rounded-lg">
                  <div className="h-4 bg-gray-200 rounded animate-pulse mb-2"></div>
                  <div className="h-2 bg-gray-200 rounded animate-pulse mb-2"></div>
                  <div className="h-3 bg-gray-200 rounded animate-pulse w-1/2"></div>
                </div>
              ))}
            </div>
          ) : metasProximas.length > 0 ? (
            <div className="space-y-4">
              {metasProximas.map((meta) => {
                const progress = meta.valor_meta > 0 ? (meta.valor_atual / meta.valor_meta) * 100 : 0;
                const isCompleted = progress >= 100;
                
                return (
                  <div key={meta.id} className="p-4 border border-gray-200 rounded-lg hover:border-blue-300 transition-colors">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-medium text-gray-900">{meta.nome}</h3>
                      {isCompleted ? (
                        <CheckCircle2 className="w-5 h-5 text-green-600" />
                      ) : (
                        <span className="text-sm text-gray-500">{progress.toFixed(1)}%</span>
                      )}
                    </div>
                    
                    <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
                      <div 
                        className={`h-2 rounded-full transition-all duration-300 ${
                          isCompleted ? 'bg-green-500' : 'bg-blue-500'
                        }`}
                        style={{ width: `${Math.min(progress, 100)}%` }}
                      />
                    </div>
                    
                    <div className="flex justify-between text-sm text-gray-600">
                      <span>{formatCurrency(meta.valor_atual)}</span>
                      <span>{formatCurrency(meta.valor_meta)}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center text-gray-500 py-8">
              <Target className="w-12 h-12 mx-auto mb-4 text-gray-300" />
              <p>Nenhuma meta ativa</p>
              <p className="text-sm mt-1">Defina seus objetivos financeiros!</p>
            </div>
          )}
        </div>

        {/* Resumo das Contas */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center space-x-2 mb-6">
            <CreditCard className="w-5 h-5 text-gray-600" />
            <h2 className="text-xl font-semibold text-gray-900">Suas Contas</h2>
          </div>
          
          {loading ? (
            <div className="space-y-4">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-gray-200 rounded-lg animate-pulse"></div>
                    <div className="h-4 bg-gray-200 rounded animate-pulse w-24"></div>
                  </div>
                  <div className="h-4 bg-gray-200 rounded animate-pulse w-20"></div>
                </div>
              ))}
            </div>
          ) : data.contas.length > 0 ? (
            <div className="space-y-3">
              {data.contas.slice(0, 5).map((conta) => (
                <div key={conta.id} className="flex items-center justify-between p-3 hover:bg-gray-50 rounded-lg transition-colors">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center">
                      <CreditCard className="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{conta.nome}</p>
                      <p className="text-sm text-gray-500">{conta.tipo}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={`font-semibold ${
                      conta.saldo_atual >= 0 ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {formatCurrency(conta.saldo_atual)}
                    </p>
                  </div>
                </div>
              ))}
              
              {data.contas.length > 5 && (
                <div className="text-center pt-2">
                  <button className="text-sm text-blue-600 hover:text-blue-700">
                    Ver todas as contas ({data.contas.length})
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center text-gray-500 py-8">
              <CreditCard className="w-12 h-12 mx-auto mb-4 text-gray-300" />
              <p>Nenhuma conta cadastrada</p>
              <p className="text-sm mt-1">Adicione suas contas bancárias!</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}