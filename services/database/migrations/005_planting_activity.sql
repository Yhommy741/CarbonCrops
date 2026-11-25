-- The crop start is recorded as one 'planting' activity (with the planting-day photo).
-- Farmers don't choose sowing or transplanting any more: the IPCC Tier 1 CH4 method the
-- app uses (services/api/app/services/ghg.py) doesn't depend on it, nor on the rice
-- variety. Older 'sowing' / 'transplanting' rows stay as they are.
--
-- Runs after the schema and the earlier migrations (see docker-compose.yml).
-- On an existing database, run it once by hand:
--   docker compose exec -T db mysql -ucarboncrops -pcarboncrops carboncrops < services/database/migrations/005_planting_activity.sql

ALTER TABLE `activities`
  MODIFY `activity_type` enum('land_prep','planting','sowing','transplanting','fertilizing','drain','flood','pesticide','harvest','other')
    COLLATE utf8mb4_unicode_ci NOT NULL;
