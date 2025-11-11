USE `catre_ipitinga`;

INSERT INTO `District` (`id`, `name`, `pastorName`, `createdAt`)
VALUES
  ('district-norte-1', 'Distrito Norte', 'Pr. Marcos Almeida', '2025-01-01 00:00:00'),
  ('district-sul-1', 'Distrito Sul', 'Pr. Helena Rocha', '2025-01-01 00:00:00')
ON DUPLICATE KEY UPDATE `name` = VALUES(`name`);

INSERT INTO `Church` (`id`, `name`, `districtId`, `directorName`, `createdAt`)
VALUES
  ('church-central-1', 'Igreja Central', 'district-norte-1', 'Daniela Carvalho', '2025-01-02 00:00:00'),
  ('church-esperanca-1', 'Igreja Esperança', 'district-sul-1', 'Ricardo Lima', '2025-01-02 00:00:00')
ON DUPLICATE KEY UPDATE `directorName` = VALUES(`directorName`);

INSERT INTO `Event` (`id`, `title`, `description`, `startDate`, `endDate`, `location`, `priceCents`, `minAgeYears`, `slug`, `paymentMethods`, `pendingPaymentValueRule`, `isFree`, `isActive`)
VALUES
  (
    'event-retiro-2025',
    'Retiro Espiritual 2025',
    'Encontro anual de lideres CATRE.',
    '2025-06-20 18:00:00',
    '2025-06-23 18:00:00',
    'CATRE Ipitinga, MG',
    25000,
    12,
    'retiro-espiritual-2025',
    'PIX_MP',
    'KEEP_ORIGINAL',
    0,
    1
  )
ON DUPLICATE KEY UPDATE `description` = VALUES(`description`);

INSERT INTO `User` (`id`, `name`, `email`, `passwordHash`, `role`, `districtScopeId`, `createdAt`)
VALUES
  ('user-admin-1', 'Admin Geral', 'admin@catre.local', '$2a$10$KQshC6U1WWfvF41ZXXn9HuuebQpszNw2gdGULZsr/6oHSQixYS0ne', 'AdminGeral', NULL, '2025-01-03 00:00:00'),
  ('user-support-1', 'Usuario CATRE', 'thgdsztls@gmail.com', '$2a$10$nPUI0LqcY7AmTYNzvhKY2urlK6105RRn.XF9sY//9cmX8r36X9O8.', 'AdminDistrital', 'district-norte-1', '2025-01-03 00:00:00')
ON DUPLICATE KEY UPDATE `passwordHash` = VALUES(`passwordHash`);

INSERT INTO `EventLot` (`id`, `eventId`, `name`, `priceCents`, `startsAt`, `endsAt`, `createdAt`)
VALUES
  ('eventlot-retiro-prefix', 'event-retiro-2025', 'Lote Promocional', 22000, '2025-03-01 00:00:00', '2025-05-01 00:00:00', '2025-01-04 00:00:00')
ON DUPLICATE KEY UPDATE `priceCents` = VALUES(`priceCents`);

INSERT INTO `Order` (
  `id`, `eventId`, `buyerCpf`, `totalCents`, `status`, `paymentMethod`, `pricingLotId`,
  `externalReference`, `expiresAt`, `paidAt`, `feeCents`, `netAmountCents`, `createdAt`
) VALUES (
  'order-retiro-1',
  'event-retiro-2025',
  '12345678901',
  44000,
  'PAID',
  'PIX_MP',
  'eventlot-retiro-prefix',
  'order-retiro-2025-1',
  '2025-06-01 00:00:00',
  '2025-05-15 12:00:00',
  2500,
  41500,
  '2025-05-10 08:00:00'
) ON DUPLICATE KEY UPDATE `status` = VALUES(`status`), `paidAt` = VALUES(`paidAt`);

INSERT INTO `Registration` (
  `id`, `orderId`, `eventId`, `fullName`, `cpf`, `birthDate`, `ageYears`, `priceCents`,
  `districtId`, `churchId`, `gender`, `paymentMethod`, `status`, `createdAt`
) VALUES (
  'registration-retiro-1',
  'order-retiro-1',
  'event-retiro-2025',
  'Marcos S. Oliveira',
  '12345678901',
  '2003-09-01 00:00:00',
  21,
  22000,
  'district-norte-1',
  'church-central-1',
  'Masculino',
  'PIX_MP',
  'CONFIRMED',
  '2025-05-10 08:05:00'
) ON DUPLICATE KEY UPDATE `status` = VALUES(`status`);
