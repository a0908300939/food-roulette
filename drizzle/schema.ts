import { int, mysqlEnum, mysqlTable, text, timestamp, varchar, boolean } from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 */
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  // 台灣手機號碼 (09xxxxxxxx)
  phone: varchar("phone", { length: 20 }).unique(),
  loginMethod: varchar("loginMethod", { length: 64 }),
  // 裝置指紋 (SHA-256 hash)
  deviceId: varchar("deviceId", { length: 64 }),
  // 裝置綁定時間
  deviceBoundAt: timestamp("deviceBoundAt"),
  role: mysqlEnum("role", ["user", "merchant", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/**
 * 店家資料表
 * 儲存草屯鎮內所有合作餐廳的基本資訊
 */
export const restaurants = mysqlTable("restaurants", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  address: text("address").notNull(),
  latitude: varchar("latitude", { length: 50 }),
  longitude: varchar("longitude", { length: 50 }),
  phone: varchar("phone", { length: 20 }),
  description: text("description"),
  // 店家照片 URL (儲存在 S3)
  photoUrl: text("photoUrl"),
  // 營業時間以 JSON 格式儲存，例如: {"monday": "10:00-22:00", "tuesday": "10:00-22:00", ...}
  operatingHours: text("operatingHours").notNull(),
  // 是否提供簽到獎勵優惠券
  providesCheckInReward: boolean("providesCheckInReward").default(false).notNull(),
  isActive: boolean("isActive").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Restaurant = typeof restaurants.$inferSelect;
export type InsertRestaurant = typeof restaurants.$inferInsert;

/**
 * 優惠券資料表
 * 每家店家可以設定多張優惠券
 */
export const coupons = mysqlTable("coupons", {
  id: int("id").autoincrement().primaryKey(),
  restaurantId: int("restaurantId").notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description").notNull(),
  // 優惠券圖片 URL (儲存在 S3，選填)
  imageUrl: text("imageUrl"),
  // 優惠券類型: discount (折扣), gift (贈品), cashback (現金回饋), check_in_reward (簽到獎勵)
  type: mysqlEnum("type", ["discount", "gift", "cashback", "check_in_reward"]).default("discount").notNull(),
  // 優惠券有效期限 (null 表示永久有效)
  expiresAt: timestamp("expiresAt"),
  // 是否為簽到獎勵優惠券 (連續簽到 7 天獲得)
  isCheckInReward: boolean("isCheckInReward").default(false).notNull(),
  // 曝光權重 (1-10，數字越大曝光機率越高)
  weight: int("weight").default(5).notNull(),
  isActive: boolean("isActive").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Coupon = typeof coupons.$inferSelect;
export type InsertCoupon = typeof coupons.$inferInsert;

/**
 * 轉盤使用記錄表
 * 追蹤每次使用者旋轉轉盤的記錄
 */
export const spinHistory = mysqlTable("spin_history", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  restaurantId: int("restaurantId").notNull(),
  couponId: int("couponId"),
  // 時段: breakfast, lunch, afternoon_tea, dinner, late_night
  mealPeriod: mysqlEnum("mealPeriod", ["breakfast", "lunch", "afternoon_tea", "dinner", "late_night"]).notNull(),
  // 優惠券是否已失效 (每天 24:00 自動標記為 true)
  isExpired: boolean("isExpired").default(false).notNull(),
  // 是否已分享（分享後獲得 1 次額外轉盤機會）
  isShared: boolean("isShared").default(false).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type SpinHistory = typeof spinHistory.$inferSelect;
export type InsertSpinHistory = typeof spinHistory.$inferInsert;

/**
 * 優惠券兌換記錄表
 * 追蹤使用者實際到店兌換優惠券的記錄
 */
export const couponRedemptions = mysqlTable("coupon_redemptions", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  restaurantId: int("restaurantId").notNull(),
  couponId: int("couponId").notNull(),
  spinHistoryId: int("spinHistoryId"),
  redeemedAt: timestamp("redeemedAt").defaultNow().notNull(),
});

export type CouponRedemption = typeof couponRedemptions.$inferSelect;
export type InsertCouponRedemption = typeof couponRedemptions.$inferInsert;

/**
 * 每日簽到記錄表
 * 追蹤使用者每天的簽到狀態
 */
export const checkInRecords = mysqlTable("check_in_records", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  // 簽到日期 (YYYY-MM-DD 格式)
  checkInDate: varchar("checkInDate", { length: 10 }).notNull(),
  // 連續簽到天數
  consecutiveDays: int("consecutiveDays").default(1).notNull(),
  // 是否已領取當日獎勵 (+1 次轉盤機會)
  rewardClaimed: boolean("rewardClaimed").default(false).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type CheckInRecord = typeof checkInRecords.$inferSelect;
export type InsertCheckInRecord = typeof checkInRecords.$inferInsert;

/**
 * 推播訊息表
 * 管理員可建立推播訊息給所有使用者
 */
export const pushNotifications = mysqlTable("push_notifications", {
  id: int("id").autoincrement().primaryKey(),
  // 推播標題
  title: varchar("title", { length: 255 }).notNull(),
  // 推播內容
  content: text("content").notNull(),
  // 優惠券圖片 URL (選填)
  imageUrl: text("imageUrl"),
  // 關聯的優惠券 ID (選填)
  couponId: int("couponId"),
  // 推播狀態: draft (草稿), scheduled (已排程), sent (已發送)
  status: mysqlEnum("status", ["draft", "scheduled", "sent"]).default("draft").notNull(),
  // 排程發送時間 (null 表示立即發送)
  scheduledAt: timestamp("scheduledAt"),
  // 實際發送時間
  sentAt: timestamp("sentAt"),
  createdBy: int("createdBy").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type PushNotification = typeof pushNotifications.$inferSelect;
export type InsertPushNotification = typeof pushNotifications.$inferInsert;

/**
 * 使用者推播閱讀記錄表
 * 追蹤使用者是否已讀推播訊息
 */
export const userNotificationReads = mysqlTable("user_notification_reads", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  notificationId: int("notificationId").notNull(),
  readAt: timestamp("readAt").defaultNow().notNull(),
});

export type UserNotificationRead = typeof userNotificationReads.$inferSelect;
export type InsertUserNotificationRead = typeof userNotificationReads.$inferInsert;

/**
 * 系統設定表
 * 儲存全域設定（例如：背景圖片）
 */
export const systemSettings = mysqlTable("system_settings", {
  id: int("id").autoincrement().primaryKey(),
  // 設定鍵 (例如: "background_image")
  key: varchar("key", { length: 100 }).notNull().unique(),
  // 設定值 (例如: S3 圖片 URL)
  value: text("value"),
  updatedBy: int("updatedBy"),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type SystemSetting = typeof systemSettings.$inferSelect;
export type InsertSystemSetting = typeof systemSettings.$inferInsert;

/**
 * 轉盤使用限制記錄表
 * 追蹤使用者每天在各時段的轉盤使用次數
 */
export const spinLimits = mysqlTable("spin_limits", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  // 日期 (YYYY-MM-DD 格式)
  date: varchar("date", { length: 10 }).notNull(),
  // 時段
  mealPeriod: mysqlEnum("mealPeriod", ["breakfast", "lunch", "afternoon_tea", "dinner", "late_night"]).notNull(),
  // 已使用次數
  usedCount: int("usedCount").default(0).notNull(),
  // 當日抽中的優惠券總數
  dailyCouponCount: int("dailyCouponCount").default(0).notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type SpinLimit = typeof spinLimits.$inferSelect;
export type InsertSpinLimit = typeof spinLimits.$inferInsert;

/**
 * 自訂轉盤樣式表
 * 管理員可建立自訂轉盤設計（程式繪製或上傳圖片）
 */
export const customWheelStyles = mysqlTable("custom_wheel_styles", {
  id: int("id").autoincrement().primaryKey(),
  // 轉盤名稱
  name: varchar("name", { length: 255 }).notNull(),
  // 轉盤類型: canvas (程式繪製), image (上傳圖片)
  type: mysqlEnum("type", ["canvas", "image"]).default("canvas").notNull(),
  // 轉盤樣式: rainbow, redwhite, colorful (程式繪製), 或自訂名稱
  style: varchar("style", { length: 100 }).notNull(),
  // 轉盤圖片 URL (僅當 type = image 時使用)
  imageUrl: text("imageUrl"),
  // 轉盤配置 (JSON 格式，儲存顏色、字體等設定)
  config: text("config"),
  // 是否為預設樣式（預設樣式無法刪除）
  isDefault: boolean("isDefault").default(false).notNull(),
  // 建立者 ID
  createdBy: int("createdBy").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type CustomWheelStyle = typeof customWheelStyles.$inferSelect;
export type InsertCustomWheelStyle = typeof customWheelStyles.$inferInsert;

/**
 * 商家資料表
 * 儲存商家的基本資訊，一個 user 可以是一個商家
 */
export const merchants = mysqlTable("merchants", {
  id: int("id").autoincrement().primaryKey(),
  // 關聯到 users 表的 ID
  userId: int("userId").notNull().unique(),
  // 商家名稱（可以是個人或公司名稱）
  name: varchar("name", { length: 255 }).notNull(),
  // 商家聯絡電話
  contactPhone: varchar("contactPhone", { length: 20 }),
  // 商家聯絡 Email
  contactEmail: varchar("contactEmail", { length: 320 }),
  // 商家狀態: active (啟用), suspended (停權), inactive (停用)
  status: mysqlEnum("status", ["active", "suspended", "inactive"]).default("active").notNull(),
  // 備註（管理員可填寫）
  notes: text("notes"),
  // 建立者（管理員 ID）
  createdBy: int("createdBy").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Merchant = typeof merchants.$inferSelect;
export type InsertMerchant = typeof merchants.$inferInsert;

/**
 * 商家與店鋪關聯表
 * 一個商家可以管理多個店鋪（一對多）
 */
export const merchantRestaurants = mysqlTable("merchant_restaurants", {
  id: int("id").autoincrement().primaryKey(),
  // 商家 ID
  merchantId: int("merchantId").notNull(),
  // 店鋪 ID
  restaurantId: int("restaurantId").notNull(),
  // 綁定時間
  boundAt: timestamp("boundAt").defaultNow().notNull(),
  // 綁定者（管理員 ID）
  boundBy: int("boundBy").notNull(),
});

export type MerchantRestaurant = typeof merchantRestaurants.$inferSelect;
export type InsertMerchantRestaurant = typeof merchantRestaurants.$inferInsert;

/**
 * 店鋪統計資料表
 * 儲存每日的店鋪統計資料，用於商家查看數據
 */
export const restaurantStatistics = mysqlTable("restaurant_statistics", {
  id: int("id").autoincrement().primaryKey(),
  restaurantId: int("restaurantId").notNull(),
  // 統計日期 (YYYY-MM-DD 格式)
  date: varchar("date", { length: 10 }).notNull(),
  // 被抽中總次數
  totalSpins: int("totalSpins").default(0).notNull(),
  // 早餐時段被抽中次數
  breakfastSpins: int("breakfastSpins").default(0).notNull(),
  // 午餐時段被抽中次數
  lunchSpins: int("lunchSpins").default(0).notNull(),
  // 下午茶時段被抽中次數
  afternoonTeaSpins: int("afternoonTeaSpins").default(0).notNull(),
  // 晚餐時段被抽中次數
  dinnerSpins: int("dinnerSpins").default(0).notNull(),
  // 消夜時段被抽中次數
  lateNightSpins: int("lateNightSpins").default(0).notNull(),
  // 優惠券發放數量
  couponsIssued: int("couponsIssued").default(0).notNull(),
  // 優惠券兌換數量
  couponsRedeemed: int("couponsRedeemed").default(0).notNull(),
  // 優惠券兌換率 (%)
  redemptionRate: int("redemptionRate").default(0).notNull(),
  // 不重複使用者數量
  uniqueUsers: int("uniqueUsers").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type RestaurantStatistic = typeof restaurantStatistics.$inferSelect;
export type InsertRestaurantStatistic = typeof restaurantStatistics.$inferInsert;

/**
 * 使用者評價表（預留）
 * 儲存使用者對店鋪的評價和評論
 */
export const restaurantReviews = mysqlTable("restaurant_reviews", {
  id: int("id").autoincrement().primaryKey(),
  restaurantId: int("restaurantId").notNull(),
  userId: int("userId").notNull(),
  // 評分 (1-5 星)
  rating: int("rating").notNull(),
  // 評論內容
  comment: text("comment"),
  // 評論照片 URL (選填，JSON 格式儲存多張照片)
  photoUrls: text("photoUrls"),
  // 是否已審核通過
  isApproved: boolean("isApproved").default(false).notNull(),
  // 審核者 ID
  approvedBy: int("approvedBy"),
  // 審核時間
  approvedAt: timestamp("approvedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type RestaurantReview = typeof restaurantReviews.$inferSelect;
export type InsertRestaurantReview = typeof restaurantReviews.$inferInsert;

/**
 * 使用者與店鋪關聯表
 * 記錄哪些使用者可以管理哪些店鋪（用於權限控制）
 */
export const userRestaurants = mysqlTable("user_restaurants", {
  id: int("id").autoincrement().primaryKey(),
  // 使用者 ID
  userId: int("userId").notNull(),
  // 店鋪 ID
  restaurantId: int("restaurantId").notNull(),
  // 角色: owner (擁有者), manager (管理者)
  role: mysqlEnum("role", ["owner", "manager"]).default("owner").notNull(),
  // 綁定時間
  assignedAt: timestamp("assignedAt").defaultNow().notNull(),
  // 指派者（管理員 ID）
  assignedBy: int("assignedBy").notNull(),
});

export type UserRestaurant = typeof userRestaurants.$inferSelect;
export type InsertUserRestaurant = typeof userRestaurants.$inferInsert;
