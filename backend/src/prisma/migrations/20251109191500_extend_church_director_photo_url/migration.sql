-- Permitir URLs grandes para fotos de diretores de igreja
ALTER TABLE `Church`
  MODIFY `directorPhotoUrl` LONGTEXT NULL;
