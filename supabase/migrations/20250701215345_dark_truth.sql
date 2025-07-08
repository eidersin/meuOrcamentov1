/*
  # Sistema de Gestão Financeira Pessoal

  1. Novas Tabelas
    - `profiles` - Perfis de usuário com configurações
    - `categorias` - Categorias de receitas e despesas
    - `contas` - Contas bancárias e carteiras
    - `lancamentos` - Transações financeiras
    - `metas_financeiras` - Metas de economia e gastos
    - `orcamentos` - Orçamentos mensais por categoria
    - `lembretes` - Lembretes de pagamentos
    - `relatorios_salvos` - Relatórios personalizados salvos

  2. Segurança
    - RLS habilitado em todas as tabelas
    - Políticas para isolamento por usuário
    - Triggers para auditoria e validação

  3. Funcionalidades Avançadas
    - Categorização inteligente
    - Metas financeiras
    - Orçamentos mensais
    - Lembretes automáticos
    - Relatórios personalizados
*/

-- Extensões necessárias
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Tabela de perfis de usuário
CREATE TABLE IF NOT EXISTS profiles (
  id uuid REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email text,
  nome text,
  avatar_url text,
  moeda text DEFAULT 'BRL',
  fuso_horario text DEFAULT 'America/Sao_Paulo',
  tema text DEFAULT 'light',
  notificacoes_email boolean DEFAULT true,
  notificacoes_push boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Tabela de categorias
CREATE TABLE IF NOT EXISTS categorias (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  nome text NOT NULL,
  tipo text CHECK (tipo IN ('RECEITA', 'DESPESA')) NOT NULL,
  cor text NOT NULL DEFAULT '#3B82F6',
  icone text DEFAULT 'circle',
  descricao text,
  ativa boolean DEFAULT true,
  ordem integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id, nome, tipo)
);

-- Tabela de contas
CREATE TABLE IF NOT EXISTS contas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  nome text NOT NULL,
  tipo text CHECK (tipo IN ('CORRENTE', 'POUPANCA', 'INVESTIMENTO', 'CARTEIRA', 'CARTAO_CREDITO')) DEFAULT 'CORRENTE',
  saldo_inicial decimal(15,2) DEFAULT 0,
  saldo_atual decimal(15,2) DEFAULT 0,
  limite_credito decimal(15,2),
  banco text,
  agencia text,
  conta text,
  ativa boolean DEFAULT true,
  incluir_relatorios boolean DEFAULT true,
  cor text DEFAULT '#10B981',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Tabela de lançamentos
CREATE TABLE IF NOT EXISTS lancamentos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  conta_id uuid REFERENCES contas(id) ON DELETE CASCADE NOT NULL,
  categoria_id uuid REFERENCES categorias(id) ON DELETE RESTRICT NOT NULL,
  descricao text NOT NULL,
  valor decimal(15,2) NOT NULL CHECK (valor > 0),
  data date NOT NULL,
  tipo text CHECK (tipo IN ('RECEITA', 'DESPESA')) NOT NULL,
  status text CHECK (status IN ('PENDENTE', 'CONFIRMADO', 'CANCELADO')) DEFAULT 'CONFIRMADO',
  observacoes text,
  tags text[],
  
  -- Campos para parcelas
  compra_parcelada_id uuid,
  parcela_atual integer,
  total_parcelas integer,
  
  -- Campos para transferências
  transferencia_id uuid,
  conta_destino_id uuid REFERENCES contas(id),
  
  -- Campos para recorrência
  recorrente boolean DEFAULT false,
  frequencia text CHECK (frequencia IN ('SEMANAL', 'MENSAL', 'BIMESTRAL', 'TRIMESTRAL', 'SEMESTRAL', 'ANUAL')),
  proximo_vencimento date,
  
  -- Geolocalização
  latitude decimal(10,8),
  longitude decimal(11,8),
  local text,
  
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Tabela de metas financeiras
CREATE TABLE IF NOT EXISTS metas_financeiras (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  categoria_id uuid REFERENCES categorias(id) ON DELETE CASCADE,
  nome text NOT NULL,
  descricao text,
  tipo text CHECK (tipo IN ('ECONOMIA', 'GASTO_MAXIMO', 'RECEITA_MINIMA')) NOT NULL,
  valor_meta decimal(15,2) NOT NULL CHECK (valor_meta > 0),
  valor_atual decimal(15,2) DEFAULT 0,
  data_inicio date NOT NULL,
  data_fim date NOT NULL,
  status text CHECK (status IN ('ATIVA', 'PAUSADA', 'CONCLUIDA', 'CANCELADA')) DEFAULT 'ATIVA',
  cor text DEFAULT '#F59E0B',
  notificar_progresso boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CHECK (data_fim > data_inicio)
);

