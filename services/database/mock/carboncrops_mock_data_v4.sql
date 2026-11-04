USE `carboncrops`;
SET NAMES utf8mb4;
START TRANSACTION;

-- rice_stages: 6 rows
INSERT INTO `rice_stages` (`stage_no`, `stage_name`, `start_day`, `end_day`) VALUES
(1, 'เตรียมดิน', -14, -1),
(2, 'ระยะกล้า', 0, 20),
(3, 'แตกกอ', 21, 45),
(4, 'ตั้งท้อง', 46, 70),
(5, 'ออกรวง', 71, 95),
(6, 'สุกแก่และเก็บเกี่ยว', 96, 120);

-- users: 5 rows
INSERT INTO `users` (`user_id`, `display_name`, `phone`, `role`, `address`, `province`, `district`, `is_active`) VALUES
('631baedb-ad9b-531e-a4b4-b30ed561748d', 'เกษตรกรตัวอย่าง ก', NULL, 'farmer', 'ที่อยู่สมมติสำหรับทดสอบ', 'สุพรรณบุรี', 'เมืองสุพรรณบุรี', 1),
('2bdbeed9-281c-5414-a680-918006d0e1c2', 'เกษตรกรตัวอย่าง ข', NULL, 'farmer', 'ที่อยู่สมมติสำหรับทดสอบ', 'สุพรรณบุรี', 'เมืองสุพรรณบุรี', 1),
('e6876a9f-40f4-555f-a830-45eea08e7dbf', 'เกษตรกรตัวอย่าง ค', NULL, 'farmer', 'ที่อยู่สมมติสำหรับทดสอบ', 'สุพรรณบุรี', 'เมืองสุพรรณบุรี', 1),
('37f50fa5-8e5d-5e89-8f89-9c9e80cc4537', 'ผู้ตรวจสอบตัวอย่าง', NULL, 'verifier', 'ที่อยู่สมมติสำหรับทดสอบ', 'สุพรรณบุรี', 'เมืองสุพรรณบุรี', 1),
('3693e566-1c6c-5cbf-826a-513ae402460b', 'ผู้ดูแลระบบตัวอย่าง', NULL, 'admin', 'ที่อยู่สมมติสำหรับทดสอบ', 'สุพรรณบุรี', 'เมืองสุพรรณบุรี', 1);

-- auth_identities: 5 rows
INSERT INTO `auth_identities` (`auth_id`, `user_id`, `provider`, `provider_user_id`, `line_display_name`, `picture_url`, `last_login_at`) VALUES
('27506a05-19c8-50f1-859f-37e4dfd5a98f', '631baedb-ad9b-531e-a4b4-b30ed561748d', 'line', 'MOCK_LINE_USER_001', 'เกษตรกรตัวอย่าง ก', 'https://example.invalid/avatars/1.png', '2026-11-04 08:00:00'),
('89830c14-97db-52b0-8a88-21a3b93669fe', '2bdbeed9-281c-5414-a680-918006d0e1c2', 'line', 'MOCK_LINE_USER_002', 'เกษตรกรตัวอย่าง ข', 'https://example.invalid/avatars/2.png', '2026-11-04 08:00:00'),
('11b37a42-cff9-5be9-9038-f9bfb6b92d7f', 'e6876a9f-40f4-555f-a830-45eea08e7dbf', 'line', 'MOCK_LINE_USER_003', 'เกษตรกรตัวอย่าง ค', 'https://example.invalid/avatars/3.png', '2026-11-04 08:00:00'),
('5765d613-b517-5e99-88a8-a148bb2438a6', '37f50fa5-8e5d-5e89-8f89-9c9e80cc4537', 'line', 'MOCK_LINE_USER_004', 'ผู้ตรวจสอบตัวอย่าง', 'https://example.invalid/avatars/4.png', '2026-11-04 08:00:00'),
('d5c34b59-a259-5dc1-a00a-3e1f26de44de', '3693e566-1c6c-5cbf-826a-513ae402460b', 'line', 'MOCK_LINE_USER_005', 'ผู้ดูแลระบบตัวอย่าง', 'https://example.invalid/avatars/5.png', '2026-11-04 08:00:00');

