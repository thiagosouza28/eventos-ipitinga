-- Permitir metadados maiores nos logs de auditoria
ALTER TABLE `AuditLog`
  MODIFY `metadataJson` LONGTEXT NULL;
