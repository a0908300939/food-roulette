# 草屯美食轉盤 - 專案完整文件

## 📋 專案概述

**草屯美食轉盤**是一個互動式餐廳推薦與優惠券發放系統，透過趣味的轉盤抽獎機制，幫助使用者決定用餐地點，並獲得專屬優惠券。

### 核心特色
- 🎡 **互動式轉盤抽獎** - 根據當前時段智能篩選營業中的餐廳
- 🎫 **優惠券系統** - 抽中餐廳即可獲得專屬優惠券
- ✅ **簽到獎勵** - 連續簽到7天獲得額外獎勵
- 📊 **數據分析儀表板** - 完整的使用統計和視覺化圖表
- 🔔 **推播通知** - 即時訊息推送功能
- 📱 **PWA 支援** - 可安裝為手機 App，離線也能使用
- 🎨 **自訂轉盤樣式** - 管理員可自訂轉盤外觀

---

## 🏗️ 技術架構

### 前端技術棧
- **框架**: React 19.2.0 + TypeScript 5.9.3
- **樣式**: Tailwind CSS 4.1.14 + Framer Motion
- **狀態管理**: TanStack Query (React Query) 5.90.2
- **路由**: Wouter 3.7.1
- **UI 元件**: Radix UI 全套元件
- **表單處理**: React Hook Form 7.64.0
- **動畫效果**: Canvas Confetti + Framer Motion
- **轉盤元件**: react-wheel-of-prizes 1.1.0

### 後端技術棧
- **運行環境**: Node.js 22 + Express 4.21.2
- **API 框架**: tRPC 11.6.0 (端到端型別安全)
- **資料庫**: MySQL + Drizzle ORM 0.44.6
- **認證系統**: Manus OAuth + LINE Login (選填)
- **檔案儲存**: AWS S3 (圖片上傳)
- **建置工具**: Vite 7.1.9 + esbuild 0.25.10

### 開發工具
- **套件管理**: pnpm 10.18.0
- **測試框架**: Vitest 2.1.9
- **程式碼格式化**: Prettier 3.6.2
- **型別檢查**: TypeScript strict mode

---

## 📂 專案結構

```
food-roulette/
├── client/                    # 前端應用
│   ├── src/
│   │   ├── pages/            # 頁面元件
│   │   │   ├── Home.tsx      # 首頁（轉盤）
│   │   │   ├── MyCoupons.tsx # 我的優惠券
│   │   │   ├── CheckIn.tsx   # 簽到頁面
│   │   │   └── admin/        # 後台管理頁面
│   │   │       ├── RestaurantManagement.tsx  # 店家管理
│   │   │       ├── CouponManagement.tsx      # 優惠券管理
│   │   │       ├── UserManagement.tsx        # 使用者管理
│   │   │       └── Analytics.tsx             # 數據分析
│   │   ├── components/       # UI 元件
│   │   │   ├── SpinWheel.tsx # 轉盤元件
│   │   │   ├── CouponCard.tsx # 優惠券卡片
│   │   │   └── ui/           # 基礎 UI 元件
│   │   ├── hooks/            # 自訂 Hooks
│   │   ├── lib/              # 工具函數
│   │   └── contexts/         # React Context
│   └── public/               # 靜態資源
│       ├── logo.png          # Logo
│       ├── manifest.json     # PWA 設定
│       ├── spin-sound.mp3    # 轉盤音效
│       └── win-sound.mp3     # 中獎音效
│
├── server/                    # 後端應用
│   ├── _core/                # 核心功能
│   │   ├── index.ts          # 伺服器入口
│   │   ├── context.ts        # tRPC Context
│   │   ├── oauth.ts          # OAuth 認證
│   │   └── trpc.ts           # tRPC 設定
│   ├── routers.ts            # API 路由定義
│   ├── db.ts                 # 資料庫操作
│   ├── adminRouter.ts        # 管理員 API
│   ├── checkInRouter.ts      # 簽到 API
│   ├── spinLimitRouter.ts    # 轉盤限制 API
│   └── pushNotificationRouter.ts  # 推播 API
│
├── drizzle/                   # 資料庫架構
│   ├── schema.ts             # 資料表定義
│   ├── relations.ts          # 關聯定義
│   └── migrations/           # 遷移檔案
│
├── shared/                    # 共用程式碼
│   ├── types.ts              # 型別定義
│   └── const.ts              # 常數定義
│
├── dist/                      # 建置輸出
│   ├── public/               # 前端靜態檔案
│   └── index.js              # 後端執行檔
│
├── package.json              # 專案設定
├── tsconfig.json             # TypeScript 設定
├── vite.config.ts            # Vite 設定
├── drizzle.config.ts         # Drizzle 設定
└── .env                      # 環境變數
```

