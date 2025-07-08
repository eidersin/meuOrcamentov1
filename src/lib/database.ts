import { supabase } from './supabase';
import type { Database } from './supabase';

type Tables = Database['public']['Tables'];
type Categoria = Tables['categorias']['Row'];
type Conta = Tables['contas']['Row'];
type Lancamento = Tables['lancamentos']['Row'];
type MetaFinanceira = Tables['metas_financeiras']['Row'];
type Orcamento = Tables['orcamentos']['Row'];
type Lembrete = Tables['lembretes']['Row'];
type Patrimonio = Tables['patrimonio']['Row'];

export class DatabaseService {
  // Categorias
  static async getCategorias(): Promise<Categoria[]> {
    const { data, error } = await supabase
      .from('categorias')
      .select('*')
      .eq('ativa', true)
      .order('ordem', { ascending: true });

    if (error) throw error;
    return data || [];
  }

  static async createCategoria(categoria: Tables['categorias']['Insert']): Promise<Categoria> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Usuário não autenticado');

    const { data, error } = await supabase
      .from('categorias')
      .insert({ ...categoria, user_id: user.id })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  static async updateCategoria(id: string, updates: Tables['categorias']['Update']): Promise<Categoria> {
    const { data, error } = await supabase
      .from('categorias')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  static async deleteCategoria(id: string): Promise<void> {
    const { error } = await supabase
      .from('categorias')
      .update({ ativa: false })
      .eq('id', id);

    if (error) throw error;
  }

  // Contas
  static async getContas(): Promise<Conta[]> {
    const { data, error } = await supabase
      .from('contas')
      .select('*')
      .eq('ativa', true)
      .order('nome', { ascending: true });

    if (error) throw error;
    return data || [];
  }

  static async createConta(conta: Tables['contas']['Insert']): Promise<Conta> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Usuário não autenticado');

    const { data, error } = await supabase
      .from('contas')
      .insert({ 
        ...conta, 
        user_id: user.id,
        saldo_atual: conta.saldo_inicial || 0
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  static async updateConta(id: string, updates: Tables['contas']['Update']): Promise<Conta> {
    const { data, error } = await supabase
      .from('contas')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  static async deleteConta(id: string): Promise<void> {
    const { error } = await supabase
      .from('contas')
      .update({ ativa: false })
      .eq('id', id);

    if (error) throw error;
  }

  // Lançamentos
  static async getLancamentos(filters?: {
    dataInicio?: string;
    dataFim?: string;
    categoriaId?: string;
    contaId?: string;
    tipo?: 'RECEITA' | 'DESPESA';
    status?: 'PENDENTE' | 'CONFIRMADO' | 'CANCELADO';
  }): Promise<Lancamento[]> {
    let query = supabase
      .from('lancamentos')
      .select(`
        *,
        categoria:categorias(nome, cor, icone),
        conta:contas!lancamentos_conta_id_fkey(nome, tipo),
        conta_destino:contas!lancamentos_conta_destino_id_fkey(nome, tipo)
      `)
      .order('data', { ascending: false })
      .order('created_at', { ascending: false });

    if (filters?.dataInicio) {
      query = query.gte('data', filters.dataInicio);
    }
    if (filters?.dataFim) {
      query = query.lte('data', filters.dataFim);
    }
    if (filters?.categoriaId) {
      query = query.eq('categoria_id', filters.categoriaId);
    }
    if (filters?.contaId) {
      query = query.eq('conta_id', filters.contaId);
    }
    if (filters?.tipo) {
      query = query.eq('tipo', filters.tipo);
    }
    if (filters?.status) {
      query = query.eq('status', filters.status);
    }

    const { data, error } = await query;

    if (error) throw error;
    return data || [];
  }

  static async createLancamento(lancamento: Tables['lancamentos']['Insert']): Promise<Lancamento> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Usuário não autenticado');

    const { data, error } = await supabase
      .from('lancamentos')
      .insert({ ...lancamento, user_id: user.id })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  static async updateLancamento(id: string, updates: Tables['lancamentos']['Update']): Promise<Lancamento> {
    const { data, error } = await supabase
      .from('lancamentos')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  static async deleteLancamento(id: string): Promise<void> {
    const { error } = await supabase
      .from('lancamentos')
      .delete()
      .eq('id', id);

    if (error) throw error;
  }

  // Patrimônio (para dívidas)
  static async getPatrimonio(): Promise<Patrimonio[]> {
    const { data, error } = await supabase
      .from('patrimonio')
      .select('*')
      .eq('ativo', true)
      .order('nome', { ascending: true });

    if (error) throw error;
    return data || [];
  }

  static async createPatrimonio(patrimonio: Tables['patrimonio']['Insert']): Promise<Patrimonio> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Usuário não autenticado');

    const { data, error } = await supabase
      .from('patrimonio')
      .insert({ ...patrimonio, user_id: user.id })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  static async updatePatrimonio(id: string, updates: Tables['patrimonio']['Update']): Promise<Patrimonio> {
    const { data, error } = await supabase
      .from('patrimonio')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  static async deletePatrimonio(id: string): Promise<void> {
    const { error } = await supabase
      .from('patrimonio')
      .delete()
      .eq('id', id);

    if (error) throw error;
  }

  // Transferências entre contas
  static async createTransferencia(origem: string, destino: string, valor: number, descricao: string): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Usuário não autenticado');

    const transferencia_id = crypto.randomUUID();
    const data = new Date().toISOString().split('T')[0];

    // Criar lançamento de saída na conta origem
    const lancamentoSaida = {
      user_id: user.id,
      conta_id: origem,
      categoria_id: await this.getCategoriaTransferencia(),
      descricao: `Transferência para conta destino - ${descricao}`,
      valor: valor,
      data: data,
      tipo: 'DESPESA' as const,
      status: 'CONFIRMADO' as const,
      transferencia_id: transferencia_id,
      conta_destino_id: destino
    };

    // Criar lançamento de entrada na conta destino
    const lancamentoEntrada = {
      user_id: user.id,
      conta_id: destino,
      categoria_id: await this.getCategoriaTransferencia(),
      descricao: `Transferência da conta origem - ${descricao}`,
      valor: valor,
      data: data,
      tipo: 'RECEITA' as const,
      status: 'CONFIRMADO' as const,
      transferencia_id: transferencia_id,
      conta_destino_id: origem
    };

    const { error } = await supabase
      .from('lancamentos')
      .insert([lancamentoSaida, lancamentoEntrada]);

    if (error) throw error;
  }

  private static async getCategoriaTransferencia(): Promise<string> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Usuário não autenticado');

    // Buscar ou criar categoria de transferência
    let { data: categoria } = await supabase
      .from('categorias')
      .select('id')
      .eq('user_id', user.id)
      .eq('nome', 'Transferência')
      .single();

    if (!categoria) {
      const { data: novaCategoria } = await supabase
        .from('categorias')
        .insert({
          user_id: user.id,
          nome: 'Transferência',
          tipo: 'RECEITA',
          cor: '#6B7280'
        })
        .select('id')
        .single();
      
      categoria = novaCategoria;
    }

    return categoria?.id || '';
  }

  // Notificações
  static async getNotificacoesPendentes(): Promise<any[]> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Usuário não autenticado');

    const hoje = new Date();
    const proximosDias = new Date();
    proximosDias.setDate(hoje.getDate() + 7); // Próximos 7 dias

    const { data, error } = await supabase
      .from('lancamentos')
      .select(`
        *,
        categoria:categorias(nome, cor),
        conta:contas!lancamentos_conta_id_fkey(nome)
      `)
      .eq('user_id', user.id)
      .eq('status', 'PENDENTE')
      .gte('data', hoje.toISOString().split('T')[0])
      .lte('data', proximosDias.toISOString().split('T')[0])
      .order('data', { ascending: true });

    if (error) throw error;
    return data || [];
  }

  // Metas Financeiras
  static async getMetas(): Promise<MetaFinanceira[]> {
    const { data, error } = await supabase
      .from('metas_financeiras')
      .select(`
        *,
        categoria:categorias(nome, cor)
      `)
      .order('data_fim', { ascending: true });

    if (error) throw error;
    return data || [];
  }

  static async createMeta(meta: Tables['metas_financeiras']['Insert']): Promise<MetaFinanceira> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Usuário não autenticado');

    const { data, error } = await supabase
      .from('metas_financeiras')
      .insert({ ...meta, user_id: user.id })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  static async updateMeta(id: string, updates: Tables['metas_financeiras']['Update']): Promise<MetaFinanceira> {
    const { data, error } = await supabase
      .from('metas_financeiras')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  static async deleteMeta(id: string): Promise<void> {
    const { error } = await supabase
      .from('metas_financeiras')
      .delete()
      .eq('id', id);

    if (error) throw error;
  }

  // Orçamentos
  static async getOrcamentos(ano?: number, mes?: number): Promise<Orcamento[]> {
    let query = supabase
      .from('orcamentos')
      .select(`
        *,
        categoria:categorias(nome, cor)
      `);

    if (ano) query = query.eq('ano', ano);
    if (mes) query = query.eq('mes', mes);

    const { data, error } = await query.order('categoria_id');

    if (error) throw error;
    return data || [];
  }

  static async createOrcamento(orcamento: Tables['orcamentos']['Insert']): Promise<Orcamento> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Usuário não autenticado');

    const { data, error } = await supabase
      .from('orcamentos')
      .insert({ ...orcamento, user_id: user.id })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  static async updateOrcamento(id: string, updates: Tables['orcamentos']['Update']): Promise<Orcamento> {
    const { data, error } = await supabase
      .from('orcamentos')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  static async deleteOrcamento(id: string): Promise<void> {
    const { error } = await supabase
      .from('orcamentos')
      .delete()
      .eq('id', id);

    if (error) throw error;
  }

  // Lembretes
  static async getLembretes(): Promise<Lembrete[]> {
    const { data, error } = await supabase
      .from('lembretes')
      .select(`
        *,
        categoria:categorias(nome, cor)
      `)
      .order('data_vencimento', { ascending: true });

    if (error) throw error;
    return data || [];
  }

  static async createLembrete(lembrete: Tables['lembretes']['Insert']): Promise<Lembrete> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Usuário não autenticado');

    const { data, error } = await supabase
      .from('lembretes')
      .insert({ ...lembrete, user_id: user.id })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  static async updateLembrete(id: string, updates: Tables['lembretes']['Update']): Promise<Lembrete> {
    const { data, error } = await supabase
      .from('lembretes')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  static async deleteLembrete(id: string): Promise<void> {
    const { error } = await supabase
      .from('lembretes')
      .delete()
      .eq('id', id);

    if (error) throw error;
  }

  // Relatórios e Analytics
  static async getResumoFinanceiro(dataInicio: string, dataFim: string) {
    const { data, error } = await supabase
      .rpc('get_resumo_financeiro', {
        data_inicio: dataInicio,
        data_fim: dataFim
      });

    if (error) throw error;
    return data;
  }

  static async getGastosPorCategoria(dataInicio: string, dataFim: string) {
    const { data, error } = await supabase
      .from('lancamentos')
      .select(`
        valor,
        categoria:categorias(nome, cor)
      `)
      .eq('tipo', 'DESPESA')
      .in('status', ['CONFIRMADO', 'PENDENTE']) 
      .gte('data', dataInicio)
      .lte('data', dataFim);

    if (error) throw error;

    const grupos = (data || []).reduce((acc, item) => {
      const categoria = item.categoria?.nome || 'Sem categoria';
      const cor = item.categoria?.cor || '#6B7280';
      
      if (!acc[categoria]) {
        acc[categoria] = { nome: categoria, valor: 0, cor };
      }
      acc[categoria].valor += item.valor;
      return acc;
    }, {} as Record<string, { nome: string; valor: number; cor: string }>);

    return Object.values(grupos);
  }

  static async getEvolucaoMensal(meses: number = 6) {
    const { data, error } = await supabase
      .rpc('get_evolucao_mensal', { num_meses: meses });

    if (error) throw error;
    return data;
  }

  // Faturas de Cartão de Crédito
  static async getFaturaCartao(contaId: string, dataInicio: string, dataFim: string) {
    const { data, error } = await supabase
      .from('lancamentos')
      .select(`
        *,
        categoria:categorias(nome, cor)
      `)
      .eq('conta_id', contaId)
      .eq('tipo', 'DESPESA')
      .not('cartao_credito_usado', 'is', null)
      .gte('data', dataInicio)
      .lte('data', dataFim)
      .order('data', { ascending: false });

    if (error) throw error;
    return data || [];
  }

  static async pagarFatura(contaId: string, contaOrigemId: string, valor: number, dataInicio: string, dataFim: string) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Usuário não autenticado');

    // Criar lançamento de pagamento da fatura
    const { error: lancamentoError } = await supabase
      .from('lancamentos')
      .insert({
        user_id: user.id,
        conta_id: contaOrigemId,
        categoria_id: await this.getCategoriaCartaoCredito(),
        descricao: 'Pagamento de Fatura do Cartão',
        valor: valor,
        data: new Date().toISOString().split('T')[0],
        tipo: 'DESPESA',
        status: 'CONFIRMADO'
      });

    if (lancamentoError) throw lancamentoError;

    // Marcar todos os lançamentos da fatura como pagos
    const { error: updateError } = await supabase
      .from('lancamentos')
      .update({ status: 'CONFIRMADO' })
      .eq('conta_id', contaId)
      .eq('tipo', 'DESPESA')
      .not('cartao_credito_usado', 'is', null)
      .gte('data', dataInicio)
      .lte('data', dataFim);

    if (updateError) throw updateError;
  }

  private static async getCategoriaCartaoCredito(): Promise<string> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Usuário não autenticado');

    // Buscar ou criar categoria de cartão de crédito
    let { data: categoria } = await supabase
      .from('categorias')
      .select('id')
      .eq('user_id', user.id)
      .eq('nome', 'Cartão de Crédito')
      .single();

    if (!categoria) {
      const { data: novaCategoria } = await supabase
        .from('categorias')
        .insert({
          user_id: user.id,
          nome: 'Cartão de Crédito',
          tipo: 'DESPESA',
          cor: '#EF4444'
        })
        .select('id')
        .single();
      
      categoria = novaCategoria;
    }

    return categoria?.id || '';
  }
}