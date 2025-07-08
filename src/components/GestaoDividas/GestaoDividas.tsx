import React, { useState, useEffect, useMemo } from 'react';
import { Plus, CreditCard, Calendar, TrendingDown, AlertTriangle, CheckCircle, Edit3, Trash2 } from 'lucide-react';
import { DatabaseService } from '../../lib/database';
import { AuthService } from '../../lib/auth';
import { formatCurrency, formatDate, parseCurrencyInput } from '../../lib/utils';
import { CurrencyInput } from '../Common/CurrencyInput';

interface Divida {
  id: string;
  nome: string;
  tipo: 'EMPRESTIMO' | 'FINANCIAMENTO' | 'CARTAO_CREDITO' | 'OUTRO';
  valor_total: number;
  valor_pago: number;
  valor_restante: number;
  taxa_juros: number;
  data_inicio: string;
  data_vencimento: string;
  parcela_valor: number;
  parcelas_total: number;
  parcelas_pagas: number;
  status: 'ATIVA' | 'QUITADA' | 'EM_ATRASO';
  observacoes?: string;
  created_at: string;
}

export function GestaoDividas() {
  const [dividas, setDividas] = useState<Divida[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingDivida, setEditingDivida] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    nome: '',
    tipo: 'EMPRESTIMO' as 'EMPRESTIMO' | 'FINANCIAMENTO' | 'CARTAO_CREDITO' | 'OUTRO',
    valor_total: 0,
    taxa_juros: 0,
    data_inicio: new Date().toISOString().split('T')[0],
    data_vencimento: '',
    parcelas_total: 1,
    observacoes: '',
  });

  useEffect(() => {
    loadDividas();
  }, []);

  const loadDividas = async () => {
    try {
      setLoading(true);
      // Usar a tabela de patrimônio para armazenar dívidas como valores negativos
      const patrimonioData = await DatabaseService.getPatrimonio();
      
      // Filtrar apenas dívidas (valores negativos ou descrição contendo informações de dívida)
      const dividasData = patrimonioData
        .filter(item => item.valor_atual < 0 || (item.descricao && item.descricao.includes('DIVIDA:')))
        .map(item => {
          // Extrair informações da descrição
          const descricao = item.descricao || '';
          const tipoMatch = descricao.match(/DIVIDA:(\w+)/);
          const taxaMatch = descricao.match(/Taxa:\s*([\d.]+)%/);
          const parcelasMatch = descricao.match(/Parcelas:\s*(\d+)/);
          const vencimentoMatch = descricao.match(/Vencimento:\s*([\d-]+)/);
          
          const valorTotal = Math.abs(item.valor_compra || item.valor_atual);
          const parcelasTotal = parcelasMatch ? parseInt(parcelasMatch[1]) : 1;
          const parcelaValor = valorTotal / parcelasTotal;
          
          return {
            id: item.id,
            nome: item.nome,
            tipo: (tipoMatch ? tipoMatch[1] : 'OUTRO') as 'EMPRESTIMO' | 'FINANCIAMENTO' | 'CARTAO_CREDITO' | 'OUTRO',
            valor_total: valorTotal,
            valor_pago: valorTotal - Math.abs(item.valor_atual), // Calcular baseado na diferença
            valor_restante: Math.abs(item.valor_atual),
            taxa_juros: taxaMatch ? parseFloat(taxaMatch[1]) : 0,
            data_inicio: item.data_aquisicao || new Date().toISOString().split('T')[0],
            data_vencimento: vencimentoMatch ? vencimentoMatch[1] : item.data_aquisicao || new Date().toISOString().split('T')[0],
            parcela_valor: parcelaValor,
            parcelas_total: parcelasTotal,
            parcelas_pagas: Math.floor((valorTotal - Math.abs(item.valor_atual)) / parcelaValor),
            status: Math.abs(item.valor_atual) > 0 ? 'ATIVA' : 'QUITADA',
            observacoes: descricao.replace(/DIVIDA:\w+\s*-\s*Taxa:\s*[\d.]+%\s*-\s*Parcelas:\s*\d+\s*-\s*Vencimento:\s*[\d-]+\s*-\s*/, '').trim(),
            created_at: item.created_at || new Date().toISOString()
          } as Divida;
        });

      setDividas(dividasData);
    } catch (error) {
      console.error('Erro ao carregar dívidas:', error);
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
      setLoading(true);
      // Parse the currency input to get numeric value
      const valorTotal = typeof formData.valor_total === 'string' 
        ? parseCurrencyInput(formData.valor_total) 
        : formData.valor_total;
      
      const parcelasTotal = formData.parcelas_total;
      const parcelaValor = valorTotal / parcelasTotal;

      const dividaData = {
        nome: formData.nome,
        tipo: 'OUTRO', // Usar 'OUTRO' que é permitido pela constraint do banco
        valor_atual: -Math.abs(valorTotal), // Valor negativo para representar dívida
        valor_compra: valorTotal,
        data_aquisicao: formData.data_inicio,
        descricao: `DIVIDA:${formData.tipo} - Taxa: ${formData.taxa_juros}% - Parcelas: ${parcelasTotal} - Vencimento: ${formData.data_vencimento} - ${formData.observacoes || ''}`,
        ativo: true
      };

      if (editingDivida) {
        await DatabaseService.updatePatrimonio(editingDivida, dividaData);
      } else {
        await DatabaseService.createPatrimonio(dividaData);
      }

      await loadDividas();
      resetForm();
      alert('Dívida salva com sucesso!');
    } catch (error) {
      console.error('Erro ao salvar dívida:', error);
      if (error instanceof Error && error.message === 'Usuário não autenticado') {
        await AuthService.signOut();
        return;
      }
      alert('Erro ao salvar dívida');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (divida: Divida) => {
    setEditingDivida(divida.id);
    setFormData({
      nome: divida.nome,
      tipo: divida.tipo,
      valor_total: divida.valor_total,
      taxa_juros: divida.taxa_juros,
      data_inicio: divida.data_inicio,
      data_vencimento: divida.data_vencimento,
      parcelas_total: divida.parcelas_total,
      observacoes: divida.observacoes || '',
    });
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (confirm('Tem certeza que deseja excluir esta dívida?')) {
      try {
        setLoading(true);
        await DatabaseService.deletePatrimonio(id);
        await loadDividas();
        alert('Dívida excluída com sucesso!');
      } catch (error) {
        console.error('Erro ao excluir dívida:', error);
        if (error instanceof Error && error.message === 'Usuário não autenticado') {
          await AuthService.signOut();
          return;
        }
        alert('Erro ao excluir dívida');
      } finally {
        setLoading(false);
      }
    }
  };

  const resetForm = () => {
    setFormData({
      nome: '',
      tipo: 'EMPRESTIMO',
      valor_total: 0,
      taxa_juros: 0,
      data_inicio: new Date().toISOString().split('T')[0],
      data_vencimento: '',
      parcelas_total: 1,
      observacoes: '',
    });
    setShowForm(false);
    setEditingDivida(null);
  };

  const resumoGeral = useMemo(() => {
    const totalDividas = dividas.reduce((sum, d) => sum + d.valor_restante, 0);
    const totalPago = dividas.reduce((sum, d) => sum + d.valor_pago, 0);
    const parcelasMensais = dividas.filter(d => d.status === 'ATIVA').reduce((sum, d) => sum + d.parcela_valor, 0);
    const dividasAtivas = dividas.filter(d => d.status === 'ATIVA').length;

    return {
      totalDividas,
      totalPago,
      parcelasMensais,
      dividasAtivas
    };
  }, [dividas]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ATIVA':
        return 'text-blue-600 bg-blue-50 border-blue-200';
      case 'QUITADA':
        return 'text-green-600 bg-green-50 border-green-200';
      case 'EM_ATRASO':
        return 'text-red-600 bg-red-50 border-red-200';
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'ATIVA':
        return <CreditCard className="w-4 h-4 text-blue-600" />;
      case 'QUITADA':
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'EM_ATRASO':
        return <AlertTriangle className="w-4 h-4 text-red-600" />;
      default:
        return <CreditCard className="w-4 h-4 text-gray-600" />;
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
          <h1 className="text-3xl font-bold text-gray-900">Gestão de Dívidas</h1>
          <p className="text-gray-600 mt-2">Controle empréstimos, financiamentos e outras dívidas</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-5 h-5" />
          <span>Nova Dívida</span>
        </button>
      </div>

      {/* Resumo Geral */}
      <div className="bg-gradient-to-r from-red-50 to-orange-50 rounded-xl border border-red-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Resumo das Dívidas</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-red-600">{formatCurrency(resumoGeral.totalDividas)}</div>
            <div className="text-sm text-gray-600">Total em Dívidas</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">{formatCurrency(resumoGeral.totalPago)}</div>
            <div className="text-sm text-gray-600">Total Pago</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-orange-600">{formatCurrency(resumoGeral.parcelasMensais)}</div>
            <div className="text-sm text-gray-600">Parcelas Mensais</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">{resumoGeral.dividasAtivas}</div>
            <div className="text-sm text-gray-600">Dívidas Ativas</div>
          </div>
        </div>
      </div>

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-gray-900 bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">
                {editingDivida ? 'Editar Dívida' : 'Nova Dívida'}
              </h2>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nome da Dívida *
                </label>
                <input
                  type="text"
                  value={formData.nome}
                  onChange={(e) => setFormData(prev => ({ ...prev, nome: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Ex: Financiamento do carro"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Tipo *
                </label>
                <select
                  value={formData.tipo}
                  onChange={(e) => setFormData(prev => ({ ...prev, tipo: e.target.value as any }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="EMPRESTIMO">Empréstimo</option>
                  <option value="FINANCIAMENTO">Financiamento</option>
                  <option value="CARTAO_CREDITO">Cartão de Crédito</option>
                  <option value="OUTRO">Outro</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Valor Total *
                  </label>
                  <CurrencyInput
                    value={formData.valor_total}
                    onChange={(value) => setFormData(prev => ({ ...prev, valor_total: value }))}
                    placeholder="R$ 0,00"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Taxa de Juros (% a.a.)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.taxa_juros}
                    onChange={(e) => setFormData(prev => ({ ...prev, taxa_juros: parseFloat(e.target.value) || 0 }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="0,00"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Data Início *
                  </label>
                  <input
                    type="date"
                    value={formData.data_inicio}
                    onChange={(e) => setFormData(prev => ({ ...prev, data_inicio: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Data Vencimento *
                  </label>
                  <input
                    type="date"
                    value={formData.data_vencimento}
                    onChange={(e) => setFormData(prev => ({ ...prev, data_vencimento: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Total de Parcelas *
                </label>
                <input
                  type="number"
                  value={formData.parcelas_total}
                  onChange={(e) => setFormData(prev => ({ ...prev, parcelas_total: parseInt(e.target.value) || 1 }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="12"
                  min="1"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Observações
                </label>
                <textarea
                  value={formData.observacoes}
                  onChange={(e) => setFormData(prev => ({ ...prev, observacoes: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Informações adicionais..."
                  rows={3}
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
                  disabled={loading}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                >
                  {loading ? 'Salvando...' : (editingDivida ? 'Salvar' : 'Criar')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Lista de Dívidas */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {dividas.map((divida) => {
          const progressoPagamento = divida.valor_total > 0 ? (divida.valor_pago / divida.valor_total) * 100 : 0;
          const progressoParcelas = divida.parcelas_total > 0 ? (divida.parcelas_pagas / divida.parcelas_total) * 100 : 0;
          
          return (
            <div key={divida.id} className={`bg-white rounded-xl shadow-sm border p-6 hover:shadow-md transition-all duration-200 group ${getStatusColor(divida.status)}`}>
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <div className="w-12 h-12 bg-red-50 rounded-lg flex items-center justify-center">
                    <TrendingDown className="w-6 h-6 text-red-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">{divida.nome}</h3>
                    <div className="flex items-center space-x-1">
                      {getStatusIcon(divida.status)}
                      <span className="text-sm font-medium">{divida.tipo}</span>
                    </div>
                  </div>
                </div>
                
                <div className="opacity-0 group-hover:opacity-100 flex items-center space-x-1 transition-opacity">
                  <button 
                    onClick={() => handleEdit(divida)}
                    className="p-1 text-gray-400 hover:text-blue-600 transition-colors"
                  >
                    <Edit3 className="w-4 h-4" />
                  </button>
                  <button 
                    onClick={() => handleDelete(divida.id)}
                    className="p-1 text-gray-400 hover:text-red-600 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="space-y-4">
                {/* Progresso de Pagamento */}
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm text-gray-600">Progresso de Pagamento:</span>
                    <span className="text-sm font-medium">{progressoPagamento.toFixed(1)}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="h-2 rounded-full bg-green-500 transition-all duration-300"
                      style={{ width: `${Math.min(progressoPagamento, 100)}%` }}
                    />
                  </div>
                </div>

                {/* Informações Financeiras */}
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-gray-600">Valor Total</p>
                    <p className="font-semibold text-gray-900">{formatCurrency(divida.valor_total)}</p>
                  </div>
                  <div>
                    <p className="text-gray-600">Valor Restante</p>
                    <p className="font-semibold text-red-600">{formatCurrency(divida.valor_restante)}</p>
                  </div>
                  <div>
                    <p className="text-gray-600">Parcela Mensal</p>
                    <p className="font-semibold text-gray-900">{formatCurrency(divida.parcela_valor)}</p>
                  </div>
                  <div>
                    <p className="text-gray-600">Taxa de Juros</p>
                    <p className="font-semibold text-gray-900">{divida.taxa_juros.toFixed(2)}% a.a.</p>
                  </div>
                </div>

                {/* Progresso de Parcelas */}
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm text-gray-600">Parcelas:</span>
                    <span className="text-sm font-medium">{divida.parcelas_pagas}/{divida.parcelas_total}</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="h-2 rounded-full bg-blue-500 transition-all duration-300"
                      style={{ width: `${Math.min(progressoParcelas, 100)}%` }}
                    />
                  </div>
                </div>

                {/* Datas */}
                <div className="pt-3 border-t border-gray-100">
                  <div className="flex items-center justify-between text-sm text-gray-600">
                    <div className="flex items-center space-x-1">
                      <Calendar className="w-4 h-4" />
                      <span>Início: {formatDate(divida.data_inicio)}</span>
                    </div>
                    <span>Fim: {formatDate(divida.data_vencimento)}</span>
                  </div>
                </div>

                {divida.observacoes && (
                  <div className="text-xs text-gray-500 bg-gray-50 p-2 rounded">
                    {divida.observacoes}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {dividas.length === 0 && (
        <div className="text-center text-gray-500 py-12">
          <CreditCard className="w-12 h-12 mx-auto mb-4 text-gray-300" />
          <p className="text-lg font-medium">Nenhuma dívida cadastrada</p>
          <p className="text-sm mt-1">Adicione empréstimos e financiamentos para controlar melhor suas finanças!</p>
        </div>
      )}
    </div>
  );
}