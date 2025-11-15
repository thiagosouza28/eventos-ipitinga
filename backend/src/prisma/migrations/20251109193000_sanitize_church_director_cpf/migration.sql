-- Remove caracteres nao numericos dos CPFs de diretores ja cadastrados
UPDATE `Church`
SET `directorCpf` = REGEXP_REPLACE(`directorCpf`, '[^0-9]', '')
WHERE `directorCpf` IS NOT NULL;
