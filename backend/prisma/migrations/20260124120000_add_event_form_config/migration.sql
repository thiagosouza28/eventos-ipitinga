-- Add dynamic form configuration to Event and responses to Registration.
ALTER TABLE `Event`
  ADD COLUMN `formConfig` JSON NULL;

ALTER TABLE `Registration`
  ADD COLUMN `formResponses` JSON NULL;
