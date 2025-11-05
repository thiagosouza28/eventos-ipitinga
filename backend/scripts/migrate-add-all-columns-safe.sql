-- Script SQL SEGURO para adicionar todas as colunas necessárias
-- Este script verifica se a coluna existe antes de adicionar
-- Nota: SQLite não suporta IF NOT EXISTS diretamente em ALTER TABLE ADD COLUMN
-- Execute este script manualmente ou use o script Node.js que faz a verificação

-- Para executar manualmente, você pode usar um cliente SQLite ou criar um script que:
-- 1. Verifica se a coluna existe usando PRAGMA table_info
-- 2. Adiciona apenas se não existir

-- Exemplo de como verificar antes de adicionar (requer lógica externa):
-- PRAGMA table_info(District); -- Ver colunas existentes

-- Adicionar colunas (execute apenas se não existirem):
-- Se a coluna já existir, você receberá um erro "duplicate column name"

-- ============================================
-- Tabela District
-- ============================================
-- Verificar: PRAGMA table_info(District);
ALTER TABLE District ADD COLUMN pastorName TEXT;

-- ============================================
-- Tabela Church
-- ============================================
-- Verificar: PRAGMA table_info(Church);
ALTER TABLE Church ADD COLUMN directorName TEXT;
ALTER TABLE Church ADD COLUMN directorCpf TEXT;
ALTER TABLE Church ADD COLUMN directorBirthDate DATETIME;
ALTER TABLE Church ADD COLUMN directorEmail TEXT;
ALTER TABLE Church ADD COLUMN directorWhatsapp TEXT;
ALTER TABLE Church ADD COLUMN directorPhotoUrl TEXT;

-- ============================================
-- Tabela Event
-- ============================================
-- Verificar: PRAGMA table_info(Event);
ALTER TABLE Event ADD COLUMN bannerUrl TEXT;

-- ============================================
-- Verificação final (execute para confirmar)
-- ============================================
-- PRAGMA table_info(District);
-- PRAGMA table_info(Church);
-- PRAGMA table_info(Event);

