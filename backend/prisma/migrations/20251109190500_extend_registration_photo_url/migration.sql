-- Prisma schema now stores Registration.photoUrl as LONGTEXT to avoid P2000 errors.
ALTER TABLE `Registration`
  MODIFY `photoUrl` LONGTEXT NULL;
