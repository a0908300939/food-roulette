-- 商家管理系統資料庫遷移腳本
-- 此腳本會建立商家管理系統所需的所有資料表

-- 1. 檢查 users 表是否已有 role 欄位，如果沒有則新增
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS role ENUM('user', 'merchant', 'admin') DEFAULT 'user' NOT NULL;

-- 2. 建立 merchants 表（如果不存在）
CREATE TABLE IF NOT EXISTS merchants (
  id INT AUTO_INCREMENT PRIMARY KEY,
  userId INT NOT NULL UNIQUE,
  name VARCHAR(255) NOT NULL,
  contactPhone VARCHAR(20),
  contactEmail VARCHAR(320),
  status ENUM('active', 'suspended', 'inactive') DEFAULT 'active' NOT NULL,
  notes TEXT,
  createdBy INT NOT NULL,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP NOT NULL,
  FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_userId (userId),
  INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. 建立 merchant_restaurants 表（如果不存在）
CREATE TABLE IF NOT EXISTS merchant_restaurants (
  id INT AUTO_INCREMENT PRIMARY KEY,
  merchantId INT NOT NULL,
  restaurantId INT NOT NULL,
  boundAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  boundBy INT NOT NULL,
  FOREIGN KEY (merchantId) REFERENCES merchants(id) ON DELETE CASCADE,
  FOREIGN KEY (restaurantId) REFERENCES restaurants(id) ON DELETE CASCADE,
  UNIQUE KEY unique_merchant_restaurant (merchantId, restaurantId),
  INDEX idx_merchantId (merchantId),
  INDEX idx_restaurantId (restaurantId)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4. 建立 restaurant_statistics 表（如果不存在）
CREATE TABLE IF NOT EXISTS restaurant_statistics (
  id INT AUTO_INCREMENT PRIMARY KEY,
  restaurantId INT NOT NULL,
  date VARCHAR(10) NOT NULL,
  totalSpins INT DEFAULT 0 NOT NULL,
  breakfastSpins INT DEFAULT 0 NOT NULL,
  lunchSpins INT DEFAULT 0 NOT NULL,
  afternoonTeaSpins INT DEFAULT 0 NOT NULL,
  dinnerSpins INT DEFAULT 0 NOT NULL,
  lateNightSpins INT DEFAULT 0 NOT NULL,
  couponsIssued INT DEFAULT 0 NOT NULL,
  couponsRedeemed INT DEFAULT 0 NOT NULL,
  redemptionRate INT DEFAULT 0 NOT NULL,
  uniqueUsers INT DEFAULT 0 NOT NULL,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP NOT NULL,
  FOREIGN KEY (restaurantId) REFERENCES restaurants(id) ON DELETE CASCADE,
  UNIQUE KEY unique_restaurant_date (restaurantId, date),
  INDEX idx_restaurantId (restaurantId),
  INDEX idx_date (date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 5. 建立 restaurant_reviews 表（如果不存在）
CREATE TABLE IF NOT EXISTS restaurant_reviews (
  id INT AUTO_INCREMENT PRIMARY KEY,
  restaurantId INT NOT NULL,
  userId INT NOT NULL,
  rating INT NOT NULL,
  comment TEXT,
  photoUrls TEXT,
  isApproved BOOLEAN DEFAULT FALSE NOT NULL,
  approvedBy INT,
  approvedAt TIMESTAMP,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP NOT NULL,
  FOREIGN KEY (restaurantId) REFERENCES restaurants(id) ON DELETE CASCADE,
  FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_restaurantId (restaurantId),
  INDEX idx_userId (userId),
  INDEX idx_isApproved (isApproved)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 完成！
SELECT 'Migration completed successfully!' AS status;
