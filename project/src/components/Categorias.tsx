import React, { useState } from 'react';
import { Plus, Edit3, Trash2, Tag } from 'lucide-react';
import { useBudgetStore } from '../lib/store';

const cores = [
  '#EF4444', '#F97316', '#F59E0B', '#EAB308', '#84CC16', '#22C55E',
  '#10B981', '#14B8A6', '#06B6D4', '#0EA5E9', '#3B82F6', '#6366F1',
  '#8B5CF6', '#A855F7', '#D946EF', '#EC4899', '#F43F5E', '#64748B'
];

export function Categorias() {
  const { categorias, adicionarCategoria, editarCategoria, removerCategoria, lancamentos } = useBudgetStore();
  const [showForm, setShowForm] = useState(false);
  const [editingCategoria, setEditingCategoria] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    nome: '',
    tipo: 'DESPESA' as 'RECEITA' | 'DESPESA',
    cor: cores[0],
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.nome) {
      alert('Por favor, digite o nome da categoria');
      return;
    }

    if (editingCategoria) {
      editarCategoria(editingCategoria, formData);
    } else {
      adicionarCategoria(formData);
    }

    // Reset form
    setFormData({ nome: '', tipo: 'DESPESA', cor: cores[0] });
    setShowForm(false);
    setEditingCategoria(null);
  };

  const handleEdit = (categoria: any) => {
    setEditingCategoria(categoria.id);
    setFormData({
      nome: categoria.nome,
      tipo: categoria.tipo,
      cor: categoria.cor,
    });
    setShowForm(true);
  };

  const handleDelete = (id: string) => {
    const hasTransactions = lancamentos.some(l => l.categoriaId === id);
    if (hasTransactions) {
      alert('Não é possível excluir uma categoria que possui lançamentos vinculados.');
      return;
    }
    
    if (confirm('Tem certeza que deseja excluir esta categoria?')) {
      removerCategoria(id);
    }
  };

  const getTransactionsCount = (categoriaId: string) => {
    return lancamentos.filter(l => l.categoriaId === categoriaId).length;
  };

  const categoriasReceitas = categorias.filter(c => c.tipo === 'RECEITA');
  const categoriasDespesas = categorias.filter(c => c.tipo === 'DESPESA');

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Categorias</h1>
          <p className="text-gray-600 mt-2">Organize suas receitas e despesas</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-5 h-5" />
          <span>Nova Categoria</span>
        </button>
      </div>

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-gray-900 bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">
                {editingCategoria ? 'Editar Categoria' : 'Nova Categoria'}
              </h2>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nome da Categoria *
                </label>
                <input
                  type="text"
                  value={formData.nome}
                  onChange={(e) => setFormData(prev => ({ ...prev, nome: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Ex: Alimentação, Transporte..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Tipo *
                </label>
                <select
                  value={formData.tipo}
                  onChange={(e) => setFormData(prev => ({ ...prev, tipo: e.target.value as 'RECEITA' | 'DESPESA' }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="DESPESA">Despesa</option>
                  <option value="RECEITA">Receita</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Cor *
                </label>
                <div className="grid grid-cols-6 gap-2 mt-2">
                  {cores.map((cor) => (
                    <button
                      key={cor}
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, cor }))}
                      className={`w-8 h-8 rounded-lg border-2 transition-all ${
                        formData.cor === cor ? 'border-gray-900 scale-110' : 'border-gray-200'
                      }`}
                      style={{ backgroundColor: cor }}
                    />
                  ))}
                </div>
              </div>

              <div className="flex space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowForm(false);
                    setEditingCategoria(null);
                    setFormData({ nome: '', tipo: 'DESPESA', cor: cores[0] });
                  }}
                  className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  {editingCategoria ? 'Salvar' : 'Criar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Categorias de Despesas */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">Categorias de Despesas</h2>
        </div>
        
        <div className="p-6">
          {categoriasDespesas.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {categoriasDespesas.map((categoria) => {
                const transacoesCount = getTransactionsCount(categoria.id);
                
                return (
                  <div key={categoria.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-all duration-200 group">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center space-x-3">
                        <div 
                          className="w-10 h-10 rounded-lg flex items-center justify-center"
                          style={{ backgroundColor: categoria.cor + '20' }}
                        >
                          <div 
                            className="w-5 h-5 rounded-full"
                            style={{ backgroundColor: categoria.cor }}
                          />
                        </div>
                        <div>
                          <h3 className="font-medium text-gray-900">{categoria.nome}</h3>
                          <p className="text-sm text-gray-500">{transacoesCount} transações</p>
                        </div>
                      </div>
                      
                      <div className="opacity-0 group-hover:opacity-100 flex items-center space-x-1 transition-opacity">
                        <button 
                          onClick={() => handleEdit(categoria)}
                          className="p-1 text-gray-400 hover:text-blue-600 transition-colors"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => handleDelete(categoria.id)}
                          className="p-1 text-gray-400 hover:text-red-600 transition-colors"
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
            <div className="text-center text-gray-500 py-8">
              <Tag className="w-8 h-8 mx-auto mb-2 text-gray-300" />
              <p>Nenhuma categoria de despesa cadastrada</p>
            </div>
          )}
        </div>
      </div>

      {/* Categorias de Receitas */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">Categorias de Receitas</h2>
        </div>
        
        <div className="p-6">
          {categoriasReceitas.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {categoriasReceitas.map((categoria) => {
                const transacoesCount = getTransactionsCount(categoria.id);
                
                return (
                  <div key={categoria.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-all duration-200 group">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center space-x-3">
                        <div 
                          className="w-10 h-10 rounded-lg flex items-center justify-center"
                          style={{ backgroundColor: categoria.cor + '20' }}
                        >
                          <div 
                            className="w-5 h-5 rounded-full"
                            style={{ backgroundColor: categoria.cor }}
                          />
                        </div>
                        <div>
                          <h3 className="font-medium text-gray-900">{categoria.nome}</h3>
                          <p className="text-sm text-gray-500">{transacoesCount} transações</p>
                        </div>
                      </div>
                      
                      <div className="opacity-0 group-hover:opacity-100 flex items-center space-x-1 transition-opacity">
                        <button 
                          onClick={() => handleEdit(categoria)}
                          className="p-1 text-gray-400 hover:text-blue-600 transition-colors"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => handleDelete(categoria.id)}
                          className="p-1 text-gray-400 hover:text-red-600 transition-colors"
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
            <div className="text-center text-gray-500 py-8">
              <Tag className="w-8 h-8 mx-auto mb-2 text-gray-300" />
              <p>Nenhuma categoria de receita cadastrada</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}