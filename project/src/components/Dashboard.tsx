import React, { useMemo } from 'react';
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign,
  PieChart as PieChartIcon,
  BarChart3,
  Calendar,
  Target
} from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend, LineChart, Line, XAxis, YAxis, CartesianGrid, BarChart, Bar } from 'recharts';
import { useBudgetStore } from '../lib/store';
import { 
  getCurrentMonthTransactions, 
  calculateFinancialSummary, 
  groupExpensesByCategory,
  formatCurrency,
  formatDate,
  getMonthlyEvolution,
  getTopCategories
} from '../lib/utils';

function StatCard({ title, value, icon: Icon, trend, color, subtitle }: any) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-all duration-200">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <p className={`text-2xl font-bold ${color}`}>{value}</p>
          {subtitle && (
            <p className="text-xs text-gray-500 mt-1">{subtitle}</p>
          )}
        </div>
        <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${
          trend === 'up' ? 'bg-green-50' : trend === 'down' ? 'bg-red-50' : 'bg-blue-50'
        }`}>
          <Icon className={`w-6 h-6 ${
            trend === 'up' ? 'text-green-600' : trend === 'down' ? 'text-red-600' : 'text-blue-600'
          }`} />
        </div>
      </div>
    </div>
  );
}

export function Dashboard() {
  const { lancamentos, categorias, contas } = useBudgetStore();
  
  const transacoesMesAtual = getCurrentMonthTransactions(lancamentos);
  const { receitas, despesas, saldo } = calculateFinancialSummary(transacoesMesAtual);
  const dadosGrafico = groupExpensesByCategory(transacoesMesAtual, categorias);
  const evolucaoMensal = getMonthlyEvolution(lancamentos);
  const topCategorias = getTopCategories(transacoesMesAtual, categorias, 5);
  
  const ultimosLancamentos = useMemo(() => {
    return lancamentos
      .sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime())
      .slice(0, 5);
  }, [lancamentos]);

  const estatisticasGerais = useMemo(() => {
    const totalReceitas = lancamentos.filter(l => l.tipo === 'RECEITA').reduce((sum, l) => sum + l.valor, 0);
    const totalDespesas = lancamentos.filter(l => l.tipo === 'DESPESA').reduce((sum, l) => sum + l.valor, 0);
    const saldoGeral = totalReceitas - totalDespesas;
    
    return { totalReceitas, totalDespesas, saldoGeral };
  }, [lancamentos]);

  const parcelasProximas = useMemo(() => {
    const hoje = new Date();
    const proximoMes = new Date(hoje.getFullYear(), hoje.getMonth() + 1, hoje.getDate());
    
    return lancamentos
      .filter(l => l.totalParcelas && new Date(l.data) <= proximoMes && new Date(l.data) > hoje)
      .sort((a, b) => new Date(a.data).getTime() - new Date(b.data).getTime())
      .slice(0, 3);
  }, [lancamentos]);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-600 mt-2">Visão geral das suas finanças pessoais</p>
      </div>

      {/* Stats Cards - Mês Atual */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Resumo do Mês Atual</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <StatCard
            title="Saldo do Mês"
            value={formatCurrency(saldo)}
            icon={DollarSign}
            color={saldo >= 0 ? 'text-green-600' : 'text-red-600'}
            trend={saldo >= 0 ? 'up' : 'down'}
            subtitle={`${transacoesMesAtual.length} transações`}
          />
          <StatCard
            title="Receitas"
            value={formatCurrency(receitas)}
            icon={TrendingUp}
            color="text-green-600"
            trend="up"
            subtitle="Entradas do mês"
          />
          <StatCard
            title="Despesas"
            value={formatCurrency(despesas)}
            icon={TrendingDown}
            color="text-red-600"
            trend="down"
            subtitle="Saídas do mês"
          />
        </div>
      </div>

      {/* Stats Cards - Geral */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Resumo Geral</h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <StatCard
            title="Saldo Total"
            value={formatCurrency(estatisticasGerais.saldoGeral)}
            icon={Target}
            color={estatisticasGerais.saldoGeral >= 0 ? 'text-green-600' : 'text-red-600'}
            trend={estatisticasGerais.saldoGeral >= 0 ? 'up' : 'down'}
          />
          <StatCard
            title="Total Receitas"
            value={formatCurrency(estatisticasGerais.totalReceitas)}
            icon={TrendingUp}
            color="text-green-600"
            trend="up"
          />
          <StatCard
            title="Total Despesas"
            value={formatCurrency(estatisticasGerais.totalDespesas)}
            icon={TrendingDown}
            color="text-red-600"
            trend="down"
          />
          <StatCard
            title="Transações"
            value={lancamentos.length.toString()}
            icon={BarChart3}
            color="text-blue-600"
            subtitle={`${categorias.length} categorias`}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
        {/* Gráfico de Despesas por Categoria */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center space-x-2 mb-6">
            <PieChartIcon className="w-5 h-5 text-gray-600" />
            <h2 className="text-xl font-semibold text-gray-900">Despesas por Categoria</h2>
            <span className="text-sm text-gray-500">(Mês Atual)</span>
          </div>
          
          {dadosGrafico.length > 0 ? (
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={dadosGrafico}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={120}
                    paddingAngle={2}
                    dataKey="valor"
                  >
                    {dadosGrafico.map((entry, index) => (
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
                {dadosGrafico.map((item, index) => (
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
                <p>Nenhuma despesa encontrada neste mês</p>
              </div>
            </div>
          )}
        </div>

        {/* Evolução Mensal */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center space-x-2 mb-6">
            <BarChart3 className="w-5 h-5 text-gray-600" />
            <h2 className="text-xl font-semibold text-gray-900">Evolução Mensal</h2>
          </div>
          
          {evolucaoMensal.length > 0 ? (
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={evolucaoMensal}>
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
                    strokeWidth={2}
                    name="Receitas"
                  />
                  <Line 
                    type="monotone" 
                    dataKey="despesas" 
                    stroke="#EF4444" 
                    strokeWidth={2}
                    name="Despesas"
                  />
                  <Line 
                    type="monotone" 
                    dataKey="saldo" 
                    stroke="#3B82F6" 
                    strokeWidth={2}
                    name="Saldo"
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-80 flex items-center justify-center text-gray-500">
              <div className="text-center">
                <BarChart3 className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                <p>Dados insuficientes para gráfico</p>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
        {/* Últimos Lançamentos */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">Últimos Lançamentos</h2>
          
          {ultimosLancamentos.length > 0 ? (
            <div className="space-y-4">
              {ultimosLancamentos.map((lancamento) => {
                const categoria = categorias.find(c => c.id === lancamento.categoriaId);
                return (
                  <div key={lancamento.id} className="flex items-center justify-between p-3 hover:bg-gray-50 rounded-lg transition-colors">
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
              <p>Nenhum lançamento encontrado</p>
              <p className="text-sm mt-1">Comece adicionando suas primeiras transações!</p>
            </div>
          )}
        </div>

        {/* Próximas Parcelas */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center space-x-2 mb-6">
            <Calendar className="w-5 h-5 text-gray-600" />
            <h2 className="text-xl font-semibold text-gray-900">Próximas Parcelas</h2>
          </div>
          
          {parcelasProximas.length > 0 ? (
            <div className="space-y-4">
              {parcelasProximas.map((lancamento) => {
                const categoria = categorias.find(c => c.id === lancamento.categoriaId);
                return (
                  <div key={lancamento.id} className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
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
                          {formatDate(lancamento.data)} • Parcela {lancamento.parcelaAtual}/{lancamento.totalParcelas}
                        </p>
                      </div>
                    </div>
                    <div className="font-semibold text-red-600 flex-shrink-0">
                      {formatCurrency(lancamento.valor)}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center text-gray-500 py-8">
              <Calendar className="w-8 h-8 mx-auto mb-2 text-gray-300" />
              <p>Nenhuma parcela próxima</p>
            </div>
          )}
        </div>
      </div>

      {/* Top Categorias */}
      {topCategorias.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">Top Categorias (Mês Atual)</h2>
          
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={topCategorias} layout="horizontal">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" tickFormatter={(value) => formatCurrency(value)} />
                <YAxis dataKey="nome" type="category" width={100} />
                <Tooltip 
                  formatter={(value: number) => formatCurrency(value)}
                  labelFormatter={(label) => `Categoria: ${label}`}
                />
                <Bar dataKey="valor" fill="#3B82F6" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  );
}