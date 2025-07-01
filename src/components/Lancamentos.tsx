import React, { useState, useEffect, useMemo } from 'react';
import { Plus, Edit3, Trash2, Calendar, DollarSign, Search, Filter, X } from 'lucide-react';
import { DatabaseService } from '../lib/database';
import { formatCurrency, formatDate, createParcelaLancamentos } from '../lib/utils';

export function Lancamentos() {
  const [lancamentos, setLancamentos] = useState<any[]>([]);
  const [categorias, setCategorias] = useState<any[]>([]);
  const [contas, setContas] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState({
    tipo: 'TODOS' as 'TODOS' | 'RECEITA' | 'DESPESA',
    categoriaId: '',
    contaId: '',
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
    } finally {
      setLoading(false);
    }
  };

  const validateForm = () => {
    const errors: Record<string, string> = {};
    
    if (!formData.descricao.trim()) {
      errors.descricao = 'Descrição é obrigatória';
    }
    
    const valor = parseFloat(formData.valor);
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
      const valor = parseFloat(formData.valor);
      const dadosBase = {
        descricao: formData.descricao.trim(),
        valor: valor,
        data: formData.data,
        tipo: formData.tipo,
        conta_id: formData.conta_id,
        categoria_id: formData.categoria_id,
        observacoes: formData.observacoes || null,
      };

      if (formData.isParcelado && formData.numeroParcelas > 1) {
        const parcelas = createParcelaLancamentos(dadosBase, formData.numeroParcelas);
        for (const parcela of parcelas) {
          await DatabaseService.createLancamento(parcela);
        }
      } else {
        await DatabaseService.createLancamento(dadosBase);
      }

      await loadData();
      resetForm();
    } catch (error) {
      console.error('Erro ao salvar lançamento:', error);
      alert('Erro ao salvar lançamento');
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm('Tem certeza que deseja excluir este lançamento?')) {
      try {
        await DatabaseService.deleteLancamento(id);
        await loadData();
      } catch (error) {
        console.error('Erro ao excluir lançamento:', error);
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
      isParcelado: false,
      numeroParcelas: 2,
    });
    setFormErrors({});
    setShowForm(false);
  };

  const clearFilters = () => {
    setFilters({
      tipo: 'TODOS',
      categoriaId: '',
      contaId: '',
      dataInicio: '',
      dataFim: '',
    });
    setSearchTerm('');
  };

  const lancamentosFiltrados = useMemo(() => {
    let resultado = lancamentos;

    // Filtro por busca
    if (searchTerm) {
      resultado = resultado.filter(l => 
        l.descricao.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Filtro por tipo
    if (filters.tipo !== 'TODOS') {
      resultado = resultado.filter(l => l.tipo === filters.tipo);
    }

    // Filtro por categoria
    if (filters.categoriaId) {
      resultado = resultado.filter(l => l.categoria_id === filters.categoriaId);
    }

    // Filtro por conta
    if (filters.contaId) {
      resultado = resultado.filter(l => l.conta_id === filters.contaId);
    }

    // Filtro por período
    if (filters.dataInicio) {
      resultado = resultado.filter(l => l.data >= filters.dataInicio);
    }
    if (filters.dataFim) {
      resultado = resultado.filter(l => l.data <= filters.dataFim);
    }

    return resultado.sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime());
  }, [lancamentos, searchTerm, filters]);

  const categoriasFiltered = categorias.filter(c => c.tipo === formData.tipo);
  const hasActiveFilters = filters.tipo !== 'TODOS' || filters.categoriaId || filters.contaId || filters.dataInicio || filters.dataFim || searchTerm;

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
          {/* Busca */}
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

          {/* Botão de Filtros */}
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

        {/* Painel de Filtros */}
        {showFilters && (
          <div className="mt-4 pt-4 border-t border-gray-200">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
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
              <h2 className="text-xl font-semibold text-gray-900">Novo Lançamento</h2>
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

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Tipo *
                </label>
                <select
                  value={formData.tipo}
                  onChange={(e) => setFormData(prev => ({ 
                    ...prev, 
                    tipo: e.target.value as 'RECEITA' | 'DESPESA',
                    categoria_id: '' // Reset categoria quando muda o tipo
                  }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="DESPESA">Despesa</option>
                  <option value="RECEITA">Receita</option>
                </select>
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
                  onChange={(e) => setFormData(prev => ({ ...prev, conta_id: e.target.value }))}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                    formErrors.conta_id ? 'border-red-300' : 'border-gray-300'
                  }`}
                >
                  <option value="">Selecione uma conta</option>
                  {contas.map(conta => (
                    <option key={conta.id} value={conta.id}>
                      {conta.nome}
                    </option>
                  ))}
                </select>
                {formErrors.conta_id && (
                  <p className="text-red-600 text-sm mt-1">{formErrors.conta_id}</p>
                )}
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

              {formData.tipo === 'DESPESA' && (
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
                          formErrors.numeroParcelas ? 'border-red-300' : 'border-gray-300'
                        }`}
                      />
                      {formErrors.numeroParcelas && (
                        <p className="text-red-600 text-sm mt-1">{formErrors.numeroParcelas}</p>
                      )}
                      <p className="text-sm text-gray-500 mt-1">
                        Valor por parcela: {formData.valor ? formatCurrency(parseFloat(formData.valor) / formData.numeroParcelas) : 'R$ 0,00'}
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
                  Salvar
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
              {lancamentosFiltrados.length} de {lancamentos.length} lançamentos
            </span>
          </div>
        </div>
        
        <div className="p-6">
          {lancamentosFiltrados.length > 0 ? (
            <div className="space-y-3">
              {lancamentosFiltrados.map((lancamento) => {
                const categoria = categorias.find(c => c.id === lancamento.categoria_id);
                const conta = contas.find(c => c.id === lancamento.conta_id);
                
                return (
                  <div key={lancamento.id} className="flex items-center justify-between p-4 hover:bg-gray-50 rounded-lg transition-colors group">
                    <div className="flex items-center space-x-4">
                      <div 
                        className="w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0"
                        style={{ backgroundColor: categoria?.cor + '20' }}
                      >
                        {lancamento.tipo === 'RECEITA' ? (
                          <DollarSign className="w-6 h-6 text-green-600" />
                        ) : (
                          <div 
                            className="w-6 h-6 rounded-full"
                            style={{ backgroundColor: categoria?.cor }}
                          />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-gray-900 truncate">{lancamento.descricao}</p>
                        <div className="flex items-center space-x-2 text-sm text-gray-500">
                          <Calendar className="w-4 h-4 flex-shrink-0" />
                          <span>{formatDate(lancamento.data)}</span>
                          <span>•</span>
                          <span className="truncate">{categoria?.nome}</span>
                          <span>•</span>
                          <span className="truncate">{conta?.nome}</span>
                        </div>
                        {lancamento.total_parcelas && (
                          <div className="text-xs text-blue-600 mt-1">
                            Parcela {lancamento.parcela_atual}/{lancamento.total_parcelas}
                          </div>
                        )}
                        {lancamento.observacoes && (
                          <div className="text-xs text-gray-400 mt-1 truncate">
                            {lancamento.observacoes}
                          </div>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-3 flex-shrink-0">
                      <div className={`font-semibold text-lg ${
                        lancamento.tipo === 'RECEITA' ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {lancamento.tipo === 'RECEITA' ? '+' : '-'} {formatCurrency(lancamento.valor)}
                      </div>
                      
                      <div className="opacity-0 group-hover:opacity-100 flex items-center space-x-1 transition-opacity">
                        <button className="p-2 text-gray-400 hover:text-blue-600 transition-colors">
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => handleDelete(lancamento.id)}
                          className="p-2 text-gray-400 hover:text-red-600 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
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