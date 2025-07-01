import React, { useState, useMemo } from 'react';
import { Plus, Edit3, Trash2, CreditCard, TrendingUp, TrendingDown } from 'lucide-react';
import { useBudgetStore } from '../lib/store';
import { formatCurrency } from '../lib/utils';

export function Contas() {
  const { contas, adicionarConta, editarConta, removerConta, lancamentos } = useBudgetStore();
  const [showForm, setShowForm] = useState(false);
  const [editingConta, setEditingConta] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    nome: '',
    saldoInicial: '',
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  const validateForm = () => {
    const errors: Record<string, string> = {};
    
    if (!formData.nome.trim()) {
      errors.nome = 'Nome da conta é obrigatório';
    }
    
    const saldoInicial = parseFloat(formData.saldoInicial);
    if (formData.saldoInicial && isNaN(saldoInicial)) {
      errors.saldoInicial = 'Saldo inicial deve ser um número válido';
    }
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    const saldoInicial = parseFloat(formData.saldoInicial) || 0;

    if (editingConta) {
      editarConta(editingConta, {
        nome: formData.nome.trim(),
        saldoInicial: saldoInicial,
      });
    } else {
      adicionarConta({
        nome: formData.nome.trim(),
        saldoInicial: saldoInicial,
      });
    }

    // Reset form
    setFormData({ nome: '', saldoInicial: '' });
    setFormErrors({});
    setShowForm(false);
    setEditingConta(null);
  };

  const handleEdit = (conta: any) => {
    setEditingConta(conta.id);
    setFormData({
      nome: conta.nome,
      saldoInicial: conta.saldoInicial.toString(),
    });
    setShowForm(true);
  };

  const handleDelete = (id: string) => {
    const hasTransactions = lancamentos.some(l => l.contaId === id);
    if (hasTransactions) {
      alert('Não é possível excluir uma conta que possui lançamentos vinculados.');
      return;
    }
    
    if (confirm('Tem certeza que deseja excluir esta conta?')) {
      removerConta(id);
    }
  };

  const contasComCalculos = useMemo(() => {
    return contas.map(conta => {
      const transacoesConta = lancamentos.filter(l => l.contaId === conta.id);
      const totalTransacoes = transacoesConta.reduce((sum, l) => {
        return sum + (l.tipo === 'RECEITA' ? l.valor : -l.valor);
      }, 0);
      const saldoAtual = conta.saldoInicial + totalTransacoes;
      
      const receitasTotal = transacoesConta
        .filter(l => l.tipo === 'RECEITA')
        .reduce((sum, l) => sum + l.valor, 0);
      
      const despesasTotal = transacoesConta
        .filter(l => l.tipo === 'DESPESA')
        .reduce((sum, l) => sum + l.valor, 0);
      
      return {
        ...conta,
        saldoAtual,
        transacoesCount: transacoesConta.length,
        receitasTotal,
        despesasTotal,
        movimentacao: totalTransacoes
      };
    });
  }, [contas, lancamentos]);

  const resumoGeral = useMemo(() => {
    const saldoTotalInicial = contas.reduce((sum, conta) => sum + conta.saldoInicial, 0);
    const saldoTotalAtual = contasComCalculos.reduce((sum, conta) => sum + conta.saldoAtual, 0);
    const totalReceitas = contasComCalculos.reduce((sum, conta) => sum + conta.receitasTotal, 0);
    const totalDespesas = contasComCalculos.reduce((sum, conta) => sum + conta.despesasTotal, 0);
    
    return {
      saldoTotalInicial,
      saldoTotalAtual,
      totalReceitas,
      totalDespesas,
      variacao: saldoTotalAtual - saldoTotalInicial
    };
  }, [contas, contasComCalculos]);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Contas</h1>
          <p className="text-gray-600 mt-2">Gerencie suas contas bancárias e carteiras</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center justify-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-5 h-5" />
          <span>Nova Conta</span>
        </button>
      </div>

      {/* Resumo Geral */}
      {contas.length > 0 && (
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Resumo Geral</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{formatCurrency(resumoGeral.saldoTotalAtual)}</div>
              <div className="text-sm text-gray-600">Saldo Total Atual</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{formatCurrency(resumoGeral.totalReceitas)}</div>
              <div className="text-sm text-gray-600">Total Receitas</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600">{formatCurrency(resumoGeral.totalDespesas)}</div>
              <div className="text-sm text-gray-600">Total Despesas</div>
            </div>
            <div className="text-center">
              <div className={`text-2xl font-bold ${resumoGeral.variacao >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {resumoGeral.variacao >= 0 ? '+' : ''}{formatCurrency(resumoGeral.variacao)}
              </div>
              <div className="text-sm text-gray-600">Variação Total</div>
            </div>
          </div>
        </div>
      )}

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-gray-900 bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">
                {editingConta ? 'Editar Conta' : 'Nova Conta'}
              </h2>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nome da Conta *
                </label>
                <input
                  type="text"
                  value={formData.nome}
                  onChange={(e) => setFormData(prev => ({ ...prev, nome: e.target.value }))}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                    formErrors.nome ? 'border-red-300' : 'border-gray-300'
                  }`}
                  placeholder="Ex: Conta Corrente, Poupança..."
                />
                {formErrors.nome && (
                  <p className="text-red-600 text-sm mt-1">{formErrors.nome}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Saldo Inicial
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.saldoInicial}
                  onChange={(e) => setFormData(prev => ({ ...prev, saldoInicial: e.target.value }))}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                    formErrors.saldoInicial ? 'border-red-300' : 'border-gray-300'
                  }`}
                  placeholder="0,00"
                />
                {formErrors.saldoInicial && (
                  <p className="text-red-600 text-sm mt-1">{formErrors.saldoInicial}</p>
                )}
                <p className="text-sm text-gray-500 mt-1">
                  Deixe em branco ou zero se não souber o saldo inicial
                </p>
              </div>

              <div className="flex space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowForm(false);
                    setEditingConta(null);
                    setFormData({ nome: '', saldoInicial: '' });
                    setFormErrors({});
                  }}
                  className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  {editingConta ? 'Salvar' : 'Criar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Lista de Contas */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">Suas Contas</h2>
        </div>
        
        <div className="p-6">
          {contasComCalculos.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {contasComCalculos.map((conta) => {
                return (
                  <div key={conta.id} className="border border-gray-200 rounded-lg p-6 hover:shadow-md transition-all duration-200 group">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center space-x-3">
                        <div className="w-12 h-12 bg-blue-50 rounded-lg flex items-center justify-center">
                          <CreditCard className="w-6 h-6 text-blue-600" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-gray-900">{conta.nome}</h3>
                          <p className="text-sm text-gray-500">{conta.transacoesCount} transações</p>
                        </div>
                      </div>
                      
                      <div className="opacity-0 group-hover:opacity-100 flex items-center space-x-1 transition-opacity">
                        <button 
                          onClick={() => handleEdit(conta)}
                          className="p-1 text-gray-400 hover:text-blue-600 transition-colors"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => handleDelete(conta.id)}
                          className="p-1 text-gray-400 hover:text-red-600 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                    
                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600">Saldo Inicial:</span>
                        <span className="text-sm font-medium">{formatCurrency(conta.saldoInicial)}</span>
                      </div>
                      
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600">Saldo Atual:</span>
                        <span className={`text-lg font-bold ${
                          conta.saldoAtual >= 0 ? 'text-green-600' : 'text-red-600'
                        }`}>
                          {formatCurrency(conta.saldoAtual)}
                        </span>
                      </div>
                      
                      <div className="pt-3 border-t border-gray-100">
                        <div className="flex justify-between items-center mb-2">
                          <div className="flex items-center space-x-1">
                            <TrendingUp className="w-4 h-4 text-green-600" />
                            <span className="text-sm text-gray-600">Receitas:</span>
                          </div>
                          <span className="text-sm font-medium text-green-600">
                            {formatCurrency(conta.receitasTotal)}
                          </span>
                        </div>
                        
                        <div className="flex justify-between items-center">
                          <div className="flex items-center space-x-1">
                            <TrendingDown className="w-4 h-4 text-red-600" />
                            <span className="text-sm text-gray-600">Despesas:</span>
                          </div>
                          <span className="text-sm font-medium text-red-600">
                            {formatCurrency(conta.despesasTotal)}
                          </span>
                        </div>
                      </div>
                      
                      {conta.movimentacao !== 0 && (
                        <div className="pt-2">
                          <div className={`text-center text-sm font-medium px-3 py-1 rounded-full ${
                            conta.movimentacao >= 0 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-red-100 text-red-800'
                          }`}>
                            {conta.movimentacao >= 0 ? '+' : ''}{formatCurrency(conta.movimentacao)} de movimentação
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center text-gray-500 py-12">
              <CreditCard className="w-12 h-12 mx-auto mb-4 text-gray-300" />
              <p className="text-lg font-medium">Nenhuma conta cadastrada</p>
              <p className="text-sm mt-1">Crie sua primeira conta para começar!</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}