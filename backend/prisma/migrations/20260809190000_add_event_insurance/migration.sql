-- Configuração do seguro por evento.
ALTER TABLE `events`
  ADD COLUMN `insurance_enabled` BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN `insurance_required` BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN `insurance_daily_cents` INTEGER NOT NULL DEFAULT 0;

-- Fotografia da contratação por participante.
ALTER TABLE `registrations`
  ADD COLUMN `insurance_selected` BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN `insurance_daily_cents` INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN `insurance_days` INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN `insurance_amount_cents` INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN `insurance_waiver_accepted` BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN `insurance_waiver_accepted_at` DATETIME(3) NULL;

CREATE INDEX `registrations_event_id_insurance_selected_idx`
  ON `registrations`(`event_id`, `insurance_selected`);
