import React, { useState, useEffect } from 'react';
import { 
  Home, 
  PlusCircle, 
  CreditCard, 
  Tags, 
  Target,
  Settings,
  DollarSign,
  LogOut,
  User,
  Bell,
  Menu,
  X,
  BarChart3,
  ArrowLeftRight,
  ChevronDown,
  Calculator,
  FileText,
  TrendingDown,
  Scan,
  Camera,
  ChevronLeft,
  ChevronRight,
  ArrowLeft
} from 'lucide-react';
import { AuthService, type AuthUser } from '../lib/auth';
import { DatabaseService } from '../lib/database';
import { UnifiedChatBot } from './ChatBot/UnifiedChatBot';
import { NotificationPanel } from './Notifications/NotificationPanel';

interface LayoutProps {
  children: React.ReactNode;
  currentPage: string;
  onPageChange: (page: string) => void;
  onGoBack?: () => void;
  canGoBack?: boolean;
  user: AuthUser;
}

const menuItems = [
  { id: 'dashboard', label: 'Dashboard', icon: Home },
  { id: 'lancamentos', label: 'Lançamentos', icon: PlusCircle },
  { id: 'contas', label: 'Contas', icon: CreditCard },
  { id: 'categorias', label: 'Categorias', icon: Tags },
  { id: 'metas', label: 'Metas', icon: Target },
  { id: 'orcamentos', label: 'Orçamentos', icon: Calculator },
  { id: 'transferencias', label: 'Transferências', icon: ArrowLeftRight },
  { id: 'relatorios', label: 'Relatórios', icon: BarChart3 },
];

const advancedMenuItems = [
  { id: 'conciliacao', label: 'Conciliação', icon: FileText },
  { id: 'dividas', label: 'Dívidas', icon: TrendingDown },
  { id: 'sankey', label: 'Fluxo Sankey', icon: BarChart3 },
  { id: 'ocr', label: 'OCR Recibos', icon: Camera },
];

