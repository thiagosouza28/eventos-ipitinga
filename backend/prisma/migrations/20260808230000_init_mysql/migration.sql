-- CreateTable
CREATE TABLE `districts` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `pastor_name` VARCHAR(191) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `districts_name_key`(`name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `churches` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `district_id` VARCHAR(191) NOT NULL,
    `director_name` VARCHAR(191) NULL,
    `director_cpf` VARCHAR(191) NULL,
    `director_birth_date` DATETIME(3) NULL,
    `director_email` VARCHAR(191) NULL,
    `director_whatsapp` VARCHAR(191) NULL,
    `director_photo_url` TEXT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `churches_district_id_idx`(`district_id`),
    UNIQUE INDEX `churches_name_district_id_key`(`name`, `district_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `events` (
    `id` VARCHAR(191) NOT NULL,
    `title` VARCHAR(191) NOT NULL,
    `description` VARCHAR(191) NOT NULL,
    `start_date` DATETIME(3) NOT NULL,
    `end_date` DATETIME(3) NOT NULL,
    `location` VARCHAR(191) NOT NULL,
    `banner_url` VARCHAR(191) NULL,
    `form_config` JSON NULL,
    `notice_enabled` BOOLEAN NOT NULL DEFAULT false,
    `notice_title` VARCHAR(191) NULL,
    `notice_bullets` TEXT NULL,
    `notice_footer_text` VARCHAR(191) NULL,
    `notice_show_once` BOOLEAN NOT NULL DEFAULT true,
    `price_cents` INTEGER NOT NULL DEFAULT 0,
    `min_age_years` INTEGER NULL,
    `is_free` BOOLEAN NOT NULL DEFAULT false,
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `slug` VARCHAR(191) NOT NULL,
    `payment_methods` VARCHAR(191) NOT NULL DEFAULT 'PIX_MP',
    `pending_payment_value_rule` VARCHAR(191) NOT NULL DEFAULT 'KEEP_ORIGINAL',
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `ministry_id` VARCHAR(191) NULL,
    `created_by_id` VARCHAR(191) NULL,
    `district_id` VARCHAR(191) NOT NULL,
    `church_id` VARCHAR(191) NULL,

    UNIQUE INDEX `events_slug_key`(`slug`),
    INDEX `events_ministry_id_idx`(`ministry_id`),
    INDEX `events_created_by_id_idx`(`created_by_id`),
    INDEX `events_district_id_idx`(`district_id`),
    INDEX `events_church_id_idx`(`church_id`),
    INDEX `events_is_active_start_date_idx`(`is_active`, `start_date`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `orders` (
    `id` VARCHAR(191) NOT NULL,
    `event_id` VARCHAR(191) NOT NULL,
    `buyer_cpf` VARCHAR(191) NOT NULL,
    `total_cents` INTEGER NOT NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'PENDING',
    `payment_method` VARCHAR(191) NOT NULL DEFAULT 'PIX_MP',
    `mp_payment_id` VARCHAR(191) NULL,
    `mp_preference_id` VARCHAR(191) NULL,
    `preference_version` INTEGER NOT NULL DEFAULT 0,
    `pricing_lot_id` VARCHAR(191) NULL,
    `external_reference` VARCHAR(191) NOT NULL,
    `expires_at` DATETIME(3) NOT NULL,
    `paid_at` DATETIME(3) NULL,
    `manual_payment_reference` VARCHAR(191) NULL,
    `manual_payment_proof_url` TEXT NULL,
    `fee_cents` INTEGER NOT NULL DEFAULT 0,
    `net_amount_cents` INTEGER NOT NULL DEFAULT 0,
    `origin` ENUM('MARKETPLACE', 'MANUAL') NOT NULL DEFAULT 'MARKETPLACE',
    `responsible_name` VARCHAR(191) NULL,
    `responsible_document` VARCHAR(191) NULL,
    `responsible_email` VARCHAR(191) NULL,
    `responsible_phone` VARCHAR(191) NULL,
    `amount_received_cents` INTEGER NULL,
    `manual_notes` TEXT NULL,
    `confirmed_by_id` VARCHAR(191) NULL,
    `confirmed_at` DATETIME(3) NULL,
    `district_id` VARCHAR(191) NULL,
    `district_admin_id` VARCHAR(191) NULL,
    `responsible_user_id` VARCHAR(191) NULL,
    `amount_to_transfer` INTEGER NOT NULL DEFAULT 0,
    `transfer_status` ENUM('PENDING', 'TRANSFERRED', 'FAILED') NULL,
    `transfer_batch_id` VARCHAR(191) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `orders_external_reference_key`(`external_reference`),
    INDEX `orders_event_id_idx`(`event_id`),
    INDEX `orders_buyer_cpf_idx`(`buyer_cpf`),
    INDEX `orders_status_idx`(`status`),
    INDEX `orders_pricing_lot_id_idx`(`pricing_lot_id`),
    INDEX `orders_origin_idx`(`origin`),
    INDEX `orders_confirmed_by_id_idx`(`confirmed_by_id`),
    INDEX `orders_district_id_idx`(`district_id`),
    INDEX `orders_district_admin_id_idx`(`district_admin_id`),
    INDEX `orders_responsible_user_id_idx`(`responsible_user_id`),
    INDEX `orders_transfer_status_idx`(`transfer_status`),
    INDEX `orders_transfer_batch_id_idx`(`transfer_batch_id`),
    INDEX `orders_buyer_cpf_status_idx`(`buyer_cpf`, `status`),
    INDEX `orders_event_id_buyer_cpf_status_idx`(`event_id`, `buyer_cpf`, `status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `registrations` (
    `id` VARCHAR(191) NOT NULL,
    `order_id` VARCHAR(191) NOT NULL,
    `event_id` VARCHAR(191) NOT NULL,
    `full_name` VARCHAR(191) NOT NULL,
    `cpf` VARCHAR(191) NOT NULL,
    `birth_date` DATETIME(3) NOT NULL,
    `age_years` INTEGER NOT NULL,
    `price_cents` INTEGER NOT NULL DEFAULT 0,
    `district_id` VARCHAR(191) NOT NULL,
    `church_id` VARCHAR(191) NOT NULL,
    `responsible_user_id` VARCHAR(191) NULL,
    `photo_url` TEXT NULL,
    `gender` VARCHAR(191) NULL,
    `form_responses` JSON NULL,
    `payment_method` VARCHAR(191) NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'DRAFT',
    `receipt_pdf_url` VARCHAR(191) NULL,
    `checkin_at` DATETIME(3) NULL,
    `paid_at` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `ministry_id` VARCHAR(191) NULL,

    INDEX `registrations_order_id_idx`(`order_id`),
    INDEX `registrations_event_id_idx`(`event_id`),
    INDEX `registrations_cpf_idx`(`cpf`),
    INDEX `registrations_status_idx`(`status`),
    INDEX `registrations_church_id_idx`(`church_id`),
    INDEX `registrations_district_id_idx`(`district_id`),
    INDEX `registrations_ministry_id_idx`(`ministry_id`),
    INDEX `registrations_responsible_user_id_idx`(`responsible_user_id`),
    INDEX `registrations_event_id_status_created_at_idx`(`event_id`, `status`, `created_at`),
    UNIQUE INDEX `registrations_event_id_cpf_key`(`event_id`, `cpf`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `refunds` (
    `id` VARCHAR(191) NOT NULL,
    `order_id` VARCHAR(191) NOT NULL,
    `registration_id` VARCHAR(191) NOT NULL,
    `amount_cents` INTEGER NOT NULL,
    `mp_refund_id` VARCHAR(191) NOT NULL,
    `reason` VARCHAR(191) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `refunds_order_id_idx`(`order_id`),
    INDEX `refunds_registration_id_idx`(`registration_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `webhook_events` (
    `id` VARCHAR(191) NOT NULL,
    `provider` VARCHAR(191) NOT NULL,
    `event_type` VARCHAR(191) NOT NULL,
    `payload_json` VARCHAR(191) NOT NULL,
    `idempotency_key` VARCHAR(191) NOT NULL,
    `processed_at` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `order_id` VARCHAR(191) NULL,

    UNIQUE INDEX `webhook_events_idempotency_key_key`(`idempotency_key`),
    INDEX `webhook_events_order_id_idx`(`order_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `audit_logs` (
    `id` VARCHAR(191) NOT NULL,
    `actor_user_id` VARCHAR(191) NULL,
    `action` VARCHAR(191) NOT NULL,
    `entity` VARCHAR(191) NOT NULL,
    `entity_id` VARCHAR(191) NOT NULL,
    `metadata_json` TEXT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `audit_logs_actor_user_id_idx`(`actor_user_id`),
    INDEX `audit_logs_entity_entity_id_idx`(`entity`, `entity_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `users` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `email` VARCHAR(191) NOT NULL,
    `password_hash` VARCHAR(191) NULL,
    `role` VARCHAR(191) NOT NULL,
    `district_scope_id` VARCHAR(191) NULL,
    `church_scope_id` VARCHAR(191) NULL,
    `ministry_id` VARCHAR(191) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `cpf` VARCHAR(191) NULL,
    `must_change_password` BOOLEAN NOT NULL DEFAULT false,
    `password_updated_at` DATETIME(3) NULL,
    `phone` VARCHAR(191) NULL,
    `photo_url` TEXT NULL,
    `profile_id` VARCHAR(191) NULL,
    `status` ENUM('ACTIVE', 'INACTIVE') NOT NULL DEFAULT 'ACTIVE',
    `pix_type` ENUM('CPF', 'CNPJ', 'EMAIL', 'PHONE', 'EVP', 'RANDOM') NULL,
    `pix_key` VARCHAR(191) NULL,
    `pix_owner_name` VARCHAR(191) NULL,
    `pix_owner_document` VARCHAR(191) NULL,
    `pix_bank_name` VARCHAR(191) NULL,
    `pix_status` ENUM('VALIDATED', 'PENDING') NULL DEFAULT 'PENDING',

    UNIQUE INDEX `users_email_key`(`email`),
    UNIQUE INDEX `users_cpf_key`(`cpf`),
    INDEX `users_profile_id_idx`(`profile_id`),
    INDEX `users_church_scope_id_idx`(`church_scope_id`),
    INDEX `users_district_scope_id_idx`(`district_scope_id`),
    INDEX `users_ministry_id_idx`(`ministry_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `system_configs` (
    `id` VARCHAR(191) NOT NULL,
    `settings` JSON NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,
    `updated_by_id` VARCHAR(191) NULL,

    INDEX `system_configs_updated_by_id_idx`(`updated_by_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `event_lots` (
    `id` VARCHAR(191) NOT NULL,
    `event_id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `price_cents` INTEGER NOT NULL,
    `type` ENUM('PADRAO', 'PROMOCIONAL') NOT NULL DEFAULT 'PADRAO',
    `status` ENUM('ATIVO', 'INATIVO', 'ENCERRADO') NOT NULL DEFAULT 'INATIVO',
    `starts_at` DATETIME(3) NOT NULL,
    `ends_at` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `event_lots_event_id_idx`(`event_id`),
    UNIQUE INDEX `event_lots_event_id_name_key`(`event_id`, `name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `expenses` (
    `id` VARCHAR(191) NOT NULL,
    `event_id` VARCHAR(191) NOT NULL,
    `description` VARCHAR(191) NOT NULL,
    `date` DATETIME(3) NOT NULL,
    `amount_cents` INTEGER NOT NULL,
    `made_by` VARCHAR(191) NOT NULL,
    `items` VARCHAR(191) NULL,
    `receipt_url` VARCHAR(191) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `expenses_event_id_idx`(`event_id`),
    INDEX `expenses_date_idx`(`date`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ministries` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `description` VARCHAR(191) NULL,
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `ministries_name_key`(`name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ministry_users` (
    `user_id` VARCHAR(191) NOT NULL,
    `ministry_id` VARCHAR(191) NOT NULL,
    `assigned_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `ministry_users_ministry_id_idx`(`ministry_id`),
    PRIMARY KEY (`user_id`, `ministry_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `profiles` (
    `id` VARCHAR(191) NOT NULL,
    `user_id` VARCHAR(191) NOT NULL,
    `nome` VARCHAR(191) NOT NULL,
    `avatar_url` VARCHAR(191) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `profile_permissions` (
    `id` VARCHAR(191) NOT NULL,
    `profile_id` VARCHAR(191) NOT NULL,
    `module` VARCHAR(191) NOT NULL,
    `can_view` BOOLEAN NOT NULL DEFAULT false,
    `can_create` BOOLEAN NOT NULL DEFAULT false,
    `can_edit` BOOLEAN NOT NULL DEFAULT false,
    `can_delete` BOOLEAN NOT NULL DEFAULT false,
    `can_approve` BOOLEAN NOT NULL DEFAULT false,
    `can_deactivate` BOOLEAN NOT NULL DEFAULT false,
    `can_report` BOOLEAN NOT NULL DEFAULT false,
    `can_financial` BOOLEAN NOT NULL DEFAULT false,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `profile_permissions_profile_id_idx`(`profile_id`),
    UNIQUE INDEX `profile_permissions_profile_id_module_key`(`profile_id`, `module`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `user_permissions` (
    `id` VARCHAR(191) NOT NULL,
    `user_id` VARCHAR(191) NOT NULL,
    `module` VARCHAR(191) NOT NULL,
    `can_view` BOOLEAN NOT NULL DEFAULT false,
    `can_create` BOOLEAN NOT NULL DEFAULT false,
    `can_edit` BOOLEAN NOT NULL DEFAULT false,
    `can_delete` BOOLEAN NOT NULL DEFAULT false,
    `can_approve` BOOLEAN NOT NULL DEFAULT false,
    `can_deactivate` BOOLEAN NOT NULL DEFAULT false,
    `can_report` BOOLEAN NOT NULL DEFAULT false,
    `can_financial` BOOLEAN NOT NULL DEFAULT false,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `user_permissions_user_id_idx`(`user_id`),
    UNIQUE INDEX `user_permissions_user_id_module_key`(`user_id`, `module`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `order_items` (
    `id` VARCHAR(191) NOT NULL,
    `order_id` VARCHAR(191) NOT NULL,
    `registration_id` VARCHAR(191) NOT NULL,
    `amount_cents` INTEGER NOT NULL,
    `status` ENUM('PENDING', 'CONFIRMED', 'CANCELED') NOT NULL DEFAULT 'PENDING',
    `notes` TEXT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,
    `confirmed_by_id` VARCHAR(191) NULL,

    INDEX `order_items_registration_id_idx`(`registration_id`),
    INDEX `order_items_confirmed_by_id_idx`(`confirmed_by_id`),
    UNIQUE INDEX `order_items_order_id_registration_id_key`(`order_id`, `registration_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `service_orders` (
    `id` VARCHAR(191) NOT NULL,
    `order_id` VARCHAR(191) NOT NULL,
    `number` INTEGER NOT NULL,
    `total_cents` INTEGER NOT NULL,
    `proof_url` TEXT NULL,
    `pdf_url` TEXT NULL,
    `notes` TEXT NULL,
    `metadata` JSON NULL,
    `issued_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `issued_by_id` VARCHAR(191) NULL,

    INDEX `service_orders_order_id_idx`(`order_id`),
    INDEX `service_orders_issued_by_id_idx`(`issued_by_id`),
    UNIQUE INDEX `service_orders_order_id_number_key`(`order_id`, `number`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `transfers` (
    `id` VARCHAR(191) NOT NULL,
    `district_id` VARCHAR(191) NULL,
    `district_admin_id` VARCHAR(191) NULL,
    `responsible_user_id` VARCHAR(191) NULL,
    `amount` INTEGER NOT NULL,
    `pix_type` ENUM('CPF', 'CNPJ', 'EMAIL', 'PHONE', 'EVP', 'RANDOM') NULL,
    `pix_key` VARCHAR(191) NULL,
    `pix_owner_name` VARCHAR(191) NULL,
    `pix_owner_document` VARCHAR(191) NULL,
    `pix_bank_name` VARCHAR(191) NULL,
    `order_ids` JSON NOT NULL,
    `mp_transfer_id` VARCHAR(191) NULL,
    `status` ENUM('PENDING', 'SUCCESS', 'FAILED') NOT NULL DEFAULT 'PENDING',
    `error_message` VARCHAR(191) NULL,
    `created_by_id` VARCHAR(191) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `transfers_district_id_idx`(`district_id`),
    INDEX `transfers_district_admin_id_idx`(`district_admin_id`),
    INDEX `transfers_responsible_user_id_idx`(`responsible_user_id`),
    INDEX `transfers_status_idx`(`status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `pix_gateway_configs` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `provider` VARCHAR(191) NOT NULL,
    `client_id` VARCHAR(191) NULL,
    `client_secret` VARCHAR(191) NULL,
    `api_key` VARCHAR(191) NULL,
    `webhook_url` VARCHAR(191) NULL,
    `certificate_path` VARCHAR(191) NULL,
    `active` BOOLEAN NOT NULL DEFAULT true,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `churches` ADD CONSTRAINT `churches_district_id_fkey` FOREIGN KEY (`district_id`) REFERENCES `districts`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `events` ADD CONSTRAINT `events_created_by_id_fkey` FOREIGN KEY (`created_by_id`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `events` ADD CONSTRAINT `events_ministry_id_fkey` FOREIGN KEY (`ministry_id`) REFERENCES `ministries`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `events` ADD CONSTRAINT `events_district_id_fkey` FOREIGN KEY (`district_id`) REFERENCES `districts`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `events` ADD CONSTRAINT `events_church_id_fkey` FOREIGN KEY (`church_id`) REFERENCES `churches`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `orders` ADD CONSTRAINT `orders_event_id_fkey` FOREIGN KEY (`event_id`) REFERENCES `events`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `orders` ADD CONSTRAINT `orders_pricing_lot_id_fkey` FOREIGN KEY (`pricing_lot_id`) REFERENCES `event_lots`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `orders` ADD CONSTRAINT `orders_confirmed_by_id_fkey` FOREIGN KEY (`confirmed_by_id`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `orders` ADD CONSTRAINT `orders_district_id_fkey` FOREIGN KEY (`district_id`) REFERENCES `districts`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `orders` ADD CONSTRAINT `orders_district_admin_id_fkey` FOREIGN KEY (`district_admin_id`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `orders` ADD CONSTRAINT `orders_responsible_user_id_fkey` FOREIGN KEY (`responsible_user_id`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `orders` ADD CONSTRAINT `orders_transfer_batch_id_fkey` FOREIGN KEY (`transfer_batch_id`) REFERENCES `transfers`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `registrations` ADD CONSTRAINT `registrations_church_id_fkey` FOREIGN KEY (`church_id`) REFERENCES `churches`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `registrations` ADD CONSTRAINT `registrations_district_id_fkey` FOREIGN KEY (`district_id`) REFERENCES `districts`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `registrations` ADD CONSTRAINT `registrations_event_id_fkey` FOREIGN KEY (`event_id`) REFERENCES `events`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `registrations` ADD CONSTRAINT `registrations_ministry_id_fkey` FOREIGN KEY (`ministry_id`) REFERENCES `ministries`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `registrations` ADD CONSTRAINT `registrations_order_id_fkey` FOREIGN KEY (`order_id`) REFERENCES `orders`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `registrations` ADD CONSTRAINT `registrations_responsible_user_id_fkey` FOREIGN KEY (`responsible_user_id`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `refunds` ADD CONSTRAINT `refunds_order_id_fkey` FOREIGN KEY (`order_id`) REFERENCES `orders`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `refunds` ADD CONSTRAINT `refunds_registration_id_fkey` FOREIGN KEY (`registration_id`) REFERENCES `registrations`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `webhook_events` ADD CONSTRAINT `webhook_events_order_id_fkey` FOREIGN KEY (`order_id`) REFERENCES `orders`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `audit_logs` ADD CONSTRAINT `audit_logs_actor_user_id_fkey` FOREIGN KEY (`actor_user_id`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `users` ADD CONSTRAINT `users_church_scope_id_fkey` FOREIGN KEY (`church_scope_id`) REFERENCES `churches`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `users` ADD CONSTRAINT `users_district_scope_id_fkey` FOREIGN KEY (`district_scope_id`) REFERENCES `districts`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `users` ADD CONSTRAINT `users_ministry_id_fkey` FOREIGN KEY (`ministry_id`) REFERENCES `ministries`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `users` ADD CONSTRAINT `users_profile_id_fkey` FOREIGN KEY (`profile_id`) REFERENCES `profiles`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `system_configs` ADD CONSTRAINT `system_configs_updated_by_id_fkey` FOREIGN KEY (`updated_by_id`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `event_lots` ADD CONSTRAINT `event_lots_event_id_fkey` FOREIGN KEY (`event_id`) REFERENCES `events`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `expenses` ADD CONSTRAINT `expenses_event_id_fkey` FOREIGN KEY (`event_id`) REFERENCES `events`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ministry_users` ADD CONSTRAINT `ministry_users_ministry_id_fkey` FOREIGN KEY (`ministry_id`) REFERENCES `ministries`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ministry_users` ADD CONSTRAINT `ministry_users_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `profile_permissions` ADD CONSTRAINT `profile_permissions_profile_id_fkey` FOREIGN KEY (`profile_id`) REFERENCES `profiles`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `user_permissions` ADD CONSTRAINT `user_permissions_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `order_items` ADD CONSTRAINT `order_items_order_id_fkey` FOREIGN KEY (`order_id`) REFERENCES `orders`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `order_items` ADD CONSTRAINT `order_items_registration_id_fkey` FOREIGN KEY (`registration_id`) REFERENCES `registrations`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `order_items` ADD CONSTRAINT `order_items_confirmed_by_id_fkey` FOREIGN KEY (`confirmed_by_id`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `service_orders` ADD CONSTRAINT `service_orders_order_id_fkey` FOREIGN KEY (`order_id`) REFERENCES `orders`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `service_orders` ADD CONSTRAINT `service_orders_issued_by_id_fkey` FOREIGN KEY (`issued_by_id`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `transfers` ADD CONSTRAINT `transfers_district_id_fkey` FOREIGN KEY (`district_id`) REFERENCES `districts`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `transfers` ADD CONSTRAINT `transfers_district_admin_id_fkey` FOREIGN KEY (`district_admin_id`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `transfers` ADD CONSTRAINT `transfers_responsible_user_id_fkey` FOREIGN KEY (`responsible_user_id`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `transfers` ADD CONSTRAINT `transfers_created_by_id_fkey` FOREIGN KEY (`created_by_id`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