-- Tabela de orçamentos
CREATE TABLE IF NOT EXISTS orcamentos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  categoria_id uuid REFERENCES categorias(id) ON DELETE CASCADE NOT NULL,
  ano integer NOT NULL,
  mes integer NOT NULL CHECK (mes BETWEEN 1 AND 12),
  valor_orcado decimal(15,2) NOT NULL CHECK (valor_orcado >= 0),
  valor_gasto decimal(15,2) DEFAULT 0,
  alerta_percentual integer DEFAULT 80 CHECK (alerta_percentual BETWEEN 0 AND 100),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id, categoria_id, ano, mes)
);

-- Tabela de lembretes
CREATE TABLE IF NOT EXISTS lembretes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  categoria_id uuid REFERENCES categorias(id) ON DELETE CASCADE,
  titulo text NOT NULL,
  descricao text,
  valor decimal(15,2),
  data_vencimento date NOT NULL,
  tipo text CHECK (tipo IN ('PAGAMENTO', 'RECEBIMENTO', 'META', 'ORCAMENTO')) NOT NULL,
  frequencia text CHECK (frequencia IN ('UNICO', 'SEMANAL', 'MENSAL', 'ANUAL')),
  status text CHECK (status IN ('PENDENTE', 'NOTIFICADO', 'CONCLUIDO', 'CANCELADO')) DEFAULT 'PENDENTE',
  antecedencia_dias integer DEFAULT 3,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Tabela de relatórios salvos
CREATE TABLE IF NOT EXISTS relatorios_salvos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  nome text NOT NULL,
  descricao text,
  tipo text CHECK (tipo IN ('RECEITAS_DESPESAS', 'FLUXO_CAIXA', 'CATEGORIAS', 'METAS', 'ORCAMENTOS')) NOT NULL,
  filtros jsonb NOT NULL DEFAULT '{}',
  configuracoes jsonb NOT NULL DEFAULT '{}',
  publico boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE categorias ENABLE ROW LEVEL SECURITY;
ALTER TABLE contas ENABLE ROW LEVEL SECURITY;
ALTER TABLE lancamentos ENABLE ROW LEVEL SECURITY;
ALTER TABLE metas_financeiras ENABLE ROW LEVEL SECURITY;
ALTER TABLE orcamentos ENABLE ROW LEVEL SECURITY;
ALTER TABLE lembretes ENABLE ROW LEVEL SECURITY;
ALTER TABLE relatorios_salvos ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para profiles
CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- Políticas RLS para categorias
CREATE POLICY "Users can manage own categorias"
  ON categorias FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Políticas RLS para contas
CREATE POLICY "Users can manage own contas"
  ON contas FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Políticas RLS para lancamentos
CREATE POLICY "Users can manage own lancamentos"
  ON lancamentos FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Políticas RLS para metas_financeiras
CREATE POLICY "Users can manage own metas"
  ON metas_financeiras FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Políticas RLS para orcamentos
CREATE POLICY "Users can manage own orcamentos"
  ON orcamentos FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Políticas RLS para lembretes
CREATE POLICY "Users can manage own lembretes"
  ON lembretes FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Políticas RLS para relatorios_salvos
CREATE POLICY "Users can manage own relatorios"
  ON relatorios_salvos FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view public relatorios"
  ON relatorios_salvos FOR SELECT
  TO authenticated
  USING (publico = true);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_categorias_user_id ON categorias(user_id);
CREATE INDEX IF NOT EXISTS idx_categorias_tipo ON categorias(tipo);
CREATE INDEX IF NOT EXISTS idx_contas_user_id ON contas(user_id);
CREATE INDEX IF NOT EXISTS idx_lancamentos_user_id ON lancamentos(user_id);
CREATE INDEX IF NOT EXISTS idx_lancamentos_data ON lancamentos(data);
CREATE INDEX IF NOT EXISTS idx_lancamentos_categoria ON lancamentos(categoria_id);
CREATE INDEX IF NOT EXISTS idx_lancamentos_conta ON lancamentos(conta_id);
CREATE INDEX IF NOT EXISTS idx_metas_user_id ON metas_financeiras(user_id);
CREATE INDEX IF NOT EXISTS idx_metas_status ON metas_financeiras(status);
CREATE INDEX IF NOT EXISTS idx_orcamentos_user_id ON orcamentos(user_id);
CREATE INDEX IF NOT EXISTS idx_orcamentos_periodo ON orcamentos(ano, mes);
CREATE INDEX IF NOT EXISTS idx_lembretes_user_id ON lembretes(user_id);
CREATE INDEX IF NOT EXISTS idx_lembretes_vencimento ON lembretes(data_vencimento);

