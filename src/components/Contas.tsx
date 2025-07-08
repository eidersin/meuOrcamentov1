import React, { useState, useEffect, useMemo } from 'react';
import { Plus, Edit3, Trash2, CreditCard, TrendingUp, TrendingDown, AlertCircle } from 'lucide-react';
import { DatabaseService } from '../lib/database';
import { AuthService } from '../lib/auth';
import { formatCurrency } from '../lib/utils';
import { CurrencyInput } from './Common/CurrencyInput';

export function Contas() {
  const [contas, setContas] = useState<any[]>([]);
  const [lancamentos, setLancamentos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingConta, setEditingConta] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    nome: '',
    tipo: 'CORRENTE' as 'CORRENTE' | 'POUPANCA' | 'INVESTIMENTO' | 'CARTEIRA',
    saldo_inicial: 0,
    limite_credito: 0,
    valor_investido: 0,
    banco: '',
    agencia: '',
    conta: '',
    cor: '#10B981',
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [contasData, lancamentosData] = await Promise.all([
        DatabaseService.getContas(),
        DatabaseService.getLancamentos()
      ]);
      setContas(contasData);
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

  const validateForm = () => {
    const errors: Record<string, string> = {};
    
    if (!formData.nome.trim()) {
      errors.nome = 'Nome da conta é obrigatório';
    }
    
    if (formData.saldo_inicial < 0) {
      errors.saldo_inicial = 'Saldo inicial não pode ser negativo';
    }

    if (formData.limite_credito < 0) {
      errors.limite_credito = 'Limite de crédito não pode ser negativo';
    }

    if (formData.valor_investido < 0) {
      errors.valor_investido = 'Valor investido não pode ser negativo';
    }
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    try {
      const contaData = {
        nome: formData.nome.trim(),
        tipo: formData.tipo,
        saldo_inicial: formData.saldo_inicial,
        limite_credito: formData.limite_credito > 0 ? formData.limite_credito : null,
        valor_investido: formData.valor_investido > 0 ? formData.valor_investido : null,
        banco: formData.banco || null,
        agencia: formData.agencia || null,
        conta: formData.conta || null,
        cor: formData.cor,
      };

      if (editingConta) {
        await DatabaseService.updateConta(editingConta, contaData);
      } else {
        await DatabaseService.createConta(contaData);
      }

      await loadData();
      resetForm();
    } catch (error) {
      console.error('Erro ao salvar conta:', error);
      if (error instanceof Error && error.message === 'Usuário não autenticado') {
        await AuthService.signOut();
        return;
      }
      alert('Erro ao salvar conta');
    }
  };

  const handleEdit = (conta: any) => {
    setEditingConta(conta.id);
    setFormData({
      nome: conta.nome,
      tipo: conta.tipo,
      saldo_inicial: conta.saldo_inicial,
      limite_credito: conta.limite_credito || 0,
      valor_investido: conta.valor_investido || 0,
      banco: conta.banco || '',
      agencia: conta.agencia || '',
      conta: conta.conta || '',
      cor: conta.cor,
    });
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    const hasTransactions = lancamentos.some(l => l.conta_id === id);
    if (hasTransactions) {
      alert('Não é possível excluir uma conta que possui lançamentos vinculados.');
      return;
    }
    
    if (confirm('Tem certeza que deseja excluir esta conta?')) {
      try {
        await DatabaseService.deleteConta(id);
        await loadData();
      } catch (error) {
        console.error('Erro ao excluir conta:', error);
        if (error instanceof Error && error.message === 'Usuário não autenticado') {
          await AuthService.signOut();
          return;
        }
        alert('Erro ao excluir conta');
      }
    }
  };

  const resetForm = () => {
    setFormData({
      nome: '',
      tipo: 'CORRENTE',
      saldo_inicial: 0,
      limite_credito: 0,
      valor_investido: 0,
      banco: '',
      agencia: '',
      conta: '',
      cor: '#10B981',
    });
    setFormErrors({});
    setShowForm(false);
    setEditingConta(null);
  };

  const contasComCalculos = useMemo(() => {
    return contas.map(conta => {
      const transacoesConta = lancamentos.filter(l => l.conta_id === conta.id);
      
      const receitasTotal = transacoesConta
        .filter(l => l.tipo === 'RECEITA' && l.status === 'CONFIRMADO')
        .reduce((sum, l) => sum + l.valor, 0);
      
      const despesasTotal = transacoesConta
        .filter(l => l.tipo === 'DESPESA' && l.status === 'CONFIRMADO')
        .reduce((sum, l) => sum + l.valor, 0);

      // Calcular gastos específicos do cartão de crédito
      const gastosCartao = transacoesConta
        .filter(l => l.tipo === 'DESPESA' && l.status === 'CONFIRMADO' && l.cartao_credito_usado)
        .reduce((sum, l) => sum + l.valor, 0);
      
      let limiteRestante = null;
      let utilizacaoPercentual = null;
      
      if (conta.limite_credito && conta.limite_credito > 0) {
        limiteRestante = conta.limite_credito - gastosCartao;
        utilizacaoPercentual = (gastosCartao / conta.limite_credito) * 100;
      }
      
      return {
        ...conta,
        transacoesCount: transacoesConta.length,
        receitasTotal,
        despesasTotal,
        gastosCartao,
        limiteRestante,
        utilizacaoPercentual
      };
    });
  }, [contas, lancamentos]);

  const resumoGeral = useMemo(() => {
    const saldoTotalInicial = contas.reduce((sum, conta) => sum + conta.saldo_inicial, 0);
    const saldoTotalAtual = contas.reduce((sum, conta) => sum + conta.saldo_atual, 0);
    const totalReceitas = contasComCalculos.reduce((sum, conta) => sum + conta.receitasTotal, 0);
    const totalDespesas = contasComCalculos.reduce((sum, conta) => sum + conta.despesasTotal, 0);
    const totalInvestido = contas.reduce((sum, conta) => sum + (conta.valor_investido || 0), 0);
    const totalLimiteCredito = contas.reduce((sum, conta) => sum + (conta.limite_credito || 0), 0);
    const totalUsadoCartao = contasComCalculos.reduce((sum, conta) => sum + (conta.gastosCartao || 0), 0);
    const limiteDisponivelCartao = totalLimiteCredito - totalUsadoCartao;
    
    return {
      saldoTotalInicial,
      saldoTotalAtual,
      totalReceitas,
      totalDespesas,
      totalInvestido,
      totalLimiteCredito,
      totalUsadoCartao,
      limiteDisponivelCartao,
      variacao: saldoTotalAtual - saldoTotalInicial
    };
  }, [contas, contasComCalculos]);

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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
            <div className="text-center">
              <div className={`text-2xl font-bold ${resumoGeral.saldoTotalAtual >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {formatCurrency(resumoGeral.saldoTotalAtual)}
              </div>
              <div className="text-sm text-gray-600">Saldo Líquido Total</div>
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
              <div className="text-2xl font-bold text-purple-600">{formatCurrency(resumoGeral.totalInvestido)}</div>
              <div className="text-sm text-gray-600">Total Investido</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">{formatCurrency(resumoGeral.totalLimiteCredito)}</div>
              <div className="text-sm text-gray-600">Limite Total Cartões</div>
            </div>
            <div className="text-center">
              <div className={`text-2xl font-bold ${resumoGeral.limiteDisponivelCartao >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {formatCurrency(resumoGeral.limiteDisponivelCartao)}
              </div>
              <div className="text-sm text-gray-600">Limite Disponível</div>
            </div>
          </div>
        </div>
      )}

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-gray-900 bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
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
                  Tipo da Conta *
                </label>
                <select
                  value={formData.tipo}
                  onChange={(e) => setFormData(prev => ({ ...prev, tipo: e.target.value as any }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="CORRENTE">Conta Corrente</option>
                  <option value="POUPANCA">Poupança</option>
                  <option value="INVESTIMENTO">Investimento</option>
                  <option value="CARTEIRA">Carteira</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Saldo Inicial *
                </label>
                <CurrencyInput
                  value={formData.saldo_inicial}
                  onChange={(value) => setFormData(prev => ({ ...prev, saldo_inicial: value }))}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                    formErrors.saldo_inicial ? 'border-red-300' : 'border-gray-300'
                  }`}
                  placeholder="R$ 0,00"
                  error={!!formErrors.saldo_inicial}
                  required
                />
                {formErrors.saldo_inicial && (
                  <p className="text-red-600 text-sm mt-1">{formErrors.saldo_inicial}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Limite do Cartão de Crédito
                </label>
                <CurrencyInput
                  value={formData.limite_credito}
                  onChange={(value) => setFormData(prev => ({ ...prev, limite_credito: value }))}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                    formErrors.limite_credito ? 'border-red-300' : 'border-gray-300'
                  }`}
                  placeholder="R$ 0,00"
                  error={!!formErrors.limite_credito}
                />
                <p className="text-xs text-gray-500 mt-1">
                  Deixe em branco se a conta não possui cartão de crédito
                </p>
                {formErrors.limite_credito && (
                  <p className="text-red-600 text-sm mt-1">{formErrors.limite_credito}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Valor Investido (Opcional)
                </label>
                <CurrencyInput
                  value={formData.valor_investido}
                  onChange={(value) => setFormData(prev => ({ ...prev, valor_investido: value }))}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                    formErrors.valor_investido ? 'border-red-300' : 'border-gray-300'
                  }`}
                  placeholder="R$ 0,00"
                  error={!!formErrors.valor_investido}
                />
                {formErrors.valor_investido && (
                  <p className="text-red-600 text-sm mt-1">{formErrors.valor_investido}</p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Banco
                  </label>
                  <input
                    type="text"
                    value={formData.banco}
                    onChange={(e) => setFormData(prev => ({ ...prev, banco: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Ex: Banco do Brasil"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Agência
                  </label>
                  <input
                    type="text"
                    value={formData.agencia}
                    onChange={(e) => setFormData(prev => ({ ...prev, agencia: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="0000"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Número da Conta
                </label>
                <input
                  type="text"
                  value={formData.conta}
                  onChange={(e) => setFormData(prev => ({ ...prev, conta: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="00000-0"
                />
              </div>

              <div className="flex space-x-3 pt-4">
                <button
                  type="button"
                  onClick={resetForm}
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
                        <div 
                          className="w-12 h-12 rounded-lg flex items-center justify-center"
                          style={{ backgroundColor: conta.cor + '20' }}
                        >
                          <CreditCard className="w-6 h-6" style={{ color: conta.cor }} />
                        </div>
                        <div>
                          <h3 className="font-semibold text-gray-900">{conta.nome}</h3>
                          <p className="text-sm text-gray-500">{conta.tipo} • {conta.transacoesCount} transações</p>
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
                        <span className="text-sm font-medium">{formatCurrency(conta.saldo_inicial)}</span>
                      </div>
                      
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600">Saldo Atual:</span>
                        <span className={`text-lg font-bold ${
                          conta.saldo_atual >= 0 ? 'text-green-600' : 'text-red-600'
                        }`}>
                          {formatCurrency(conta.saldo_atual)}
                        </span>
                      </div>

                      {/* Informações do cartão de crédito */}
                      {conta.limite_credito && conta.limite_credito > 0 && (
                        <div className="pt-3 border-t border-gray-100">
                          <div className="flex justify-between items-center mb-2">
                            <span className="text-sm text-gray-600">Limite do Cartão:</span>
                            <span className="text-sm font-medium">{formatCurrency(conta.limite_credito)}</span>
                          </div>
                          
                          <div className="flex justify-between items-center mb-2">
                            <span className="text-sm text-gray-600">Usado no Cartão:</span>
                            <span className="text-sm font-medium text-red-600">
                              {formatCurrency(conta.gastosCartao)}
                            </span>
                          </div>

                          <div className="flex justify-between items-center mb-2">
                            <span className="text-sm text-gray-600">Limite Restante:</span>
                            <span className={`text-sm font-medium ${
                              conta.limiteRestante && conta.limiteRestante > 0 ? 'text-green-600' : 'text-red-600'
                            }`}>
                              {formatCurrency(conta.limiteRestante || 0)}
                            </span>
                          </div>

                          {/* Barra de utilização do cartão */}
                          <div className="mt-2">
                            <div className="flex justify-between items-center mb-1">
                              <span className="text-xs text-gray-500">Utilização do Cartão</span>
                              <span className="text-xs text-gray-500">{conta.utilizacaoPercentual?.toFixed(1)}%</span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-2">
                              <div 
                                className={`h-2 rounded-full transition-all duration-300 ${
                                  (conta.utilizacaoPercentual || 0) > 80 ? 'bg-red-500' :
                                  (conta.utilizacaoPercentual || 0) > 60 ? 'bg-yellow-500' : 'bg-green-500'
                                }`}
                                style={{ width: `${Math.min(conta.utilizacaoPercentual || 0, 100)}%` }}
                              />
                            </div>
                            {(conta.utilizacaoPercentual || 0) > 80 && (
                              <div className="flex items-center space-x-1 mt-1">
                                <AlertCircle className="w-3 h-3 text-red-500" />
                                <span className="text-xs text-red-600">Limite quase esgotado</span>
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Valor investido */}
                      {conta.valor_investido && conta.valor_investido > 0 && (
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-gray-600">Valor Investido:</span>
                          <span className="text-sm font-medium text-purple-600">
                            {formatCurrency(conta.valor_investido)}
                          </span>
                        </div>
                      )}
                      
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
                      
                      {conta.banco && (
                        <div className="pt-2 text-xs text-gray-500">
                          {conta.banco} {conta.agencia && `• Ag: ${conta.agencia}`} {conta.conta && `• Cc: ${conta.conta}`}
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