-- paddy: 5 rows
INSERT INTO `paddy` (`paddy_id`, `owner_user_id`, `paddy_name`, `latitude`, `longitude`, `area_rai`, `province`, `district`, `subdistrict`, `land_doc_no`) VALUES
('ceed0afb-bfe3-5ca5-921b-c28c9bb7db39', '631baedb-ad9b-531e-a4b4-b30ed561748d', 'แปลงนาทดสอบ 1', 14.471, 100.111, 12, 'สุพรรณบุรี', 'เมืองสุพรรณบุรี', 'สนามชัย', 'MOCK-LAND-001'),
('f1287ffd-592b-5db2-bfb4-2253f3bafacf', '2bdbeed9-281c-5414-a680-918006d0e1c2', 'แปลงนาทดสอบ 2', 14.472000000000001, 100.112, 14, 'สุพรรณบุรี', 'เมืองสุพรรณบุรี', 'สนามชัย', 'MOCK-LAND-002'),
('a5fdde22-0b23-520b-b5a3-12c98e1e40a6', 'e6876a9f-40f4-555f-a830-45eea08e7dbf', 'แปลงนาทดสอบ 3', 14.473, 100.113, 16, 'สุพรรณบุรี', 'เมืองสุพรรณบุรี', 'สนามชัย', 'MOCK-LAND-003'),
('d4c21e1b-3a01-52d9-80ab-5638ec3ea3c6', '631baedb-ad9b-531e-a4b4-b30ed561748d', 'แปลงนาทดสอบ 4', 14.474, 100.114, 18, 'สุพรรณบุรี', 'เมืองสุพรรณบุรี', 'สนามชัย', 'MOCK-LAND-004'),
('d22ee80b-eb0c-5daa-a6bb-84416a5a5a67', '2bdbeed9-281c-5414-a680-918006d0e1c2', 'แปลงนาทดสอบ 5', 14.475000000000001, 100.115, 20, 'สุพรรณบุรี', 'เมืองสุพรรณบุรี', 'สนามชัย', 'MOCK-LAND-005');

-- farming_calendars: 5 rows
INSERT INTO `farming_calendars` (`calendar_id`, `paddy_id`, `rice_variety`, `planting_date`, `harvest_date`) VALUES
('f561660c-7be8-5522-9046-40549e9a67ab', 'ceed0afb-bfe3-5ca5-921b-c28c9bb7db39', 'กข43', '2026-05-01', '2026-08-29'),
('53d65577-6775-551b-98bf-172976d68256', 'f1287ffd-592b-5db2-bfb4-2253f3bafacf', 'กข43', '2026-05-02', '2026-08-30'),
('3f1aa6ea-c318-5415-992b-81335dfc95f5', 'a5fdde22-0b23-520b-b5a3-12c98e1e40a6', 'กข43', '2026-05-03', '2026-08-31'),
('ff4f5935-c8e6-5773-81e2-b71e6ac25e67', 'd4c21e1b-3a01-52d9-80ab-5638ec3ea3c6', 'กข43', '2026-10-10', NULL),
('1c20f9ec-d32f-56b8-af2a-78f739b1dd51', 'd22ee80b-eb0c-5daa-a6bb-84416a5a5a67', 'กข43', '2026-10-11', NULL);

