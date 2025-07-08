import React from 'react';
import { Bell, X, Calendar, DollarSign, AlertTriangle, RefreshCw } from 'lucide-react';
import { formatCurrency, formatDate } from '../../lib/utils';

interface NotificationPanelProps {
  notificacoes: any[];
  onClose: () => void;
  onRefresh: () => void;
}

export function NotificationPanel({ notificacoes, onClose, onRefresh }: NotificationPanelProps) {
  const getNotificationIcon = (tipo: string) => {
    switch (tipo) {
      case 'DESPESA':
        return <DollarSign className="w-4 h-4 text-red-600" />;
      case 'RECEITA':
        return <DollarSign className="w-4 h-4 text-green-600" />;
      default:
        return <AlertTriangle className="w-4 h-4 text-yellow-600" />;
    }
  };

  const getNotificationColor = (tipo: string) => {
    switch (tipo) {
      case 'DESPESA':
        return 'border-red-200 bg-red-50';
      case 'RECEITA':
        return 'border-green-200 bg-green-50';
      default:
        return 'border-yellow-200 bg-yellow-50';
    }
  };

  return (
    <div className="absolute right-0 top-full mt-2 w-80 bg-white rounded-xl shadow-xl border border-gray-200 z-50">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200">
        <div className="flex items-center space-x-2">
          <Bell className="w-5 h-5 text-gray-600" />
          <h3 className="font-semibold text-gray-900">Notificações</h3>
          {notificacoes.length > 0 && (
            <span className="bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
              {notificacoes.length}
            </span>
          )}
        </div>
        <div className="flex items-center space-x-1">
          <button
            onClick={onRefresh}
            className="p-1 text-gray-400 hover:text-gray-600 rounded transition-colors"
            title="Atualizar"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <button
            onClick={onClose}
            className="p-1 text-gray-400 hover:text-gray-600 rounded transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="max-h-96 overflow-y-auto">
        {notificacoes.length > 0 ? (
          <div className="p-2 space-y-2">
            {notificacoes.map((notificacao) => (
              <div
                key={notificacao.id}
                className={`p-3 rounded-lg border ${getNotificationColor(notificacao.tipo)}`}
              >
                <div className="flex items-start space-x-3">
                  <div className="flex-shrink-0 mt-0.5">
                    {getNotificationIcon(notificacao.tipo)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {notificacao.descricao}
                    </p>
                    <div className="flex items-center space-x-2 mt-1">
                      <Calendar className="w-3 h-3 text-gray-500" />
                      <span className="text-xs text-gray-600">
                        {formatDate(notificacao.data)}
                      </span>
                    </div>
                    <p className="text-sm font-semibold text-gray-900 mt-1">
                      {formatCurrency(notificacao.valor)}
                    </p>
                    <p className="text-xs text-gray-600 mt-1">
                      Conta: {notificacao.conta?.nome}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-8 text-center">
            <Bell className="w-8 h-8 text-gray-300 mx-auto mb-2" />
            <p className="text-sm text-gray-500">Nenhuma notificação pendente</p>
          </div>
        )}
      </div>

      {/* Footer */}
      {notificacoes.length > 0 && (
        <div className="p-3 border-t border-gray-200 bg-gray-50 rounded-b-xl">
          <p className="text-xs text-gray-600 text-center">
            {notificacoes.length} vencimento{notificacoes.length > 1 ? 's' : ''} próximo{notificacoes.length > 1 ? 's' : ''}
          </p>
        </div>
      )}
    </div>
  );
}