-- Triggers para updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_categorias_updated_at BEFORE UPDATE ON categorias FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_contas_updated_at BEFORE UPDATE ON contas FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_lancamentos_updated_at BEFORE UPDATE ON lancamentos FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_metas_updated_at BEFORE UPDATE ON metas_financeiras FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_orcamentos_updated_at BEFORE UPDATE ON orcamentos FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_lembretes_updated_at BEFORE UPDATE ON lembretes FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_relatorios_updated_at BEFORE UPDATE ON relatorios_salvos FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Trigger para atualizar saldo das contas
CREATE OR REPLACE FUNCTION update_conta_saldo()
RETURNS TRIGGER AS $$
BEGIN
  -- Atualizar saldo da conta origem
  IF TG_OP = 'INSERT' THEN
    UPDATE contas 
    SET saldo_atual = saldo_atual + 
      CASE 
        WHEN NEW.tipo = 'RECEITA' THEN NEW.valor
        ELSE -NEW.valor
      END
    WHERE id = NEW.conta_id;
    
    -- Se for transferência, atualizar conta destino
    IF NEW.conta_destino_id IS NOT NULL THEN
      UPDATE contas 
      SET saldo_atual = saldo_atual + NEW.valor
      WHERE id = NEW.conta_destino_id;
    END IF;
    
    RETURN NEW;
  END IF;
  
  IF TG_OP = 'UPDATE' THEN
    -- Reverter saldo antigo
    UPDATE contas 
    SET saldo_atual = saldo_atual - 
      CASE 
        WHEN OLD.tipo = 'RECEITA' THEN OLD.valor
        ELSE -OLD.valor
      END
    WHERE id = OLD.conta_id;
    
    -- Aplicar novo saldo
    UPDATE contas 
    SET saldo_atual = saldo_atual + 
      CASE 
        WHEN NEW.tipo = 'RECEITA' THEN NEW.valor
        ELSE -NEW.valor
      END
    WHERE id = NEW.conta_id;
    
    RETURN NEW;
  END IF;
  
  IF TG_OP = 'DELETE' THEN
    UPDATE contas 
    SET saldo_atual = saldo_atual - 
      CASE 
        WHEN OLD.tipo = 'RECEITA' THEN OLD.valor
        ELSE -OLD.valor
      END
    WHERE id = OLD.conta_id;
    
    RETURN OLD;
  END IF;
  
  RETURN NULL;
END;
$$ language 'plpgsql';

CREATE TRIGGER trigger_update_conta_saldo
  AFTER INSERT OR UPDATE OR DELETE ON lancamentos
  FOR EACH ROW EXECUTE FUNCTION update_conta_saldo();

-- Trigger para atualizar progresso das metas
CREATE OR REPLACE FUNCTION update_meta_progresso()
RETURNS TRIGGER AS $$
BEGIN
  -- Atualizar valor atual das metas baseado nos lançamentos
  UPDATE metas_financeiras 
  SET valor_atual = (
    SELECT COALESCE(SUM(l.valor), 0)
    FROM lancamentos l
    WHERE l.user_id = metas_financeiras.user_id
      AND (metas_financeiras.categoria_id IS NULL OR l.categoria_id = metas_financeiras.categoria_id)
      AND l.data BETWEEN metas_financeiras.data_inicio AND metas_financeiras.data_fim
      AND l.status = 'CONFIRMADO'
      AND CASE 
        WHEN metas_financeiras.tipo = 'ECONOMIA' AND l.tipo = 'RECEITA' THEN true
        WHEN metas_financeiras.tipo = 'GASTO_MAXIMO' AND l.tipo = 'DESPESA' THEN true
        WHEN metas_financeiras.tipo = 'RECEITA_MINIMA' AND l.tipo = 'RECEITA' THEN true
        ELSE false
      END
  )
  WHERE user_id = COALESCE(NEW.user_id, OLD.user_id)
    AND status = 'ATIVA';
    
  RETURN COALESCE(NEW, OLD);
END;
$$ language 'plpgsql';

CREATE TRIGGER trigger_update_meta_progresso
  AFTER INSERT OR UPDATE OR DELETE ON lancamentos
  FOR EACH ROW EXECUTE FUNCTION update_meta_progresso();

-- Inserir categorias padrão para novos usuários
CREATE OR REPLACE FUNCTION create_default_categories()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO categorias (user_id, nome, tipo, cor, icone) VALUES
    (NEW.id, 'Alimentação', 'DESPESA', '#EF4444', 'utensils'),
    (NEW.id, 'Transporte', 'DESPESA', '#F97316', 'car'),
    (NEW.id, 'Casa', 'DESPESA', '#8B5CF6', 'home'),
    (NEW.id, 'Saúde', 'DESPESA', '#EC4899', 'heart'),
    (NEW.id, 'Lazer', 'DESPESA', '#06B6D4', 'gamepad-2'),
    (NEW.id, 'Educação', 'DESPESA', '#10B981', 'book'),
    (NEW.id, 'Roupas', 'DESPESA', '#F59E0B', 'shirt'),
    (NEW.id, 'Salário', 'RECEITA', '#10B981', 'banknote'),
    (NEW.id, 'Freelance', 'RECEITA', '#84CC16', 'laptop'),
    (NEW.id, 'Investimentos', 'RECEITA', '#3B82F6', 'trending-up');
    
  INSERT INTO contas (user_id, nome, tipo, cor) VALUES
    (NEW.id, 'Conta Corrente', 'CORRENTE', '#10B981'),
    (NEW.id, 'Poupança', 'POUPANCA', '#3B82F6');
    
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER trigger_create_default_categories
  AFTER INSERT ON profiles
  FOR EACH ROW EXECUTE FUNCTION create_default_categories();