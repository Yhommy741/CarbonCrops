-- The project no longer uses satellite images (NDVI/NDWI): water levels come only from
-- the paddy's sensor node. Drops the table carboncrops_DB_last04112569.sql still creates.
--
-- Runs after the schema and 002 (see docker-compose.yml).
-- On an existing database, run it once by hand (this deletes any satellite rows):
--   docker compose exec -T db mysql -ucarboncrops -pcarboncrops carboncrops < services/database/migrations/003_drop_satellite_images.sql

DROP TABLE IF EXISTS `satellite_images`;
