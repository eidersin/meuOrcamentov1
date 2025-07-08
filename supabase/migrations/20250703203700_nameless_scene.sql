/*
  # Melhorias e Novas Funcionalidades

  1. Novas Colunas
    - `antecedencia_notificacao` em lancamentos
    - `valor_investido` em contas

  2. Novas Tabelas
    - `patrimonio` - Gestão de ativos e patrimônio
    - `sessoes_ativas` - Controle de sessões

  3. Funcionalidades
    - Storage para avatars
    - Triggers aprimorados
    - Índices de performance
*/

-- Adicionar coluna de antecedência de notificação se não existir
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'lancamentos' AND column_name = 'antecedencia_notificacao'
  ) THEN
    ALTER TABLE lancamentos ADD COLUMN antecedencia_notificacao integer DEFAULT 3;
  END IF;
END $$;

-- Adicionar coluna de valor investido se não existir
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'contas' AND column_name = 'valor_investido'
  ) THEN
    ALTER TABLE contas ADD COLUMN valor_investido decimal(15,2);
  END IF;
END $$;

-- Tabela de patrimônio
CREATE TABLE IF NOT EXISTS patrimonio (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  nome text NOT NULL,
  tipo text CHECK (tipo IN ('IMOVEL', 'VEICULO', 'INVESTIMENTO', 'OUTRO')) NOT NULL,
  valor_atual decimal(15,2) NOT NULL,
  valor_compra decimal(15,2),
  data_aquisicao date,
  descricao text,
  ativo boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Tabela de sessões ativas
CREATE TABLE IF NOT EXISTS sessoes_ativas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  device_info text,
  ip_address inet,
  user_agent text,
  last_activity timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

-- Habilitar RLS nas novas tabelas
ALTER TABLE patrimonio ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessoes_ativas ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para patrimonio
CREATE POLICY "Users can manage own patrimonio"
  ON patrimonio FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Políticas RLS para sessoes_ativas
CREATE POLICY "Users can manage own sessions"
  ON sessoes_ativas FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_patrimonio_user_id ON patrimonio(user_id);
CREATE INDEX IF NOT EXISTS idx_patrimonio_tipo ON patrimonio(tipo);
CREATE INDEX IF NOT EXISTS idx_sessoes_user_id ON sessoes_ativas(user_id);
CREATE INDEX IF NOT EXISTS idx_sessoes_last_activity ON sessoes_ativas(last_activity);

-- Triggers para updated_at
CREATE TRIGGER update_patrimonio_updated_at BEFORE UPDATE ON patrimonio FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_sessoes_updated_at BEFORE UPDATE ON sessoes_ativas FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Criar bucket para avatars se não existir
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

-- Política para upload de avatars
CREATE POLICY "Avatar uploads are publicly accessible"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'avatars');

CREATE POLICY "Users can upload their own avatar"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can update their own avatar"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own avatar"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Função para limpeza de sessões antigas
CREATE OR REPLACE FUNCTION cleanup_old_sessions()
RETURNS void AS $$
BEGIN
  DELETE FROM sessoes_ativas 
  WHERE last_activity < now() - interval '30 days';
END;
$$ LANGUAGE plpgsql;

-- Função para calcular patrimônio líquido
CREATE OR REPLACE FUNCTION get_patrimonio_liquido(user_uuid uuid)
RETURNS decimal AS $$
DECLARE
  total_contas decimal := 0;
  total_patrimonio decimal := 0;
  total_dividas decimal := 0;
BEGIN
  -- Somar saldos das contas (exceto cartão de crédito)
  SELECT COALESCE(SUM(
    CASE 
      WHEN tipo = 'CARTAO_CREDITO' THEN -ABS(saldo_atual)
      ELSE saldo_atual
    END
  ), 0) INTO total_contas
  FROM contas 
  WHERE user_id = user_uuid AND ativa = true;
  
  -- Somar patrimônio
  SELECT COALESCE(SUM(valor_atual), 0) INTO total_patrimonio
  FROM patrimonio 
  WHERE user_id = user_uuid AND ativo = true;
  
  RETURN total_contas + total_patrimonio;
END;
$$ LANGUAGE plpgsql;

-- Função para detectar anomalias simples
CREATE OR REPLACE FUNCTION detect_spending_anomalies(user_uuid uuid, days_back integer DEFAULT 30)
RETURNS TABLE(
  categoria_nome text,
  valor_atual decimal,
  valor_medio decimal,
  desvio_percentual decimal,
  severidade text
) AS $$
BEGIN
  RETURN QUERY
  WITH categoria_stats AS (
    SELECT 
      c.nome,
      l.categoria_id,
      AVG(l.valor) as media,
      STDDEV(l.valor) as desvio,
      COUNT(*) as total_transacoes
    FROM lancamentos l
    JOIN categorias c ON c.id = l.categoria_id
    WHERE l.user_id = user_uuid 
      AND l.tipo = 'DESPESA'
      AND l.status = 'CONFIRMADO'
      AND l.data >= CURRENT_DATE - INTERVAL '90 days'
    GROUP BY c.nome, l.categoria_id
    HAVING COUNT(*) >= 3
  ),
  recent_expenses AS (
    SELECT 
      c.nome,
      l.valor,
      cs.media,
      cs.desvio
    FROM lancamentos l
    JOIN categorias c ON c.id = l.categoria_id
    JOIN categoria_stats cs ON cs.categoria_id = l.categoria_id
    WHERE l.user_id = user_uuid 
      AND l.tipo = 'DESPESA'
      AND l.status = 'CONFIRMADO'
      AND l.data >= CURRENT_DATE - INTERVAL '7 days'
  )
  SELECT 
    re.nome,
    re.valor,
    re.media,
    ((re.valor - re.media) / re.media * 100) as desvio_perc,
    CASE 
      WHEN re.valor > re.media + (2 * re.desvio) THEN 'ALTA'
      WHEN re.valor > re.media + re.desvio THEN 'MEDIA'
      ELSE 'BAIXA'
    END as sev
  FROM recent_expenses re
  WHERE re.valor > re.media * 1.5
  ORDER BY ((re.valor - re.media) / re.media) DESC;
END;
$$ LANGUAGE plpgsql;