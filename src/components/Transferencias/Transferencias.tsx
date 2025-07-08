import React, { useState, useEffect } from 'react';
import { ArrowLeftRight, Plus, ArrowRight } from 'lucide-react';
import { DatabaseService } from '../../lib/database';
import { AuthService } from '../../lib/auth';
import { formatCurrency, formatDate } from '../../lib/utils';

export function Transferencias() {
  const [contas, setContas] = useState<any[]>([]);
  const [transferencias, setTransferencias] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    contaOrigem: '',
    contaDestino: '',
    valor: '',
    descricao: '',
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
      
      // Filtrar apenas transferências
      const transferenciasData = lancamentosData.filter(l => l.transferencia_id);
      
      // Agrupar transferências por transferencia_id
      const transferenciasAgrupadas = transferenciasData.reduce((acc, lancamento) => {
        const id = lancamento.transferencia_id;
        if (!acc[id]) {
          acc[id] = {
            id,
            data: lancamento.data,
            descricao: lancamento.descricao,
            valor: 0,
            contaOrigem: null,
            contaDestino: null,
            created_at: lancamento.created_at
          };
        }
        
        if (lancamento.tipo === 'DESPESA') {
          acc[id].contaOrigem = lancamento.conta;
          acc[id].valor = lancamento.valor;
        } else {
          acc[id].contaDestino = lancamento.conta_destino || lancamento.conta;
        }
        
        return acc;
      }, {} as Record<string, any>);
      
      setTransferencias(Object.values(transferenciasAgrupadas));
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

  const validateForm = () => {
    const errors: Record<string, string> = {};
    
    if (!formData.contaOrigem) {
      errors.contaOrigem = 'Selecione a conta de origem';
    }
    
    if (!formData.contaDestino) {
      errors.contaDestino = 'Selecione a conta de destino';
    }
    
    if (formData.contaOrigem === formData.contaDestino) {
      errors.contaDestino = 'A conta de destino deve ser diferente da origem';
    }
    
    const valor = parseFloat(formData.valor);
    if (!formData.valor || isNaN(valor) || valor <= 0) {
      errors.valor = 'Valor deve ser maior que zero';
    }
    
    if (!formData.descricao.trim()) {
      errors.descricao = 'Descrição é obrigatória';
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
      await DatabaseService.createTransferencia(
        formData.contaOrigem,
        formData.contaDestino,
        parseFloat(formData.valor),
        formData.descricao
      );

      await loadData();
      resetForm();
    } catch (error) {
      console.error('Erro ao criar transferência:', error);
      // Handle authentication errors
      if (error instanceof Error && error.message === 'Usuário não autenticado') {
        await AuthService.signOut();
        return;
      }
      alert('Erro ao criar transferência');
    }
  };

  const resetForm = () => {
    setFormData({
      contaOrigem: '',
      contaDestino: '',
      valor: '',
      descricao: '',
    });
    setFormErrors({});
    setShowForm(false);
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
          <h1 className="text-3xl font-bold text-gray-900">Transferências</h1>
          <p className="text-gray-600 mt-2">Transfira valores entre suas contas</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center justify-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-5 h-5" />
          <span>Nova Transferência</span>
        </button>
      </div>

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-gray-900 bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">Nova Transferência</h2>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Conta de Origem *
                </label>
                <select
                  value={formData.contaOrigem}
                  onChange={(e) => setFormData(prev => ({ ...prev, contaOrigem: e.target.value }))}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                    formErrors.contaOrigem ? 'border-red-300' : 'border-gray-300'
                  }`}
                >
                  <option value="">Selecione a conta de origem</option>
                  {contas.map(conta => (
                    <option key={conta.id} value={conta.id}>
                      {conta.nome} - {formatCurrency(conta.saldo_atual)}
                    </option>
                  ))}
                </select>
                {formErrors.contaOrigem && (
                  <p className="text-red-600 text-sm mt-1">{formErrors.contaOrigem}</p>
                )}
              </div>

              <div className="flex justify-center">
                <ArrowRight className="w-6 h-6 text-gray-400" />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Conta de Destino *
                </label>
                <select
                  value={formData.contaDestino}
                  onChange={(e) => setFormData(prev => ({ ...prev, contaDestino: e.target.value }))}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                    formErrors.contaDestino ? 'border-red-300' : 'border-gray-300'
                  }`}
                >
                  <option value="">Selecione a conta de destino</option>
                  {contas.filter(conta => conta.id !== formData.contaOrigem).map(conta => (
                    <option key={conta.id} value={conta.id}>
                      {conta.nome} - {formatCurrency(conta.saldo_atual)}
                    </option>
                  ))}
                </select>
                {formErrors.contaDestino && (
                  <p className="text-red-600 text-sm mt-1">{formErrors.contaDestino}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Valor *
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.valor}
                  onChange={(e) => setFormData(prev => ({ ...prev, valor: e.target.value }))}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                    formErrors.valor ? 'border-red-300' : 'border-gray-300'
                  }`}
                  placeholder="0,00"
                />
                {formErrors.valor && (
                  <p className="text-red-600 text-sm mt-1">{formErrors.valor}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Descrição *
                </label>
                <input
                  type="text"
                  value={formData.descricao}
                  onChange={(e) => setFormData(prev => ({ ...prev, descricao: e.target.value }))}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                    formErrors.descricao ? 'border-red-300' : 'border-gray-300'
                  }`}
                  placeholder="Ex: Transferência para poupança"
                />
                {formErrors.descricao && (
                  <p className="text-red-600 text-sm mt-1">{formErrors.descricao}</p>
                )}
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
                  Transferir
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Lista de Transferências */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">Histórico de Transferências</h2>
        </div>
        
        <div className="p-6">
          {transferencias.length > 0 ? (
            <div className="space-y-4">
              {transferencias.map((transferencia) => (
                <div key={transferencia.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:shadow-md transition-all duration-200">
                  <div className="flex items-center space-x-4">
                    <div className="w-12 h-12 bg-blue-50 rounded-lg flex items-center justify-center">
                      <ArrowLeftRight className="w-6 h-6 text-blue-600" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{transferencia.descricao}</p>
                      <div className="flex items-center space-x-2 text-sm text-gray-500">
                        <span>{transferencia.contaOrigem?.nome}</span>
                        <ArrowRight className="w-4 h-4" />
                        <span>{transferencia.contaDestino?.nome}</span>
                      </div>
                      <p className="text-sm text-gray-500">{formatDate(transferencia.data)}</p>
                    </div>
                  </div>
                  
                  <div className="text-right">
                    <p className="text-lg font-semibold text-blue-600">
                      {formatCurrency(transferencia.valor)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center text-gray-500 py-12">
              <ArrowLeftRight className="w-12 h-12 mx-auto mb-4 text-gray-300" />
              <p className="text-lg font-medium">Nenhuma transferência encontrada</p>
              <p className="text-sm mt-1">Crie sua primeira transferência entre contas!</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}