-- Script SQL para adicionar todas as colunas necessárias no banco de dados
-- Execute este script no seu banco de dados SQLite

-- Adicionar coluna pastorName na tabela District
-- Se a coluna já existir, o comando será ignorado (SQLite não suporta IF NOT EXISTS em ALTER TABLE)
ALTER TABLE District ADD COLUMN pastorName TEXT;

-- Adicionar colunas do Diretor Jovem na tabela Church
ALTER TABLE Church ADD COLUMN directorName TEXT;
ALTER TABLE Church ADD COLUMN directorCpf TEXT;
ALTER TABLE Church ADD COLUMN directorBirthDate DATETIME;
ALTER TABLE Church ADD COLUMN directorEmail TEXT;
ALTER TABLE Church ADD COLUMN directorWhatsapp TEXT;
ALTER TABLE Church ADD COLUMN directorPhotoUrl TEXT;

-- Adicionar coluna bannerUrl na tabela Event
ALTER TABLE Event ADD COLUMN bannerUrl TEXT;

-- Verificar estrutura das tabelas (opcional - para confirmar)
-- PRAGMA table_info(District);
-- PRAGMA table_info(Church);
-- PRAGMA table_info(Event);

