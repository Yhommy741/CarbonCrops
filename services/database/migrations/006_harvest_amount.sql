-- The farmer enters how much rice was harvested (total kg for the paddy) when recording
-- the harvest; the API works out the yield per rai from the paddy's area.
--
-- Runs after the schema and the earlier migrations (see docker-compose.yml).
-- On an existing database, run it once by hand:
--   docker compose exec -T db mysql -ucarboncrops -pcarboncrops carboncrops < services/database/migrations/006_harvest_amount.sql

ALTER TABLE `farming_calendars`
  ADD COLUMN `harvest_kg` decimal(10,1) DEFAULT NULL AFTER `harvest_date`,
  ADD CONSTRAINT `chk_cal_harvest_kg` CHECK ((`harvest_kg` IS NULL) OR (`harvest_kg` > 0));
