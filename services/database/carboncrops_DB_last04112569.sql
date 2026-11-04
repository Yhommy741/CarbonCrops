-- MySQL dump 10.13  Distrib 8.0.46, for Win64 (x86_64)
--
-- Host: localhost    Database: carboncrops
-- ------------------------------------------------------
-- Server version	8.0.46

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!50503 SET NAMES utf8 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Table structure for table `activities`
--

DROP TABLE IF EXISTS `activities`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `activities` (
  `activity_id` char(36) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT (uuid()),
  `calendar_id` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `stage_no` tinyint unsigned NOT NULL,
  `activity_type` enum('land_prep','sowing','transplanting','fertilizing','drain','flood','pesticide','harvest','other') COLLATE utf8mb4_unicode_ci NOT NULL,
  `activity_date` date NOT NULL,
  `note` text COLLATE utf8mb4_unicode_ci,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`activity_id`),
  KEY `idx_act_cal_date` (`calendar_id`,`activity_date`),
  KEY `fk_act_stage` (`stage_no`),
  CONSTRAINT `fk_act_calendar` FOREIGN KEY (`calendar_id`) REFERENCES `farming_calendars` (`calendar_id`) ON DELETE CASCADE,
  CONSTRAINT `fk_act_stage` FOREIGN KEY (`stage_no`) REFERENCES `rice_stages` (`stage_no`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `activities`
--

LOCK TABLES `activities` WRITE;
/*!40000 ALTER TABLE `activities` DISABLE KEYS */;
/*!40000 ALTER TABLE `activities` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `activity_evidence`
--

DROP TABLE IF EXISTS `activity_evidence`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `activity_evidence` (
  `evidence_id` char(36) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT (uuid()),
  `activity_id` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `file_path` varchar(500) COLLATE utf8mb4_unicode_ci NOT NULL,
  `file_type` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `captured_at` datetime DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`evidence_id`),
  KEY `idx_evi_activity` (`activity_id`),
  CONSTRAINT `fk_evi_activity` FOREIGN KEY (`activity_id`) REFERENCES `activities` (`activity_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `activity_evidence`
--

LOCK TABLES `activity_evidence` WRITE;
/*!40000 ALTER TABLE `activity_evidence` DISABLE KEYS */;
/*!40000 ALTER TABLE `activity_evidence` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `auth_identities`
--

DROP TABLE IF EXISTS `auth_identities`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `auth_identities` (
  `auth_id` char(36) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT (uuid()),
  `user_id` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `provider` enum('line') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'line',
  `provider_user_id` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `line_display_name` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `picture_url` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `last_login_at` datetime DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`auth_id`),
  UNIQUE KEY `uq_provider_user` (`provider`,`provider_user_id`),
  KEY `idx_auth_user` (`user_id`),
  CONSTRAINT `fk_auth_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `auth_identities`
--

LOCK TABLES `auth_identities` WRITE;
/*!40000 ALTER TABLE `auth_identities` DISABLE KEYS */;
/*!40000 ALTER TABLE `auth_identities` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `carboncredit_info`
--

DROP TABLE IF EXISTS `carboncredit_info`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `carboncredit_info` (
  `credit_id` char(36) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT (uuid()),
  `calendar_id` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `paddy_id` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `credit_tco2e` decimal(12,4) NOT NULL,
  `credit_status` enum('not_checked','passed','failed') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'not_checked',
  `amount_thb` decimal(12,2) DEFAULT NULL,
  `submitted_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `verified_by` char(36) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `verified_at` datetime DEFAULT NULL,
  `verify_comment` text COLLATE utf8mb4_unicode_ci,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`credit_id`),
  UNIQUE KEY `uq_credit_calendar` (`calendar_id`),
  KEY `idx_credit_paddy` (`paddy_id`),
  KEY `idx_credit_status` (`credit_status`),
  KEY `fk_credit_calendar` (`calendar_id`,`paddy_id`),
  KEY `fk_credit_verifier` (`verified_by`),
  CONSTRAINT `fk_credit_calendar` FOREIGN KEY (`calendar_id`, `paddy_id`) REFERENCES `farming_calendars` (`calendar_id`, `paddy_id`),
  CONSTRAINT `fk_credit_verifier` FOREIGN KEY (`verified_by`) REFERENCES `users` (`user_id`),
  CONSTRAINT `chk_credit_amount` CHECK (((`amount_thb` is null) or ((`amount_thb` >= 0) and (`credit_status` = _utf8mb4'passed')))),
  CONSTRAINT `chk_credit_decided` CHECK (((`credit_status` = _utf8mb4'not_checked') or (`verified_at` is not null))),
  CONSTRAINT `chk_credit_nonneg` CHECK ((`credit_tco2e` >= 0))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `carboncredit_info`
--

LOCK TABLES `carboncredit_info` WRITE;
/*!40000 ALTER TABLE `carboncredit_info` DISABLE KEYS */;
/*!40000 ALTER TABLE `carboncredit_info` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `devices`
--

DROP TABLE IF EXISTS `devices`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `devices` (
  `device_id` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL,
  `paddy_id` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `battery_pct` tinyint unsigned DEFAULT NULL,
  `installed_at` date NOT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`device_id`),
  KEY `idx_dev_paddy` (`paddy_id`),
  CONSTRAINT `fk_dev_paddy` FOREIGN KEY (`paddy_id`) REFERENCES `paddy` (`paddy_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `devices`
--

LOCK TABLES `devices` WRITE;
/*!40000 ALTER TABLE `devices` DISABLE KEYS */;
/*!40000 ALTER TABLE `devices` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `farming_calendars`
--

DROP TABLE IF EXISTS `farming_calendars`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `farming_calendars` (
  `calendar_id` char(36) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT (uuid()),
  `paddy_id` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `rice_variety` varchar(60) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `planting_date` date NOT NULL,
  `harvest_date` date DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`calendar_id`),
  UNIQUE KEY `uq_calendar_paddy` (`calendar_id`,`paddy_id`),
  KEY `idx_cal_paddy_date` (`paddy_id`,`planting_date`),
  CONSTRAINT `fk_cal_paddy` FOREIGN KEY (`paddy_id`) REFERENCES `paddy` (`paddy_id`) ON DELETE CASCADE,
  CONSTRAINT `chk_cal_dates` CHECK (((`harvest_date` is null) or (`harvest_date` >= `planting_date`)))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `farming_calendars`
--

LOCK TABLES `farming_calendars` WRITE;
/*!40000 ALTER TABLE `farming_calendars` DISABLE KEYS */;
/*!40000 ALTER TABLE `farming_calendars` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `notifications`
--

DROP TABLE IF EXISTS `notifications`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `notifications` (
  `notification_id` char(36) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT (uuid()),
  `user_id` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `channel` enum('line') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'line',
  `notif_type` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `message` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `status` enum('pending','sent','failed') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'pending',
  `sent_at` datetime DEFAULT NULL,
  `error_message` text COLLATE utf8mb4_unicode_ci,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`notification_id`),
  KEY `idx_notif_user_status` (`user_id`,`status`),
  CONSTRAINT `fk_notif_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `notifications`
--

LOCK TABLES `notifications` WRITE;
/*!40000 ALTER TABLE `notifications` DISABLE KEYS */;
/*!40000 ALTER TABLE `notifications` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `paddy`
--

DROP TABLE IF EXISTS `paddy`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `paddy` (
  `paddy_id` char(36) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT (uuid()),
  `owner_user_id` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `paddy_name` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `latitude` decimal(9,6) DEFAULT NULL,
  `longitude` decimal(9,6) DEFAULT NULL,
  `area_rai` decimal(10,2) NOT NULL,
  `province` varchar(60) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `district` varchar(60) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `subdistrict` varchar(60) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `land_doc_no` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`paddy_id`),
  KEY `idx_paddy_owner` (`owner_user_id`),
  CONSTRAINT `fk_paddy_owner` FOREIGN KEY (`owner_user_id`) REFERENCES `users` (`user_id`),
  CONSTRAINT `chk_paddy_area` CHECK ((`area_rai` > 0))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `paddy`
--

LOCK TABLES `paddy` WRITE;
/*!40000 ALTER TABLE `paddy` DISABLE KEYS */;
/*!40000 ALTER TABLE `paddy` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `rice_stages`
--

DROP TABLE IF EXISTS `rice_stages`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `rice_stages` (
  `stage_no` tinyint unsigned NOT NULL,
  `stage_name` varchar(60) COLLATE utf8mb4_unicode_ci NOT NULL,
  `start_day` smallint NOT NULL,
  `end_day` smallint NOT NULL,
  PRIMARY KEY (`stage_no`),
  CONSTRAINT `chk_stage_no` CHECK ((`stage_no` between 1 and 6)),
  CONSTRAINT `chk_stage_range` CHECK ((`end_day` >= `start_day`))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `rice_stages`
--

LOCK TABLES `rice_stages` WRITE;
/*!40000 ALTER TABLE `rice_stages` DISABLE KEYS */;
/*!40000 ALTER TABLE `rice_stages` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `satellite_images`
--

DROP TABLE IF EXISTS `satellite_images`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `satellite_images` (
  `image_id` char(36) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT (uuid()),
  `paddy_id` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `captured_at` date NOT NULL,
  `source` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT 'Sentinel-2',
  `file_path` varchar(500) COLLATE utf8mb4_unicode_ci NOT NULL,
  `cloud_cover_pct` tinyint unsigned DEFAULT NULL,
  `ndvi_value` decimal(4,3) DEFAULT NULL,
  `ndwi_value` decimal(4,3) DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`image_id`),
  KEY `idx_sat_paddy_date` (`paddy_id`,`captured_at`),
  CONSTRAINT `fk_sat_paddy` FOREIGN KEY (`paddy_id`) REFERENCES `paddy` (`paddy_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `satellite_images`
--

LOCK TABLES `satellite_images` WRITE;
/*!40000 ALTER TABLE `satellite_images` DISABLE KEYS */;
/*!40000 ALTER TABLE `satellite_images` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `sensor_readings`
--

DROP TABLE IF EXISTS `sensor_readings`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `sensor_readings` (
  `reading_id` bigint NOT NULL AUTO_INCREMENT,
  `device_id` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL,
  `recorded_at` datetime NOT NULL,
  `water_level_cm` decimal(5,1) DEFAULT NULL,
  PRIMARY KEY (`reading_id`),
  UNIQUE KEY `uq_device_time` (`device_id`,`recorded_at`),
  CONSTRAINT `fk_read_device` FOREIGN KEY (`device_id`) REFERENCES `devices` (`device_id`)
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `sensor_readings`
--

LOCK TABLES `sensor_readings` WRITE;
/*!40000 ALTER TABLE `sensor_readings` DISABLE KEYS */;
/*!40000 ALTER TABLE `sensor_readings` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `users`
--

DROP TABLE IF EXISTS `users`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `users` (
  `user_id` char(36) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT (uuid()),
  `display_name` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `phone` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `role` enum('farmer','verifier','admin') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'farmer',
  `address` text COLLATE utf8mb4_unicode_ci,
  `province` varchar(60) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `district` varchar(60) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`user_id`),
  KEY `idx_users_role` (`role`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `users`
--

LOCK TABLES `users` WRITE;
/*!40000 ALTER TABLE `users` DISABLE KEYS */;
/*!40000 ALTER TABLE `users` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Temporary view structure for view `v_calendar_current_stage`
--

DROP TABLE IF EXISTS `v_calendar_current_stage`;
/*!50001 DROP VIEW IF EXISTS `v_calendar_current_stage`*/;
SET @saved_cs_client     = @@character_set_client;
/*!50503 SET character_set_client = utf8mb4 */;
/*!50001 CREATE VIEW `v_calendar_current_stage` AS SELECT 
 1 AS `calendar_id`,
 1 AS `paddy_id`,
 1 AS `paddy_name`,
 1 AS `day_no`,
 1 AS `stage_no`,
 1 AS `stage_name`*/;
SET character_set_client = @saved_cs_client;

--
-- Temporary view structure for view `v_calendar_stages`
--

DROP TABLE IF EXISTS `v_calendar_stages`;
/*!50001 DROP VIEW IF EXISTS `v_calendar_stages`*/;
SET @saved_cs_client     = @@character_set_client;
/*!50503 SET character_set_client = utf8mb4 */;
/*!50001 CREATE VIEW `v_calendar_stages` AS SELECT 
 1 AS `calendar_id`,
 1 AS `paddy_id`,
 1 AS `stage_no`,
 1 AS `stage_name`,
 1 AS `start_date`,
 1 AS `end_date`*/;
SET character_set_client = @saved_cs_client;

--
-- Temporary view structure for view `v_carboncredit_summary`
--

DROP TABLE IF EXISTS `v_carboncredit_summary`;
/*!50001 DROP VIEW IF EXISTS `v_carboncredit_summary`*/;
SET @saved_cs_client     = @@character_set_client;
/*!50503 SET character_set_client = utf8mb4 */;
/*!50001 CREATE VIEW `v_carboncredit_summary` AS SELECT 
 1 AS `credit_id`,
 1 AS `paddy_id`,
 1 AS `paddy_name`,
 1 AS `owner_user_id`,
 1 AS `owner_name`,
 1 AS `calendar_id`,
 1 AS `planting_date`,
 1 AS `harvest_date`,
 1 AS `credit_tco2e`,
 1 AS `credit_status`,
 1 AS `credit_status_th`,
 1 AS `amount_thb`,
 1 AS `submitted_at`,
 1 AS `verified_at`*/;
SET character_set_client = @saved_cs_client;

--
-- Temporary view structure for view `v_device_latest`
--

DROP TABLE IF EXISTS `v_device_latest`;
/*!50001 DROP VIEW IF EXISTS `v_device_latest`*/;
SET @saved_cs_client     = @@character_set_client;
/*!50503 SET character_set_client = utf8mb4 */;
/*!50001 CREATE VIEW `v_device_latest` AS SELECT 
 1 AS `device_id`,
 1 AS `paddy_id`,
 1 AS `battery_pct`,
 1 AS `last_recorded_at`,
 1 AS `water_level_cm`*/;
SET character_set_client = @saved_cs_client;

--
-- Final view structure for view `v_calendar_current_stage`
--

/*!50001 DROP VIEW IF EXISTS `v_calendar_current_stage`*/;
/*!50001 SET @saved_cs_client          = @@character_set_client */;
/*!50001 SET @saved_cs_results         = @@character_set_results */;
/*!50001 SET @saved_col_connection     = @@collation_connection */;
/*!50001 SET character_set_client      = utf8mb4 */;
/*!50001 SET character_set_results     = utf8mb4 */;
/*!50001 SET collation_connection      = utf8mb4_0900_ai_ci */;
/*!50001 CREATE ALGORITHM=UNDEFINED */
/*!50013 DEFINER=`root`@`localhost` SQL SECURITY DEFINER */
/*!50001 VIEW `v_calendar_current_stage` AS select `c`.`calendar_id` AS `calendar_id`,`c`.`paddy_id` AS `paddy_id`,`p`.`paddy_name` AS `paddy_name`,(to_days(curdate()) - to_days(`c`.`planting_date`)) AS `day_no`,`s`.`stage_no` AS `stage_no`,`s`.`stage_name` AS `stage_name` from ((`farming_calendars` `c` join `paddy` `p` on((`p`.`paddy_id` = `c`.`paddy_id`))) left join `rice_stages` `s` on(((to_days(curdate()) - to_days(`c`.`planting_date`)) between `s`.`start_day` and `s`.`end_day`))) where (`c`.`harvest_date` is null) */;
/*!50001 SET character_set_client      = @saved_cs_client */;
/*!50001 SET character_set_results     = @saved_cs_results */;
/*!50001 SET collation_connection      = @saved_col_connection */;

--
-- Final view structure for view `v_calendar_stages`
--

/*!50001 DROP VIEW IF EXISTS `v_calendar_stages`*/;
/*!50001 SET @saved_cs_client          = @@character_set_client */;
/*!50001 SET @saved_cs_results         = @@character_set_results */;
/*!50001 SET @saved_col_connection     = @@collation_connection */;
/*!50001 SET character_set_client      = utf8mb4 */;
/*!50001 SET character_set_results     = utf8mb4 */;
/*!50001 SET collation_connection      = utf8mb4_0900_ai_ci */;
/*!50001 CREATE ALGORITHM=UNDEFINED */
/*!50013 DEFINER=`root`@`localhost` SQL SECURITY DEFINER */
/*!50001 VIEW `v_calendar_stages` AS select `c`.`calendar_id` AS `calendar_id`,`c`.`paddy_id` AS `paddy_id`,`s`.`stage_no` AS `stage_no`,`s`.`stage_name` AS `stage_name`,(`c`.`planting_date` + interval `s`.`start_day` day) AS `start_date`,(`c`.`planting_date` + interval `s`.`end_day` day) AS `end_date` from (`farming_calendars` `c` join `rice_stages` `s`) */;
/*!50001 SET character_set_client      = @saved_cs_client */;
/*!50001 SET character_set_results     = @saved_cs_results */;
/*!50001 SET collation_connection      = @saved_col_connection */;

--
-- Final view structure for view `v_carboncredit_summary`
--

/*!50001 DROP VIEW IF EXISTS `v_carboncredit_summary`*/;
/*!50001 SET @saved_cs_client          = @@character_set_client */;
/*!50001 SET @saved_cs_results         = @@character_set_results */;
/*!50001 SET @saved_col_connection     = @@collation_connection */;
/*!50001 SET character_set_client      = utf8mb4 */;
/*!50001 SET character_set_results     = utf8mb4 */;
/*!50001 SET collation_connection      = utf8mb4_0900_ai_ci */;
/*!50001 CREATE ALGORITHM=UNDEFINED */
/*!50013 DEFINER=`root`@`localhost` SQL SECURITY DEFINER */
/*!50001 VIEW `v_carboncredit_summary` AS select `cc`.`credit_id` AS `credit_id`,`cc`.`paddy_id` AS `paddy_id`,`p`.`paddy_name` AS `paddy_name`,`p`.`owner_user_id` AS `owner_user_id`,`u`.`display_name` AS `owner_name`,`cc`.`calendar_id` AS `calendar_id`,`c`.`planting_date` AS `planting_date`,`c`.`harvest_date` AS `harvest_date`,`cc`.`credit_tco2e` AS `credit_tco2e`,`cc`.`credit_status` AS `credit_status`,(case `cc`.`credit_status` when 'not_checked' then 'ยังไม่ตรวจ' when 'passed' then 'ตรวจแล้ว (ผ่าน)' when 'failed' then 'ไม่ผ่าน' end) AS `credit_status_th`,`cc`.`amount_thb` AS `amount_thb`,`cc`.`submitted_at` AS `submitted_at`,`cc`.`verified_at` AS `verified_at` from (((`carboncredit_info` `cc` join `paddy` `p` on((`p`.`paddy_id` = `cc`.`paddy_id`))) join `users` `u` on((`u`.`user_id` = `p`.`owner_user_id`))) join `farming_calendars` `c` on((`c`.`calendar_id` = `cc`.`calendar_id`))) */;
/*!50001 SET character_set_client      = @saved_cs_client */;
/*!50001 SET character_set_results     = @saved_cs_results */;
/*!50001 SET collation_connection      = @saved_col_connection */;

--
-- Final view structure for view `v_device_latest`
--

/*!50001 DROP VIEW IF EXISTS `v_device_latest`*/;
/*!50001 SET @saved_cs_client          = @@character_set_client */;
/*!50001 SET @saved_cs_results         = @@character_set_results */;
/*!50001 SET @saved_col_connection     = @@collation_connection */;
/*!50001 SET character_set_client      = utf8mb4 */;
/*!50001 SET character_set_results     = utf8mb4 */;
/*!50001 SET collation_connection      = utf8mb4_0900_ai_ci */;
/*!50001 CREATE ALGORITHM=UNDEFINED */
/*!50013 DEFINER=`root`@`localhost` SQL SECURITY DEFINER */
/*!50001 VIEW `v_device_latest` AS select `d`.`device_id` AS `device_id`,`d`.`paddy_id` AS `paddy_id`,`d`.`battery_pct` AS `battery_pct`,`r`.`recorded_at` AS `last_recorded_at`,`r`.`water_level_cm` AS `water_level_cm` from (`devices` `d` left join `sensor_readings` `r` on((`r`.`reading_id` = (select `r2`.`reading_id` from `sensor_readings` `r2` where (`r2`.`device_id` = `d`.`device_id`) order by `r2`.`recorded_at` desc limit 1)))) */;
/*!50001 SET character_set_client      = @saved_cs_client */;
/*!50001 SET character_set_results     = @saved_cs_results */;
/*!50001 SET collation_connection      = @saved_col_connection */;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2026-11-04 21:52:04
