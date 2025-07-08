import React, { useState, useRef } from 'react';
import { Upload, FileText, CheckCircle, AlertCircle, Download, X, Eye } from 'lucide-react';
import { DatabaseService } from '../../lib/database';
import { AuthService } from '../../lib/auth';
import { formatCurrency, formatDate } from '../../lib/utils';

interface TransacaoImportada {
  id: string;
  data: string;
  descricao: string;
  valor: number;
  tipo: 'RECEITA' | 'DESPESA';
  status: 'NOVA' | 'DUPLICADA' | 'CONCILIADA';
  categoria_sugerida?: string;
  conta_id?: string;
}

export function ConciliacaoBancaria() {
  const [transacoesImportadas, setTransacoesImportadas] = useState<TransacaoImportada[]>([]);
  const [loading, setLoading] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [contas, setContas] = useState<any[]>([]);
  const [categorias, setCategorias] = useState<any[]>([]);
  const [contaSelecionada, setContaSelecionada] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [contasData, categoriasData] = await Promise.all([
        DatabaseService.getContas(),
        DatabaseService.getCategorias()
      ]);
      setContas(contasData);
      setCategorias(categoriasData);
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setLoading(true);

    try {
      const text = await file.text();
      let transacoes: TransacaoImportada[] = [];

      if (file.name.toLowerCase().endsWith('.csv')) {
        transacoes = parseCSV(text);
      } else if (file.name.toLowerCase().endsWith('.ofx')) {
        transacoes = parseOFX(text);
      } else {
        throw new Error('Formato de arquivo não suportado. Use CSV ou OFX.');
      }

      // Detectar duplicatas
      const lancamentosExistentes = await DatabaseService.getLancamentos();
      transacoes = transacoes.map(t => {
        const duplicata = lancamentosExistentes.find(l => 
          l.data === t.data && 
          Math.abs(l.valor - Math.abs(t.valor)) < 0.01 &&
          l.descricao.toLowerCase().includes(t.descricao.toLowerCase().substring(0, 10))
        );
        
        return {
          ...t,
          status: duplicata ? 'DUPLICADA' : 'NOVA',
          categoria_sugerida: sugerirCategoria(t.descricao)
        };
      });

      setTransacoesImportadas(transacoes);
      setShowPreview(true);
    } catch (error) {
      console.error('Erro ao processar arquivo:', error);
      alert('Erro ao processar arquivo: ' + (error as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const parseCSV = (text: string): TransacaoImportada[] => {
    const lines = text.split('\n').filter(line => line.trim());
    const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
    
    // Detectar colunas automaticamente
    const dataIndex = headers.findIndex(h => h.includes('data') || h.includes('date'));
    const descricaoIndex = headers.findIndex(h => h.includes('descri') || h.includes('historic') || h.includes('memo'));
    const valorIndex = headers.findIndex(h => h.includes('valor') || h.includes('amount') || h.includes('value'));
    const tipoIndex = headers.findIndex(h => h.includes('tipo') || h.includes('type') || h.includes('credit') || h.includes('debit'));

    if (dataIndex === -1 || descricaoIndex === -1 || valorIndex === -1) {
      throw new Error('Arquivo CSV deve conter colunas: Data, Descrição e Valor');
    }

    return lines.slice(1).map((line, index) => {
      const columns = line.split(',').map(c => c.trim().replace(/"/g, ''));
      
      const valor = parseFloat(columns[valorIndex].replace(/[^\d.,-]/g, '').replace(',', '.'));
      const tipo = valor < 0 ? 'DESPESA' : 'RECEITA';
      
      return {
        id: `import-${index}`,
        data: formatDateFromString(columns[dataIndex]),
        descricao: columns[descricaoIndex],
        valor: Math.abs(valor),
        tipo,
        status: 'NOVA' as const
      };
    });
  };

  const parseOFX = (text: string): TransacaoImportada[] => {
    // Parser básico para OFX
    const transactions: TransacaoImportada[] = [];
    const stmtTrnRegex = /<STMTTRN>(.*?)<\/STMTTRN>/gs;
    let match;

    while ((match = stmtTrnRegex.exec(text)) !== null) {
      const trnData = match[1];
      
      const dtposted = trnData.match(/<DTPOSTED>(\d+)/)?.[1];
      const trnamt = trnData.match(/<TRNAMT>([-\d.]+)/)?.[1];
      const memo = trnData.match(/<MEMO>(.*?)</)?.[1] || trnData.match(/<NAME>(.*?)</)?.[1];
      
      if (dtposted && trnamt && memo) {
        const valor = parseFloat(trnamt);
        const data = formatOFXDate(dtposted);
        
        transactions.push({
          id: `ofx-${transactions.length}`,
          data,
          descricao: memo.trim(),
          valor: Math.abs(valor),
          tipo: valor < 0 ? 'DESPESA' : 'RECEITA',
          status: 'NOVA'
        });
      }
    }

    return transactions;
  };

  const formatDateFromString = (dateStr: string): string => {
    // Tentar vários formatos de data
    const formats = [
      /(\d{2})\/(\d{2})\/(\d{4})/, // DD/MM/YYYY
      /(\d{4})-(\d{2})-(\d{2})/, // YYYY-MM-DD
      /(\d{2})-(\d{2})-(\d{4})/, // DD-MM-YYYY
    ];

    for (const format of formats) {
      const match = dateStr.match(format);
      if (match) {
        if (format === formats[1]) { // YYYY-MM-DD
          return `${match[1]}-${match[2]}-${match[3]}`;
        } else { // DD/MM/YYYY ou DD-MM-YYYY
          return `${match[3]}-${match[2]}-${match[1]}`;
        }
      }
    }

    return new Date().toISOString().split('T')[0];
  };

  const formatOFXDate = (ofxDate: string): string => {
    // OFX format: YYYYMMDD
    const year = ofxDate.substring(0, 4);
    const month = ofxDate.substring(4, 6);
    const day = ofxDate.substring(6, 8);
    return `${year}-${month}-${day}`;
  };

  const sugerirCategoria = (descricao: string): string => {
    const desc = descricao.toLowerCase();
    
    // Mapeamento simples de palavras-chave para categorias
    const mapeamento = {
      'supermercado|mercado|alimentacao|comida': 'Alimentação',
      'posto|combustivel|gasolina|alcool': 'Transporte',
      'farmacia|medicamento|hospital|medico': 'Saúde',
      'shopping|loja|magazine': 'Compras',
      'restaurante|lanchonete|delivery': 'Alimentação',
      'cinema|teatro|show|lazer': 'Lazer',
      'salario|ordenado|vencimento': 'Salário',
      'freelance|extra|bico': 'Freelance'
    };

    for (const [palavras, categoria] of Object.entries(mapeamento)) {
      const regex = new RegExp(palavras, 'i');
      if (regex.test(desc)) {
        const categoriaEncontrada = categorias.find(c => c.nome === categoria);
        return categoriaEncontrada?.id || '';
      }
    }

    return '';
  };

  const handleImportTransactions = async () => {
    if (!contaSelecionada) {
      alert('Selecione uma conta para importar as transações');
      return;
    }

    setLoading(true);

    try {
      const transacoesParaImportar = transacoesImportadas.filter(t => t.status === 'NOVA');
      
      for (const transacao of transacoesParaImportar) {
        await DatabaseService.createLancamento({
          conta_id: contaSelecionada,
          categoria_id: transacao.categoria_sugerida || categorias[0]?.id,
          descricao: transacao.descricao,
          valor: transacao.valor,
          data: transacao.data,
          tipo: transacao.tipo,
          status: 'CONFIRMADO',
          observacoes: 'Importado via conciliação bancária'
        });
      }

      alert(`${transacoesParaImportar.length} transações importadas com sucesso!`);
      setTransacoesImportadas([]);
      setShowPreview(false);
    } catch (error) {
      console.error('Erro ao importar transações:', error);
      alert('Erro ao importar transações');
    } finally {
      setLoading(false);
    }
  };

  const updateTransacao = (id: string, updates: Partial<TransacaoImportada>) => {
    setTransacoesImportadas(prev => 
      prev.map(t => t.id === id ? { ...t, ...updates } : t)
    );
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'NOVA':
        return 'text-green-600 bg-green-50 border-green-200';
      case 'DUPLICADA':
        return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'CONCILIADA':
        return 'text-blue-600 bg-blue-50 border-blue-200';
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Conciliação Bancária</h1>
        <p className="text-gray-600 mt-2">Importe extratos bancários (CSV/OFX) e concilie automaticamente</p>
      </div>

      {/* Upload Area */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Importar Extrato</h2>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Conta de Destino *
            </label>
            <select
              value={contaSelecionada}
              onChange={(e) => setContaSelecionada(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">Selecione uma conta</option>
              {contas.map(conta => (
                <option key={conta.id} value={conta.id}>
                  {conta.nome} - {conta.tipo}
                </option>
              ))}
            </select>
          </div>

          <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-blue-400 transition-colors">
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,.ofx"
              onChange={handleFileUpload}
              className="hidden"
              disabled={loading || !contaSelecionada}
            />
            
            <FileText className="w-12 h-12 mx-auto mb-4 text-gray-400" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Arraste um arquivo ou clique para selecionar
            </h3>
            <p className="text-gray-600 mb-4">
              Formatos suportados: CSV, OFX (máximo 10MB)
            </p>
            
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={loading || !contaSelecionada}
              className="inline-flex items-center space-x-2 bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
              ) : (
                <Upload className="w-5 h-5" />
              )}
              <span>{loading ? 'Processando...' : 'Selecionar Arquivo'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Preview das Transações */}
      {showPreview && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-gray-900">
              Preview das Transações ({transacoesImportadas.length})
            </h2>
            <div className="flex items-center space-x-3">
              <button
                onClick={() => setShowPreview(false)}
                className="text-gray-600 hover:text-gray-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Resumo */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-green-600">
                {transacoesImportadas.filter(t => t.status === 'NOVA').length}
              </div>
              <div className="text-sm text-green-700">Novas Transações</div>
            </div>
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-yellow-600">
                {transacoesImportadas.filter(t => t.status === 'DUPLICADA').length}
              </div>
              <div className="text-sm text-yellow-700">Possíveis Duplicatas</div>
            </div>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-blue-600">
                {formatCurrency(transacoesImportadas.reduce((sum, t) => sum + (t.tipo === 'RECEITA' ? t.valor : -t.valor), 0))}
              </div>
              <div className="text-sm text-blue-700">Saldo Líquido</div>
            </div>
          </div>

          {/* Lista de Transações */}
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {transacoesImportadas.map((transacao) => (
              <div key={transacao.id} className={`border rounded-lg p-4 ${getStatusColor(transacao.status)}`}>
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3">
                      <div className="flex-1">
                        <p className="font-medium text-gray-900">{transacao.descricao}</p>
                        <div className="flex items-center space-x-4 text-sm text-gray-600 mt-1">
                          <span>{formatDate(transacao.data)}</span>
                          <span className={transacao.tipo === 'RECEITA' ? 'text-green-600' : 'text-red-600'}>
                            {transacao.tipo === 'RECEITA' ? '+' : '-'} {formatCurrency(transacao.valor)}
                          </span>
                          <span className="px-2 py-1 rounded-full text-xs font-medium border">
                            {transacao.status}
                          </span>
                        </div>
                      </div>
                      
                      {transacao.status === 'NOVA' && (
                        <div className="flex items-center space-x-2">
                          <select
                            value={transacao.categoria_sugerida || ''}
                            onChange={(e) => updateTransacao(transacao.id, { categoria_sugerida: e.target.value })}
                            className="text-sm border border-gray-300 rounded px-2 py-1"
                          >
                            <option value="">Selecionar categoria</option>
                            {categorias.filter(c => c.tipo === transacao.tipo).map(categoria => (
                              <option key={categoria.id} value={categoria.id}>
                                {categoria.nome}
                              </option>
                            ))}
                          </select>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Ações */}
          <div className="flex justify-end space-x-3 mt-6 pt-6 border-t border-gray-200">
            <button
              onClick={() => setShowPreview(false)}
              className="px-6 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={handleImportTransactions}
              disabled={loading || transacoesImportadas.filter(t => t.status === 'NOVA').length === 0}
              className="flex items-center space-x-2 bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              ) : (
                <CheckCircle className="w-4 h-4" />
              )}
              <span>
                Importar {transacoesImportadas.filter(t => t.status === 'NOVA').length} Transações
              </span>
            </button>
          </div>
        </div>
      )}

      {/* Instruções */}
      <div className="bg-blue-50 rounded-xl border border-blue-200 p-6">
        <h3 className="text-lg font-semibold text-blue-900 mb-4">📋 Como usar a Conciliação Bancária</h3>
        
        <div className="space-y-3 text-sm text-blue-800">
          <div className="flex items-start space-x-2">
            <div className="w-1.5 h-1.5 bg-blue-600 rounded-full mt-2 flex-shrink-0"></div>
            <span><strong>CSV:</strong> Certifique-se que o arquivo contém colunas para Data, Descrição e Valor</span>
          </div>
          <div className="flex items-start space-x-2">
            <div className="w-1.5 h-1.5 bg-blue-600 rounded-full mt-2 flex-shrink-0"></div>
            <span><strong>OFX:</strong> Formato padrão de extratos bancários, importação automática</span>
          </div>
          <div className="flex items-start space-x-2">
            <div className="w-1.5 h-1.5 bg-blue-600 rounded-full mt-2 flex-shrink-0"></div>
            <span><strong>Duplicatas:</strong> O sistema detecta automaticamente transações similares já existentes</span>
          </div>
          <div className="flex items-start space-x-2">
            <div className="w-1.5 h-1.5 bg-blue-600 rounded-full mt-2 flex-shrink-0"></div>
            <span><strong>Categorização:</strong> Sugestões automáticas baseadas na descrição da transação</span>
          </div>
        </div>
      </div>
    </div>
  );
}