-- devices: 5 rows
INSERT INTO `devices` (`device_id`, `paddy_id`, `battery_pct`, `installed_at`) VALUES
('MOCK-DEV-001', 'ceed0afb-bfe3-5ca5-921b-c28c9bb7db39', 98, '2026-04-16'),
('MOCK-DEV-002', 'f1287ffd-592b-5db2-bfb4-2253f3bafacf', 76, '2026-04-17'),
('MOCK-DEV-003', 'a5fdde22-0b23-520b-b5a3-12c98e1e40a6', 52, '2026-04-18'),
('MOCK-DEV-004', 'd4c21e1b-3a01-52d9-80ab-5638ec3ea3c6', 23, '2026-09-25'),
('MOCK-DEV-005', 'd22ee80b-eb0c-5daa-a6bb-84416a5a5a67', 8, '2026-09-26');

-- sensor_readings: 25 rows
INSERT INTO `sensor_readings` (`device_id`, `recorded_at`, `water_level_cm`) VALUES
('MOCK-DEV-001', '2026-11-04 08:00:00', 5.2),
('MOCK-DEV-001', '2026-11-04 09:00:00', 2.2),
('MOCK-DEV-001', '2026-11-04 10:00:00', -4.8),
('MOCK-DEV-001', '2026-11-04 11:00:00', -11.8),
('MOCK-DEV-001', '2026-11-04 12:00:00', -15.8),
('MOCK-DEV-002', '2026-11-04 08:00:00', 5.4),
('MOCK-DEV-002', '2026-11-04 09:00:00', 2.4),
('MOCK-DEV-002', '2026-11-04 10:00:00', -4.6),
('MOCK-DEV-002', '2026-11-04 11:00:00', -11.6),
('MOCK-DEV-002', '2026-11-04 12:00:00', -15.6),
('MOCK-DEV-003', '2026-11-04 08:00:00', 5.6),
('MOCK-DEV-003', '2026-11-04 09:00:00', 2.6),
('MOCK-DEV-003', '2026-11-04 10:00:00', -4.4),
('MOCK-DEV-003', '2026-11-04 11:00:00', -11.4),
('MOCK-DEV-003', '2026-11-04 12:00:00', -15.4),
('MOCK-DEV-004', '2026-11-04 08:00:00', 5.8),
('MOCK-DEV-004', '2026-11-04 09:00:00', 2.8),
('MOCK-DEV-004', '2026-11-04 10:00:00', -4.2),
('MOCK-DEV-004', '2026-11-04 11:00:00', -11.2),
('MOCK-DEV-004', '2026-11-04 12:00:00', -15.2),
('MOCK-DEV-005', '2026-11-04 08:00:00', 6.0),
('MOCK-DEV-005', '2026-11-04 09:00:00', 3.0),
('MOCK-DEV-005', '2026-11-04 10:00:00', -4.0),
('MOCK-DEV-005', '2026-11-04 11:00:00', -11.0),
('MOCK-DEV-005', '2026-11-04 12:00:00', -15.0);