---

## 🗄️ 資料庫架構

### 1. users (使用者資料表)
```typescript
{
  id: number (PK)
  openId: string (unique)      // OAuth ID
  name: string
  email: string
  phone: string (unique)       // 台灣手機號碼
  loginMethod: string          // 登入方式
  deviceId: string             // 裝置指紋
  deviceBoundAt: timestamp     // 裝置綁定時間
  role: enum ['user', 'admin'] // 角色
  createdAt: timestamp
  updatedAt: timestamp
  lastSignedIn: timestamp
}
```

### 2. restaurants (店家資料表)
```typescript
{
  id: number (PK)
  name: string                 // 店家名稱
  address: string              // 地址
  latitude: string             // 緯度
  longitude: string            // 經度
  phone: string                // 電話
  description: string          // 描述
  photoUrl: string             // 店家照片 URL
  operatingHours: JSON         // 營業時間
  providesCheckInReward: boolean  // 是否提供簽到獎勵
  isActive: boolean            // 是否啟用
  createdAt: timestamp
  updatedAt: timestamp
}
```

### 3. coupons (優惠券資料表)
```typescript
{
  id: number (PK)
  restaurantId: number (FK)    // 關聯店家
  title: string                // 優惠券標題
  description: string          // 描述
  imageUrl: string             // 圖片 URL
  type: enum ['discount', 'gift', 'cashback', 'check_in_reward']
  expiresAt: timestamp         // 有效期限
  isCheckInReward: boolean     // 是否為簽到獎勵
  isActive: boolean
  createdAt: timestamp
  updatedAt: timestamp
}
```

### 4. spinHistory (轉盤使用記錄)
```typescript
{
  id: number (PK)
  userId: number (FK)
  restaurantId: number (FK)
  couponId: number (FK)
  mealPeriod: enum ['breakfast', 'lunch', 'afternoon_tea', 'dinner', 'late_night']
  isExpired: boolean           // 是否已失效
  isShared: boolean            // 是否已分享
  createdAt: timestamp
}
```

### 5. couponRedemptions (優惠券兌換記錄)
```typescript
{
  id: number (PK)
  userId: number (FK)
  couponId: number (FK)
  spinHistoryId: number (FK)
  redeemedAt: timestamp
  createdAt: timestamp
}
```

### 6. checkInRecords (簽到記錄)
```typescript
{
  id: number (PK)
  userId: number (FK)
  restaurantId: number (FK)
  checkInDate: date            // 簽到日期
  consecutiveDays: number      // 連續簽到天數
  rewardClaimed: boolean       // 是否已領取獎勵
  createdAt: timestamp
}
```

### 7. pushNotifications (推播通知)
```typescript
{
  id: number (PK)
  userId: number (FK)
  title: string
  message: string
  type: enum ['info', 'promotion', 'system']
  isRead: boolean
  createdAt: timestamp
}
```

### 8. spinLimits (轉盤限制設定)
```typescript
{
  id: number (PK)
  userId: number (FK)
  date: date
  spinsUsed: number            // 已使用次數
  maxSpins: number             // 最大次數
  bonusSpins: number           // 額外次數
  createdAt: timestamp
  updatedAt: timestamp
}
```

### 9. customWheelStyles (自訂轉盤樣式)
```typescript
{
  id: number (PK)
  name: string
  colors: JSON                 // 顏色設定
  borderWidth: number
  borderColor: string
  textColor: string
  isActive: boolean
  createdAt: timestamp
  updatedAt: timestamp
}
```

---

## 🎯 核心功能說明

### 1. 轉盤抽獎系統

#### 運作流程
1. **時段判斷** - 系統根據當前時間判斷用餐時段
   - 早餐: 06:00-10:00
   - 午餐: 10:00-14:00
   - 下午茶: 14:00-17:00
   - 晚餐: 17:00-21:00
   - 消夜: 21:00-02:00

2. **店家篩選** - 根據營業時間篩選當前營業中的店家

3. **後端決定結果** (符合您的偏好)
   - 使用者點擊「開始抽獎」
   - 後端先決定抽中哪家店家和優惠券
   - 將結果傳回前端

4. **前端動畫呈現**
   - 轉盤旋轉並停在對應位置
   - 播放音效和動畫效果
   - 顯示中獎結果

