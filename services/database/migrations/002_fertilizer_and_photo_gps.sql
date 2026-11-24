-- Columns the app needs that carboncrops_DB_last04112569.sql doesn't have yet:
--   activities.fertilizer_*       farmers record fertilizer as formula + kg per rai
--   activity_evidence.lat/long    GPS where the planting/harvest photo was taken (verifier evidence)
--
-- Runs after the schema and carboncrops_mock_data_v4.sql (see docker-compose.yml).
-- On an existing database, run it once by hand:
--   docker compose exec -T db mysql -ucarboncrops -pcarboncrops carboncrops < services/database/migrations/002_fertilizer_and_photo_gps.sql

ALTER TABLE `activities`
  ADD COLUMN `fertilizer_formula` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL AFTER `note`,
  ADD COLUMN `fertilizer_kg_per_rai` decimal(6,2) DEFAULT NULL AFTER `fertilizer_formula`;

ALTER TABLE `activity_evidence`
  ADD COLUMN `latitude` decimal(9,6) DEFAULT NULL AFTER `captured_at`,
  ADD COLUMN `longitude` decimal(9,6) DEFAULT NULL AFTER `latitude`;
