-- Add notice fields to Event (non-JSON storage).
ALTER TABLE `Event`
  ADD COLUMN `noticeEnabled` BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN `noticeTitle` VARCHAR(191) NULL,
  ADD COLUMN `noticeBullets` LONGTEXT NULL,
  ADD COLUMN `noticeFooterText` VARCHAR(191) NULL,
  ADD COLUMN `noticeShowOnce` BOOLEAN NOT NULL DEFAULT true;

-- Migrate existing noticeJson values if present (best-effort).
UPDATE `Event`
SET
  noticeEnabled = IF(JSON_EXTRACT(`noticeJson`, '$.enabled') = true, 1, 0),
  noticeTitle = JSON_UNQUOTE(JSON_EXTRACT(`noticeJson`, '$.title')),
  noticeFooterText = JSON_UNQUOTE(JSON_EXTRACT(`noticeJson`, '$.footerText')),
  noticeShowOnce = IF(JSON_EXTRACT(`noticeJson`, '$.showOnce') = false, 0, 1),
  noticeBullets = CASE
    WHEN JSON_TYPE(JSON_EXTRACT(`noticeJson`, '$.bullets')) = 'ARRAY' THEN
      REPLACE(
        REPLACE(
          REPLACE(JSON_UNQUOTE(JSON_EXTRACT(`noticeJson`, '$.bullets')), '","', '\n'),
          '["',
          ''
        ),
        '"]',
        ''
      )
    WHEN JSON_TYPE(JSON_EXTRACT(`noticeJson`, '$.bullets')) = 'STRING' THEN
      JSON_UNQUOTE(JSON_EXTRACT(`noticeJson`, '$.bullets'))
    ELSE NULL
  END
WHERE `noticeJson` IS NOT NULL;

-- Drop JSON column.
ALTER TABLE `Event` DROP COLUMN `noticeJson`;
