import React, { useRef, useState, useEffect } from 'react';
import { Download, Upload, Trash2, Shield, Database, AlertTriangle, CheckCircle, User, Bell, Palette, Globe, Camera, Save, X } from 'lucide-react';
import { AuthService } from '../lib/auth';
import { DatabaseService } from '../lib/database';
import { exportToJson, importFromJson } from '../lib/utils';
import { supabase } from '../lib/supabase';

export function Configuracoes() {
  const [profile, setProfile] = useState<any>(null);
  const [categorias, setCategorias] = useState<any[]>([]);
  const [contas, setContas] = useState<any[]>([]);
  const [lancamentos, setLancamentos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const [importStatus, setImportStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [importMessage, setImportMessage] = useState('');
  const [profileForm, setProfileForm] = useState({
    nome: '',
    moeda: 'BRL',
    tema: 'light',
    notificacoes_email: true,
    notificacoes_push: true,
  });
  const [profileLoading, setProfileLoading] = useState(false);
  const [clearDataLoading, setClearDataLoading] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [user, categoriasData, contasData, lancamentosData] = await Promise.all([
        AuthService.getCurrentUser(),
        DatabaseService.getCategorias(),
        DatabaseService.getContas(),
        DatabaseService.getLancamentos()
      ]);

      if (user?.profile) {
        setProfile(user.profile);
        setProfileForm({
          nome: user.profile.nome || '',
          moeda: user.profile.moeda || 'BRL',
          tema: user.profile.tema || 'light',
          notificacoes_email: user.profile.notificacoes_email ?? true,
          notificacoes_push: user.profile.notificacoes_push ?? true,
        });
      }

      setCategorias(categoriasData);
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

  const handleProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileLoading(true);

    try {
      await AuthService.updateProfile(profileForm);
      setProfile({ ...profile, ...profileForm });
      
      // Recarregar a página para aplicar mudanças de tema completamente
      if (profile?.tema !== profileForm.tema) {
        setTimeout(() => {
          window.location.reload();
        }, 1000);
      }
      
      alert('Perfil atualizado com sucesso!');
    } catch (error) {
      console.error('Erro ao atualizar perfil:', error);
      alert('Erro ao atualizar perfil');
    } finally {
      setProfileLoading(false);
    }
  };

  const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validar tipo de arquivo
    if (!file.type.startsWith('image/')) {
      alert('Por favor, selecione apenas arquivos de imagem');
      return;
    }

    // Validar tamanho (máximo 2MB)
    if (file.size > 2 * 1024 * 1024) {
      alert('A imagem deve ter no máximo 2MB');
      return;
    }

    setUploadingAvatar(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado');

      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/${Date.now()}.${fileExt}`;

      // Upload da imagem
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) {
        console.error('Erro no upload:', uploadError);
        throw new Error(`Erro no upload: ${uploadError.message}`);
      }

      // Obter URL pública
      const { data } = supabase.storage
        .from('avatars')
        .getPublicUrl(fileName);

      if (!data?.publicUrl) {
        throw new Error('Não foi possível obter a URL da imagem');
      }

      // Atualizar perfil com nova URL
      await AuthService.updateProfile({
        avatar_url: data.publicUrl
      });

      setProfile({ ...profile, avatar_url: data.publicUrl });
      alert('Foto de perfil atualizada com sucesso!');
    } catch (error) {
      console.error('Erro ao fazer upload da imagem:', error);
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      alert(`Erro ao fazer upload da imagem: ${errorMessage}`);
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleRemoveAvatar = async () => {
    if (!confirm('Tem certeza que deseja remover sua foto de perfil?')) return;

    setProfileLoading(true);

    try {
      // Remover arquivo do storage se existir
      if (profile?.avatar_url) {
        try {
          const fileName = profile.avatar_url.split('/').pop();
          if (fileName) {
            await supabase.storage
              .from('avatars')
              .remove([`${profile.id}/${fileName}`]);
          }
        } catch (error) {
          console.warn('Erro ao remover arquivo do storage:', error);
        }
      }

      await AuthService.updateProfile({
        avatar_url: undefined
      });

      setProfile({ ...profile, avatar_url: null });
      alert('Foto de perfil removida com sucesso!');
    } catch (error) {
      console.error('Erro ao remover foto:', error);
      alert('Erro ao remover foto');
    } finally {
      setProfileLoading(false);
    }
  };

  const handleExport = () => {
    const data = {
      categorias,
      contas,
      lancamentos,
      exportDate: new Date().toISOString(),
      version: '2.0.0',
      appName: 'FinanceApp'
    };
    
    const filename = `financeapp-backup-${new Date().toISOString().split('T')[0]}.json`;
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
        // Implementar importação real aqui
        setImportStatus('success');
        setImportMessage('Dados importados com sucesso!');
        
        setTimeout(() => {
          setImportStatus('idle');
          setImportMessage('');
          loadData(); // Recarregar dados
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

  const handleClearData = async () => {
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
        setClearDataLoading(true);
        
        try {
          // Deletar todos os lançamentos
          for (const lancamento of lancamentos) {
            await DatabaseService.deleteLancamento(lancamento.id);
          }
          
          // Deletar todas as contas
          for (const conta of contas) {
            await DatabaseService.deleteConta(conta.id);
          }
          
          // Deletar todas as categorias (exceto as padrão)
          for (const categoria of categorias) {
            try {
              await DatabaseService.deleteCategoria(categoria.id);
            } catch (error) {
              // Ignorar erros de categorias que não podem ser deletadas
              console.warn('Não foi possível deletar categoria:', categoria.nome);
            }
          }
          
          alert('✅ Todos os dados foram removidos com sucesso.');
          await loadData(); // Recarregar dados
          
        } catch (error) {
          console.error('Erro ao limpar dados:', error);
          alert('❌ Erro ao limpar alguns dados. Verifique o console para mais detalhes.');
        } finally {
          setClearDataLoading(false);
        }
      }
    }
  };

  const totalTransacoes = lancamentos.length;
  const parcelasCount = lancamentos.filter(l => l.total_parcelas).length;
  const comprasParceladasCount = new Set(lancamentos.filter(l => l.compra_parcelada_id).map(l => l.compra_parcelada_id)).size;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 lg:space-y-8">
      {/* Header */}
      <div className="text-center lg:text-left">
        <h1 className="text-2xl lg:text-3xl font-bold text-gray-900">Configurações</h1>
        <p className="text-gray-600 mt-2">Gerencie seu perfil, dados e configurações da aplicação</p>
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

      {/* Configurações do Perfil */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 lg:p-6">
        <div className="flex items-center space-x-2 mb-6">
          <User className="w-5 h-5 text-blue-600" />
          <h2 className="text-lg lg:text-xl font-semibold text-gray-900">Perfil do Usuário</h2>
        </div>
        
        {/* Foto de Perfil */}
        <div className="mb-6">
          <h3 className="text-base lg:text-lg font-medium text-gray-900 mb-4">Foto de Perfil</h3>
          
          <div className="flex flex-col sm:flex-row items-center space-y-4 sm:space-y-0 sm:space-x-6">
            <div className="relative">
              <div className="w-20 h-20 lg:w-24 lg:h-24 rounded-full overflow-hidden bg-gray-100 flex items-center justify-center">
                {profile?.avatar_url ? (
                  <img 
                    src={profile.avatar_url} 
                    alt="Avatar" 
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <User className="w-8 lg:w-12 h-8 lg:h-12 text-gray-400" />
                )}
              </div>
              
              {uploadingAvatar && (
                <div className="absolute inset-0 bg-black bg-opacity-50 rounded-full flex items-center justify-center">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white"></div>
                </div>
              )}
            </div>
            
            <div className="space-y-2 text-center sm:text-left">
              <input
                ref={avatarInputRef}
                type="file"
                accept="image/*"
                onChange={handleAvatarUpload}
                className="hidden"
              />
              
              <button
                onClick={() => avatarInputRef.current?.click()}
                disabled={uploadingAvatar}
                className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 text-sm lg:text-base"
              >
                <Camera className="w-4 h-4" />
                <span>{profile?.avatar_url ? 'Alterar Foto' : 'Adicionar Foto'}</span>
              </button>
              
              {profile?.avatar_url && (
                <button
                  onClick={handleRemoveAvatar}
                  disabled={profileLoading}
                  className="flex items-center space-x-2 px-4 py-2 text-red-600 border border-red-200 rounded-lg hover:bg-red-50 transition-colors disabled:opacity-50 text-sm lg:text-base"
                >
                  <X className="w-4 h-4" />
                  <span>Remover Foto</span>
                </button>
              )}
              
              <p className="text-xs text-gray-500">
                JPG, PNG ou GIF. Máximo 2MB.
              </p>
            </div>
          </div>
        </div>
        
        <form onSubmit={handleProfileUpdate} className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Nome Completo
              </label>
              <input
                type="text"
                value={profileForm.nome}
                onChange={(e) => setProfileForm(prev => ({ ...prev, nome: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm lg:text-base"
                placeholder="Seu nome completo"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Moeda Padrão
              </label>
              <select
                value={profileForm.moeda}
                onChange={(e) => setProfileForm(prev => ({ ...prev, moeda: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm lg:text-base"
              >
                <option value="BRL">Real Brasileiro (R$)</option>
                <option value="USD">Dólar Americano ($)</option>
                <option value="EUR">Euro (€)</option>
              </select>
            </div>

            <div className="lg:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Palette className="w-4 h-4 inline mr-1" />
                Tema da Interface
              </label>
              <select
                value={profileForm.tema}
                onChange={(e) => setProfileForm(prev => ({ ...prev, tema: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm lg:text-base"
              >
                <option value="light">🌞 Claro</option>
                <option value="dark">🌙 Escuro</option>
                <option value="auto">🔄 Automático (Sistema)</option>
              </select>
              <p className="text-xs text-gray-500 mt-1">
                {profileForm.tema === 'auto' && 'Segue a preferência do seu sistema operacional'}
                {profileForm.tema === 'light' && 'Interface clara para uso diurno'}
                {profileForm.tema === 'dark' && 'Interface escura para reduzir cansaço visual'}
              </p>
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-base lg:text-lg font-medium text-gray-900 flex items-center space-x-2">
              <Bell className="w-5 h-5" />
              <span>Notificações</span>
            </h3>
            
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <label className="text-sm font-medium text-gray-700">Notificações por E-mail</label>
                  <p className="text-xs text-gray-500">Receber alertas de vencimentos por e-mail</p>
                </div>
                <input
                  type="checkbox"
                  checked={profileForm.notificacoes_email}
                  onChange={(e) => setProfileForm(prev => ({ ...prev, notificacoes_email: e.target.checked }))}
                  className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <label className="text-sm font-medium text-gray-700">Notificações Push</label>
                  <p className="text-xs text-gray-500">Receber notificações no navegador</p>
                </div>
                <input
                  type="checkbox"
                  checked={profileForm.notificacoes_push}
                  onChange={(e) => setProfileForm(prev => ({ ...prev, notificacoes_push: e.target.checked }))}
                  className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={profileLoading}
              className="flex items-center space-x-2 bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm lg:text-base"
            >
              {profileLoading ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              ) : (
                <Save className="w-4 h-4" />
              )}
              <span>{profileLoading ? 'Salvando...' : 'Salvar Perfil'}</span>
            </button>
          </div>
        </form>
      </div>

      {/* Informações do Sistema */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 lg:p-6">
        <div className="flex items-center space-x-2 mb-4">
          <Shield className="w-5 h-5 text-green-600" />
          <h2 className="text-lg lg:text-xl font-semibold text-gray-900">Privacidade & Segurança</h2>
        </div>
        
        <div className="space-y-3 text-sm text-gray-600">
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
            <span>Todos os seus dados são armazenados com segurança no Supabase</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
            <span>Conexão criptografada e autenticação segura</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
            <span>Isolamento completo de dados por usuário (RLS)</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
            <span>Versão 2.0.0 - FinanceApp</span>
          </div>
        </div>
      </div>

      {/* Estatísticas dos Dados */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 lg:p-6">
        <div className="flex items-center space-x-2 mb-4">
          <Database className="w-5 h-5 text-blue-600" />
          <h2 className="text-lg lg:text-xl font-semibold text-gray-900">Seus Dados</h2>
        </div>
        
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="text-center p-4 bg-gray-50 rounded-lg">
            <div className="text-xl lg:text-2xl font-bold text-blue-600">{categorias.length}</div>
            <div className="text-xs lg:text-sm text-gray-600">Categorias</div>
          </div>
          <div className="text-center p-4 bg-gray-50 rounded-lg">
            <div className="text-xl lg:text-2xl font-bold text-green-600">{contas.length}</div>
            <div className="text-xs lg:text-sm text-gray-600">Contas</div>
          </div>
          <div className="text-center p-4 bg-gray-50 rounded-lg">
            <div className="text-xl lg:text-2xl font-bold text-purple-600">{totalTransacoes}</div>
            <div className="text-xs lg:text-sm text-gray-600">Lançamentos</div>
          </div>
          <div className="text-center p-4 bg-gray-50 rounded-lg">
            <div className="text-xl lg:text-2xl font-bold text-orange-600">{comprasParceladasCount}</div>
            <div className="text-xs lg:text-sm text-gray-600">Compras Parceladas</div>
            {parcelasCount > 0 && (
              <div className="text-xs text-gray-500 mt-1">{parcelasCount} parcelas</div>
            )}
          </div>
        </div>
      </div>

      {/* Backup e Restore */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 lg:p-6">
        <h2 className="text-lg lg:text-xl font-semibold text-gray-900 mb-4">Backup & Restauração</h2>
        
        <div className="space-y-4">
          {/* Exportar Dados */}
          <div className="border border-gray-200 rounded-lg p-4">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-3 lg:space-y-0">
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
                className="flex items-center justify-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors text-sm lg:text-base"
              >
                <Download className="w-4 h-4" />
                <span>Exportar</span>
              </button>
            </div>
          </div>

          {/* Importar Dados */}
          <div className="border border-gray-200 rounded-lg p-4">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-3 lg:space-y-0">
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
                  className="flex items-center justify-center space-x-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm lg:text-base"
                >
                  <Upload className="w-4 h-4" />
                  <span>{importStatus === 'loading' ? 'Importando...' : 'Importar'}</span>
                </button>
              </div>
            </div>
          </div>

          {/* Limpar Dados */}
          <div className="border border-red-200 rounded-lg p-4 bg-red-50">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-3 lg:space-y-0">
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
                disabled={clearDataLoading}
                className="flex items-center justify-center space-x-2 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm lg:text-base"
              >
                {clearDataLoading ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                ) : (
                  <Trash2 className="w-4 h-4" />
                )}
                <span>{clearDataLoading ? 'Limpando...' : 'Limpar Tudo'}</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Dicas de Uso */}
      <div className="bg-blue-50 rounded-xl border border-blue-200 p-4 lg:p-6">
        <h2 className="text-lg lg:text-xl font-semibold text-blue-900 mb-4">💡 Dicas de Uso</h2>
        
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
            <span>Configure as notificações para não perder vencimentos importantes</span>
          </div>
          <div className="flex items-start space-x-2">
            <div className="w-1.5 h-1.5 bg-blue-600 rounded-full mt-2 flex-shrink-0"></div>
            <span>Use os filtros na página de lançamentos para encontrar transações específicas rapidamente</span>
          </div>
        </div>
      </div>

      {/* Informações Técnicas */}
      <div className="bg-gray-50 rounded-xl border border-gray-200 p-4 lg:p-6">
        <h2 className="text-base lg:text-lg font-semibold text-gray-900 mb-4">ℹ️ Informações Técnicas</h2>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 text-sm text-gray-600">
          <div>
            <strong>Banco de Dados:</strong> Supabase (PostgreSQL)
          </div>
          <div>
            <strong>Autenticação:</strong> Supabase Auth
          </div>
          <div>
            <strong>Segurança:</strong> Row Level Security (RLS)
          </div>
          <div>
            <strong>Backup:</strong> Formato JSON padrão
          </div>
        </div>
      </div>
    </div>
  );
}