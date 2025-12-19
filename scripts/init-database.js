#!/usr/bin/env node

/**
 * 資料庫初始化腳本
 * 
 * 此腳本會建立所有必要的資料表，包含：
 * - 基礎功能資料表（11個）
 * - 商家管理系統資料表（4個）
 * 
 * 使用方式：
 * node scripts/init-database.js
 */

const mysql = require('mysql2/promise');

// 從環境變數讀取資料庫連接資訊
const config = {
  host: process.env.MYSQLHOST || 'localhost',
  port: parseInt(process.env.MYSQLPORT || '3306'),
  user: process.env.MYSQLUSER || 'root',
  password: process.env.MYSQLPASSWORD || '',
  database: process.env.MYSQLDATABASE || 'railway',
};

// SQL 建表語句
const createTableStatements = [
  // 1. users - 使用者表（包含三層權限）
  `CREATE TABLE IF NOT EXISTS users (
    id int AUTO_INCREMENT PRIMARY KEY,
    openId varchar(64) UNIQUE,
    name text,
    email varchar(320),
    loginMethod varchar(64),
    role enum('user','merchant','admin') NOT NULL DEFAULT 'user',
    createdAt timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updatedAt timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    lastSignedIn timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
    phone varchar(20) UNIQUE,
    deviceId varchar(64),
    deviceBoundAt timestamp
  )`,

  // 2. restaurants - 餐廳表
  `CREATE TABLE IF NOT EXISTS restaurants (
    id int AUTO_INCREMENT PRIMARY KEY,
    name varchar(255) NOT NULL,
    address text NOT NULL,
    latitude varchar(50),
    longitude varchar(50),
    phone varchar(20),
    description text,
    photoUrl text,
    operatingHours text NOT NULL,
    providesCheckInReward boolean NOT NULL DEFAULT false,
    isActive boolean NOT NULL DEFAULT true,
    createdAt timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updatedAt timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
  )`,

  // 3. coupons - 優惠券表
  `CREATE TABLE IF NOT EXISTS coupons (
    id int AUTO_INCREMENT PRIMARY KEY,
    restaurantId int NOT NULL,
    title varchar(255) NOT NULL,
    description text NOT NULL,
    type enum('discount','gift','cashback') NOT NULL DEFAULT 'discount',
    expiresAt timestamp,
    isActive boolean NOT NULL DEFAULT true,
    createdAt timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updatedAt timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
  )`,

  // 4. spin_history - 轉盤歷史表
  `CREATE TABLE IF NOT EXISTS spin_history (
    id int AUTO_INCREMENT PRIMARY KEY,
    userId int NOT NULL,
    restaurantId int NOT NULL,
    couponId int,
    mealPeriod enum('breakfast','lunch','afternoon_tea','dinner','late_night') NOT NULL,
    isShared boolean DEFAULT false NOT NULL,
    createdAt timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`,

  // 5. coupon_redemptions - 優惠券兌換表
  `CREATE TABLE IF NOT EXISTS coupon_redemptions (
    id int AUTO_INCREMENT PRIMARY KEY,
    userId int NOT NULL,
    restaurantId int NOT NULL,
    couponId int NOT NULL,
    spinHistoryId int,
    redeemedAt timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`,

  // 6. check_in_records - 簽到記錄表
  `CREATE TABLE IF NOT EXISTS check_in_records (
    id int AUTO_INCREMENT PRIMARY KEY,
    userId int NOT NULL,
    checkInDate varchar(10) NOT NULL,
    consecutiveDays int NOT NULL DEFAULT 1,
    rewardClaimed boolean NOT NULL DEFAULT false,
    createdAt timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`,

  // 7. push_notifications - 推播通知表
  `CREATE TABLE IF NOT EXISTS push_notifications (
    id int AUTO_INCREMENT PRIMARY KEY,
    title varchar(255) NOT NULL,
    content text NOT NULL,
    imageUrl text,
    couponId int,
    status enum('draft','scheduled','sent') NOT NULL DEFAULT 'draft',
    scheduledAt timestamp,
    sentAt timestamp,
    createdBy int NOT NULL,
    createdAt timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updatedAt timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
  )`,

  // 8. user_notification_reads - 使用者通知已讀表
  `CREATE TABLE IF NOT EXISTS user_notification_reads (
    id int AUTO_INCREMENT PRIMARY KEY,
    userId int NOT NULL,
    notificationId int NOT NULL,
    readAt timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`,

  // 9. system_settings - 系統設定表
  `CREATE TABLE IF NOT EXISTS system_settings (
    id int AUTO_INCREMENT PRIMARY KEY,
    \`key\` varchar(100) NOT NULL UNIQUE,
    value text,
    description text,
    updatedAt timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
  )`,

  // 10. spin_limits - 轉盤限制表
  `CREATE TABLE IF NOT EXISTS spin_limits (
    id int AUTO_INCREMENT PRIMARY KEY,
    userId int NOT NULL,
    date varchar(10) NOT NULL,
    mealPeriod enum('breakfast','lunch','afternoon_tea','dinner','late_night') NOT NULL,
    usedCount int NOT NULL DEFAULT 0,
    dailyCouponCount int NOT NULL DEFAULT 0,
    updatedAt timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
  )`,

  // 11. custom_wheel_styles - 自訂轉盤樣式表
  `CREATE TABLE IF NOT EXISTS custom_wheel_styles (
    id int AUTO_INCREMENT PRIMARY KEY,
    name varchar(255) NOT NULL,
    type enum('canvas','image') NOT NULL DEFAULT 'canvas',
    style varchar(100) NOT NULL,
    imageUrl text,
    config text,
    isDefault boolean NOT NULL DEFAULT false,
    createdBy int NOT NULL,
    createdAt timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updatedAt timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
  )`,

  // 12. merchants - 商家表
  `CREATE TABLE IF NOT EXISTS merchants (
    id int AUTO_INCREMENT PRIMARY KEY,
    userId int NOT NULL UNIQUE,
    name varchar(255) NOT NULL,
    contactPhone varchar(20),
    contactEmail varchar(320),
    status enum('active','suspended','inactive') DEFAULT 'active' NOT NULL,
    notes text,
    createdBy int NOT NULL,
    createdAt timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updatedAt timestamp DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP NOT NULL,
    INDEX idx_userId (userId),
    INDEX idx_status (status)
  )`,

  // 13. merchant_restaurants - 商家與餐廳關聯表
  `CREATE TABLE IF NOT EXISTS merchant_restaurants (
    id int AUTO_INCREMENT PRIMARY KEY,
    merchantId int NOT NULL,
    restaurantId int NOT NULL,
    boundAt timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
    boundBy int NOT NULL,
    UNIQUE KEY unique_merchant_restaurant (merchantId, restaurantId),
    INDEX idx_merchantId (merchantId),
    INDEX idx_restaurantId (restaurantId)
  )`,

  // 14. restaurant_statistics - 餐廳統計表
  `CREATE TABLE IF NOT EXISTS restaurant_statistics (
    id int AUTO_INCREMENT PRIMARY KEY,
    restaurantId int NOT NULL,
    date varchar(10) NOT NULL,
    totalSpins int DEFAULT 0 NOT NULL,
    breakfastSpins int DEFAULT 0 NOT NULL,
    lunchSpins int DEFAULT 0 NOT NULL,
    afternoonTeaSpins int DEFAULT 0 NOT NULL,
    dinnerSpins int DEFAULT 0 NOT NULL,
    lateNightSpins int DEFAULT 0 NOT NULL,
    couponsIssued int DEFAULT 0 NOT NULL,
    couponsRedeemed int DEFAULT 0 NOT NULL,
    redemptionRate int DEFAULT 0 NOT NULL,
    uniqueUsers int DEFAULT 0 NOT NULL,
    createdAt timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updatedAt timestamp DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP NOT NULL,
    UNIQUE KEY unique_restaurant_date (restaurantId, date),
    INDEX idx_restaurantId (restaurantId),
    INDEX idx_date (date)
  )`,

  // 15. restaurant_reviews - 餐廳評價表
  `CREATE TABLE IF NOT EXISTS restaurant_reviews (
    id int AUTO_INCREMENT PRIMARY KEY,
    restaurantId int NOT NULL,
    userId int NOT NULL,
    rating int NOT NULL,
    comment text,
    photoUrls text,
    isApproved boolean DEFAULT FALSE NOT NULL,
    approvedBy int,
    approvedAt timestamp,
    createdAt timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updatedAt timestamp DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP NOT NULL,
    INDEX idx_restaurantId (restaurantId),
    INDEX idx_userId (userId),
    INDEX idx_isApproved (isApproved)
  )`
];

