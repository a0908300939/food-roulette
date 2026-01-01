-- 加入 weight 欄位到 coupons 表
ALTER TABLE `coupons` ADD COLUMN `weight` int NOT NULL DEFAULT 5;
