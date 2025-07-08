import React, { useState, useEffect } from 'react';
import { AuthPage } from './components/Auth/AuthPage';
import { Layout } from './components/Layout';
import { EnhancedDashboard } from './components/Dashboard/EnhancedDashboard';
import { Lancamentos } from './components/Lancamentos';
import { Contas } from './components/Contas';
import { Categorias } from './components/Categorias';
import { MetasFinanceiras } from './components/Metas/MetasFinanceiras';
import { Transferencias } from './components/Transferencias/Transferencias';
import { Relatorios } from './components/Relatorios/Relatorios';
import { Orcamentos } from './components/Orcamentos/Orcamentos';
import { ConciliacaoBancaria } from './components/ConciliacaoBancaria/ConciliacaoBancaria';
import { GestaoDividas } from './components/GestaoDividas/GestaoDividas';
import { RelatoriosSankey } from './components/RelatoriosSankey/RelatoriosSankey';
import { OCRRecibos } from './components/OCRRecibos/OCRRecibos';
import { Configuracoes } from './components/Configuracoes';
import { AuthService, type AuthUser } from './lib/auth';

function App() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState('dashboard');
  const [navigationHistory, setNavigationHistory] = useState<string[]>(['dashboard']);

  // useEffect foi reescrito para ser mais simples e robusto.
  useEffect(() => {
    let mounted = true;

    // Apenas o onAuthStateChange é necessário. Ele lida com o estado inicial
    // e com todas as mudanças de autenticação (login/logout).
    const { data: { subscription } } = AuthService.onAuthStateChange((user) => {
      if (mounted) {
        setUser(user);
        
        // Aplica o tema se o usuário estiver definido
        if (user?.profile?.tema) {
          AuthService.applyTheme(user.profile.tema);
        }
        
        // Assim que o estado do usuário é conhecido (seja ele nulo ou não),
        // o carregamento é finalizado.
        setLoading(false);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []); // O array de dependências vazio garante que o efeito rode apenas uma vez.

  // Função melhorada para navegação com histórico
  const handlePageChange = (page: string) => {
    setCurrentPage(page);
    setNavigationHistory(prev => {
      const newHistory = [...prev];
      const existingIndex = newHistory.indexOf(page);
      if (existingIndex !== -1) {
        newHistory.splice(existingIndex, 1);
      }
      newHistory.push(page);
      return newHistory.slice(-10);
    });
  };

  // Função para voltar à página anterior
  const handleGoBack = () => {
    if (navigationHistory.length > 1) {
      const newHistory = [...navigationHistory];
      newHistory.pop();
      const previousPage = newHistory[newHistory.length - 1] || 'dashboard';
      setCurrentPage(previousPage);
      setNavigationHistory(newHistory);
    }
  };

  const renderPage = () => {
    switch (currentPage) {
      case 'dashboard':
        return <EnhancedDashboard onNavigate={handlePageChange} />;
      case 'lancamentos':
        return <Lancamentos />;
      case 'contas':
        return <Contas />;
      case 'categorias':
        return <Categorias />;
      case 'metas':
        return <MetasFinanceiras />;
      case 'orcamentos':
        return <Orcamentos />;
      case 'transferencias':
        return <Transferencias />;
      case 'relatorios':
        return <Relatorios />;
      case 'conciliacao':
        return <ConciliacaoBancaria />;
      case 'dividas':
        return <GestaoDividas />;
      case 'sankey':
        return <RelatoriosSankey />;
      case 'ocr':
        return <OCRRecibos />;
      case 'configuracoes':
        return <Configuracoes />;
      default:
        return <EnhancedDashboard onNavigate={handlePageChange} />;
    }
  };

  // Tela de carregamento
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Carregando...</p>
        </div>
      </div>
    );
  }

  // Tela de autenticação
  if (!user) {
    // A propriedade onSuccess é mantida para o caso de alguma lógica específica ser necessária após o login,
    // mas o listener onAuthStateChange é quem realmente gerencia a transição de tela.
    return <AuthPage onSuccess={() => setLoading(false)} />;
  }

  // App principal
  return (
    <Layout 
      currentPage={currentPage} 
      onPageChange={handlePageChange}
      onGoBack={handleGoBack}
      canGoBack={navigationHistory.length > 1}
      user={user}
    >
      {renderPage()}
    </Layout>
  );
}

export default App;