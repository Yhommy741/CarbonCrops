-- A sensor node is reused season after season: after a harvest the farmer adds a new
-- paddy with the same sensor ID. So each reading keeps the paddy the sensor was in when
-- it was recorded (sensor_readings.paddy_id), and a sensor can be unlinked (devices.paddy_id
-- NULL, e.g. after its paddy is deleted). Deleting a paddy deletes its readings.
--
-- Runs after the schema, 002 and 003 (see docker-compose.yml).
-- On an existing database, run it once by hand:
--   docker compose exec -T db mysql -ucarboncrops -pcarboncrops carboncrops < services/database/migrations/004_readings_paddy.sql

ALTER TABLE `sensor_readings`
  ADD COLUMN `paddy_id` char(36) COLLATE utf8mb4_unicode_ci DEFAULT NULL AFTER `device_id`,
  ADD KEY `idx_read_paddy_time` (`paddy_id`, `recorded_at`);

-- Readings so far belong to the paddy their sensor is linked to now
UPDATE `sensor_readings` sr JOIN `devices` d ON d.device_id = sr.device_id
SET sr.paddy_id = d.paddy_id;

ALTER TABLE `sensor_readings`
  ADD CONSTRAINT `fk_read_paddy` FOREIGN KEY (`paddy_id`) REFERENCES `paddy` (`paddy_id`) ON DELETE CASCADE;

-- A sensor whose paddy is deleted stays registered but unlinked, ready for a new paddy
ALTER TABLE `devices` DROP FOREIGN KEY `fk_dev_paddy`;
ALTER TABLE `devices`
  MODIFY `paddy_id` char(36) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  ADD CONSTRAINT `fk_dev_paddy` FOREIGN KEY (`paddy_id`) REFERENCES `paddy` (`paddy_id`) ON DELETE SET NULL;