-- activities: 24 rows
INSERT INTO `activities` (`activity_id`, `calendar_id`, `stage_no`, `activity_type`, `activity_date`, `note`) VALUES
('9469e6ca-d251-567f-b20b-fd4c3db0ccd0', 'f561660c-7be8-5522-9046-40549e9a67ab', 1, 'land_prep', '2026-04-24', 'กิจกรรมจำลอง แปลง 1 ขั้น 1'),
('55819107-0749-5c21-ac3f-9e616baa2512', 'f561660c-7be8-5522-9046-40549e9a67ab', 2, 'sowing', '2026-05-01', 'กิจกรรมจำลอง แปลง 1 ขั้น 2'),
('bd49dafb-b2bc-543f-895d-7ab3ed23b608', 'f561660c-7be8-5522-9046-40549e9a67ab', 3, 'fertilizing', '2026-05-26', 'กิจกรรมจำลอง แปลง 1 ขั้น 3'),
('a48afd86-8c81-5b51-9eb8-d7d4683ce2aa', 'f561660c-7be8-5522-9046-40549e9a67ab', 4, 'drain', '2026-06-25', 'กิจกรรมจำลอง แปลง 1 ขั้น 4'),
('46714227-b817-5c92-945e-4e2007a2dd54', 'f561660c-7be8-5522-9046-40549e9a67ab', 5, 'flood', '2026-07-20', 'กิจกรรมจำลอง แปลง 1 ขั้น 5'),
('af84739a-c05f-5e7f-8a30-4ed455b68087', 'f561660c-7be8-5522-9046-40549e9a67ab', 6, 'harvest', '2026-08-29', 'กิจกรรมจำลอง แปลง 1 ขั้น 6'),
('25599a14-7b95-5303-bf79-cfdc11f44acc', '53d65577-6775-551b-98bf-172976d68256', 1, 'land_prep', '2026-04-25', 'กิจกรรมจำลอง แปลง 2 ขั้น 1'),
('5bb26f5d-50ff-50d3-817d-f3f6e49f235d', '53d65577-6775-551b-98bf-172976d68256', 2, 'sowing', '2026-05-02', 'กิจกรรมจำลอง แปลง 2 ขั้น 2'),
('0f3b0b0c-2363-5420-b2f0-0fcbc06d7e3b', '53d65577-6775-551b-98bf-172976d68256', 3, 'fertilizing', '2026-05-27', 'กิจกรรมจำลอง แปลง 2 ขั้น 3'),
('1afddc59-ab4d-5770-9f14-fa6a20edfe2b', '53d65577-6775-551b-98bf-172976d68256', 4, 'drain', '2026-06-26', 'กิจกรรมจำลอง แปลง 2 ขั้น 4'),
('8a1fa8df-581f-5f5e-a17b-9ddd91d88371', '53d65577-6775-551b-98bf-172976d68256', 5, 'flood', '2026-07-21', 'กิจกรรมจำลอง แปลง 2 ขั้น 5'),
('37af5f49-8879-5844-9b62-fb86c05c6940', '53d65577-6775-551b-98bf-172976d68256', 6, 'harvest', '2026-08-30', 'กิจกรรมจำลอง แปลง 2 ขั้น 6'),
('460915b5-edff-55dc-be6e-020ee549f635', '3f1aa6ea-c318-5415-992b-81335dfc95f5', 1, 'land_prep', '2026-04-26', 'กิจกรรมจำลอง แปลง 3 ขั้น 1'),
('8477d9a4-978d-5864-af76-22a5ae095729', '3f1aa6ea-c318-5415-992b-81335dfc95f5', 2, 'sowing', '2026-05-03', 'กิจกรรมจำลอง แปลง 3 ขั้น 2'),
('068df388-cc71-5229-a59e-6f5a5e67a44a', '3f1aa6ea-c318-5415-992b-81335dfc95f5', 3, 'fertilizing', '2026-05-28', 'กิจกรรมจำลอง แปลง 3 ขั้น 3'),
('cf809d59-8d9c-5949-a641-8103aa45d56a', '3f1aa6ea-c318-5415-992b-81335dfc95f5', 4, 'drain', '2026-06-27', 'กิจกรรมจำลอง แปลง 3 ขั้น 4'),
('d3170aff-8cc6-5eeb-b402-6fa927e7c011', '3f1aa6ea-c318-5415-992b-81335dfc95f5', 5, 'flood', '2026-07-22', 'กิจกรรมจำลอง แปลง 3 ขั้น 5'),
('ddf30671-4a31-573e-b123-0247aa29d135', '3f1aa6ea-c318-5415-992b-81335dfc95f5', 6, 'harvest', '2026-08-31', 'กิจกรรมจำลอง แปลง 3 ขั้น 6'),
('e8b1808b-c6c0-5625-a315-01c99b4d5377', 'ff4f5935-c8e6-5773-81e2-b71e6ac25e67', 1, 'land_prep', '2026-10-03', 'กิจกรรมจำลอง แปลง 4 ขั้น 1'),
('47d5f76c-0b52-5c82-a73f-fa87a539f77a', 'ff4f5935-c8e6-5773-81e2-b71e6ac25e67', 2, 'sowing', '2026-10-10', 'กิจกรรมจำลอง แปลง 4 ขั้น 2'),
('9f125d8d-ed10-55d0-9b0f-a59d728631a8', 'ff4f5935-c8e6-5773-81e2-b71e6ac25e67', 3, 'fertilizing', '2026-11-04', 'กิจกรรมจำลอง แปลง 4 ขั้น 3'),
('5967c7ab-f81e-5d8a-b3da-3f3ea7bbfaa2', '1c20f9ec-d32f-56b8-af2a-78f739b1dd51', 1, 'land_prep', '2026-10-04', 'กิจกรรมจำลอง แปลง 5 ขั้น 1'),
('64a09c1c-c13f-56de-984f-06ea92cee32b', '1c20f9ec-d32f-56b8-af2a-78f739b1dd51', 2, 'sowing', '2026-10-11', 'กิจกรรมจำลอง แปลง 5 ขั้น 2'),
('4a1709f1-1f77-513a-a5b0-dbc64f5551df', '1c20f9ec-d32f-56b8-af2a-78f739b1dd51', 3, 'fertilizing', '2026-11-05', 'กิจกรรมจำลอง แปลง 5 ขั้น 3');

