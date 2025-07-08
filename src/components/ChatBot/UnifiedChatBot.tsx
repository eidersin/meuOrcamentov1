import React, { useState, useRef, useEffect } from 'react';
import { MessageCircle, X, Send, Bot, User, Plus, DollarSign, Target, CreditCard, Zap, Sparkles, Brain } from 'lucide-react';
import { AzureOpenAIService } from '../../lib/azureOpenAI';
import { DatabaseService } from '../../lib/database';
import { formatCurrency } from '../../lib/utils';

interface Message {
  id: string;
  content: string;
  sender: 'user' | 'bot';
  timestamp: Date;
  action?: {
    type: 'create_lancamento' | 'create_meta' | 'create_conta';
    data: any;
    executed?: boolean;
  };
}

export function UnifiedChatBot() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      content: '🤖 Olá! Sou seu assistente financeiro inteligente com IA avançada. Posso ajudá-lo com:\n\n💬 **Análises e consultas** sobre suas finanças\n⚡ **Comandos rápidos** como "Gastei R$ 50 com alimentação"\n🎯 **Criação de metas**: "Criar meta de R$ 1000"\n🏦 **Novas contas**: "Criar conta poupança Banco do Brasil"\n📊 **Relatórios inteligentes** e insights personalizados\n\nComo posso ajudá-lo hoje?',
      sender: 'bot',
      timestamp: new Date()
    }
  ]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [categorias, setCategorias] = useState<any[]>([]);
  const [contas, setContas] = useState<any[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const loadData = async () => {
    try {
      const [categoriasData, contasData] = await Promise.all([
        DatabaseService.getCategorias(),
        DatabaseService.getContas()
      ]);
      setCategorias(categoriasData);
      setContas(contasData);
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const parseCommand = (message: string): { type: string; data?: any; message?: string } | null => {
    const msg = message.toLowerCase();

    // Padrões para criar lançamento
    const lancamentoPatterns = [
      /gastei.*?r?\$?\s*(\d+(?:[.,]\d{2})?)\s*.*?com\s*(.+)/i,
      /criar.*lançamento.*?r?\$?\s*(\d+(?:[.,]\d{2})?)\s*.*?para\s*(.+)/i,
      /adicionar.*gasto.*?r?\$?\s*(\d+(?:[.,]\d{2})?)\s*.*?em\s*(.+)/i,
      /registrar.*despesa.*?r?\$?\s*(\d+(?:[.,]\d{2})?)\s*.*?categoria\s*(.+)/i
    ];

    for (const pattern of lancamentoPatterns) {
      const match = message.match(pattern);
      if (match) {
        if (!contas || contas.length === 0) {
          return {
            type: 'error',
            message: 'Você precisa ter pelo menos uma conta cadastrada para criar um lançamento. Crie uma conta primeiro dizendo: "Criar conta corrente Banco do Brasil".'
          };
        }

        if (!categorias || categorias.length === 0) {
          return {
            type: 'error',
            message: 'Você precisa ter pelo menos uma categoria cadastrada para criar um lançamento. As categorias são criadas automaticamente quando você cria seu perfil. Tente recarregar a página ou criar uma categoria manualmente.'
          };
        }

        const valorStr = match[1].replace(',', '.');
        const valor = parseFloat(valorStr);
        
        if (isNaN(valor) || valor <= 0) {
          return {
            type: 'error',
            message: 'O valor do lançamento deve ser um número positivo.'
          };
        }

        const descricao = match[2].trim();
        
        let categoria = categorias.find(c => 
          c.nome.toLowerCase().includes(descricao.toLowerCase()) ||
          descricao.toLowerCase().includes(c.nome.toLowerCase())
        );

        if (!categoria) {
          categoria = categorias.find(c => c.tipo === 'DESPESA');
        }

        if (!categoria) {
          categoria = categorias[0];
        }

        if (!categoria || !categoria.id) {
          return {
            type: 'error',
            message: 'Não foi possível encontrar uma categoria válida. Verifique se você possui categorias cadastradas.'
          };
        }

        const contaAtiva = contas.find(c => c.ativa !== false) || contas[0];

        if (!contaAtiva || !contaAtiva.id) {
          return {
            type: 'error',
            message: 'Não foi possível encontrar uma conta válida. Verifique se você possui contas cadastradas.'
          };
        }

        return {
          type: 'create_lancamento',
          data: {
            descricao: `Gasto com ${descricao}`,
            valor,
            tipo: 'DESPESA',
            categoria_id: categoria.id,
            conta_id: contaAtiva.id,
            data: new Date().toISOString().split('T')[0]
          }
        };
      }
    }

    // Padrões para criar meta
    const metaPatterns = [
      /criar.*meta.*?r?\$?\s*(\d+(?:[.,]\d{2})?)/i,
      /definir.*objetivo.*?r?\$?\s*(\d+(?:[.,]\d{2})?)/i,
      /meta.*economia.*?r?\$?\s*(\d+(?:[.,]\d{2})?)/i
    ];

    for (const pattern of metaPatterns) {
      const match = message.match(pattern);
      if (match) {
        const valorStr = match[1].replace(',', '.');
        const valor = parseFloat(valorStr);
        
        if (isNaN(valor) || valor <= 0) {
          return {
            type: 'error',
            message: 'O valor da meta deve ser um número positivo.'
          };
        }
        
        return {
          type: 'create_meta',
          data: {
            nome: 'Meta de Economia',
            tipo: 'ECONOMIA',
            valor_meta: valor,
            data_inicio: new Date().toISOString().split('T')[0],
            data_fim: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
          }
        };
      }
    }

    // Padrões melhorados para criar conta
    const contaPatterns = [
      /criar.*conta\s+(corrente|poupança|poupanca|investimento|carteira|cartão|cartao)(?:\s+(.+))?/i,
      /adicionar.*conta\s+(corrente|poupança|poupanca|investimento|carteira|cartão|cartao)(?:\s+(.+))?/i,
      /nova.*conta\s+(corrente|poupança|poupanca|investimento|carteira|cartão|cartao)(?:\s+(.+))?/i,
      /criar.*conta\s+(.+)/i
    ];

    for (const pattern of contaPatterns) {
      const match = message.match(pattern);
      if (match) {
        let tipo = 'CORRENTE';
        let nome = '';
        
        if (match[1]) {
          const tipoStr = match[1].toLowerCase();
          switch (tipoStr) {
            case 'poupança':
            case 'poupanca':
              tipo = 'POUPANCA';
              nome = match[2] ? `Poupança ${match[2]}` : 'Poupança';
              break;
            case 'investimento':
              tipo = 'INVESTIMENTO';
              nome = match[2] ? `Investimento ${match[2]}` : 'Investimento';
              break;
            case 'carteira':
              tipo = 'CARTEIRA';
              nome = match[2] ? `Carteira ${match[2]}` : 'Carteira';
              break;
            case 'cartão':
            case 'cartao':
              tipo = 'CARTAO_CREDITO';
              nome = match[2] ? `Cartão ${match[2]}` : 'Cartão de Crédito';
              break;
            default:
              tipo = 'CORRENTE';
              nome = match[2] ? `Conta Corrente ${match[2]}` : 'Conta Corrente';
          }
        } else {
          // Caso genérico
          nome = match[1].trim();
          if (nome.length < 3) {
            return {
              type: 'error',
              message: 'O nome da conta deve ter pelo menos 3 caracteres. Exemplo: "Criar conta poupança Banco do Brasil"'
            };
          }
        }
        
        return {
          type: 'create_conta',
          data: {
            nome,
            tipo,
            saldo_inicial: 0
          }
        };
      }
    }

    return null;
  };

  const executeAction = async (action: { type: string; data: any }) => {
    try {
      switch (action.type) {
        case 'create_lancamento':
          await DatabaseService.createLancamento({
            ...action.data,
            status: 'CONFIRMADO'
          });
          return `✅ Lançamento criado: ${action.data.descricao} - ${formatCurrency(action.data.valor)}`;

        case 'create_meta':
          await DatabaseService.createMeta(action.data);
          return `🎯 Meta criada: ${action.data.nome} - ${formatCurrency(action.data.valor_meta)}`;

        case 'create_conta':
          await DatabaseService.createConta(action.data);
          return `🏦 Conta criada: ${action.data.nome}`;

        default:
          return 'Ação não reconhecida';
      }
    } catch (error) {
      console.error('Erro ao executar ação:', error);
      return '❌ Erro ao executar a ação. Tente novamente.';
    }
  };

  const handleSendMessage = async () => {
    if (!inputMessage.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      content: inputMessage,
      sender: 'user',
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setIsLoading(true);

    try {
      const command = parseCommand(inputMessage);
      
      if (command) {
        if (command.type === 'error') {
          const botMessage: Message = {
            id: (Date.now() + 1).toString(),
            content: `❌ ${command.message}`,
            sender: 'bot',
            timestamp: new Date()
          };

          setMessages(prev => [...prev, botMessage]);
        } else {
          const result = await executeAction(command);
          
          const botMessage: Message = {
            id: (Date.now() + 1).toString(),
            content: result,
            sender: 'bot',
            timestamp: new Date(),
            action: { ...command, executed: true }
          };

          setMessages(prev => [...prev, botMessage]);
          await loadData();
        }
      } else {
        const response = await AzureOpenAIService.getChatResponse(inputMessage);
        
        const botMessage: Message = {
          id: (Date.now() + 1).toString(),
          content: response,
          sender: 'bot',
          timestamp: new Date()
        };

        setMessages(prev => [...prev, botMessage]);
      }
    } catch (error) {
      console.error('Erro ao processar mensagem:', error);
      
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: 'Desculpe, ocorreu um erro ao processar sua mensagem. Tente novamente.',
        sender: 'bot',
        timestamp: new Date()
      };

      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const getActionIcon = (type: string) => {
    switch (type) {
      case 'create_lancamento':
        return <DollarSign className="w-4 h-4 text-green-600" />;
      case 'create_meta':
        return <Target className="w-4 h-4 text-blue-600" />;
      case 'create_conta':
        return <CreditCard className="w-4 h-4 text-purple-600" />;
      default:
        return null;
    }
  };

  return (
    <>
      {/* Chat Button - Melhorado */}
      <button
        onClick={() => setIsOpen(true)}
        className={`fixed bottom-4 right-4 sm:bottom-6 sm:right-6 w-14 h-14 sm:w-16 sm:h-16 bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-600 text-white rounded-full shadow-lg hover:shadow-xl transition-all duration-300 flex items-center justify-center z-50 group ${
          isOpen ? 'scale-0' : 'scale-100'
        }`}
      >
        <div className="relative">
          <Brain className="w-6 h-6 sm:w-7 sm:h-7 group-hover:scale-110 transition-transform" />
          <Sparkles className="w-3 h-3 sm:w-4 sm:h-4 absolute -top-1 -right-1 text-yellow-300 animate-pulse" />
        </div>
        <div className="absolute -top-2 -right-2 w-3 h-3 sm:w-4 sm:h-4 bg-green-500 rounded-full border-2 border-white animate-pulse"></div>
      </button>

      {/* Chat Window - Responsivo */}
      {isOpen && (
        <div className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 w-[calc(100vw-2rem)] max-w-sm sm:w-96 h-[calc(100vh-8rem)] max-h-[600px] bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 flex flex-col z-50 overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-600 rounded-t-2xl flex-shrink-0">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-white bg-opacity-20 rounded-full flex items-center justify-center">
                <Brain className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="font-semibold text-white">Assistente IA Financeiro</h3>
                <p className="text-xs text-blue-100 flex items-center space-x-1">
                  <Zap className="w-3 h-3" />
                  <span>Chat inteligente + Comandos rápidos</span>
                </p>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="p-1 text-white hover:bg-white hover:bg-opacity-20 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 min-h-0">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div className={`flex items-start space-x-2 max-w-[85%] ${
                  message.sender === 'user' ? 'flex-row-reverse space-x-reverse' : ''
                }`}>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                    message.sender === 'user' 
                      ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white' 
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
                  }`}>
                    {message.sender === 'user' ? (
                      <User className="w-4 h-4" />
                    ) : (
                      <Brain className="w-4 h-4" />
                    )}
                  </div>
                  <div className={`px-4 py-3 rounded-2xl ${
                    message.sender === 'user'
                      ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200'
                  }`}>
                    <p className="text-sm whitespace-pre-wrap leading-relaxed">{message.content}</p>
                    
                    {message.action && (
                      <div className="flex items-center space-x-2 mt-3 pt-3 border-t border-gray-200 dark:border-gray-600">
                        {getActionIcon(message.action.type)}
                        <span className="text-xs font-medium">
                          {message.action.executed ? '✅ Executado' : '⏳ Ação pendente'}
                        </span>
                      </div>
                    )}
                    
                    <p className={`text-xs mt-2 ${
                      message.sender === 'user' ? 'text-blue-100' : 'text-gray-500 dark:text-gray-400'
                    }`}>
                      {message.timestamp.toLocaleTimeString('pt-BR', { 
                        hour: '2-digit', 
                        minute: '2-digit' 
                      })}
                    </p>
                  </div>
                </div>
              </div>
            ))}
            
            {isLoading && (
              <div className="flex justify-start">
                <div className="flex items-start space-x-2">
                  <div className="w-8 h-8 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center">
                    <Brain className="w-4 h-4 text-gray-600 dark:text-gray-300" />
                  </div>
                  <div className="bg-gray-100 dark:bg-gray-700 px-4 py-3 rounded-2xl">
                    <div className="flex space-x-1">
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                    </div>
                  </div>
                </div>
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="p-4 border-t border-gray-200 dark:border-gray-700 flex-shrink-0">
            <div className="flex space-x-2">
              <input
                type="text"
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Digite sua mensagem ou comando..."
                className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
                disabled={isLoading}
              />
              <button
                onClick={handleSendMessage}
                disabled={!inputMessage.trim() || isLoading}
                className="px-3 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:from-blue-700 hover:to-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
            
            {/* Comandos de exemplo */}
            <div className="mt-3 text-xs text-gray-500 dark:text-gray-400">
              <p><strong>💡 Comandos rápidos:</strong></p>
              <div className="grid grid-cols-1 gap-1 mt-1">
                <p>• "Gastei R$ 25 com alimentação"</p>
                <p>• "Criar meta de R$ 1000"</p>
                <p>• "Criar conta poupança Banco do Brasil"</p>
                <p>• "Como estão meus gastos este mês?"</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}