5. **優惠券發放**
   - 自動記錄到 spinHistory
   - 使用者可在「我的優惠券」查看

#### 抽獎限制
- 每天基本次數: 3次
- 分享後額外獎勵: +1次
- 連續簽到獎勵: 最多+2次

### 2. 優惠券系統

#### 優惠券類型
- **折扣券** (discount) - 全品項折扣
- **贈品券** (gift) - 買一送一、免費贈品
- **現金回饋** (cashback) - 消費回饋
- **簽到獎勵券** (check_in_reward) - 連續簽到專屬

#### 有效期規則 (符合您的偏好)
- 優惠券有效期: 當日 24:00
- 過期自動標記為「已失效」
- 失效後2天內顯示「已失效」標籤
- 2天後完全從前台隱藏

#### 兌換流程
1. 使用者在店家出示優惠券
2. 店家掃描或確認優惠券代碼
3. 系統記錄兌換時間
4. 優惠券狀態變更為「已使用」

### 3. 簽到獎勵系統

#### 簽到規則
- 每天可簽到一次
- 連續簽到累計天數
- 中斷後重新計算

#### 獎勵機制
- 連續簽到3天: +1次轉盤機會
- 連續簽到7天: 專屬優惠券
- 連續簽到14天: +2次轉盤機會 + 特殊優惠券

### 4. 後台管理系統

#### 店家管理
- 新增/編輯/刪除店家
- 設定營業時間 (視覺化介面)
- 上傳店家照片
- 設定地理位置 (經緯度)
- 啟用/停用店家

#### 優惠券管理
- 新增/編輯/刪除優惠券
- 設定優惠券類型和內容
- 上傳優惠券圖片
- 設定有效期限
- 查看使用統計

#### 使用者管理
- 查看所有使用者列表
- 查看使用者抽獎記錄
- 查看使用者優惠券
- 設定管理員權限

#### 數據分析
- 使用者統計 (總數、活躍數)
- 轉盤使用統計 (各時段)
- 店家抽出次數排行
- 優惠券兌換率分析
- 圖表視覺化呈現

### 5. 推播通知系統

#### 通知類型
- **資訊通知** (info) - 一般訊息
- **促銷通知** (promotion) - 優惠活動
- **系統通知** (system) - 系統公告

#### 推送時機
- 新優惠券發放
- 簽到獎勵達成
- 優惠券即將過期
- 特殊活動通知

---

## 🚀 部署指南

### 環境需求
- Node.js 22+
- MySQL 8.0+
- pnpm 10+

### 環境變數設定

建立 `.env` 檔案：

```bash
# 應用程式基本設定
VITE_APP_TITLE=草屯美食轉盤
VITE_APP_ID=your-app-id

# OAuth 設定 (Manus 平台)
VITE_OAUTH_PORTAL_URL=https://manus.im
OAUTH_SERVER_URL=https://api.manus.im

# 資料庫連線
DATABASE_URL=mysql://user:password@host:3306/database

# JWT Secret
JWT_SECRET=your-secret-key

# 擁有者 OpenID (超級管理員)
OWNER_OPEN_ID=your-openid

# Forge API (用於 AI 功能，選填)
BUILT_IN_FORGE_API_URL=
BUILT_IN_FORGE_API_KEY=

# LINE Login 設定 (選填)
LINE_CHANNEL_ID=
LINE_CHANNEL_SECRET=

# Analytics (選填)
VITE_ANALYTICS_ENDPOINT=
VITE_ANALYTICS_WEBSITE_ID=

# 環境設定
NODE_ENV=production
PORT=3000
```

### 安裝與建置

```bash
# 1. 安裝依賴
pnpm install

# 2. 執行資料庫 migration
pnpm db:push

# 3. 建置生產版本
pnpm build

# 4. 啟動生產伺服器
pnpm start
```

### 開發模式

```bash
# 啟動開發伺服器 (支援 HMR)
pnpm dev

# 執行測試
pnpm test

# 型別檢查
pnpm check

# 程式碼格式化
pnpm format
```

---

## 📱 PWA 功能

### 安裝為 App
使用者可以將網頁安裝到手機主畫面：
1. 訪問網站
2. 點擊「安裝到主畫面」提示
3. 確認安裝
4. 像 App 一樣使用

### 離線支援
- Service Worker 快取靜態資源
- 離線時可查看已獲得的優惠券
- 網路恢復後自動同步

### 推播通知
- 支援瀏覽器推播通知
- 優惠券即將過期提醒
- 新活動通知

---

## 🎨 設計特色

