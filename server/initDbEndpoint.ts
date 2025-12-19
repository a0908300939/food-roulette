/**
 * 臨時資料庫初始化端點
 * 
 * 此端點僅用於一次性初始化資料庫
 * 執行完成後應立即刪除此檔案
 * 
 * 訪問: https://your-domain.com/init-database-now
 * 使用 Railway 私有網路連接
 */

import { Router } from 'express';
import mysql from 'mysql2/promise';

export const initDbEndpoint = Router();

initDbEndpoint.get('/init-database-now', async (req, res) => {
  let connection;
  
  try {
    // 建立資料庫連接 - 優先使用 DATABASE_URL
    if (process.env.DATABASE_URL) {
      // 使用 DATABASE_URL 連接字串
      connection = await mysql.createConnection(process.env.DATABASE_URL);
    } else {
      // 備用方案：使用分離的環境變數
      const dbConfig = {
        host: process.env.MYSQL_PRIVATE_DOMAIN || process.env.MYSQLHOST,
        port: process.env.MYSQL_PRIVATE_DOMAIN ? 3306 : parseInt(process.env.MYSQLPORT || '3306'),
        user: process.env.MYSQLUSER || 'root',
        password: process.env.MYSQLPASSWORD,
        database: process.env.MYSQLDATABASE || 'railway'
      };
      connection = await mysql.createConnection(dbConfig);
    }
    
    const tables = [
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

    const results = [];

    // 執行建表語句
    for (let i = 0; i < tables.length; i++) {
      await connection.execute(tables[i]);
      results.push({
        table: tableNames[i],
        status: 'created'
      });
    }

    // 驗證資料表
    const [verifyResult] = await connection.execute('SHOW TABLES');
    
    // 返回 HTML 格式的成功頁面
    res.send(`
      <!DOCTYPE html>
      <html lang="zh-TW">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>資料庫初始化成功</title>
        <style>
          body {
            font-family: 'Microsoft JhengHei', sans-serif;
            max-width: 800px;
            margin: 50px auto;
            padding: 20px;
            background: #f5f5f5;
          }
          .container {
            background: white;
            padding: 30px;
            border-radius: 10px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
          }
          h1 {
            color: #4CAF50;
            border-bottom: 3px solid #4CAF50;
            padding-bottom: 10px;
          }
          .success {
            background: #d4edda;
            border: 1px solid #c3e6cb;
            color: #155724;
            padding: 15px;
            border-radius: 5px;
            margin: 20px 0;
          }
          .table-list {
            background: #f8f9fa;
            padding: 15px;
            border-radius: 5px;
            margin: 20px 0;
          }
          .table-list ul {
            columns: 2;
            list-style-position: inside;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <h1>🎉 資料庫初始化成功！</h1>
          
          <div class="success">
            <h2>✅ 初始化完成</h2>
            <p><strong>建立的資料表數量：</strong>${results.length} 個</p>
            <p><strong>總資料表數量：</strong>${(verifyResult as any[]).length} 個</p>
          </div>
          
          <div class="table-list">
            <h3>📋 資料表列表：</h3>
            <ul>
              ${tableNames.map(name => `<li>${name}</li>`).join('')}
            </ul>
          </div>
          
          <p><strong>下一步：</strong></p>
          <ol>
            <li>前往網站首頁</li>
            <li>使用管理員帳號登入</li>
            <li>開始使用商家管理功能</li>
          </ol>
          
          <p style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; color: #666;">
            <small>⚠️ 注意：此初始化端點應在使用後立即刪除以確保安全。</small>
          </p>
        </div>
      </body>
      </html>
    `);

  } catch (error: any) {
    console.error('資料庫初始化錯誤:', error);
    
    // 返回 HTML 格式的錯誤頁面
    res.status(500).send(`
      <!DOCTYPE html>
      <html lang="zh-TW">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>資料庫初始化失敗</title>
        <style>
          body {
            font-family: 'Microsoft JhengHei', sans-serif;
            max-width: 800px;
            margin: 50px auto;
            padding: 20px;
            background: #f5f5f5;
          }
          .container {
            background: white;
            padding: 30px;
            border-radius: 10px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
          }
          h1 {
            color: #dc3545;
            border-bottom: 3px solid #dc3545;
            padding-bottom: 10px;
          }
          .error {
            background: #f8d7da;
            border: 1px solid #f5c6cb;
            color: #721c24;
            padding: 15px;
            border-radius: 5px;
            margin: 20px 0;
          }
          pre {
            background: #f8f9fa;
            padding: 15px;
            border-radius: 5px;
            overflow-x: auto;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <h1>❌ 資料庫初始化失敗</h1>
          
          <div class="error">
            <h2>錯誤訊息：</h2>
            <pre>${error.message}</pre>
          </div>
          
          <p><strong>可能的原因：</strong></p>
          <ul>
            <li>資料庫連接失敗</li>
            <li>環境變數未正確設定</li>
            <li>MySQL 服務未運行</li>
          </ul>
          
          <p><strong>建議：</strong></p>
          <ol>
            <li>檢查 Railway 的環境變數設定</li>
            <li>確認 MySQL 服務正在運行</li>
            <li>查看 Deploy Logs 了解詳細錯誤</li>
          </ol>
        </div>
      </body>
      </html>
    `);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
});