export function Layout({ children, currentPage, onPageChange, onGoBack, canGoBack, user }: LayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [showAdvancedMenu, setShowAdvancedMenu] = useState(false);
  const [notificacoesPendentes, setNotificacoesPendentes] = useState<any[]>([]);

  useEffect(() => {
    loadNotificacoes();
    const interval = setInterval(loadNotificacoes, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    // Auto-collapse sidebar on mobile
    const handleResize = () => {
      if (window.innerWidth < 1024) {
        setSidebarCollapsed(false);
        setSidebarOpen(false);
      }
    };

    window.addEventListener('resize', handleResize);
    handleResize(); // Check initial size

    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const loadNotificacoes = async () => {
    try {
      const notificacoes = await DatabaseService.getNotificacoesPendentes();
      setNotificacoesPendentes(notificacoes);
    } catch (error) {
      console.error('Erro ao carregar notificações:', error);
      if (error instanceof Error && error.message === 'Usuário não autenticado') {
        await AuthService.signOut();
        return;
      }
    }
  };

  const handleSignOut = async () => {
    try {
      await AuthService.signOut();
    } catch (error) {
      console.error('Erro ao fazer logout:', error);
    }
  };

  const handlePageChange = (pageId: string) => {
    onPageChange(pageId);
    setSidebarOpen(false);
    setUserMenuOpen(false);
    setShowAdvancedMenu(false);
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      if (!target.closest('[data-dropdown]')) {
        setNotificationsOpen(false);
        setUserMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar */}
      <div className={`
        fixed inset-y-0 left-0 z-50 bg-white shadow-xl border-r border-gray-200 transition-all duration-300 ease-in-out
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        ${sidebarCollapsed ? 'w-16' : 'w-64'}
        lg:translate-x-0 lg:static lg:inset-0
      `}>
        {/* Sidebar Header */}
        <div className="flex items-center justify-between h-16 px-4 border-b border-gray-200">
          <div className={`flex items-center space-x-3 transition-opacity duration-200 ${sidebarCollapsed ? 'opacity-0 w-0 overflow-hidden' : 'opacity-100'}`}>
            <div className="w-8 h-8 bg-gradient-to-br from-blue-600 via-purple-600 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg">
              <DollarSign className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                FinanceApp
              </h1>
              <p className="text-xs text-gray-500 leading-tight">Gestão Inteligente</p>
            </div>
          </div>
          
          {/* Collapse button - only on desktop */}
          <button
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className="hidden lg:flex p-1.5 text-gray-400 hover:text-gray-600 rounded-lg transition-colors"
          >
            {sidebarCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>

          {/* Close button - only on mobile */}
          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden p-1.5 text-gray-400 hover:text-gray-600 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Sidebar Content */}
        <div className="flex-1 overflow-y-auto py-4">
          {/* Main Menu */}
          <nav className="px-3 space-y-1">
            <div className={`mb-4 ${sidebarCollapsed ? 'text-center' : ''}`}>
              <h3 className={`text-xs font-semibold text-gray-500 uppercase tracking-wider ${sidebarCollapsed ? 'hidden' : 'px-3 mb-2'}`}>
                Principal
              </h3>
              {menuItems.map((item) => {
                const Icon = item.icon;
                const isActive = currentPage === item.id;
                
                return (
                  <button
                    key={item.id}
                    onClick={() => handlePageChange(item.id)}
                    className={`
                      group w-full flex items-center px-3 py-2.5 text-sm font-medium rounded-xl transition-all duration-200
                      ${isActive 
                        ? 'bg-gradient-to-r from-blue-50 to-purple-50 text-blue-700 shadow-sm' 
                        : 'text-gray-600 hover:text-blue-600 hover:bg-gray-50'
                      }
                      ${sidebarCollapsed ? 'justify-center' : 'justify-start'}
                    `}
                    title={sidebarCollapsed ? item.label : undefined}
                  >
                    <Icon className={`w-5 h-5 flex-shrink-0 transition-transform duration-200 ${
                      isActive ? 'scale-110' : 'group-hover:scale-110'
                    }`} />
                    <span className={`ml-3 transition-opacity duration-200 ${
                      sidebarCollapsed ? 'opacity-0 w-0 overflow-hidden' : 'opacity-100'
                    }`}>
                      {item.label}
                    </span>
                    {isActive && !sidebarCollapsed && (
                      <div className="ml-auto w-2 h-2 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full" />
                    )}
                  </button>
                );
              })}
            </div>

            {/* Advanced Menu */}
            <div className={`mb-4 ${sidebarCollapsed ? 'text-center' : ''}`}>
              <div className={`${sidebarCollapsed ? 'hidden' : 'px-3 mb-2'}`}>
                <button
                  onClick={() => setShowAdvancedMenu(!showAdvancedMenu)}
                  className="flex items-center justify-between w-full text-xs font-semibold text-gray-500 uppercase tracking-wider hover:text-gray-700 transition-colors"
                >
                  <span>Avançado</span>
                  <ChevronDown className={`w-3 h-3 transition-transform duration-200 ${showAdvancedMenu ? 'rotate-180' : ''}`} />
                </button>
              </div>
              
              {(showAdvancedMenu || sidebarCollapsed) && advancedMenuItems.map((item) => {
                const Icon = item.icon;
                const isActive = currentPage === item.id;
                
                return (
                  <button
                    key={item.id}
                    onClick={() => handlePageChange(item.id)}
                    className={`
                      group w-full flex items-center px-3 py-2.5 text-sm font-medium rounded-xl transition-all duration-200
                      ${isActive 
                        ? 'bg-gradient-to-r from-blue-50 to-purple-50 text-blue-700 shadow-sm' 
                        : 'text-gray-600 hover:text-blue-600 hover:bg-gray-50'
                      }
                      ${sidebarCollapsed ? 'justify-center' : 'justify-start'}
                    `}
                    title={sidebarCollapsed ? item.label : undefined}
                  >
                    <Icon className={`w-5 h-5 flex-shrink-0 transition-transform duration-200 ${
                      isActive ? 'scale-110' : 'group-hover:scale-110'
                    }`} />
                    <span className={`ml-3 transition-opacity duration-200 ${
                      sidebarCollapsed ? 'opacity-0 w-0 overflow-hidden' : 'opacity-100'
                    }`}>
                      {item.label}
                    </span>
                    {isActive && !sidebarCollapsed && (
                      <div className="ml-auto w-2 h-2 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full" />
                    )}
                  </button>
                );
              })}
            </div>
          </nav>
        </div>

        {/* Sidebar Footer */}
        <div className="border-t border-gray-200 p-3">
          <button
            onClick={() => handlePageChange('configuracoes')}
            className={`
              group w-full flex items-center px-3 py-2.5 text-sm font-medium text-gray-600 hover:text-blue-600 hover:bg-gray-50 rounded-xl transition-all duration-200
              ${sidebarCollapsed ? 'justify-center' : 'justify-start'}
            `}
            title={sidebarCollapsed ? 'Configurações' : undefined}
          >
            <Settings className="w-5 h-5 flex-shrink-0 group-hover:rotate-90 transition-transform duration-200" />
            <span className={`ml-3 transition-opacity duration-200 ${
              sidebarCollapsed ? 'opacity-0 w-0 overflow-hidden' : 'opacity-100'
            }`}>
              Configurações
            </span>
          </button>
          
          <button
            onClick={handleSignOut}
            className={`
              group w-full flex items-center px-3 py-2.5 text-sm font-medium text-red-600 hover:bg-red-50 rounded-xl transition-all duration-200 mt-1
              ${sidebarCollapsed ? 'justify-center' : 'justify-start'}
            `}
            title={sidebarCollapsed ? 'Sair' : undefined}
          >
            <LogOut className="w-5 h-5 flex-shrink-0 group-hover:translate-x-1 transition-transform duration-200" />
            <span className={`ml-3 transition-opacity duration-200 ${
              sidebarCollapsed ? 'opacity-0 w-0 overflow-hidden' : 'opacity-100'
            }`}>
              Sair
            </span>
          </button>
        </div>
      </div>

      {/* Mobile Overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-gray-900 bg-opacity-50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 transition-all duration-300">
        {/* Top Header */}
        <header className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-30">
          <div className="px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center h-16">
              {/* Left side - Mobile menu and back button */}
              <div className="flex items-center space-x-3">
                {/* Mobile menu button */}
                <button
                  onClick={() => setSidebarOpen(true)}
                  className="lg:hidden p-2 text-gray-500 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <Menu className="w-6 h-6" />
                </button>

                {/* Back button */}
                {canGoBack && onGoBack && (
                  <button
                    onClick={onGoBack}
                    className="flex items-center space-x-2 px-3 py-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    <span className="hidden sm:inline">Voltar</span>
                  </button>
                )}
              </div>

              {/* Right side actions */}
              <div className="flex items-center space-x-2">
                {/* Notifications */}
                <div className="relative" data-dropdown>
                  <button
                    onClick={() => setNotificationsOpen(!notificationsOpen)}
                    className="relative p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all duration-200"
                  >
                    <Bell className="w-5 h-5" />
                    {notificacoesPendentes.length > 0 && (
                      <span className="absolute -top-1 -right-1 w-5 h-5 bg-gradient-to-r from-red-500 to-pink-500 text-white text-xs rounded-full flex items-center justify-center font-bold shadow-lg animate-pulse">
                        {notificacoesPendentes.length > 9 ? '9+' : notificacoesPendentes.length}
                      </span>
                    )}
                  </button>
                  
                  {notificationsOpen && (
                    <NotificationPanel 
                      notificacoes={notificacoesPendentes}
                      onClose={() => setNotificationsOpen(false)}
                      onRefresh={loadNotificacoes}
                    />
                  )}
                </div>

                {/* User Menu */}
                <div className="relative" data-dropdown>
                  <button
                    onClick={() => setUserMenuOpen(!userMenuOpen)}
                    className="flex items-center space-x-3 p-2 hover:bg-gray-50 rounded-xl transition-all duration-200"
                  >
                    <div className="hidden sm:block text-right">
                      <p className="text-sm font-semibold text-gray-900 leading-tight">
                        {user.profile?.nome || user.email || 'Usuário'}
                      </p>
                      {user.profile?.nome && (
                        <p className="text-xs text-gray-500 leading-tight truncate max-w-32">
                          {user.email}
                        </p>
                      )}
                    </div>
                    
                    <div className="w-9 h-9 bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 rounded-xl flex items-center justify-center shadow-md">
                      {user.profile?.avatar_url ? (
                        <img 
                          src={user.profile.avatar_url} 
                          alt="Avatar" 
                          className="w-full h-full rounded-xl object-cover"
                        />
                      ) : (
                        <User className="w-5 h-5 text-white" />
                      )}
                    </div>
                  </button>

                  {userMenuOpen && (
                    <div className="absolute right-0 mt-2 w-64 bg-white rounded-2xl shadow-xl border border-gray-100 py-2 z-50">
                      <div className="px-4 py-3 border-b border-gray-100">
                        <div className="flex items-center space-x-3">
                          <div className="w-10 h-10 bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 rounded-xl flex items-center justify-center">
                            {user.profile?.avatar_url ? (
                              <img 
                                src={user.profile.avatar_url} 
                                alt="Avatar" 
                                className="w-full h-full rounded-xl object-cover"
                              />
                            ) : (
                              <User className="w-5 h-5 text-white" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-gray-900 truncate">
                              {user.profile?.nome || user.email || 'Usuário'}
                            </p>
                            {user.profile?.nome && (
                              <p className="text-xs text-gray-500 truncate">{user.email}</p>
                            )}
                          </div>
                        </div>
                      </div>
                      
                      <button
                        onClick={() => handlePageChange('configuracoes')}
                        className="w-full flex items-center space-x-3 px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                      >
                        <Settings className="w-4 h-4" />
                        <span>Configurações</span>
                      </button>
                      
                      <button
                        onClick={handleSignOut}
                        className="w-full flex items-center space-x-3 px-4 py-3 text-sm text-red-600 hover:bg-red-50 transition-colors"
                      >
                        <LogOut className="w-4 h-4" />
                        <span>Sair</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Main Content Area */}
        <main className="flex-1 overflow-auto">
          <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full">
            {children}
          </div>
        </main>
      </div>

      {/* ChatBot */}
      <UnifiedChatBot />
    </div>
  );
}