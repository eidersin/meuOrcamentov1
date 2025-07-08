import React, { useState } from 'react';
import { LoginForm } from './LoginForm';
import { RegisterForm } from './RegisterForm';

interface AuthPageProps {
  onSuccess: () => void;
}

export function AuthPage({ onSuccess }: AuthPageProps) {
  const [mode, setMode] = useState<'login' | 'register'>('login');

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-xl p-8">
          {mode === 'login' ? (
            <LoginForm 
              onSuccess={onSuccess}
              onToggleMode={() => setMode('register')}
            />
          ) : (
            <RegisterForm 
              onSuccess={onSuccess}
              onToggleMode={() => setMode('login')}
            />
          )}
        </div>
        
        <div className="text-center mt-8">
          <p className="text-sm text-gray-500">
            🔒 Seus dados são protegidos e criptografados
          </p>
        </div>
      </div>
    </div>
  );
}