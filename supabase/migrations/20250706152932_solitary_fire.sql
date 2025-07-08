/*
  # Adicionar lógica de cartão de crédito para contas correntes

  1. Alterações na tabela lancamentos
    - Adicionar coluna cartao_credito_usado para identificar qual cartão foi usado
    
  2. Alterações na tabela contas
    - Permitir limite_credito para contas correntes
    
  3. Atualizar triggers e funções
*/

-- Adicionar coluna para identificar qual cartão de crédito foi usado
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'lancamentos' AND column_name = 'cartao_credito_usado'
  ) THEN
    ALTER TABLE lancamentos ADD COLUMN cartao_credito_usado text;
  END IF;
END $$;

-- Atualizar o trigger de atualização de saldo para considerar cartões de crédito em contas correntes
CREATE OR REPLACE FUNCTION update_conta_saldo()
RETURNS TRIGGER AS $$
BEGIN
  -- Atualizar saldo da conta origem
  IF TG_OP = 'INSERT' THEN
    -- Para contas correntes com cartão de crédito, tratar despesas como uso do limite
    UPDATE contas 
    SET saldo_atual = saldo_atual + 
      CASE 
        WHEN NEW.tipo = 'RECEITA' THEN NEW.valor
        WHEN NEW.tipo = 'DESPESA' AND NEW.cartao_credito_usado IS NOT NULL THEN -NEW.valor
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
        WHEN OLD.tipo = 'DESPESA' AND OLD.cartao_credito_usado IS NOT NULL THEN -OLD.valor
        ELSE -OLD.valor
      END
    WHERE id = OLD.conta_id;
    
    -- Aplicar novo saldo
    UPDATE contas 
    SET saldo_atual = saldo_atual + 
      CASE 
        WHEN NEW.tipo = 'RECEITA' THEN NEW.valor
        WHEN NEW.tipo = 'DESPESA' AND NEW.cartao_credito_usado IS NOT NULL THEN -NEW.valor
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
        WHEN OLD.tipo = 'DESPESA' AND OLD.cartao_credito_usado IS NOT NULL THEN -OLD.valor
        ELSE -OLD.valor
      END
    WHERE id = OLD.conta_id;
    
    RETURN OLD;
  END IF;
  
  RETURN NULL;
END;
$$ language 'plpgsql';

-- Função para calcular utilização de cartão de crédito
CREATE OR REPLACE FUNCTION get_credit_card_usage(conta_uuid uuid)
RETURNS TABLE(
  limite_total decimal,
  valor_usado decimal,
  limite_disponivel decimal,
  percentual_usado decimal
) AS $$
DECLARE
  conta_info record;
  total_usado decimal := 0;
BEGIN
  -- Buscar informações da conta
  SELECT limite_credito, tipo INTO conta_info
  FROM contas 
  WHERE id = conta_uuid;
  
  -- Se não tem limite de crédito, retornar zeros
  IF conta_info.limite_credito IS NULL OR conta_info.limite_credito = 0 THEN
    RETURN QUERY SELECT 
      0::decimal as limite_total,
      0::decimal as valor_usado,
      0::decimal as limite_disponivel,
      0::decimal as percentual_usado;
    RETURN;
  END IF;
  
  -- Calcular total usado no cartão de crédito
  SELECT COALESCE(SUM(valor), 0) INTO total_usado
  FROM lancamentos 
  WHERE conta_id = conta_uuid 
    AND tipo = 'DESPESA' 
    AND cartao_credito_usado IS NOT NULL
    AND status = 'CONFIRMADO';
  
  RETURN QUERY SELECT 
    conta_info.limite_credito as limite_total,
    total_usado as valor_usado,
    (conta_info.limite_credito - total_usado) as limite_disponivel,
    CASE 
      WHEN conta_info.limite_credito > 0 THEN (total_usado / conta_info.limite_credito * 100)
      ELSE 0
    END as percentual_usado;
END;
$$ LANGUAGE plpgsql;

-- Atualizar as categorias padrão para não incluir mais cartão de crédito como tipo de conta
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
    (NEW.id, 'Cartão de Crédito', 'DESPESA', '#EF4444', 'credit-card'),
    (NEW.id, 'Salário', 'RECEITA', '#10B981', 'banknote'),
    (NEW.id, 'Freelance', 'RECEITA', '#84CC16', 'laptop'),
    (NEW.id, 'Investimentos', 'RECEITA', '#3B82F6', 'trending-up');
    
  INSERT INTO contas (user_id, nome, tipo, cor) VALUES
    (NEW.id, 'Conta Corrente', 'CORRENTE', '#10B981'),
    (NEW.id, 'Poupança', 'POUPANCA', '#3B82F6');
    
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Criar índice para melhor performance nas consultas de cartão de crédito
CREATE INDEX IF NOT EXISTS idx_lancamentos_cartao_credito ON lancamentos(conta_id, cartao_credito_usado) WHERE cartao_credito_usado IS NOT NULL;