-- activity_evidence: 5 rows
INSERT INTO `activity_evidence` (`evidence_id`, `activity_id`, `file_path`, `file_type`, `captured_at`) VALUES
('6b483f2a-37e5-503f-aa25-bacd469daaf4', '55819107-0749-5c21-ac3f-9e616baa2512', 'mock/evidence/paddy_1/sowing.jpg', 'image/jpeg', '2026-05-01 09:00:00'),
('e73e5110-f2d7-58ba-899c-a8944b91c16c', '5bb26f5d-50ff-50d3-817d-f3f6e49f235d', 'mock/evidence/paddy_2/sowing.jpg', 'image/jpeg', '2026-05-02 09:00:00'),
('94f9237e-3a5f-5e76-a57a-fb2a796314bb', '8477d9a4-978d-5864-af76-22a5ae095729', 'mock/evidence/paddy_3/sowing.jpg', 'image/jpeg', '2026-05-03 09:00:00'),
('72fa6bad-70e7-5d92-b657-1f8dd2285eec', '47d5f76c-0b52-5c82-a73f-fa87a539f77a', 'mock/evidence/paddy_4/sowing.jpg', 'image/jpeg', '2026-10-10 09:00:00'),
('65dee226-010a-5371-bd13-4c3c2455939e', '64a09c1c-c13f-56de-984f-06ea92cee32b', 'mock/evidence/paddy_5/sowing.jpg', 'image/jpeg', '2026-10-11 09:00:00');

-- carboncredit_info: 3 rows
INSERT INTO `carboncredit_info` (`credit_id`, `calendar_id`, `paddy_id`, `credit_tco2e`, `credit_status`, `amount_thb`, `submitted_at`, `verified_by`, `verified_at`, `verify_comment`) VALUES
('b7f2b1b8-15ad-5702-bbaa-a4d0396b98ef', 'f561660c-7be8-5522-9046-40549e9a67ab', 'ceed0afb-bfe3-5ca5-921b-c28c9bb7db39', 1.25, 'passed', 1250, '2026-09-10 09:00:00', '37f50fa5-8e5d-5e89-8f89-9c9e80cc4537', '2026-09-12 10:00:00', 'ข้อมูลสมมติ: ผ่านการตรวจสอบ'),
('708d4abc-b6de-514c-a4e0-796563df3aa9', '53d65577-6775-551b-98bf-172976d68256', 'f1287ffd-592b-5db2-bfb4-2253f3bafacf', 2.5, 'failed', NULL, '2026-09-10 09:00:00', '37f50fa5-8e5d-5e89-8f89-9c9e80cc4537', '2026-09-12 10:00:00', 'ข้อมูลสมมติ: หลักฐานไม่ครบ'),
('66eae1d0-174f-5438-bfb1-287ec6ec34a3', '3f1aa6ea-c318-5415-992b-81335dfc95f5', 'a5fdde22-0b23-520b-b5a3-12c98e1e40a6', 3.75, 'not_checked', NULL, '2026-09-10 09:00:00', NULL, NULL, NULL);