const tableNames = [
  'users', 'restaurants', 'coupons', 'spin_history', 'coupon_redemptions',
  'check_in_records', 'push_notifications', 'user_notification_reads',
  'system_settings', 'spin_limits', 'custom_wheel_styles',
  'merchants', 'merchant_restaurants', 'restaurant_statistics', 'restaurant_reviews'
];

async function initDatabase() {
  let connection;
  
  try {
    console.log('🔌 正在連接到 MySQL...');
    console.log(`   Host: ${config.host}:${config.port}`);
    console.log(`   Database: ${config.database}`);
    console.log(`   User: ${config.user}`);
    
    connection = await mysql.createConnection(config);
    console.log('✅ 連接成功！\n');

    console.log('📊 開始建立資料表...\n');
    
    for (let i = 0; i < createTableStatements.length; i++) {
      const tableName = tableNames[i];
      console.log(`   ${i + 1}. 建立 ${tableName} 表...`);
      await connection.execute(createTableStatements[i]);
    }
    
    console.log('\n✅ 所有資料表建立完成！\n');

    // 驗證資料表
    console.log('📋 驗證資料表...\n');
    const [tables] = await connection.execute('SHOW TABLES');
    
    console.log(`✅ 成功建立 ${tables.length} 個資料表：\n`);
    tables.forEach((table, index) => {
      const tableName = Object.values(table)[0];
      console.log(`   ${index + 1}. ${tableName}`);
    });

    console.log('\n🎉 資料庫初始化完成！');
    
  } catch (error) {
    console.error('\n❌ 錯誤：', error.message);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

// 執行初始化
initDatabase();