### 視覺設計
- **主色調**: 橙色系 (#FF6B35)
- **字體**: Noto Sans TC (支援繁體中文)
- **響應式設計**: 完美支援手機、平板、桌面
- **深色模式**: 自動跟隨系統設定

### 動畫效果
- 轉盤旋轉動畫 (Framer Motion)
- 中獎彩帶效果 (Canvas Confetti)
- 頁面切換動畫
- 優惠券卡片翻轉效果

### 音效
- 轉盤旋轉音效
- 中獎音效
- 可在設定中關閉

---

## 🔒 安全性

### 認證機制
- Manus OAuth 認證
- JWT Token 管理
- Cookie 加密儲存
- 裝置指紋綁定

### 資料保護
- SQL Injection 防護 (Drizzle ORM)
- XSS 防護 (React 自動轉義)
- CSRF Token 驗證
- HTTPS 強制使用

### 權限控制
- 使用者權限: 基本功能
- 管理員權限: 後台管理
- 超級管理員: 完整控制

---

## 📊 效能優化

### 前端優化
- Code Splitting (動態載入)
- 圖片懶載入
- Service Worker 快取
- Gzip 壓縮

### 後端優化
- 資料庫索引優化
- API 回應快取
- 連線池管理
- 查詢效能優化

### 建置優化
- Tree Shaking
- Minification
- CSS 壓縮
- 資源預載入

---

## 🧪 測試

### 單元測試
- 時間篩選邏輯測試
- 轉盤抽獎邏輯測試
- 優惠券有效期測試
- 簽到獎勵計算測試

### 整合測試
- API 端點測試
- 資料庫操作測試
- OAuth 流程測試
- 推播通知測試

### 執行測試
```bash
# 執行所有測試
pnpm test

# 執行特定測試
pnpm test -- wheel.test.ts

# 測試覆蓋率
pnpm test -- --coverage
```

---

## 📝 API 文件

### tRPC API 端點

#### 使用者 API
- `user.me` - 取得當前使用者資訊
- `user.updateProfile` - 更新個人資料
- `user.getMySpinHistory` - 取得我的抽獎記錄
- `user.getMyCoupons` - 取得我的優惠券

#### 轉盤 API
- `wheel.spin` - 執行抽獎
- `wheel.getAvailableRestaurants` - 取得可抽獎店家
- `wheel.getSpinLimit` - 取得今日剩餘次數
- `wheel.shareBonus` - 分享獲得額外次數

#### 簽到 API
- `checkIn.checkIn` - 執行簽到
- `checkIn.getCheckInStatus` - 取得簽到狀態
- `checkIn.getConsecutiveDays` - 取得連續簽到天數

#### 優惠券 API
- `coupon.redeem` - 兌換優惠券
- `coupon.getMyCoupons` - 取得我的優惠券
- `coupon.getCouponDetails` - 取得優惠券詳情

#### 管理員 API
- `admin.restaurants.list` - 取得店家列表
- `admin.restaurants.create` - 新增店家
- `admin.restaurants.update` - 更新店家
- `admin.restaurants.delete` - 刪除店家
- `admin.coupons.list` - 取得優惠券列表
- `admin.coupons.create` - 新增優惠券
- `admin.analytics.getStats` - 取得統計資料

---

## 🐛 已知問題與解決方案

### 問題 1: OAuth 未配置警告
**現象**: 開發環境顯示 "OAUTH_SERVER_URL is not configured"
**解決**: 設定 `.env` 檔案中的 `OAUTH_SERVER_URL` 和 `VITE_OAUTH_PORTAL_URL`

### 問題 2: 資料庫連線失敗
**現象**: 無法連接到資料庫
**解決**: 
1. 確認 `DATABASE_URL` 設定正確
2. 確認 MySQL 服務正在運行
3. 執行 `pnpm db:push` 初始化資料庫

### 問題 3: 轉盤無法抽獎
**現象**: 點擊抽獎按鈕沒有反應
**解決**:
1. 確認資料庫中有店家資料
2. 確認店家營業時間設定正確
3. 確認使用者已登入

---

## 📞 技術支援

如有任何問題，請參考：
- 專案 GitHub Issues
- Manus 平台文件: https://docs.manus.im
- 技術支援: https://help.manus.im

---

## 📄 授權

MIT License

---

## 🎉 致謝

感謝以下開源專案：
- React
- Tailwind CSS
- tRPC
- Drizzle ORM
- Radix UI
- 以及所有貢獻者

---

**最後更新**: 2024-11-30
**版本**: 1.0.0
