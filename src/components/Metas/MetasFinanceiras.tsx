import React, { useState, useEffect } from 'react';
import { Plus, Target, TrendingUp, Calendar, Edit3, Trash2 } from 'lucide-react';
import { DatabaseService } from '../../lib/database';
import { formatCurrency, formatDate } from '../../lib/utils';

interface Meta {
  id: string;
  nome: string;
  descricao: string | null;
  tipo: 'ECONOMIA' | 'GASTO_MAXIMO' | 'RECEITA_MINIMA';
  valor_meta: number;
  valor_atual: number;
  data_inicio: string;
  data_fim: string;
  status: 'ATIVA' | 'PAUSADA' | 'CONCLUIDA' | 'CANCELADA';
  cor: string;
  categoria?: {
    nome: string;
    cor: string;
  };
}

export function MetasFinanceiras() {
  const [metas, setMetas] = useState<Meta[]>([]);
  const [categorias, setCategorias] = useState<any[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingMeta, setEditingMeta] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState({
    nome: '',
    descricao: '',
    tipo: 'ECONOMIA' as 'ECONOMIA' | 'GASTO_MAXIMO' | 'RECEITA_MINIMA',
    valor_meta: '',
    data_inicio: new Date().toISOString().split('T')[0],
    data_fim: '',
    categoria_id: '',
    cor: '#F59E0B',
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [metasData, categoriasData] = await Promise.all([
        DatabaseService.getMetas(),
        DatabaseService.getCategorias(),
      ]);
      setMetas(metasData);
      setCategorias(categoriasData);
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const metaData = {
        nome: formData.nome,
        descricao: formData.descricao || null,
        tipo: formData.tipo,
        valor_meta: parseFloat(formData.valor_meta),
        data_inicio: formData.data_inicio,
        data_fim: formData.data_fim,
        categoria_id: formData.categoria_id || null,
        cor: formData.cor,
      };

      if (editingMeta) {
        await DatabaseService.updateMeta(editingMeta, metaData);
      } else {
        await DatabaseService.createMeta(metaData);
      }

      await loadData();
      resetForm();
    } catch (error) {
      console.error('Erro ao salvar meta:', error);
      alert('Erro ao salvar meta');
    }
  };

  const handleEdit = (meta: Meta) => {
    setEditingMeta(meta.id);
    setFormData({
      nome: meta.nome,
      descricao: meta.descricao || '',
      tipo: meta.tipo,
      valor_meta: meta.valor_meta.toString(),
      data_inicio: meta.data_inicio,
      data_fim: meta.data_fim,
      categoria_id: '', // Você precisará ajustar isso baseado na estrutura
      cor: meta.cor,
    });
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (confirm('Tem certeza que deseja excluir esta meta?')) {
      try {
        await DatabaseService.deleteMeta(id);
        await loadData();
      } catch (error) {
        console.error('Erro ao excluir meta:', error);
        alert('Erro ao excluir meta');
      }
    }
  };

  const resetForm = () => {
    setFormData({
      nome: '',
      descricao: '',
      tipo: 'ECONOMIA',
      valor_meta: '',
      data_inicio: new Date().toISOString().split('T')[0],
      data_fim: '',
      categoria_id: '',
      cor: '#F59E0B',
    });
    setShowForm(false);
    setEditingMeta(null);
  };

  const getProgressPercentage = (meta: Meta) => {
    if (meta.valor_meta === 0) return 0;
    return Math.min((meta.valor_atual / meta.valor_meta) * 100, 100);
  };

  const getStatusColor = (meta: Meta) => {
    const progress = getProgressPercentage(meta);
    if (meta.status === 'CONCLUIDA') return 'text-green-600';
    if (meta.status === 'CANCELADA') return 'text-red-600';
    if (progress >= 100) return 'text-green-600';
    if (progress >= 75) return 'text-yellow-600';
    return 'text-blue-600';
  };

  const getStatusText = (meta: Meta) => {
    const progress = getProgressPercentage(meta);
    if (meta.status === 'CONCLUIDA') return 'Concluída';
    if (meta.status === 'CANCELADA') return 'Cancelada';
    if (meta.status === 'PAUSADA') return 'Pausada';
    if (progress >= 100) return 'Meta atingida!';
    return 'Em andamento';
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
          <h1 className="text-3xl font-bold text-gray-900">Metas Financeiras</h1>
          <p className="text-gray-600 mt-2">Defina e acompanhe seus objetivos financeiros</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center justify-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-5 h-5" />
          <span>Nova Meta</span>
        </button>
      </div>

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-gray-900 bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">
                {editingMeta ? 'Editar Meta' : 'Nova Meta'}
              </h2>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nome da Meta *
                </label>
                <input
                  type="text"
                  value={formData.nome}
                  onChange={(e) => setFormData(prev => ({ ...prev, nome: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Ex: Reserva de emergência"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Descrição
                </label>
                <textarea
                  value={formData.descricao}
                  onChange={(e) => setFormData(prev => ({ ...prev, descricao: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Descreva sua meta..."
                  rows={3}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Tipo de Meta *
                </label>
                <select
                  value={formData.tipo}
                  onChange={(e) => setFormData(prev => ({ ...prev, tipo: e.target.value as any }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="ECONOMIA">Economia/Poupança</option>
                  <option value="GASTO_MAXIMO">Limite de Gastos</option>
                  <option value="RECEITA_MINIMA">Meta de Receita</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Valor da Meta *
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.valor_meta}
                  onChange={(e) => setFormData(prev => ({ ...prev, valor_meta: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="0,00"
                  required
                />
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
                    Data Fim *
                  </label>
                  <input
                    type="date"
                    value={formData.data_fim}
                    onChange={(e) => setFormData(prev => ({ ...prev, data_fim: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Categoria (Opcional)
                </label>
                <select
                  value={formData.categoria_id}
                  onChange={(e) => setFormData(prev => ({ ...prev, categoria_id: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Todas as categorias</option>
                  {categorias.map(categoria => (
                    <option key={categoria.id} value={categoria.id}>
                      {categoria.nome}
                    </option>
                  ))}
                </select>
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
                  {editingMeta ? 'Salvar' : 'Criar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Lista de Metas */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {metas.map((meta) => {
          const progress = getProgressPercentage(meta);
          const statusColor = getStatusColor(meta);
          const statusText = getStatusText(meta);
          
          return (
            <div key={meta.id} className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-all duration-200 group">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <div 
                    className="w-12 h-12 rounded-lg flex items-center justify-center"
                    style={{ backgroundColor: meta.cor + '20' }}
                  >
                    <Target className="w-6 h-6" style={{ color: meta.cor }} />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">{meta.nome}</h3>
                    <p className={`text-sm ${statusColor}`}>{statusText}</p>
                  </div>
                </div>
                
                <div className="opacity-0 group-hover:opacity-100 flex items-center space-x-1 transition-opacity">
                  <button 
                    onClick={() => handleEdit(meta)}
                    className="p-1 text-gray-400 hover:text-blue-600 transition-colors"
                  >
                    <Edit3 className="w-4 h-4" />
                  </button>
                  <button 
                    onClick={() => handleDelete(meta.id)}
                    className="p-1 text-gray-400 hover:text-red-600 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {meta.descricao && (
                <p className="text-sm text-gray-600 mb-4">{meta.descricao}</p>
              )}

              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Progresso:</span>
                  <span className="text-sm font-medium">{progress.toFixed(1)}%</span>
                </div>
                
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="h-2 rounded-full transition-all duration-300"
                    style={{ 
                      width: `${Math.min(progress, 100)}%`,
                      backgroundColor: meta.cor
                    }}
                  />
                </div>
                
                <div className="flex justify-between items-center">
                  <div>
                    <p className="text-sm text-gray-600">Atual</p>
                    <p className="font-semibold text-gray-900">{formatCurrency(meta.valor_atual)}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-gray-600">Meta</p>
                    <p className="font-semibold text-gray-900">{formatCurrency(meta.valor_meta)}</p>
                  </div>
                </div>
                
                <div className="pt-3 border-t border-gray-100">
                  <div className="flex items-center justify-between text-sm text-gray-600">
                    <div className="flex items-center space-x-1">
                      <Calendar className="w-4 h-4" />
                      <span>{formatDate(meta.data_inicio)}</span>
                    </div>
                    <span>até</span>
                    <span>{formatDate(meta.data_fim)}</span>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {metas.length === 0 && (
        <div className="text-center text-gray-500 py-12">
          <Target className="w-12 h-12 mx-auto mb-4 text-gray-300" />
          <p className="text-lg font-medium">Nenhuma meta cadastrada</p>
          <p className="text-sm mt-1">Crie sua primeira meta financeira!</p>
        </div>
      )}
    </div>
  );
}