# 資料庫初始化腳本

## 使用方法

### 在 Railway 上執行

1. 確保專案已部署到 Railway
2. 在 Railway 專案頁面，點擊 food-roulette 服務
3. 點擊右上角的「...」選單
4. 選擇「Run a Command」或進入 Shell
5. 執行以下命令：

```bash
node scripts/init-database.js
```

### 在本地執行

確保已設定環境變數：

```bash
export DATABASE_URL="mysql://user:password@host:port/database"
node scripts/init-database.js
```

## 功能

此腳本會建立以下資料表：

1. users - 使用者資料表（包含三層權限）
2. restaurants - 餐廳資料表
3. coupons - 優惠券資料表
4. spin_history - 轉盤歷史記錄
5. coupon_redemptions - 優惠券兌換記錄
6. check_in_records - 簽到記錄
7. push_notifications - 推播通知
8. user_notification_reads - 通知已讀記錄
9. system_settings - 系統設定
10. spin_limits - 轉盤限制
11. custom_wheel_styles - 自訂轉盤樣式
12. merchants - 商家資料表
13. merchant_restaurants - 商家與餐廳關聯表
14. restaurant_statistics - 餐廳統計資料表
15. restaurant_reviews - 餐廳評價表

## 注意事項

- 此腳本使用 `CREATE TABLE IF NOT EXISTS`，不會覆蓋現有資料
- 執行前請確保 DATABASE_URL 環境變數已正確設定
- Railway 環境會自動提供 DATABASE_URL
