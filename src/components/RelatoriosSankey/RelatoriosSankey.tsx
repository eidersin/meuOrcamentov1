import React, { useState, useEffect, useMemo } from 'react';
import { BarChart3, Download, Filter, TrendingUp, TrendingDown } from 'lucide-react';
import { DatabaseService } from '../../lib/database';
import { AuthService } from '../../lib/auth';
import { formatCurrency } from '../../lib/utils';

interface SankeyNode {
  id: string;
  name: string;
  value: number;
  color: string;
  type: 'source' | 'target' | 'intermediate';
}

interface SankeyLink {
  source: string;
  target: string;
  value: number;
  color: string;
}

interface SankeyData {
  nodes: SankeyNode[];
  links: SankeyLink[];
}

export function RelatoriosSankey() {
  const [lancamentos, setLancamentos] = useState<any[]>([]);
  const [categorias, setCategorias] = useState<any[]>([]);
  const [contas, setContas] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [periodo, setPeriodo] = useState('month');
  const [tipoFluxo, setTipoFluxo] = useState<'receitas' | 'despesas' | 'completo'>('completo');

  useEffect(() => {
    loadData();
  }, [periodo]);

  const loadData = async () => {
    try {
      setLoading(true);
      
      const hoje = new Date();
      let dataInicio: string;
      
      switch (periodo) {
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

      const [lancamentosData, categoriasData, contasData] = await Promise.all([
        DatabaseService.getLancamentos({ dataInicio, dataFim }),
        DatabaseService.getCategorias(),
        DatabaseService.getContas()
      ]);

      setLancamentos(lancamentosData.filter(l => l.status === 'CONFIRMADO'));
      setCategorias(categoriasData);
      setContas(contasData);
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
      if (error instanceof Error && error.message === 'Usuário não autenticado') {
        await AuthService.signOut();
        return;
      }
    } finally {
      setLoading(false);
    }
  };

  const sankeyData = useMemo((): SankeyData => {
    const nodes: SankeyNode[] = [];
    const links: SankeyLink[] = [];

    if (tipoFluxo === 'receitas' || tipoFluxo === 'completo') {
      // Receitas: Categorias -> Contas
      const receitasPorCategoria = lancamentos
        .filter(l => l.tipo === 'RECEITA')
        .reduce((acc, l) => {
          const categoria = categorias.find(c => c.id === l.categoria_id);
          const conta = contas.find(c => c.id === l.conta_id);
          
          if (categoria && conta) {
            const key = `${categoria.id}-${conta.id}`;
            if (!acc[key]) {
              acc[key] = {
                categoria: categoria.nome,
                categoriaId: categoria.id,
                categoriaColor: categoria.cor,
                conta: conta.nome,
                contaId: conta.id,
                valor: 0
              };
            }
            acc[key].valor += l.valor;
          }
          return acc;
        }, {} as Record<string, any>);

      // Adicionar nós de categorias de receita
      const categoriasReceita = Object.values(receitasPorCategoria).reduce((acc, item: any) => {
        if (!acc[item.categoriaId]) {
          acc[item.categoriaId] = {
            id: `receita-${item.categoriaId}`,
            name: item.categoria,
            value: 0,
            color: item.categoriaColor,
            type: 'source' as const
          };
        }
        acc[item.categoriaId].value += item.valor;
        return acc;
      }, {} as Record<string, SankeyNode>);

      nodes.push(...Object.values(categoriasReceita));

      // Adicionar links de receitas
      Object.values(receitasPorCategoria).forEach((item: any) => {
        links.push({
          source: `receita-${item.categoriaId}`,
          target: `conta-${item.contaId}`,
          value: item.valor,
          color: item.categoriaColor + '80'
        });
      });
    }

    if (tipoFluxo === 'despesas' || tipoFluxo === 'completo') {
      // Despesas: Contas -> Categorias
      const despesasPorCategoria = lancamentos
        .filter(l => l.tipo === 'DESPESA')
        .reduce((acc, l) => {
          const categoria = categorias.find(c => c.id === l.categoria_id);
          const conta = contas.find(c => c.id === l.conta_id);
          
          if (categoria && conta) {
            const key = `${conta.id}-${categoria.id}`;
            if (!acc[key]) {
              acc[key] = {
                categoria: categoria.nome,
                categoriaId: categoria.id,
                categoriaColor: categoria.cor,
                conta: conta.nome,
                contaId: conta.id,
                valor: 0
              };
            }
            acc[key].valor += l.valor;
          }
          return acc;
        }, {} as Record<string, any>);

      // Adicionar nós de categorias de despesa
      const categoriasDespesa = Object.values(despesasPorCategoria).reduce((acc, item: any) => {
        if (!acc[item.categoriaId]) {
          acc[item.categoriaId] = {
            id: `despesa-${item.categoriaId}`,
            name: item.categoria,
            value: 0,
            color: item.categoriaColor,
            type: 'target' as const
          };
        }
        acc[item.categoriaId].value += item.valor;
        return acc;
      }, {} as Record<string, SankeyNode>);

      nodes.push(...Object.values(categoriasDespesa));

      // Adicionar links de despesas
      Object.values(despesasPorCategoria).forEach((item: any) => {
        links.push({
          source: `conta-${item.contaId}`,
          target: `despesa-${item.categoriaId}`,
          value: item.valor,
          color: item.categoriaColor + '80'
        });
      });
    }

    // Adicionar nós de contas
    const contasUsadas = new Set([
      ...links.map(l => l.source).filter(s => s.startsWith('conta-')),
      ...links.map(l => l.target).filter(t => t.startsWith('conta-'))
    ]);

    contasUsadas.forEach(contaId => {
      const conta = contas.find(c => `conta-${c.id}` === contaId);
      if (conta && !nodes.find(n => n.id === contaId)) {
        const valorEntrada = links
          .filter(l => l.target === contaId)
          .reduce((sum, l) => sum + l.value, 0);
        const valorSaida = links
          .filter(l => l.source === contaId)
          .reduce((sum, l) => sum + l.value, 0);

        nodes.push({
          id: contaId,
          name: conta.nome,
          value: Math.max(valorEntrada, valorSaida),
          color: conta.cor,
          type: 'intermediate'
        });
      }
    });

    return { nodes, links };
  }, [lancamentos, categorias, contas, tipoFluxo]);

  const renderSankeyDiagram = () => {
    if (sankeyData.nodes.length === 0) {
      return (
        <div className="h-96 flex items-center justify-center text-gray-500">
          <div className="text-center">
            <BarChart3 className="w-12 h-12 mx-auto mb-4 text-gray-300" />
            <p>Nenhum dado encontrado para o período selecionado</p>
          </div>
        </div>
      );
    }

    // Renderização simplificada do diagrama Sankey
    const maxValue = Math.max(...sankeyData.nodes.map(n => n.value));
    
    return (
      <div className="h-96 p-6 bg-gray-50 rounded-lg">
        <div className="grid grid-cols-3 gap-8 h-full">
          {/* Coluna de Origem (Receitas) */}
          <div className="space-y-4">
            <h4 className="text-sm font-medium text-gray-700 text-center">Origens</h4>
            {sankeyData.nodes
              .filter(n => n.type === 'source')
              .sort((a, b) => b.value - a.value)
              .map(node => (
                <div key={node.id} className="relative">
                  <div 
                    className="rounded-lg p-3 text-white text-sm font-medium"
                    style={{ 
                      backgroundColor: node.color,
                      height: `${Math.max((node.value / maxValue) * 100, 20)}px`,
                      minHeight: '40px'
                    }}
                  >
                    <div className="truncate">{node.name}</div>
                    <div className="text-xs opacity-90">{formatCurrency(node.value)}</div>
                  </div>
                </div>
              ))}
          </div>

          {/* Coluna Central (Contas) */}
          <div className="space-y-4">
            <h4 className="text-sm font-medium text-gray-700 text-center">Contas</h4>
            {sankeyData.nodes
              .filter(n => n.type === 'intermediate')
              .sort((a, b) => b.value - a.value)
              .map(node => (
                <div key={node.id} className="relative">
                  <div 
                    className="rounded-lg p-3 text-white text-sm font-medium"
                    style={{ 
                      backgroundColor: node.color,
                      height: `${Math.max((node.value / maxValue) * 100, 20)}px`,
                      minHeight: '40px'
                    }}
                  >
                    <div className="truncate">{node.name}</div>
                    <div className="text-xs opacity-90">{formatCurrency(node.value)}</div>
                  </div>
                </div>
              ))}
          </div>

          {/* Coluna de Destino (Despesas) */}
          <div className="space-y-4">
            <h4 className="text-sm font-medium text-gray-700 text-center">Destinos</h4>
            {sankeyData.nodes
              .filter(n => n.type === 'target')
              .sort((a, b) => b.value - a.value)
              .map(node => (
                <div key={node.id} className="relative">
                  <div 
                    className="rounded-lg p-3 text-white text-sm font-medium"
                    style={{ 
                      backgroundColor: node.color,
                      height: `${Math.max((node.value / maxValue) * 100, 20)}px`,
                      minHeight: '40px'
                    }}
                  >
                    <div className="truncate">{node.name}</div>
                    <div className="text-xs opacity-90">{formatCurrency(node.value)}</div>
                  </div>
                </div>
              ))}
          </div>
        </div>
      </div>
    );
  };

  const exportarDados = () => {
    const dados = {
      periodo,
      tipoFluxo,
      dataGeracao: new Date().toISOString(),
      sankeyData,
      resumo: {
        totalReceitas: sankeyData.nodes.filter(n => n.type === 'source').reduce((sum, n) => sum + n.value, 0),
        totalDespesas: sankeyData.nodes.filter(n => n.type === 'target').reduce((sum, n) => sum + n.value, 0),
        totalContas: sankeyData.nodes.filter(n => n.type === 'intermediate').length
      }
    };
    
    const dataStr = JSON.stringify(dados, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = `fluxo-caixa-sankey-${new Date().toISOString().split('T')[0]}.json`;
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
          <h1 className="text-3xl font-bold text-gray-900">Fluxo de Caixa Sankey</h1>
          <p className="text-gray-600 mt-2">Visualize o fluxo do seu dinheiro de forma intuitiva</p>
        </div>
        
        <button
          onClick={exportarDados}
          className="flex items-center space-x-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors"
        >
          <Download className="w-4 h-4" />
          <span>Exportar</span>
        </button>
      </div>

      {/* Filtros */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Período
            </label>
            <select
              value={periodo}
              onChange={(e) => setPeriodo(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="month">Este mês</option>
              <option value="quarter">Últimos 3 meses</option>
              <option value="year">Este ano</option>
            </select>
          </div>
          
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Tipo de Fluxo
            </label>
            <select
              value={tipoFluxo}
              onChange={(e) => setTipoFluxo(e.target.value as any)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="completo">Fluxo Completo</option>
              <option value="receitas">Apenas Receitas</option>
              <option value="despesas">Apenas Despesas</option>
            </select>
          </div>
        </div>
      </div>

      {/* Diagrama Sankey */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-6">Diagrama de Fluxo</h2>
        {renderSankeyDiagram()}
      </div>

      {/* Resumo Estatístico */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-green-50 border border-green-200 rounded-xl p-6">
          <div className="flex items-center space-x-3">
            <TrendingUp className="w-8 h-8 text-green-600" />
            <div>
              <h3 className="text-lg font-semibold text-green-900">Total de Entradas</h3>
              <p className="text-2xl font-bold text-green-600">
                {formatCurrency(sankeyData.nodes.filter(n => n.type === 'source').reduce((sum, n) => sum + n.value, 0))}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-red-50 border border-red-200 rounded-xl p-6">
          <div className="flex items-center space-x-3">
            <TrendingDown className="w-8 h-8 text-red-600" />
            <div>
              <h3 className="text-lg font-semibold text-red-900">Total de Saídas</h3>
              <p className="text-2xl font-bold text-red-600">
                {formatCurrency(sankeyData.nodes.filter(n => n.type === 'target').reduce((sum, n) => sum + n.value, 0))}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
          <div className="flex items-center space-x-3">
            <BarChart3 className="w-8 h-8 text-blue-600" />
            <div>
              <h3 className="text-lg font-semibold text-blue-900">Contas Ativas</h3>
              <p className="text-2xl font-bold text-blue-600">
                {sankeyData.nodes.filter(n => n.type === 'intermediate').length}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Instruções */}
      <div className="bg-blue-50 rounded-xl border border-blue-200 p-6">
        <h3 className="text-lg font-semibold text-blue-900 mb-4">💡 Como interpretar o Diagrama Sankey</h3>
        
        <div className="space-y-2 text-sm text-blue-800">
          <div className="flex items-start space-x-2">
            <div className="w-1.5 h-1.5 bg-blue-600 rounded-full mt-2 flex-shrink-0"></div>
            <span><strong>Largura dos blocos:</strong> Representa o valor total da categoria ou conta</span>
          </div>
          <div className="flex items-start space-x-2">
            <div className="w-1.5 h-1.5 bg-blue-600 rounded-full mt-2 flex-shrink-0"></div>
            <span><strong>Fluxo completo:</strong> Mostra como o dinheiro entra (receitas) e sai (despesas) das suas contas</span>
          </div>
          <div className="flex items-start space-x-2">
            <div className="w-1.5 h-1.5 bg-blue-600 rounded-full mt-2 flex-shrink-0"></div>
            <span><strong>Cores:</strong> Cada categoria mantém sua cor definida para fácil identificação</span>
          </div>
          <div className="flex items-start space-x-2">
            <div className="w-1.5 h-1.5 bg-blue-600 rounded-full mt-2 flex-shrink-0"></div>
            <span><strong>Análise:</strong> Identifique rapidamente suas principais fontes de renda e maiores gastos</span>
          </div>
        </div>
      </div>
    </div>
  );
}