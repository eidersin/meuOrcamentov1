import React, { useState, useEffect } from 'react';
import { AuthPage } from './components/Auth/AuthPage';
import { Layout } from './components/Layout';
import { Dashboard } from './components/Dashboard';
import { Lancamentos } from './components/Lancamentos';
import { Contas } from './components/Contas';
import { Categorias } from './components/Categorias';
import { MetasFinanceiras } from './components/Metas/MetasFinanceiras';
import { Configuracoes } from './components/Configuracoes';
import { AuthService, type AuthUser } from './lib/auth';

function App() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState('dashboard');

  useEffect(() => {
    let mounted = true;

    // Função para verificar usuário atual
    const checkUser = async () => {
      try {
        const currentUser = await AuthService.getCurrentUser();
        if (mounted) {
          setUser(currentUser);
        }
      } catch (error) {
        console.error('Error checking user:', error);
        if (mounted) {
          setUser(null);
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    // Verificar usuário inicial
    checkUser();

    // Escutar mudanças no estado de autenticação
    const { data: { subscription } } = AuthService.onAuthStateChange((user) => {
      if (mounted) {
        setUser(user);
        setLoading(false);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const renderPage = () => {
    switch (currentPage) {
      case 'dashboard':
        return <Dashboard onNavigate={setCurrentPage} />;
      case 'lancamentos':
        return <Lancamentos />;
      case 'contas':
        return <Contas />;
      case 'categorias':
        return <Categorias />;
      case 'metas':
        return <MetasFinanceiras />;
      case 'configuracoes':
        return <Configuracoes />;
      default:
        return <Dashboard onNavigate={setCurrentPage} />;
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
    return <AuthPage onSuccess={() => {
      // O onAuthStateChange vai lidar com a mudança de estado
    }} />;
  }

  // App principal
  return (
    <Layout 
      currentPage={currentPage} 
      onPageChange={setCurrentPage}
      user={user}
    >
      {renderPage()}
    </Layout>
  );
}

export default App;