-- Fertilizer amount on 'fertilizing' activities (farmers enter it in kg per rai).
-- Runs after carboncrops_DB.sql. On an existing database, run it once by hand:
--   docker compose exec -T db mysql -ucarboncrops -pcarboncrops carboncrops < services/database/migrations/002_activity_fertilizer.sql

ALTER TABLE `activities`
  ADD COLUMN `fertilizer_formula` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL AFTER `note`,
  ADD COLUMN `fertilizer_kg_per_rai` decimal(6,2) DEFAULT NULL AFTER `fertilizer_formula`;

-- Sample data: the one fertilizing row already says "16-20-0 จำนวน 25 กก./ไร่" in its note
UPDATE `activities`
SET `fertilizer_formula` = '16-20-0', `fertilizer_kg_per_rai` = 25.00
WHERE `activity_id` = '60000000-0000-4000-8000-000000000003';