-- satellite_images: 5 rows
INSERT INTO `satellite_images` (`image_id`, `paddy_id`, `captured_at`, `source`, `file_path`, `cloud_cover_pct`, `ndvi_value`, `ndwi_value`) VALUES
('661684e3-1699-545c-b908-41caa68cda6f', 'ceed0afb-bfe3-5ca5-921b-c28c9bb7db39', '2026-05-16', 'Sentinel-2', 'mock/satellite/paddy_1.tif', 5, 0.46, -0.05),
('ac1ac1fc-4f97-5239-b6f5-a5a9a04b6c81', 'f1287ffd-592b-5db2-bfb4-2253f3bafacf', '2026-05-17', 'Sentinel-2', 'mock/satellite/paddy_2.tif', 10, 0.52, 0.0),
('e58a7fef-6c92-5c62-9ec2-d916b292f1c8', 'a5fdde22-0b23-520b-b5a3-12c98e1e40a6', '2026-05-18', 'Sentinel-2', 'mock/satellite/paddy_3.tif', 15, 0.58, 0.05),
('42b09349-9db6-5a99-9510-d263850e2972', 'd4c21e1b-3a01-52d9-80ab-5638ec3ea3c6', '2026-10-25', 'Sentinel-2', 'mock/satellite/paddy_4.tif', 20, 0.64, 0.1),
('6425a986-eeb1-5d52-b69f-b221e613f7c6', 'd22ee80b-eb0c-5daa-a6bb-84416a5a5a67', '2026-10-26', 'Sentinel-2', 'mock/satellite/paddy_5.tif', 25, 0.7, 0.15);

-- notifications: 5 rows
INSERT INTO `notifications` (`notification_id`, `user_id`, `channel`, `notif_type`, `message`, `status`, `sent_at`, `error_message`) VALUES
('f8be3ee8-a7d5-5e45-a3a4-5a3be7c4b30f', '631baedb-ad9b-531e-a4b4-b30ed561748d', 'line', 'water_level_alert', '[MOCK] แปลงนาทดสอบ 1: กรุณาตรวจสอบระดับน้ำ', 'pending', NULL, NULL),
('5d9a252a-1a9d-5958-bda3-2e1653da27f1', '2bdbeed9-281c-5414-a680-918006d0e1c2', 'line', 'water_level_alert', '[MOCK] แปลงนาทดสอบ 2: กรุณาตรวจสอบระดับน้ำ', 'sent', '2026-11-04 12:01:00', NULL),
('9a5303d4-b5e0-5af6-a978-2ddee7abeccd', 'e6876a9f-40f4-555f-a830-45eea08e7dbf', 'line', 'water_level_alert', '[MOCK] แปลงนาทดสอบ 3: กรุณาตรวจสอบระดับน้ำ', 'failed', NULL, 'MOCK: simulated delivery failure'),
('78a3aa04-96f9-59f3-82fc-29a102b82458', '631baedb-ad9b-531e-a4b4-b30ed561748d', 'line', 'water_level_alert', '[MOCK] แปลงนาทดสอบ 4: กรุณาตรวจสอบระดับน้ำ', 'sent', '2026-11-04 12:01:00', NULL),
('f81ffc40-b6e2-5f5c-aa97-41724dce7d62', '2bdbeed9-281c-5414-a680-918006d0e1c2', 'line', 'water_level_alert', '[MOCK] แปลงนาทดสอบ 5: กรุณาตรวจสอบระดับน้ำ', 'pending', NULL, NULL);

COMMIT;
