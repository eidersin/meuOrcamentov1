import { supabase } from './supabase';
import type { User } from '@supabase/supabase-js';

export interface AuthUser extends User {
  profile?: {
    nome: string | null;
    avatar_url: string | null;
    moeda: string;
    tema: string;
    notificacoes_email: boolean;
    notificacoes_push: boolean;
  };
}

/**
 * AuthService fornece uma classe estática para gerenciar todas as operações
 * de autenticação e perfil de usuário com o Supabase.
 */
export class AuthService {

  /**
   * Registra um novo usuário com e-mail e senha, e cria um perfil associado.
   * @param email - O e-mail do novo usuário.
   * @param password - A senha do novo usuário (mínimo 6 caracteres).
   * @param nome - O nome completo do usuário para o perfil.
   */
  static async signUp(email: string, password: string, nome: string) {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { nome },
      },
    });

    if (error) throw error;

    if (data.user) {
      const { error: profileError } = await supabase.from('profiles').insert({
        id: data.user.id,
        email: data.user.email,
        nome,
      });

      if (profileError) {
        console.error('Erro ao criar o perfil do usuário:', profileError);
      }
    }

    return data;
  }

  /**
   * Autentica um usuário existente com e-mail e senha.
   * @param email - O e-mail do usuário.
   * @param password - A senha do usuário.
   */
  static async signIn(email: string, password: string) {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) throw error;
    return data;
  }

  /**
   * Desconecta o usuário atualmente logado.
   */
  static async signOut() {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  }

  /**
   * Obtém os dados do usuário atual e seu perfil.
   * Retorna null se não houver usuário logado ou se ocorrer um erro.
   */
  static async getCurrentUser(): Promise<AuthUser | null> {
    try {
      const { data: { user }, error } = await supabase.auth.getUser();

      if (error || !user) {
        return null;
      }

      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('nome, avatar_url, moeda, tema, notificacoes_email, notificacoes_push')
        .eq('id', user.id)
        .single();

      if (profileError) {
        console.error('Erro ao buscar perfil do usuário atual:', profileError);
        return user as AuthUser;
      }

      return { ...user, profile: profile || undefined };

    } catch (error) {
      console.error('Erro crítico em getCurrentUser:', error);
      return null;
    }
  }

  /**
   * Registra um listener que é acionado em qualquer mudança de estado de autenticação.
   * @param callback - A função que será chamada com o estado do usuário (AuthUser ou null).
   */
  static onAuthStateChange(callback: (user: AuthUser | null) => void) {
    // Usando a estrutura .then() que foi validada como funcional no seu ambiente.
    return supabase.auth.onAuthStateChange((event, session) => {
      if (session?.user) {
        supabase
          .from('profiles')
          .select('nome, avatar_url, moeda, tema, notificacoes_email, notificacoes_push')
          .eq('id', session.user.id)
          .single()
          .then(({ data: profile, error }) => {
            if (error) {
              console.error('Erro ao buscar perfil em onAuthStateChange:', error);
              callback(session.user as AuthUser);
            } else {
              if (profile?.tema) {
                this.applyTheme(profile.tema);
              }
              const fullUser: AuthUser = {
                ...session.user,
                profile: profile || undefined,
              };
              callback(fullUser);
            }
          });
      } else {
        callback(null);
      }
    });
  }

  /**
   * Atualiza os dados do perfil do usuário logado.
   * @param updates - Um objeto com os campos do perfil a serem atualizados.
   */
  static async updateProfile(updates: {
    nome?: string;
    avatar_url?: string;
    moeda?: string;
    tema?: string;
    notificacoes_email?: boolean;
    notificacoes_push?: boolean;
  }) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Usuário não autenticado');

    const { data, error } = await supabase
      .from('profiles')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', user.id)
      .select()
      .single();

    if (error) throw error;
    
    if (updates.tema) {
      this.applyTheme(updates.tema);
    }
    
    return data;
  }

  /**
   * Aplica um tema (light/dark/auto) à aplicação.
   * @param theme - O nome do tema.
   */
  static applyTheme(theme: string) {
    const root = document.documentElement;
    root.classList.remove('light', 'dark');
    
    if (theme === 'dark') {
      root.classList.add('dark');
    } else if (theme === 'light') {
      root.classList.add('light');
    } else if (theme === 'auto') {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      root.classList.add(prefersDark ? 'dark' : 'light');
    }
  }

  /**
   * Envia um e-mail de recuperação de senha.
   * @param email - O e-mail para o qual o link de recuperação será enviado.
   */
  static async resetPassword(email: string) {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });

    if (error) throw error;
  }
}