-- Allow larger audit metadata payloads
ALTER TABLE `AuditLog`
  MODIFY COLUMN `metadataJson` TEXT NULL;
