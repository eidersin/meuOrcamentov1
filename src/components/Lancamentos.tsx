import React, { useState, useEffect, useMemo } from 'react';
import { Plus, Edit3, Trash2, Calendar, DollarSign, Search, Filter, X, CheckCircle, Clock, XCircle, CreditCard, ChevronDown, ChevronRight } from 'lucide-react';
import { DatabaseService } from '../lib/database';
import { AuthService } from '../lib/auth';
import { formatCurrency, formatDate, createParcelaLancamentos, parseCurrencyInput } from '../lib/utils';
import { CurrencyInput } from './Common/CurrencyInput';

export function Lancamentos() {
  const [lancamentos, setLancamentos] = useState<any[]>([]);
  const [categorias, setCategorias] = useState<any[]>([]);
  const [contas, setContas] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [editingLancamento, setEditingLancamento] = useState<string | null>(null);
  const [expandedParcelas, setExpandedParcelas] = useState<Set<string>>(new Set());
  const [filters, setFilters] = useState({
    tipo: 'TODOS' as 'TODOS' | 'RECEITA' | 'DESPESA',
    categoriaId: '',
    contaId: '',
    status: 'TODOS' as 'TODOS' | 'PENDENTE' | 'CONFIRMADO' | 'CANCELADO',
    dataInicio: '',
    dataFim: '',
  });
  const [formData, setFormData] = useState({
    descricao: '',
    valor: '',
    data: new Date().toISOString().split('T')[0],
    tipo: 'DESPESA' as 'RECEITA' | 'DESPESA',
    conta_id: '',
    categoria_id: '',
    observacoes: '',
    status: 'CONFIRMADO' as 'PENDENTE' | 'CONFIRMADO' | 'CANCELADO',
    antecedencia_notificacao: 3,
    cartao_credito_usado: '',
    isParcelado: false,
    numeroParcelas: 2,
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [lancamentosData, categoriasData, contasData] = await Promise.all([
        DatabaseService.getLancamentos(),
        DatabaseService.getCategorias(),
        DatabaseService.getContas()
      ]);
      setLancamentos(lancamentosData);
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

  const validateForm = () => {
    const errors: Record<string, string> = {};
    
    if (!formData.descricao.trim()) {
      errors.descricao = 'Descrição é obrigatória';
    }
    
    const valor = parseCurrencyInput(formData.valor);
    if (!formData.valor || isNaN(valor) || valor <= 0) {
      errors.valor = 'Valor deve ser maior que zero';
    }
    
    if (!formData.conta_id) {
      errors.conta_id = 'Selecione uma conta';
    }
    
    if (!formData.categoria_id) {
      errors.categoria_id = 'Selecione uma categoria';
    }
    
    if (formData.isParcelado && (formData.numeroParcelas < 2 || formData.numeroParcelas > 24)) {
      errors.numeroParcelas = 'Número de parcelas deve estar entre 2 e 24';
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
      const valor = parseCurrencyInput(formData.valor);
      const dadosBase = {
        descricao: formData.descricao.trim(),
        valor: valor,
        data: formData.data,
        tipo: formData.tipo,
        conta_id: formData.conta_id,
        categoria_id: formData.categoria_id,
        observacoes: formData.observacoes || null,
        status: formData.status,
        antecedencia_notificacao: formData.antecedencia_notificacao,
        cartao_credito_usado: formData.cartao_credito_usado || null,
      };

      if (editingLancamento) {
        await DatabaseService.updateLancamento(editingLancamento, dadosBase);
      } else {
        if (formData.isParcelado && formData.numeroParcelas > 1) {
          const parcelas = createParcelaLancamentos(dadosBase, formData.numeroParcelas);
          for (const parcela of parcelas) {
            await DatabaseService.createLancamento(parcela);
          }
        } else {
          await DatabaseService.createLancamento(dadosBase);
        }
      }

      await loadData();
      resetForm();
    } catch (error) {
      console.error('Erro ao salvar lançamento:', error);
      if (error instanceof Error && error.message === 'Usuário não autenticado') {
        await AuthService.signOut();
        return;
      }
      alert('Erro ao salvar lançamento');
    }
  };

  const handleEdit = (lancamento: any) => {
    setEditingLancamento(lancamento.id);
    setFormData({
      descricao: lancamento.descricao,
      valor: formatCurrency(lancamento.valor),
      data: lancamento.data,
      tipo: lancamento.tipo,
      conta_id: lancamento.conta_id,
      categoria_id: lancamento.categoria_id,
      observacoes: lancamento.observacoes || '',
      status: lancamento.status,
      antecedencia_notificacao: lancamento.antecedencia_notificacao || 3,
      cartao_credito_usado: lancamento.cartao_credito_usado || '',
      isParcelado: false,
      numeroParcelas: 2,
    });
    setShowForm(true);
  };

  const handleStatusChange = async (id: string, novoStatus: 'PENDENTE' | 'CONFIRMADO' | 'CANCELADO') => {
    try {
      await DatabaseService.updateLancamento(id, { status: novoStatus });
      await loadData();
    } catch (error) {
      console.error('Erro ao atualizar status:', error);
      if (error instanceof Error && error.message === 'Usuário não autenticado') {
        await AuthService.signOut();
        return;
      }
      alert('Erro ao atualizar status');
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm('Tem certeza que deseja excluir este lançamento?')) {
      try {
        await DatabaseService.deleteLancamento(id);
        await loadData();
      } catch (error) {
        console.error('Erro ao excluir lançamento:', error);
        if (error instanceof Error && error.message === 'Usuário não autenticado') {
          await AuthService.signOut();
          return;
        }
        alert('Erro ao excluir lançamento');
      }
    }
  };

  const resetForm = () => {
    setFormData({
      descricao: '',
      valor: '',
      data: new Date().toISOString().split('T')[0],
      tipo: 'DESPESA',
      conta_id: '',
      categoria_id: '',
      observacoes: '',
      status: 'CONFIRMADO',
      antecedencia_notificacao: 3,
      cartao_credito_usado: '',
      isParcelado: false,
      numeroParcelas: 2,
    });
    setFormErrors({});
    setShowForm(false);
    setEditingLancamento(null);
  };

  const clearFilters = () => {
    setFilters({
      tipo: 'TODOS',
      categoriaId: '',
      contaId: '',
      status: 'TODOS',
      dataInicio: '',
      dataFim: '',
    });
    setSearchTerm('');
  };

  const toggleParcelaExpansion = (parcelaId: string) => {
    setExpandedParcelas(prev => {
      const newSet = new Set(prev);
      if (newSet.has(parcelaId)) {
        newSet.delete(parcelaId);
      } else {
        newSet.add(parcelaId);
      }
      return newSet;
    });
  };

  // Agrupar lançamentos por compra parcelada
  const lancamentosAgrupados = useMemo(() => {
    const grupos: any[] = [];
    const processados = new Set<string>();

    lancamentos.forEach(lancamento => {
      if (processados.has(lancamento.id)) return;

      if (lancamento.compra_parcelada_id) {
        // Buscar todas as parcelas desta compra
        const parcelas = lancamentos.filter(l => 
          l.compra_parcelada_id === lancamento.compra_parcelada_id
        ).sort((a, b) => (a.parcela_atual || 0) - (b.parcela_atual || 0));

        // Marcar todas as parcelas como processadas
        parcelas.forEach(p => processados.add(p.id));

        // Criar grupo de parcelas
        const valorTotal = parcelas.reduce((sum, p) => sum + p.valor, 0);
        const primeiraParcela = parcelas[0];
        
        grupos.push({
          id: lancamento.compra_parcelada_id,
          tipo: 'grupo_parcelas',
          descricao: primeiraParcela.descricao.replace(/ \(\d+\/\d+\)$/, ''),
          valor: valorTotal,
          data: primeiraParcela.data,
          tipo_transacao: primeiraParcela.tipo,
          conta_id: primeiraParcela.conta_id,
          categoria_id: primeiraParcela.categoria_id,
          status: primeiraParcela.status,
          total_parcelas: primeiraParcela.total_parcelas,
          cartao_credito_usado: primeiraParcela.cartao_credito_usado,
          categoria: primeiraParcela.categoria,
          conta: primeiraParcela.conta,
          parcelas: parcelas,
          created_at: primeiraParcela.created_at
        });
      } else {
        // Lançamento individual
        grupos.push({
          ...lancamento,
          tipo_transacao: lancamento.tipo,
          tipo: 'individual'
        });
        processados.add(lancamento.id);
      }
    });

    return grupos;
  }, [lancamentos]);

  const lancamentosFiltrados = useMemo(() => {
    let resultado = lancamentosAgrupados;

    if (searchTerm) {
      resultado = resultado.filter(l => 
        l.descricao.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (filters.tipo !== 'TODOS') {
      resultado = resultado.filter(l => l.tipo_transacao === filters.tipo || l.tipo === filters.tipo);
    }

    if (filters.status !== 'TODOS') {
      resultado = resultado.filter(l => l.status === filters.status);
    }

    if (filters.categoriaId) {
      resultado = resultado.filter(l => l.categoria_id === filters.categoriaId);
    }

    if (filters.contaId) {
      resultado = resultado.filter(l => l.conta_id === filters.contaId);
    }

    if (filters.dataInicio) {
      resultado = resultado.filter(l => l.data >= filters.dataInicio);
    }
    if (filters.dataFim) {
      resultado = resultado.filter(l => l.data <= filters.dataFim);
    }

    return resultado.sort((a, b) => new Date(b.data || b.created_at).getTime() - new Date(a.data || a.created_at).getTime());
  }, [lancamentosAgrupados, searchTerm, filters]);

  const categoriasFiltered = categorias.filter(c => c.tipo === formData.tipo);
  const hasActiveFilters = filters.tipo !== 'TODOS' || filters.status !== 'TODOS' || filters.categoriaId || filters.contaId || filters.dataInicio || filters.dataFim || searchTerm;

  // Verificar se a conta selecionada tem cartão de crédito
  const contaSelecionada = contas.find(c => c.id === formData.conta_id);
  const temCartaoCredito = contaSelecionada?.limite_credito && contaSelecionada.limite_credito > 0;

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'CONFIRMADO':
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'PENDENTE':
        return <Clock className="w-4 h-4 text-yellow-600" />;
      case 'CANCELADO':
        return <XCircle className="w-4 h-4 text-red-600" />;
      default:
        return null;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'CONFIRMADO':
        return 'text-green-600 bg-green-50';
      case 'PENDENTE':
        return 'text-yellow-600 bg-yellow-50';
      case 'CANCELADO':
        return 'text-red-600 bg-red-50';
      default:
        return 'text-gray-600 bg-gray-50';
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
          <h1 className="text-3xl font-bold text-gray-900">Lançamentos</h1>
          <p className="text-gray-600 mt-2">Gerencie suas receitas e despesas</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center justify-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-5 h-5" />
          <span>Novo Lançamento</span>
        </button>
      </div>

      {/* Busca e Filtros */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Buscar por descrição..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center space-x-2 px-4 py-2 rounded-lg border transition-colors ${
              hasActiveFilters 
                ? 'bg-blue-50 border-blue-200 text-blue-700' 
                : 'bg-gray-50 border-gray-200 text-gray-700 hover:bg-gray-100'
            }`}
          >
            <Filter className="w-5 h-5" />
            <span>Filtros</span>
            {hasActiveFilters && (
              <span className="bg-blue-600 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                !
              </span>
            )}
          </button>

          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              className="flex items-center space-x-2 px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
            >
              <X className="w-4 h-4" />
              <span>Limpar</span>
            </button>
          )}
        </div>

        {showFilters && (
          <div className="mt-4 pt-4 border-t border-gray-200">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tipo</label>
                <select
                  value={filters.tipo}
                  onChange={(e) => setFilters(prev => ({ ...prev, tipo: e.target.value as any }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="TODOS">Todos</option>
                  <option value="RECEITA">Receitas</option>
                  <option value="DESPESA">Despesas</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                <select
                  value={filters.status}
                  onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value as any }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="TODOS">Todos</option>
                  <option value="CONFIRMADO">Confirmado</option>
                  <option value="PENDENTE">Pendente</option>
                  <option value="CANCELADO">Cancelado</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Categoria</label>
                <select
                  value={filters.categoriaId}
                  onChange={(e) => setFilters(prev => ({ ...prev, categoriaId: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Todas</option>
                  {categorias.map(categoria => (
                    <option key={categoria.id} value={categoria.id}>
                      {categoria.nome}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Conta</label>
                <select
                  value={filters.contaId}
                  onChange={(e) => setFilters(prev => ({ ...prev, contaId: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Todas</option>
                  {contas.map(conta => (
                    <option key={conta.id} value={conta.id}>
                      {conta.nome}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Data Início</label>
                <input
                  type="date"
                  value={filters.dataInicio}
                  onChange={(e) => setFilters(prev => ({ ...prev, dataInicio: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Data Fim</label>
                <input
                  type="date"
                  value={filters.dataFim}
                  onChange={(e) => setFilters(prev => ({ ...prev, dataFim: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-gray-900 bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">
                {editingLancamento ? 'Editar Lançamento' : 'Novo Lançamento'}
              </h2>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
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
                  placeholder="Ex: Supermercado, Salário..."
                />
                {formErrors.descricao && (
                  <p className="text-red-600 text-sm mt-1">{formErrors.descricao}</p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Valor *
                  </label>
                  <CurrencyInput
                    value={formData.valor}
                    onChange={(value) => setFormData(prev => ({ ...prev, valor: value }))}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                      formErrors.valor ? 'border-red-300' : 'border-gray-300'
                    }`}
                    error={!!formErrors.valor}
                  />
                  {formErrors.valor && (
                    <p className="text-red-600 text-sm mt-1">{formErrors.valor}</p>
                  )}
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Data *
                  </label>
                  <input
                    type="date"
                    value={formData.data}
                    onChange={(e) => setFormData(prev => ({ ...prev, data: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Tipo *
                  </label>
                  <select
                    value={formData.tipo}
                    onChange={(e) => setFormData(prev => ({ 
                      ...prev, 
                      tipo: e.target.value as 'RECEITA' | 'DESPESA',
                      categoria_id: ''
                    }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="DESPESA">Despesa</option>
                    <option value="RECEITA">Receita</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Status *
                  </label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData(prev => ({ ...prev, status: e.target.value as any }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="CONFIRMADO">Confirmado</option>
                    <option value="PENDENTE">Pendente</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Categoria *
                </label>
                <select
                  value={formData.categoria_id}
                  onChange={(e) => setFormData(prev => ({ ...prev, categoria_id: e.target.value }))}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                    formErrors.categoria_id ? 'border-red-300' : 'border-gray-300'
                  }`}
                >
                  <option value="">Selecione uma categoria</option>
                  {categoriasFiltered.map(categoria => (
                    <option key={categoria.id} value={categoria.id}>
                      {categoria.nome}
                    </option>
                  ))}
                </select>
                {formErrors.categoria_id && (
                  <p className="text-red-600 text-sm mt-1">{formErrors.categoria_id}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Conta *
                </label>
                <select
                  value={formData.conta_id}
                  onChange={(e) => setFormData(prev => ({ ...prev, conta_id: e.target.value, cartao_credito_usado: '' }))}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                    formErrors.conta_id ? 'border-red-300' : 'border-gray-300'
                  }`}
                >
                  <option value="">Selecione uma conta</option>
                  {contas.map(conta => (
                    <option key={conta.id} value={conta.id}>
                      {conta.nome} {conta.limite_credito ? '(com cartão)' : ''}
                    </option>
                  ))}
                </select>
                {formErrors.conta_id && (
                  <p className="text-red-600 text-sm mt-1">{formErrors.conta_id}</p>
                )}
              </div>

              {/* Campo de cartão de crédito - só aparece se a conta tem limite e é despesa */}
              {temCartaoCredito && formData.tipo === 'DESPESA' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    <CreditCard className="w-4 h-4 inline mr-1" />
                    Cartão de Crédito Usado
                  </label>
                  <input
                    type="text"
                    value={formData.cartao_credito_usado}
                    onChange={(e) => setFormData(prev => ({ ...prev, cartao_credito_usado: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Ex: Visa, Mastercard, Elo..."
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Deixe em branco se não foi usado o cartão de crédito
                  </p>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Antecedência para Notificação
                </label>
                <select
                  value={formData.antecedencia_notificacao}
                  onChange={(e) => setFormData(prev => ({ ...prev, antecedencia_notificacao: parseInt(e.target.value) }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value={1}>1 dia antes</option>
                  <option value={3}>3 dias antes</option>
                  <option value={7}>7 dias antes</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Observações
                </label>
                <textarea
                  value={formData.observacoes}
                  onChange={(e) => setFormData(prev => ({ ...prev, observacoes: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Observações opcionais..."
                  rows={3}
                />
              </div>

              {formData.tipo === 'DESPESA' && !editingLancamento && (
                <div className="space-y-3">
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="isParcelado"
                      checked={formData.isParcelado}
                      onChange={(e) => setFormData(prev => ({ ...prev, isParcelado: e.target.checked }))}
                      className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <label htmlFor="isParcelado" className="ml-2 text-sm font-medium text-gray-700">
                      Compra parcelada
                    </label>
                  </div>

                  {formData.isParcelado && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Número de parcelas
                      </label>
                      <input
                        type="number"
                        min="2"
                        max="24"
                        value={formData.numeroParcelas}
                        onChange={(e) => setFormData(prev => ({ ...prev, numeroParcelas: parseInt(e.target.value) }))}
                        className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                          formErrors.numeroParcelas ? 'border-blue-300' : 'border-gray-300'
                        }`}
                      />
                      {formErrors.numeroParcelas && (
                        <p className="text-red-600 text-sm mt-1">{formErrors.numeroParcelas}</p>
                      )}
                      <p className="text-sm text-gray-500 mt-1">
                        Valor por parcela: {formData.valor ? formatCurrency(parseCurrencyInput(formData.valor) / formData.numeroParcelas) : 'R$ 0,00'}
                      </p>
                    </div>
                  )}
                </div>
              )}

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
                  {editingLancamento ? 'Salvar' : 'Criar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Lista de Lançamentos */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-900">
              Histórico de Lançamentos
            </h2>
            <span className="text-sm text-gray-500">
              {lancamentosFiltrados.length} de {lancamentosAgrupados.length} lançamentos
            </span>
          </div>
        </div>
        
        <div className="p-6">
          {lancamentosFiltrados.length > 0 ? (
            <div className="space-y-3">
              {lancamentosFiltrados.map((item) => {
                const categoria = categorias.find(c => c.id === item.categoria_id);
                const conta = contas.find(c => c.id === item.conta_id);
                const isExpanded = expandedParcelas.has(item.id);
                
                return (
                  <div key={item.id} className="border border-gray-200 rounded-lg">
                    {/* Lançamento principal */}
                    <div className="flex items-center justify-between p-4 hover:bg-gray-50 transition-colors group">
                      <div className="flex items-center space-x-4 flex-1">
                        {/* Ícone de expansão para parcelas */}
                        {item.tipo === 'grupo_parcelas' && (
                          <button
                            onClick={() => toggleParcelaExpansion(item.id)}
                            className="p-1 hover:bg-gray-200 rounded transition-colors"
                          >
                            {isExpanded ? (
                              <ChevronDown className="w-4 h-4 text-gray-600" />
                            ) : (
                              <ChevronRight className="w-4 h-4 text-gray-600" />
                            )}
                          </button>
                        )}

                        <div 
                          className="w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0"
                          style={{ 
                            backgroundColor: (item.tipo_transacao || item.tipo) === 'RECEITA' 
                              ? '#10B981' + '20' 
                              : categoria?.cor + '20' 
                          }}
                        >
                          {(item.tipo_transacao || item.tipo) === 'RECEITA' ? (
                            <DollarSign className="w-6 h-6 text-green-600" />
                          ) : (
                            <div 
                              className="w-6 h-6 rounded-full"
                              style={{ backgroundColor: categoria?.cor }}
                            />
                          )}
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex items-center space-x-2">
                            <p className="font-medium text-gray-900 truncate">{item.descricao}</p>
                            <span className={`inline-flex items-center space-x-1 px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(item.status)}`}>
                              {getStatusIcon(item.status)}
                              <span>{item.status}</span>
                            </span>
                            {item.cartao_credito_usado && (
                              <span className="inline-flex items-center space-x-1 px-2 py-1 rounded-full text-xs font-medium bg-purple-50 text-purple-700">
                                <CreditCard className="w-3 h-3" />
                                <span>{item.cartao_credito_usado}</span>
                              </span>
                            )}
                          </div>
                          <div className="flex items-center space-x-2 text-sm text-gray-500">
                            <Calendar className="w-4 h-4 flex-shrink-0" />
                            <span>{formatDate(item.data)}</span>
                            <span>•</span>
                            <span className="truncate">{categoria?.nome}</span>
                            <span>•</span>
                            <span className="truncate">{conta?.nome}</span>
                          </div>
                          {item.tipo === 'grupo_parcelas' && (
                            <div className="text-xs text-blue-600 mt-1">
                              {item.total_parcelas} parcelas
                            </div>
                          )}
                          {item.total_parcelas && item.tipo !== 'grupo_parcelas' && (
                            <div className="text-xs text-blue-600 mt-1">
                              Parcela {item.parcela_atual}/{item.total_parcelas}
                            </div>
                          )}
                          {item.observacoes && (
                            <div className="text-xs text-gray-400 mt-1 truncate">
                              {item.observacoes}
                            </div>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-3 flex-shrink-0">
                        <div className={`font-semibold text-lg ${
                          (item.tipo_transacao || item.tipo) === 'RECEITA' ? 'text-green-600' : 'text-red-600'
                        }`}>
                          {(item.tipo_transacao || item.tipo) === 'RECEITA' ? '+ ' : '- '}{formatCurrency(item.valor)}
                        </div>
                        
                        {item.tipo !== 'grupo_parcelas' && (
                          <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            {item.status !== 'CONFIRMADO' && (
                              <button 
                                onClick={() => handleStatusChange(item.id, 'CONFIRMADO')}
                                className="p-2 text-gray-500 hover:text-green-600 hover:bg-green-50 rounded-lg transition-all duration-200"
                                title="Confirmar"
                              >
                                <CheckCircle className="w-4 h-4" />
                              </button>
                            )}
                            {item.status !== 'PENDENTE' && (
                              <button 
                                onClick={() => handleStatusChange(item.id, 'PENDENTE')}
                                className="p-2 text-gray-500 hover:text-yellow-600 hover:bg-yellow-50 rounded-lg transition-all duration-200"
                                title="Marcar como Pendente"
                              >
                                <Clock className="w-4 h-4" />
                              </button>
                            )}
                            {item.status !== 'CANCELADO' && (
                              <button 
                                onClick={() => handleStatusChange(item.id, 'CANCELADO')}
                                className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all duration-200"
                                title="Cancelar"
                              >
                                <XCircle className="w-4 h-4" />
                              </button>
                            )}
                            
                            <button 
                              onClick={() => handleEdit(item)}
                              className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all duration-200"
                              title="Editar"
                            >
                              <Edit3 className="w-4 h-4" />
                            </button>
                            <button 
                              onClick={() => handleDelete(item.id)}
                              className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all duration-200"
                              title="Excluir"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Parcelas expandidas */}
                    {item.tipo === 'grupo_parcelas' && isExpanded && (
                      <div className="border-t border-gray-200 bg-gray-50">
                        <div className="p-4">
                          <h4 className="text-sm font-medium text-gray-700 mb-3">Parcelas:</h4>
                          <div className="space-y-2">
                            {item.parcelas.map((parcela: any) => (
                              <div key={parcela.id} className="flex items-center justify-between p-3 bg-white rounded-lg border border-gray-200 group">
                                <div className="flex items-center space-x-3">
                                  <span className="text-sm font-medium text-gray-600">
                                    {parcela.parcela_atual}/{parcela.total_parcelas}
                                  </span>
                                  <span className="text-sm text-gray-600">
                                    {formatDate(parcela.data)}
                                  </span>
                                  <span className={`inline-flex items-center space-x-1 px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(parcela.status)}`}>
                                    {getStatusIcon(parcela.status)}
                                    <span>{parcela.status}</span>
                                  </span>
                                </div>
                                <div className="flex items-center space-x-3">
                                  <span className="font-medium text-red-600">
                                    {formatCurrency(parcela.valor)}
                                  </span>
                                  <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    {parcela.status !== 'CONFIRMADO' && (
                                      <button 
                                        onClick={() => handleStatusChange(parcela.id, 'CONFIRMADO')}
                                        className="p-1 text-gray-400 hover:text-green-600 transition-colors"
                                        title="Confirmar"
                                      >
                                        <CheckCircle className="w-4 h-4" />
                                      </button>
                                    )}
                                    {parcela.status !== 'PENDENTE' && (
                                      <button 
                                        onClick={() => handleStatusChange(parcela.id, 'PENDENTE')}
                                        className="p-1 text-gray-400 hover:text-yellow-600 transition-colors"
                                        title="Marcar como Pendente"
                                      >
                                        <Clock className="w-4 h-4" />
                                      </button>
                                    )}
                                    <button 
                                      onClick={() => handleEdit(parcela)}
                                      className="p-1 text-gray-400 hover:text-blue-600 transition-colors"
                                      title="Editar"
                                    >
                                      <Edit3 className="w-4 h-4" />
                                    </button>
                                    <button 
                                      onClick={() => handleDelete(parcela.id)}
                                      className="p-1 text-gray-400 hover:text-red-600 transition-colors"
                                      title="Excluir"
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </button>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center text-gray-500 py-12">
              <DollarSign className="w-12 h-12 mx-auto mb-4 text-gray-300" />
              <p className="text-lg font-medium">
                {hasActiveFilters ? 'Nenhum lançamento encontrado com os filtros aplicados' : 'Nenhum lançamento encontrado'}
              </p>
              <p className="text-sm mt-1">
                {hasActiveFilters ? 'Tente ajustar os filtros ou limpar a busca' : 'Comece adicionando suas primeiras transações!'}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}