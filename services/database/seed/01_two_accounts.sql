-- Clean start: no paddies, calendars or credits, just the reference stages and two accounts.
-- Loaded by docker-compose.yml on first start (while services/database/data is empty).
-- The old sample data is still in services/database/mock/ if you need it again.

SET NAMES utf8mb4;

-- Reference data the app needs (rice growth stages, day 0 = planting)
INSERT INTO `rice_stages` (`stage_no`, `stage_name`, `start_day`, `end_day`) VALUES
(1, 'เตรียมดิน', -14, -1),
(2, 'ระยะกล้า', 0, 20),
(3, 'แตกกอ', 21, 45),
(4, 'ตั้งท้อง', 46, 70),
(5, 'ออกรวง', 71, 95),
(6, 'สุกแก่และเก็บเกี่ยว', 96, 120);

INSERT INTO `users` (`user_id`, `display_name`, `phone`, `role`, `address`, `province`, `district`, `is_active`) VALUES
('a0000000-0000-4000-8000-000000000001', 'FarmerA', NULL, 'farmer',   NULL, 'สุพรรณบุรี', 'เมืองสุพรรณบุรี', 1),
('b0000000-0000-4000-8000-000000000001', 'VBB',     NULL, 'verifier', NULL, 'สุพรรณบุรี', 'เมืองสุพรรณบุรี', 1);
