import React, { useRef, useState } from 'react';
import { Download, Upload, Trash2, Shield, Database, AlertTriangle, CheckCircle } from 'lucide-react';
import { useBudgetStore } from '../lib/store';
import { exportToJson, importFromJson } from '../lib/utils';

export function Configuracoes() {
  const { categorias, contas, lancamentos, importarDados, limparTodosDados } = useBudgetStore();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importStatus, setImportStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [importMessage, setImportMessage] = useState('');

  const handleExport = () => {
    const data = {
      categorias,
      contas,
      lancamentos,
      exportDate: new Date().toISOString(),
      version: '1.0.0',
      appName: 'Meu Orçamento Local'
    };
    
    const filename = `meu-orcamento-backup-${new Date().toISOString().split('T')[0]}.json`;
    exportToJson(data, filename);
  };

  const handleImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setImportStatus('loading');
    setImportMessage('Processando arquivo...');

    try {
      const data = await importFromJson(file);
      
      // Validar estrutura básica
      if (!data.categorias || !data.contas || !data.lancamentos) {
        throw new Error('Arquivo de backup inválido - estrutura incorreta');
      }

      // Validar se é um array
      if (!Array.isArray(data.categorias) || !Array.isArray(data.contas) || !Array.isArray(data.lancamentos)) {
        throw new Error('Arquivo de backup inválido - dados corrompidos');
      }

      const confirmMessage = `
Esta ação irá substituir todos os seus dados atuais pelos dados do arquivo de backup.

📊 Dados atuais:
• ${categorias.length} categorias
• ${contas.length} contas  
• ${lancamentos.length} lançamentos

📁 Dados do backup:
• ${data.categorias.length} categorias
• ${data.contas.length} contas
• ${data.lancamentos.length} lançamentos

${data.exportDate ? `\n📅 Backup criado em: ${new Date(data.exportDate).toLocaleDateString('pt-BR')}` : ''}

⚠️ Esta ação não pode ser desfeita!

Deseja continuar?
      `.trim();

      if (confirm(confirmMessage)) {
        importarDados(data);
        setImportStatus('success');
        setImportMessage('Dados importados com sucesso!');
        
        setTimeout(() => {
          setImportStatus('idle');
          setImportMessage('');
        }, 3000);
      } else {
        setImportStatus('idle');
        setImportMessage('');
      }
    } catch (error) {
      setImportStatus('error');
      setImportMessage(`Erro ao importar arquivo: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
      
      setTimeout(() => {
        setImportStatus('idle');
        setImportMessage('');
      }, 5000);
    }
    
    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleClearData = () => {
    const confirmMessage = `
⚠️ ATENÇÃO: Esta ação é IRREVERSÍVEL!

Isso irá excluir TODOS os seus dados:
• ${categorias.length} categorias
• ${contas.length} contas
• ${lancamentos.length} lançamentos

📋 Recomendamos fazer um backup antes de prosseguir.

Tem certeza que deseja continuar?
    `.trim();

    if (confirm(confirmMessage)) {
      const finalConfirm = confirm('🚨 Última confirmação: Tem ABSOLUTA certeza que deseja apagar todos os dados?\n\nEsta ação não pode ser desfeita!');
      if (finalConfirm) {
        limparTodosDados();
        alert('✅ Todos os dados foram removidos com sucesso.');
      }
    }
  };

  const totalTransacoes = lancamentos.length;
  const parcelasCount = lancamentos.filter(l => l.totalParcelas).length;
  const comprasParceladasCount = new Set(lancamentos.filter(l => l.compraParceladaId).map(l => l.compraParceladaId)).size;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Configurações</h1>
        <p className="text-gray-600 mt-2">Gerencie seus dados e configurações da aplicação</p>
      </div>

      {/* Status de Importação */}
      {importStatus !== 'idle' && (
        <div className={`rounded-lg p-4 ${
          importStatus === 'loading' ? 'bg-blue-50 border border-blue-200' :
          importStatus === 'success' ? 'bg-green-50 border border-green-200' :
          'bg-red-50 border border-red-200'
        }`}>
          <div className="flex items-center space-x-2">
            {importStatus === 'loading' && (
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
            )}
            {importStatus === 'success' && <CheckCircle className="w-5 h-5 text-green-600" />}
            {importStatus === 'error' && <AlertTriangle className="w-5 h-5 text-red-600" />}
            <span className={`font-medium ${
              importStatus === 'loading' ? 'text-blue-800' :
              importStatus === 'success' ? 'text-green-800' :
              'text-red-800'
            }`}>
              {importMessage}
            </span>
          </div>
        </div>
      )}

      {/* Informações do Sistema */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <div className="flex items-center space-x-2 mb-4">
          <Shield className="w-5 h-5 text-green-600" />
          <h2 className="text-xl font-semibold text-gray-900">Privacidade & Segurança</h2>
        </div>
        
        <div className="space-y-3 text-sm text-gray-600">
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
            <span>Todos os seus dados são armazenados localmente no seu navegador</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
            <span>Nenhuma informação financeira é enviada para servidores externos</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
            <span>A aplicação funciona completamente offline após o primeiro carregamento</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
            <span>Versão 1.0.0 - 100% Local & Privado</span>
          </div>
        </div>
      </div>

      {/* Estatísticas dos Dados */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <div className="flex items-center space-x-2 mb-4">
          <Database className="w-5 h-5 text-blue-600" />
          <h2 className="text-xl font-semibold text-gray-900">Seus Dados</h2>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="text-center p-4 bg-gray-50 rounded-lg">
            <div className="text-2xl font-bold text-blue-600">{categorias.length}</div>
            <div className="text-sm text-gray-600">Categorias</div>
          </div>
          <div className="text-center p-4 bg-gray-50 rounded-lg">
            <div className="text-2xl font-bold text-green-600">{contas.length}</div>
            <div className="text-sm text-gray-600">Contas</div>
          </div>
          <div className="text-center p-4 bg-gray-50 rounded-lg">
            <div className="text-2xl font-bold text-purple-600">{totalTransacoes}</div>
            <div className="text-sm text-gray-600">Lançamentos</div>
          </div>
          <div className="text-center p-4 bg-gray-50 rounded-lg">
            <div className="text-2xl font-bold text-orange-600">{comprasParceladasCount}</div>
            <div className="text-sm text-gray-600">Compras Parceladas</div>
            {parcelasCount > 0 && (
              <div className="text-xs text-gray-500 mt-1">{parcelasCount} parcelas</div>
            )}
          </div>
        </div>
      </div>

      {/* Backup e Restore */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Backup & Restauração</h2>
        
        <div className="space-y-4">
          {/* Exportar Dados */}
          <div className="border border-gray-200 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-medium text-gray-900">Exportar Dados</h3>
                <p className="text-sm text-gray-600 mt-1">
                  Baixe um arquivo JSON com todos os seus dados para backup seguro
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  Inclui: categorias, contas, lançamentos e informações de parcelas
                </p>
              </div>
              <button
                onClick={handleExport}
                className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Download className="w-4 h-4" />
                <span>Exportar</span>
              </button>
            </div>
          </div>

          {/* Importar Dados */}
          <div className="border border-gray-200 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-medium text-gray-900">Importar Dados</h3>
                <p className="text-sm text-gray-600 mt-1">
                  Restaure seus dados a partir de um arquivo de backup
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  ⚠️ Esta ação substituirá todos os dados atuais
                </p>
              </div>
              <div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".json"
                  onChange={handleImport}
                  disabled={importStatus === 'loading'}
                  className="hidden"
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={importStatus === 'loading'}
                  className="flex items-center space-x-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Upload className="w-4 h-4" />
                  <span>{importStatus === 'loading' ? 'Importando...' : 'Importar'}</span>
                </button>
              </div>
            </div>
          </div>

          {/* Limpar Dados */}
          <div className="border border-red-200 rounded-lg p-4 bg-red-50">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-medium text-red-900">Limpar Todos os Dados</h3>
                <p className="text-sm text-red-700 mt-1">
                  ⚠️ Esta ação é irreversível! Todos os dados serão perdidos permanentemente.
                </p>
                <p className="text-xs text-red-600 mt-1">
                  Recomendamos fazer um backup antes de prosseguir
                </p>
              </div>
              <button
                onClick={handleClearData}
                className="flex items-center space-x-2 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors"
              >
                <Trash2 className="w-4 h-4" />
                <span>Limpar Tudo</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Dicas de Uso */}
      <div className="bg-blue-50 rounded-xl border border-blue-200 p-6">
        <h2 className="text-xl font-semibold text-blue-900 mb-4">💡 Dicas de Uso</h2>
        
        <div className="space-y-2 text-sm text-blue-800">
          <div className="flex items-start space-x-2">
            <div className="w-1.5 h-1.5 bg-blue-600 rounded-full mt-2 flex-shrink-0"></div>
            <span>Faça backups regulares dos seus dados, especialmente antes de grandes mudanças</span>
          </div>
          <div className="flex items-start space-x-2">
            <div className="w-1.5 h-1.5 bg-blue-600 rounded-full mt-2 flex-shrink-0"></div>
            <span>Use o recurso de parcelas para facilitar o controle de compras parceladas no cartão</span>
          </div>
          <div className="flex items-start space-x-2">
            <div className="w-1.5 h-1.5 bg-blue-600 rounded-full mt-2 flex-shrink-0"></div>
            <span>Organize suas categorias por cores para facilitar a visualização nos gráficos</span>
          </div>
          <div className="flex items-start space-x-2">
            <div className="w-1.5 h-1.5 bg-blue-600 rounded-full mt-2 flex-shrink-0"></div>
            <span>Os dados são salvos automaticamente a cada alteração que você faz</span>
          </div>
          <div className="flex items-start space-x-2">
            <div className="w-1.5 h-1.5 bg-blue-600 rounded-full mt-2 flex-shrink-0"></div>
            <span>Use os filtros na página de lançamentos para encontrar transações específicas rapidamente</span>
          </div>
        </div>
      </div>

      {/* Informações Técnicas */}
      <div className="bg-gray-50 rounded-xl border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">ℹ️ Informações Técnicas</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-600">
          <div>
            <strong>Armazenamento:</strong> localStorage do navegador
          </div>
          <div>
            <strong>Capacidade:</strong> ~5-10MB (milhares de transações)
          </div>
          <div>
            <strong>Compatibilidade:</strong> Navegadores modernos
          </div>
          <div>
            <strong>Backup:</strong> Formato JSON padrão
          </div>
        </div>
      </div>
    </div>
  );
}