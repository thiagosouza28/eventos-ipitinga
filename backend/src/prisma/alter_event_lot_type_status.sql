-- Adds promotional lot fields without dropping data.
ALTER TABLE `EventLot`
  ADD COLUMN `type` ENUM('PADRAO', 'PROMOCIONAL') NOT NULL DEFAULT 'PADRAO',
  ADD COLUMN `status` ENUM('ATIVO', 'INATIVO', 'ENCERRADO') NOT NULL DEFAULT 'INATIVO';
