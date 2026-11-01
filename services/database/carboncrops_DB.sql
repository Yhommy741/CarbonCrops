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
  `cycle_id` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `recorded_by` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `activity_type` enum('land_prep','planting','fertilizing','drain','flood','pesticide','harvest','other') COLLATE utf8mb4_unicode_ci NOT NULL,
  `activity_date` date NOT NULL,
  `note` text COLLATE utf8mb4_unicode_ci,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`activity_id`),
  KEY `idx_act_cycle_date` (`cycle_id`,`activity_date`),
  KEY `fk_act_user` (`recorded_by`),
  CONSTRAINT `fk_act_cycle` FOREIGN KEY (`cycle_id`) REFERENCES `crop_cycles` (`cycle_id`) ON DELETE CASCADE,
  CONSTRAINT `fk_act_user` FOREIGN KEY (`recorded_by`) REFERENCES `users` (`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `activities`
--

LOCK TABLES `activities` WRITE;
/*!40000 ALTER TABLE `activities` DISABLE KEYS */;
INSERT INTO `activities` VALUES ('60000000-0000-4000-8000-000000000001','40000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000001','land_prep','2025-05-25','ไถดะ ไถแปร ทำเทือก','2026-10-30 19:59:23','2026-10-30 19:59:23'),('60000000-0000-4000-8000-000000000002','40000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000001','planting','2025-06-01','หว่านน้ำตม กข43 15 กก./ไร่','2026-10-30 19:59:23','2026-10-30 19:59:23'),('60000000-0000-4000-8000-000000000003','40000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000002','fertilizing','2025-06-20','ใส่ปุ๋ยสูตร 16-20-0 จำนวน 25 กก./ไร่ (สมหญิงบันทึกแทน)','2026-10-30 19:59:23','2026-10-30 19:59:23'),('60000000-0000-4000-8000-000000000004','40000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000001','drain','2025-06-26','เปิดท่อระบายน้ำ เริ่มปล่อยแห้งรอบแรก','2026-10-30 19:59:23','2026-10-30 19:59:23'),('60000000-0000-4000-8000-000000000005','40000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000001','harvest','2025-11-15','รถเกี่ยว ได้ข้าว 780 กก./ไร่','2026-10-30 19:59:23','2026-10-30 19:59:23');
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
  `latitude` decimal(9,6) DEFAULT NULL,
  `longitude` decimal(9,6) DEFAULT NULL,
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
INSERT INTO `activity_evidence` VALUES ('70000000-0000-4000-8000-000000000001','60000000-0000-4000-8000-000000000001','uploads/2568/05/landprep_001.jpg','image/jpeg','2025-05-25 08:12:00',14.339520,100.867210,'2026-10-30 19:59:23'),('70000000-0000-4000-8000-000000000002','60000000-0000-4000-8000-000000000002','uploads/2568/06/planting_001.jpg','image/jpeg','2025-06-01 07:45:00',14.339498,100.867188,'2026-10-30 19:59:23'),('70000000-0000-4000-8000-000000000003','60000000-0000-4000-8000-000000000003','uploads/2568/06/fert_001.jpg','image/jpeg','2025-06-20 09:30:00',14.339530,100.867250,'2026-10-30 19:59:23'),('70000000-0000-4000-8000-000000000004','60000000-0000-4000-8000-000000000004','uploads/2568/06/drain_001.jpg','image/jpeg','2025-06-26 06:50:00',14.339505,100.867199,'2026-10-30 19:59:23'),('70000000-0000-4000-8000-000000000005','60000000-0000-4000-8000-000000000005','uploads/2568/11/harvest_001.jpg','image/jpeg','2025-11-15 10:20:00',14.339515,100.867230,'2026-10-30 19:59:23');
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
INSERT INTO `auth_identities` VALUES ('20000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000001','line','Uaaaa0000000000000000000000000001','Somchai','https://profile.line-scdn.net/0001','2026-10-30 07:15:00','2026-10-30 19:59:23'),('20000000-0000-4000-8000-000000000002','10000000-0000-4000-8000-000000000002','line','Uaaaa0000000000000000000000000002','Somying','https://profile.line-scdn.net/0002','2026-10-29 18:40:00','2026-10-30 19:59:23'),('20000000-0000-4000-8000-000000000003','10000000-0000-4000-8000-000000000003','line','Uaaaa0000000000000000000000000003','Prayoon','https://profile.line-scdn.net/0003','2026-10-28 06:05:00','2026-10-30 19:59:23'),('20000000-0000-4000-8000-000000000004','10000000-0000-4000-8000-000000000004','line','Uaaaa0000000000000000000000000004','Wichai V','https://profile.line-scdn.net/0004','2026-10-30 09:00:00','2026-10-30 19:59:23'),('20000000-0000-4000-8000-000000000005','10000000-0000-4000-8000-000000000005','line','Uaaaa0000000000000000000000000005','KDMC Admin',NULL,'2026-10-30 08:30:00','2026-10-30 19:59:23');
/*!40000 ALTER TABLE `auth_identities` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `awd_phases`
--

DROP TABLE IF EXISTS `awd_phases`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `awd_phases` (
  `phase_id` char(36) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT (uuid()),
  `cycle_id` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `phase_type` enum('flooded','drying','reflood','final_drain') COLLATE utf8mb4_unicode_ci NOT NULL,
  `start_date` date NOT NULL,
  `end_date` date DEFAULT NULL,
  `note` text COLLATE utf8mb4_unicode_ci,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`phase_id`),
  KEY `idx_phases_cycle` (`cycle_id`),
  CONSTRAINT `fk_phases_cycle` FOREIGN KEY (`cycle_id`) REFERENCES `crop_cycles` (`cycle_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `awd_phases`
--

LOCK TABLES `awd_phases` WRITE;
/*!40000 ALTER TABLE `awd_phases` DISABLE KEYS */;
INSERT INTO `awd_phases` VALUES ('50000000-0000-4000-8000-000000000001','40000000-0000-4000-8000-000000000001','flooded','2025-06-01','2025-06-25','ขังน้ำหลังหว่าน','2026-10-30 19:59:23'),('50000000-0000-4000-8000-000000000002','40000000-0000-4000-8000-000000000001','drying','2025-06-26','2025-07-05','ปล่อยแห้งรอบแรก น้ำลงถึง -12 ซม.','2026-10-30 19:59:23'),('50000000-0000-4000-8000-000000000003','40000000-0000-4000-8000-000000000001','reflood','2025-07-06','2025-07-30',NULL,'2026-10-30 19:59:23'),('50000000-0000-4000-8000-000000000004','40000000-0000-4000-8000-000000000001','drying','2025-07-31','2025-08-09','ฝนตก 2 วัน แต่น้ำยังไม่ขัง','2026-10-30 19:59:23'),('50000000-0000-4000-8000-000000000005','40000000-0000-4000-8000-000000000001','final_drain','2025-10-30','2025-11-15','ระบายน้ำก่อนเกี่ยว','2026-10-30 19:59:23');
/*!40000 ALTER TABLE `awd_phases` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `crop_cycles`
--

DROP TABLE IF EXISTS `crop_cycles`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `crop_cycles` (
  `cycle_id` char(36) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT (uuid()),
  `plot_id` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `cycle_name` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `rice_variety` varchar(60) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `start_date` date NOT NULL,
  `end_date` date DEFAULT NULL,
  `status` enum('planned','active','harvested','closed') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'planned',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`cycle_id`),
  KEY `idx_cycles_plot` (`plot_id`),
  CONSTRAINT `fk_cycles_plot` FOREIGN KEY (`plot_id`) REFERENCES `plots` (`plot_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `crop_cycles`
--

LOCK TABLES `crop_cycles` WRITE;
/*!40000 ALTER TABLE `crop_cycles` DISABLE KEYS */;
INSERT INTO `crop_cycles` VALUES ('40000000-0000-4000-8000-000000000001','30000000-0000-4000-8000-000000000001','นาปี 2568','กข43','2025-06-01','2025-11-15','closed','2026-10-30 19:59:23','2026-10-30 19:59:23'),('40000000-0000-4000-8000-000000000002','30000000-0000-4000-8000-000000000001','นาปรัง 2569','กข41','2026-01-10','2026-05-05','harvested','2026-10-30 19:59:23','2026-10-30 19:59:23'),('40000000-0000-4000-8000-000000000003','30000000-0000-4000-8000-000000000003','นาปี 2569','ขาวดอกมะลิ 105','2026-06-15',NULL,'active','2026-10-30 19:59:23','2026-10-30 19:59:23'),('40000000-0000-4000-8000-000000000004','30000000-0000-4000-8000-000000000004','นาปี 2569','ปทุมธานี 1','2026-07-01',NULL,'active','2026-10-30 19:59:23','2026-10-30 19:59:23'),('40000000-0000-4000-8000-000000000005','30000000-0000-4000-8000-000000000005','นาปรัง 2570','กข43','2026-12-01',NULL,'planned','2026-10-30 19:59:23','2026-10-30 19:59:23');
/*!40000 ALTER TABLE `crop_cycles` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `device_installations`
--

DROP TABLE IF EXISTS `device_installations`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `device_installations` (
  `installation_id` char(36) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT (uuid()),
  `device_id` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `plot_id` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `installed_at` datetime NOT NULL,
  `removed_at` datetime DEFAULT NULL,
  PRIMARY KEY (`installation_id`),
  KEY `idx_inst_device` (`device_id`),
  KEY `idx_inst_plot` (`plot_id`),
  CONSTRAINT `fk_inst_device` FOREIGN KEY (`device_id`) REFERENCES `devices` (`device_id`),
  CONSTRAINT `fk_inst_plot` FOREIGN KEY (`plot_id`) REFERENCES `plots` (`plot_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `device_installations`
--

LOCK TABLES `device_installations` WRITE;
/*!40000 ALTER TABLE `device_installations` DISABLE KEYS */;
INSERT INTO `device_installations` VALUES ('a0000000-0000-4000-8000-000000000001','90000000-0000-4000-8000-000000000001','30000000-0000-4000-8000-000000000001','2025-05-20 10:00:00','2025-11-20 10:00:00'),('a0000000-0000-4000-8000-000000000002','90000000-0000-4000-8000-000000000001','30000000-0000-4000-8000-000000000003','2026-06-10 09:00:00',NULL),('a0000000-0000-4000-8000-000000000003','90000000-0000-4000-8000-000000000002','30000000-0000-4000-8000-000000000004','2026-06-25 09:00:00',NULL),('a0000000-0000-4000-8000-000000000004','90000000-0000-4000-8000-000000000003','30000000-0000-4000-8000-000000000001','2026-01-05 10:00:00','2026-05-10 10:00:00'),('a0000000-0000-4000-8000-000000000005','90000000-0000-4000-8000-000000000004','30000000-0000-4000-8000-000000000003','2026-06-10 09:30:00','2026-09-01 14:00:00');
/*!40000 ALTER TABLE `device_installations` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `devices`
--

DROP TABLE IF EXISTS `devices`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `devices` (
  `device_id` char(36) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT (uuid()),
  `serial_no` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `device_type` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'water_level',
  `status` enum('active','inactive','maintenance') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'active',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`device_id`),
  UNIQUE KEY `uq_device_serial` (`serial_no`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `devices`
--

LOCK TABLES `devices` WRITE;
/*!40000 ALTER TABLE `devices` DISABLE KEYS */;
INSERT INTO `devices` VALUES ('90000000-0000-4000-8000-000000000001','CC-WL-0001','water_level','active','2026-10-30 19:59:23','2026-10-30 19:59:23'),('90000000-0000-4000-8000-000000000002','CC-WL-0002','water_level','active','2026-10-30 19:59:23','2026-10-30 19:59:23'),('90000000-0000-4000-8000-000000000003','CC-WL-0003','water_level','active','2026-10-30 19:59:23','2026-10-30 19:59:23'),('90000000-0000-4000-8000-000000000004','CC-WL-0004','water_level','maintenance','2026-10-30 19:59:23','2026-10-30 19:59:23'),('90000000-0000-4000-8000-000000000005','CC-WS-0001','weather_station','inactive','2026-10-30 19:59:23','2026-10-30 19:59:23');
/*!40000 ALTER TABLE `devices` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `ghg_estimates`
--

DROP TABLE IF EXISTS `ghg_estimates`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `ghg_estimates` (
  `estimate_id` char(36) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT (uuid()),
  `cycle_id` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `method_version` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `baseline_tco2e` decimal(12,4) NOT NULL,
  `project_tco2e` decimal(12,4) NOT NULL,
  `reduction_tco2e` decimal(12,4) NOT NULL,
  `calculated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `calculated_by` char(36) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  PRIMARY KEY (`estimate_id`),
  KEY `idx_est_cycle` (`cycle_id`),
  KEY `fk_est_user` (`calculated_by`),
  CONSTRAINT `fk_est_cycle` FOREIGN KEY (`cycle_id`) REFERENCES `crop_cycles` (`cycle_id`) ON DELETE CASCADE,
  CONSTRAINT `fk_est_user` FOREIGN KEY (`calculated_by`) REFERENCES `users` (`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `ghg_estimates`
--

LOCK TABLES `ghg_estimates` WRITE;
/*!40000 ALTER TABLE `ghg_estimates` DISABLE KEYS */;
INSERT INTO `ghg_estimates` VALUES ('c0000000-0000-4000-8000-000000000001','40000000-0000-4000-8000-000000000001','T-VER-METH-AGR-01 v1.0',12.5000,7.8000,4.7000,'2025-11-18 10:00:00','10000000-0000-4000-8000-000000000005'),('c0000000-0000-4000-8000-000000000002','40000000-0000-4000-8000-000000000001','T-VER-METH-AGR-01 v1.1',12.5000,7.6500,4.8500,'2025-12-01 14:30:00','10000000-0000-4000-8000-000000000005'),('c0000000-0000-4000-8000-000000000003','40000000-0000-4000-8000-000000000002','T-VER-METH-AGR-01 v1.1',11.2000,7.1000,4.1000,'2026-05-12 09:00:00','10000000-0000-4000-8000-000000000005'),('c0000000-0000-4000-8000-000000000004','40000000-0000-4000-8000-000000000003','T-VER-METH-AGR-01 v1.1',8.0000,5.2000,2.8000,'2026-10-15 02:00:00',NULL),('c0000000-0000-4000-8000-000000000005','40000000-0000-4000-8000-000000000004','T-VER-METH-AGR-01 v1.1',20.0000,13.5000,6.5000,'2026-10-27 02:00:00',NULL);
/*!40000 ALTER TABLE `ghg_estimates` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `ghg_reports`
--

DROP TABLE IF EXISTS `ghg_reports`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `ghg_reports` (
  `report_id` char(36) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT (uuid()),
  `cycle_id` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `estimate_id` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `verification_id` char(36) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `report_no` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `reduction_tco2e` decimal(12,4) NOT NULL,
  `file_path` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `generated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `generated_by` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  PRIMARY KEY (`report_id`),
  UNIQUE KEY `uq_report_no` (`report_no`),
  KEY `idx_report_cycle` (`cycle_id`),
  KEY `fk_report_estimate` (`estimate_id`),
  KEY `fk_report_ver` (`verification_id`),
  KEY `fk_report_user` (`generated_by`),
  CONSTRAINT `fk_report_cycle` FOREIGN KEY (`cycle_id`) REFERENCES `crop_cycles` (`cycle_id`),
  CONSTRAINT `fk_report_estimate` FOREIGN KEY (`estimate_id`) REFERENCES `ghg_estimates` (`estimate_id`),
  CONSTRAINT `fk_report_user` FOREIGN KEY (`generated_by`) REFERENCES `users` (`user_id`),
  CONSTRAINT `fk_report_ver` FOREIGN KEY (`verification_id`) REFERENCES `verifications` (`verification_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `ghg_reports`
--

LOCK TABLES `ghg_reports` WRITE;
/*!40000 ALTER TABLE `ghg_reports` DISABLE KEYS */;
INSERT INTO `ghg_reports` VALUES ('e0000000-0000-4000-8000-000000000001','40000000-0000-4000-8000-000000000001','c0000000-0000-4000-8000-000000000002','d0000000-0000-4000-8000-000000000002','CC-2568-000001',4.8500,'reports/2568/CC-2568-000001.pdf','2025-12-11 09:00:00','10000000-0000-4000-8000-000000000001'),('e0000000-0000-4000-8000-000000000002','40000000-0000-4000-8000-000000000001','c0000000-0000-4000-8000-000000000002','d0000000-0000-4000-8000-000000000002','CC-2568-000002',4.8500,'reports/2568/CC-2568-000002.pdf','2026-01-15 10:00:00','10000000-0000-4000-8000-000000000005'),('e0000000-0000-4000-8000-000000000003','40000000-0000-4000-8000-000000000002','c0000000-0000-4000-8000-000000000003','d0000000-0000-4000-8000-000000000003','CC-2569-000001',4.1000,'reports/2569/CC-2569-000001.pdf','2026-05-26 08:30:00','10000000-0000-4000-8000-000000000001'),('e0000000-0000-4000-8000-000000000004','40000000-0000-4000-8000-000000000003','c0000000-0000-4000-8000-000000000004',NULL,'CC-2569-000002',2.8000,'reports/2569/CC-2569-000002.pdf','2026-10-16 07:00:00','10000000-0000-4000-8000-000000000002'),('e0000000-0000-4000-8000-000000000005','40000000-0000-4000-8000-000000000004','c0000000-0000-4000-8000-000000000005',NULL,'CC-2569-000003',6.5000,NULL,'2026-10-27 09:15:00','10000000-0000-4000-8000-000000000003');
/*!40000 ALTER TABLE `ghg_reports` ENABLE KEYS */;
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
INSERT INTO `notifications` VALUES ('f0000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000001','line','phase_reminder','พรุ่งนี้ (26 มิ.ย.) ถึงกำหนดปล่อยน้ำแห้งรอบแรก แปลง \"นาหลังบ้าน\"','sent','2025-06-25 18:00:05',NULL,'2026-10-30 19:59:23'),('f0000000-0000-4000-8000-000000000002','10000000-0000-4000-8000-000000000001','line','verification_result','ผลตรวจสอบรอบ \"นาปี 2568\" : ผ่านการรับรอง ดาวน์โหลดรายงานได้แล้ว','sent','2025-12-10 15:31:02',NULL,'2026-10-30 19:59:23'),('f0000000-0000-4000-8000-000000000003','10000000-0000-4000-8000-000000000002','line','verification_result','ผู้ตรวจสอบรับเรื่องรอบ \"นาปี 2569\" แล้ว อยู่ระหว่างตรวจสอบ','pending',NULL,NULL,'2026-10-30 19:59:23'),('f0000000-0000-4000-8000-000000000004','10000000-0000-4000-8000-000000000003','line','low_battery','อุปกรณ์ CC-WL-0002 แบตเตอรี่เหลือ 15% กรุณาเปลี่ยนแบตเตอรี่','failed',NULL,'LINE API 400: The user has not added the bot as a friend','2026-10-30 19:59:23'),('f0000000-0000-4000-8000-000000000005','10000000-0000-4000-8000-000000000002','line','phase_reminder','ระดับน้ำแปลง \"แปลงบางปลาม้า\" ลดลงเหลือ 2.1 ซม. ใกล้ถึงช่วงปล่อยแห้ง','sent','2026-10-30 10:05:00',NULL,'2026-10-30 19:59:23');
/*!40000 ALTER TABLE `notifications` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `plot_members`
--

DROP TABLE IF EXISTS `plot_members`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `plot_members` (
  `plot_id` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `user_id` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `member_role` enum('owner','worker','viewer') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'viewer',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`plot_id`,`user_id`),
  KEY `fk_pm_user` (`user_id`),
  CONSTRAINT `fk_pm_plot` FOREIGN KEY (`plot_id`) REFERENCES `plots` (`plot_id`) ON DELETE CASCADE,
  CONSTRAINT `fk_pm_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `plot_members`
--

LOCK TABLES `plot_members` WRITE;
/*!40000 ALTER TABLE `plot_members` DISABLE KEYS */;
INSERT INTO `plot_members` VALUES ('30000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000001','owner','2026-10-30 19:59:23'),('30000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000002','worker','2026-10-30 19:59:23'),('30000000-0000-4000-8000-000000000003','10000000-0000-4000-8000-000000000001','viewer','2026-10-30 19:59:23'),('30000000-0000-4000-8000-000000000003','10000000-0000-4000-8000-000000000002','owner','2026-10-30 19:59:23'),('30000000-0000-4000-8000-000000000004','10000000-0000-4000-8000-000000000003','owner','2026-10-30 19:59:23');
/*!40000 ALTER TABLE `plot_members` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `plots`
--

DROP TABLE IF EXISTS `plots`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `plots` (
  `plot_id` char(36) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT (uuid()),
  `owner_user_id` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `plot_name` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `latitude` decimal(9,6) DEFAULT NULL,
  `longitude` decimal(9,6) DEFAULT NULL,
  `area_rai` decimal(10,2) NOT NULL,
  `province` varchar(60) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `district` varchar(60) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `subdistrict` varchar(60) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `land_doc_no` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`plot_id`),
  KEY `idx_plots_owner` (`owner_user_id`),
  CONSTRAINT `fk_plots_owner` FOREIGN KEY (`owner_user_id`) REFERENCES `users` (`user_id`),
  CONSTRAINT `chk_area_positive` CHECK ((`area_rai` > 0))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `plots`
--

LOCK TABLES `plots` WRITE;
/*!40000 ALTER TABLE `plots` DISABLE KEYS */;
INSERT INTO `plots` VALUES ('30000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000001','นาหลังบ้าน',14.339512,100.867204,12.50,'สระบุรี','หนองแค','หนองแค','นส.4 12345','2026-10-30 19:59:23','2026-10-30 19:59:23'),('30000000-0000-4000-8000-000000000002','10000000-0000-4000-8000-000000000001','นาริมคลอง',14.342880,100.871115,6.00,'สระบุรี','หนองแค','หนองแค','นส.4 12346','2026-10-30 19:59:23','2026-10-30 19:59:23'),('30000000-0000-4000-8000-000000000003','10000000-0000-4000-8000-000000000002','แปลงบางปลาม้า',14.396721,100.153309,8.25,'สุพรรณบุรี','บางปลาม้า','บางปลาม้า','นส.3ก 7788','2026-10-30 19:59:23','2026-10-30 19:59:23'),('30000000-0000-4000-8000-000000000004','10000000-0000-4000-8000-000000000003','นาใหญ่ท่าช้าง',14.885430,100.401877,20.00,'สิงห์บุรี','เมือง','ท่าช้าง','นส.4 90012','2026-10-30 19:59:23','2026-10-30 19:59:23'),('30000000-0000-4000-8000-000000000005','10000000-0000-4000-8000-000000000003','นาเช่าหัวไผ่',14.902115,100.388640,15.75,'สิงห์บุรี','เมือง','หัวไผ่',NULL,'2026-10-30 19:59:23','2026-10-30 19:59:23');
/*!40000 ALTER TABLE `plots` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `satellite_images`
--

DROP TABLE IF EXISTS `satellite_images`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `satellite_images` (
  `image_id` char(36) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT (uuid()),
  `plot_id` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `captured_at` date NOT NULL,
  `source` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `file_path` varchar(500) COLLATE utf8mb4_unicode_ci NOT NULL,
  `cloud_cover_pct` tinyint unsigned DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`image_id`),
  KEY `idx_sat_plot_date` (`plot_id`,`captured_at`),
  CONSTRAINT `fk_sat_plot` FOREIGN KEY (`plot_id`) REFERENCES `plots` (`plot_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `satellite_images`
--

LOCK TABLES `satellite_images` WRITE;
/*!40000 ALTER TABLE `satellite_images` DISABLE KEYS */;
INSERT INTO `satellite_images` VALUES ('b0000000-0000-4000-8000-000000000001','30000000-0000-4000-8000-000000000001','2025-06-20','Sentinel-2','satellite/2025/06/S2_plot1_20250620.tif',5,'2026-10-30 19:59:23'),('b0000000-0000-4000-8000-000000000002','30000000-0000-4000-8000-000000000001','2025-07-02','Sentinel-2','satellite/2025/07/S2_plot1_20250702.tif',12,'2026-10-30 19:59:23'),('b0000000-0000-4000-8000-000000000003','30000000-0000-4000-8000-000000000003','2026-07-10','Sentinel-2','satellite/2026/07/S2_plot3_20260710.tif',40,'2026-10-30 19:59:23'),('b0000000-0000-4000-8000-000000000004','30000000-0000-4000-8000-000000000003','2026-08-04','Sentinel-2','satellite/2026/08/S2_plot3_20260804.tif',8,'2026-10-30 19:59:23'),('b0000000-0000-4000-8000-000000000005','30000000-0000-4000-8000-000000000004','2026-09-15','Landsat-9','satellite/2026/09/L9_plot4_20260915.tif',20,'2026-10-30 19:59:23');
/*!40000 ALTER TABLE `satellite_images` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `sensor_readings`
--

DROP TABLE IF EXISTS `sensor_readings`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `sensor_readings` (
  `reading_id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `device_id` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `recorded_at` datetime NOT NULL,
  `water_level_cm` decimal(5,1) DEFAULT NULL,
  `battery_pct` tinyint unsigned DEFAULT NULL,
  `received_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
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
INSERT INTO `sensor_readings` VALUES (1,'90000000-0000-4000-8000-000000000001','2026-10-30 06:00:00',3.5,87,'2026-10-30 06:00:42'),(2,'90000000-0000-4000-8000-000000000001','2026-10-30 07:00:00',3.2,87,'2026-10-30 07:00:40'),(3,'90000000-0000-4000-8000-000000000001','2026-10-30 08:00:00',2.8,86,'2026-10-30 08:00:39'),(4,'90000000-0000-4000-8000-000000000001','2026-10-30 09:00:00',2.5,86,'2026-10-30 09:00:45'),(5,'90000000-0000-4000-8000-000000000001','2026-10-30 10:00:00',2.1,86,'2026-10-30 10:03:12');
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
INSERT INTO `users` VALUES ('10000000-0000-4000-8000-000000000001','สมชาย ใจดี','0812345671','farmer','12 ม.3 ต.หนองแค','สระบุรี','หนองแค',1,'2026-10-30 19:59:23','2026-10-30 19:59:23'),('10000000-0000-4000-8000-000000000002','สมหญิง ใจดี','0812345672','farmer','45 ม.1 ต.บางปลาม้า','สุพรรณบุรี','บางปลาม้า',1,'2026-10-30 19:59:23','2026-10-30 19:59:23'),('10000000-0000-4000-8000-000000000003','ประยูร ทองดี','0812345673','farmer','7 ม.9 ต.ท่าช้าง','สิงห์บุรี','เมือง',1,'2026-10-30 19:59:23','2026-10-30 19:59:23'),('10000000-0000-4000-8000-000000000004','ดร.วิชัย ตรวจสอบ','0812345674','verifier',NULL,'กรุงเทพมหานคร','ลาดกระบัง',1,'2026-10-30 19:59:23','2026-10-30 19:59:23'),('10000000-0000-4000-8000-000000000005','ผู้ดูแลระบบ','0812345675','admin',NULL,'กรุงเทพมหานคร','ลาดกระบัง',1,'2026-10-30 19:59:23','2026-10-30 19:59:23');
/*!40000 ALTER TABLE `users` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `verifications`
--

DROP TABLE IF EXISTS `verifications`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `verifications` (
  `verification_id` char(36) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT (uuid()),
  `cycle_id` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `estimate_id` char(36) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `verifier_user_id` char(36) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `status` enum('pending','in_review','approved','rejected') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'pending',
  `submitted_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `decided_at` datetime DEFAULT NULL,
  `comment` text COLLATE utf8mb4_unicode_ci,
  PRIMARY KEY (`verification_id`),
  KEY `idx_ver_cycle` (`cycle_id`),
  KEY `idx_ver_status` (`status`),
  KEY `fk_ver_estimate` (`estimate_id`),
  KEY `fk_ver_user` (`verifier_user_id`),
  CONSTRAINT `fk_ver_cycle` FOREIGN KEY (`cycle_id`) REFERENCES `crop_cycles` (`cycle_id`),
  CONSTRAINT `fk_ver_estimate` FOREIGN KEY (`estimate_id`) REFERENCES `ghg_estimates` (`estimate_id`),
  CONSTRAINT `fk_ver_user` FOREIGN KEY (`verifier_user_id`) REFERENCES `users` (`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `verifications`
--

LOCK TABLES `verifications` WRITE;
/*!40000 ALTER TABLE `verifications` DISABLE KEYS */;
INSERT INTO `verifications` VALUES ('d0000000-0000-4000-8000-000000000001','40000000-0000-4000-8000-000000000001','c0000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000004','rejected','2025-11-20 09:00:00','2025-11-28 16:00:00','ขาดรูปถ่ายช่วงปล่อยแห้งรอบ 2 (31 ก.ค.–9 ส.ค.) และสูตรคำนวณเก่า ขอให้ส่งใหม่'),('d0000000-0000-4000-8000-000000000002','40000000-0000-4000-8000-000000000001','c0000000-0000-4000-8000-000000000002','10000000-0000-4000-8000-000000000004','approved','2025-12-02 10:00:00','2025-12-10 15:30:00','หลักฐานครบถ้วน ผลคำนวณสอดคล้องกับข้อมูลเซ็นเซอร์'),('d0000000-0000-4000-8000-000000000003','40000000-0000-4000-8000-000000000002','c0000000-0000-4000-8000-000000000003','10000000-0000-4000-8000-000000000004','approved','2026-05-15 11:00:00','2026-05-25 14:00:00','ผ่าน'),('d0000000-0000-4000-8000-000000000004','40000000-0000-4000-8000-000000000003','c0000000-0000-4000-8000-000000000004','10000000-0000-4000-8000-000000000004','in_review','2026-10-20 09:30:00',NULL,NULL),('d0000000-0000-4000-8000-000000000005','40000000-0000-4000-8000-000000000004','c0000000-0000-4000-8000-000000000005',NULL,'pending','2026-10-28 08:00:00',NULL,NULL);
/*!40000 ALTER TABLE `verifications` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `water_measurements`
--

DROP TABLE IF EXISTS `water_measurements`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `water_measurements` (
  `measurement_id` char(36) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT (uuid()),
  `cycle_id` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `recorded_by` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `measured_at` datetime NOT NULL,
  `water_level_cm` decimal(5,1) NOT NULL,
  `photo_path` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `note` text COLLATE utf8mb4_unicode_ci,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`measurement_id`),
  KEY `idx_wm_cycle_time` (`cycle_id`,`measured_at`),
  KEY `fk_wm_user` (`recorded_by`),
  CONSTRAINT `fk_wm_cycle` FOREIGN KEY (`cycle_id`) REFERENCES `crop_cycles` (`cycle_id`) ON DELETE CASCADE,
  CONSTRAINT `fk_wm_user` FOREIGN KEY (`recorded_by`) REFERENCES `users` (`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `water_measurements`
--

LOCK TABLES `water_measurements` WRITE;
/*!40000 ALTER TABLE `water_measurements` DISABLE KEYS */;
INSERT INTO `water_measurements` VALUES ('80000000-0000-4000-8000-000000000001','40000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000001','2025-06-20 07:00:00',5.0,'uploads/2568/06/wl_0620.jpg','น้ำขังปกติ','2026-10-30 19:59:23'),('80000000-0000-4000-8000-000000000002','40000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000001','2025-06-28 07:00:00',1.5,'uploads/2568/06/wl_0628.jpg',NULL,'2026-10-30 19:59:23'),('80000000-0000-4000-8000-000000000003','40000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000001','2025-07-01 07:00:00',-3.0,'uploads/2568/07/wl_0701.jpg','น้ำต่ำกว่าผิวดินแล้ว','2026-10-30 19:59:23'),('80000000-0000-4000-8000-000000000004','40000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000002','2025-07-04 07:30:00',-12.0,'uploads/2568/07/wl_0704.jpg','ถึงระดับ -12 ซม. พรุ่งนี้เติมน้ำ','2026-10-30 19:59:23'),('80000000-0000-4000-8000-000000000005','40000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000001','2025-07-08 07:00:00',4.5,NULL,'เติมน้ำกลับแล้ว','2026-10-30 19:59:23');
/*!40000 ALTER TABLE `water_measurements` ENABLE KEYS */;
UNLOCK TABLES;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2026-11-01 15:27:21
