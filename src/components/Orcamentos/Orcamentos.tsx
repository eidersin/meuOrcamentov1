import React, { useState, useEffect, useMemo } from 'react';
import { Plus, Target, AlertTriangle, TrendingUp, TrendingDown, Edit3, Trash2, Calendar } from 'lucide-react';
import { DatabaseService } from '../../lib/database';
import { AuthService } from '../../lib/auth';
import { formatCurrency, formatDate } from '../../lib/utils';
import { CurrencyInput } from '../Common/CurrencyInput';
import { COLORS } from '../../constants';
import type { Orcamento, Categoria, Lancamento } from '../../types';

export function Orcamentos() {
  const [orcamentos, setOrcamentos] = useState<Orcamento[]>([]);
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [lancamentos, setLancamentos] = useState<Lancamento[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingOrcamento, setEditingOrcamento] = useState<string | null>(null);
  const [selectedPeriod, setSelectedPeriod] = useState({
    ano: new Date().getFullYear(),
    mes: new Date().getMonth() + 1
  });
  const [formData, setFormData] = useState({
    categoria_id: '',
    valor_orcado: 0,
    alerta_percentual: 80,
  });

  useEffect(() => {
    loadData();
  }, [selectedPeriod]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [orcamentosData, categoriasData, lancamentosData] = await Promise.all([
        DatabaseService.getOrcamentos(selectedPeriod.ano, selectedPeriod.mes),
        DatabaseService.getCategorias(),
        DatabaseService.getLancamentos({
          dataInicio: `${selectedPeriod.ano}-${selectedPeriod.mes.toString().padStart(2, '0')}-01`,
          dataFim: `${selectedPeriod.ano}-${selectedPeriod.mes.toString().padStart(2, '0')}-31`
        })
      ]);
      
      setOrcamentos(orcamentosData);
      setCategorias(categoriasData.filter(c => c.tipo === 'DESPESA'));
      setLancamentos(lancamentosData);
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const orcamentoData = {
        categoria_id: formData.categoria_id,
        ano: selectedPeriod.ano,
        mes: selectedPeriod.mes,
        valor_orcado: formData.valor_orcado,
        alerta_percentual: formData.alerta_percentual,
      };

      if (editingOrcamento) {
        await DatabaseService.updateOrcamento(editingOrcamento, orcamentoData);
      } else {
        await DatabaseService.createOrcamento(orcamentoData);
      }

      await loadData();
      resetForm();
    } catch (error) {
      console.error('Erro ao salvar orçamento:', error);
      if (error instanceof Error && error.message === 'Usuário não autenticado') {
        await AuthService.signOut();
        return;
      }
      alert('Erro ao salvar orçamento');
    }
  };

  const handleEdit = (orcamento: Orcamento) => {
    setEditingOrcamento(orcamento.id);
    setFormData({
      categoria_id: orcamento.categoria_id,
      valor_orcado: orcamento.valor_orcado,
      alerta_percentual: orcamento.alerta_percentual,
    });
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (confirm('Tem certeza que deseja excluir este orçamento?')) {
      try {
        await DatabaseService.deleteOrcamento(id);
        await loadData();
      } catch (error) {
        console.error('Erro ao excluir orçamento:', error);
        if (error instanceof Error && error.message === 'Usuário não autenticado') {
          await AuthService.signOut();
          return;
        }
        alert('Erro ao excluir orçamento');
      }
    }
  };

  const resetForm = () => {
    setFormData({
      categoria_id: '',
      valor_orcado: 0,
      alerta_percentual: 80,
    });
    setShowForm(false);
    setEditingOrcamento(null);
  };

  const orcamentosComGastos = useMemo(() => {
    return orcamentos.map(orcamento => {
      const gastosCategoria = lancamentos
        .filter(l => 
          l.categoria_id === orcamento.categoria_id && 
          l.tipo === 'DESPESA' && 
          l.status === 'CONFIRMADO'
        )
        .reduce((sum, l) => sum + l.valor, 0);

      const percentualGasto = orcamento.valor_orcado > 0 
        ? (gastosCategoria / orcamento.valor_orcado) * 100 
        : 0;

      const status = percentualGasto >= 100 
        ? 'EXCEDIDO' 
        : percentualGasto >= orcamento.alerta_percentual 
        ? 'ALERTA' 
        : 'OK';

      return {
        ...orcamento,
        valor_gasto: gastosCategoria,
        percentual_gasto: percentualGasto,
        status,
        valor_restante: orcamento.valor_orcado - gastosCategoria
      };
    });
  }, [orcamentos, lancamentos]);

  const resumoGeral = useMemo(() => {
    const totalOrcado = orcamentosComGastos.reduce((sum, o) => sum + o.valor_orcado, 0);
    const totalGasto = orcamentosComGastos.reduce((sum, o) => sum + o.valor_gasto, 0);
    const orcamentosExcedidos = orcamentosComGastos.filter(o => o.status === 'EXCEDIDO').length;
    const orcamentosAlerta = orcamentosComGastos.filter(o => o.status === 'ALERTA').length;

    return {
      totalOrcado,
      totalGasto,
      totalRestante: totalOrcado - totalGasto,
      percentualGeral: totalOrcado > 0 ? (totalGasto / totalOrcado) * 100 : 0,
      orcamentosExcedidos,
      orcamentosAlerta
    };
  }, [orcamentosComGastos]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'OK':
        return 'text-green-600 bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800';
      case 'ALERTA':
        return 'text-yellow-600 bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800';
      case 'EXCEDIDO':
        return 'text-red-600 bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800';
      default:
        return 'text-gray-600 bg-gray-50 dark:bg-gray-700 border-gray-200 dark:border-gray-600';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'OK':
        return <TrendingUp className="w-4 h-4 text-green-600" />;
      case 'ALERTA':
        return <AlertTriangle className="w-4 h-4 text-yellow-600" />;
      case 'EXCEDIDO':
        return <TrendingDown className="w-4 h-4 text-red-600" />;
      default:
        return <Target className="w-4 h-4 text-gray-600" />;
    }
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
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Orçamentos</h1>
          <p className="text-gray-600 dark:text-gray-300 mt-2">Controle seus gastos mensais por categoria</p>
        </div>
        
        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-2">
            <Calendar className="w-5 h-5 text-gray-500" />
            <select
              value={`${selectedPeriod.ano}-${selectedPeriod.mes}`}
              onChange={(e) => {
                const [ano, mes] = e.target.value.split('-');
                setSelectedPeriod({ ano: parseInt(ano), mes: parseInt(mes) });
              }}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
            >
              {Array.from({ length: 12 }, (_, i) => {
                const mes = i + 1;
                const data = new Date(selectedPeriod.ano, i);
                return (
                  <option key={mes} value={`${selectedPeriod.ano}-${mes}`}>
                    {data.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
                  </option>
                );
              })}
            </select>
          </div>
          
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-5 h-5" />
            <span>Novo Orçamento</span>
          </button>
        </div>
      </div>

      {/* Resumo Geral */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-xl border border-blue-200 dark:border-blue-800 p-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Resumo do Período</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">{formatCurrency(resumoGeral.totalOrcado)}</div>
            <div className="text-sm text-gray-600 dark:text-gray-300">Total Orçado</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-red-600">{formatCurrency(resumoGeral.totalGasto)}</div>
            <div className="text-sm text-gray-600 dark:text-gray-300">Total Gasto</div>
          </div>
          <div className="text-center">
            <div className={`text-2xl font-bold ${resumoGeral.totalRestante >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {formatCurrency(resumoGeral.totalRestante)}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-300">Restante</div>
          </div>
          <div className="text-center">
            <div className={`text-2xl font-bold ${resumoGeral.percentualGeral <= 80 ? 'text-green-600' : resumoGeral.percentualGeral <= 100 ? 'text-yellow-600' : 'text-red-600'}`}>
              {resumoGeral.percentualGeral.toFixed(1)}%
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-300">Utilização</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-purple-600">
              {resumoGeral.orcamentosExcedidos + resumoGeral.orcamentosAlerta}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-300">Alertas</div>
          </div>
        </div>
      </div>

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-gray-900 bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-md w-full">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                {editingOrcamento ? 'Editar Orçamento' : 'Novo Orçamento'}
              </h2>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Categoria *
                </label>
                <select
                  value={formData.categoria_id}
                  onChange={(e) => setFormData(prev => ({ ...prev, categoria_id: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  required
                >
                  <option value="">Selecione uma categoria</option>
                  {categorias.map(categoria => (
                    <option key={categoria.id} value={categoria.id}>
                      {categoria.nome}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Valor Orçado *
                </label>
                <CurrencyInput
                  value={formData.valor_orcado}
                  onChange={(value) => setFormData(prev => ({ ...prev, valor_orcado: value }))}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  placeholder="R$ 0,00"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Alerta em (%)
                </label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={formData.alerta_percentual}
                  onChange={(e) => setFormData(prev => ({ ...prev, alerta_percentual: parseInt(e.target.value) }))}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Receber alerta quando atingir esta porcentagem do orçamento
                </p>
              </div>

              <div className="flex space-x-3 pt-4">
                <button
                  type="button"
                  onClick={resetForm}
                  className="flex-1 px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  {editingOrcamento ? 'Salvar' : 'Criar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Lista de Orçamentos */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {orcamentosComGastos.map((orcamento) => {
          const categoria = categorias.find(c => c.id === orcamento.categoria_id);
          
          return (
            <div key={orcamento.id} className={`bg-white dark:bg-gray-800 rounded-xl shadow-sm border p-6 hover:shadow-md transition-all duration-200 group ${getStatusColor(orcamento.status)}`}>
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <div 
                    className="w-12 h-12 rounded-lg flex items-center justify-center"
                    style={{ backgroundColor: categoria?.cor + '20' }}
                  >
                    <Target className="w-6 h-6" style={{ color: categoria?.cor }} />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 dark:text-white">{categoria?.nome}</h3>
                    <div className="flex items-center space-x-1">
                      {getStatusIcon(orcamento.status)}
                      <span className="text-sm font-medium">
                        {orcamento.status === 'OK' ? 'No limite' : 
                         orcamento.status === 'ALERTA' ? 'Atenção' : 'Excedido'}
                      </span>
                    </div>
                  </div>
                </div>
                
                <div className="opacity-0 group-hover:opacity-100 flex items-center space-x-1 transition-opacity">
                  <button 
                    onClick={() => handleEdit(orcamento)}
                    className="p-1 text-gray-400 hover:text-blue-600 transition-colors"
                  >
                    <Edit3 className="w-4 h-4" />
                  </button>
                  <button 
                    onClick={() => handleDelete(orcamento.id)}
                    className="p-1 text-gray-400 hover:text-red-600 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600 dark:text-gray-300">Progresso:</span>
                  <span className="text-sm font-medium">{orcamento.percentual_gasto.toFixed(1)}%</span>
                </div>
                
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                  <div 
                    className={`h-2 rounded-full transition-all duration-300 ${
                      orcamento.status === 'OK' ? 'bg-green-500' :
                      orcamento.status === 'ALERTA' ? 'bg-yellow-500' : 'bg-red-500'
                    }`}
                    style={{ width: `${Math.min(orcamento.percentual_gasto, 100)}%` }}
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-gray-600 dark:text-gray-300">Orçado</p>
                    <p className="font-semibold text-gray-900 dark:text-white">{formatCurrency(orcamento.valor_orcado)}</p>
                  </div>
                  <div>
                    <p className="text-gray-600 dark:text-gray-300">Gasto</p>
                    <p className="font-semibold text-gray-900 dark:text-white">{formatCurrency(orcamento.valor_gasto)}</p>
                  </div>
                </div>
                
                <div className="pt-3 border-t border-gray-100 dark:border-gray-700">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600 dark:text-gray-300">Restante:</span>
                    <span className={`font-semibold ${
                      orcamento.valor_restante >= 0 ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {formatCurrency(orcamento.valor_restante)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {orcamentosComGastos.length === 0 && (
        <div className="text-center text-gray-500 dark:text-gray-400 py-12">
          <Target className="w-12 h-12 mx-auto mb-4 text-gray-300 dark:text-gray-600" />
          <p className="text-lg font-medium">Nenhum orçamento cadastrado</p>
          <p className="text-sm mt-1">Crie seu primeiro orçamento para este período!</p>
        </div>
      )}
    </div>
  );
}