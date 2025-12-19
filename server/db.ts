import { eq, and, desc, gte, lte } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { 
  InsertUser, 
  users, 
  restaurants, 
  coupons, 
  spinHistory, 
  couponRedemptions,
  InsertRestaurant,
  InsertCoupon,
  InsertSpinHistory,
  InsertCouponRedemption,
  checkInRecords,
  InsertCheckInRecord,
  pushNotifications,
  InsertPushNotification,
  userNotificationReads,
  systemSettings,
  spinLimits,
  InsertSpinLimit,
  customWheelStyles,
  InsertCustomWheelStyle
} from "../drizzle/schema";
import { ENV } from './_core/env';

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = 'admin';
      updateSet.role = 'admin';
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);

  return result.length > 0 ? result[0] : undefined;
}

// ========== 店家管理 ==========

export async function getAllRestaurants() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(restaurants).orderBy(restaurants.name);
}

export async function getActiveRestaurants() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(restaurants).where(eq(restaurants.isActive, true)).orderBy(restaurants.name);
}

// 判斷店家是否營業中
function isRestaurantOpen(operatingHours: string): boolean {
  try {
    const hours = JSON.parse(operatingHours);
    // 使用台灣時間（UTC+8）確保與後台設定一致
    const now = new Date();
    const taiwanTime = new Date(now.getTime() + 8 * 60 * 60 * 1000);
    const taiwanDay = taiwanTime.getUTCDay();
    const dayOfWeek = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'][taiwanDay];
    const todayHours = hours[dayOfWeek];
    
    if (!todayHours || todayHours === '休息') {
      return false;
    }
    
    // 支援新的 JSON 物件格式 {"closed": false, "shifts": [{"start": "10:00", "end": "14:00"}, ...]}
    if (typeof todayHours === 'object' && todayHours !== null) {
      // 檢查是否為公休
      if (todayHours.closed === true) {
        return false;
      }
      
      // 如果有 shifts 陣列，檢查任何班次是否營業中
      if (Array.isArray(todayHours.shifts)) {
        const currentHour = taiwanTime.getUTCHours();
        const currentMinute = taiwanTime.getUTCMinutes();
        const currentTime = currentHour * 60 + currentMinute;
        
        for (const shift of todayHours.shifts) {
          const [startHour, startMinute] = shift.start.split(':').map(Number);
          const [endHour, endMinute] = shift.end.split(':').map(Number);
          const startTime = startHour * 60 + startMinute;
          const endTime = endHour * 60 + endMinute;
          
          // 處理跨午夜的情況 (例如 20:00-05:00)
          if (endTime <= startTime) {
            if (currentTime >= startTime || currentTime < endTime) {
              return true;
            }
          } else {
            if (currentTime >= startTime && currentTime < endTime) {
              return true;
            }
          }
        }
        return false;
      }
      
      // 向侌相容：支援舐的單班次格式 {"start": "00:00", "end": "23:59"}
      if (todayHours.start && todayHours.end) {
        const [openHour, openMinute] = todayHours.start.split(':').map(Number);
        const [closeHour, closeMinute] = todayHours.end.split(':').map(Number);
        
        const currentHour = taiwanTime.getUTCHours();
        const currentMinute = taiwanTime.getUTCMinutes();
        const currentTime = currentHour * 60 + currentMinute;
        const openingTime = openHour * 60 + openMinute;
        const closingTime = closeHour * 60 + closeMinute;
        
        // 處理跨午夜的情況 (例如 20:00-05:00)
        if (closingTime <= openingTime) {
          return currentTime >= openingTime || currentTime < closingTime;
        } else {
          return currentTime >= openingTime && currentTime < closingTime;
        }
      }
      
      // 如果是物件但沒有 shifts 或 start/end，則視為營業中
      return true;
    }
    
    // 支援舐的字串格式 "10:00-22:00"
    if (typeof todayHours === 'string') {
      const [openTime, closeTime] = todayHours.split('-');
      if (!openTime || !closeTime) {
        return false;
      }
      
      const [openHour, openMinute] = openTime.split(':').map(Number);
      const [closeHour, closeMinute] = closeTime.split(':').map(Number);
      
      const currentHour = taiwanTime.getUTCHours();
      const currentMinute = taiwanTime.getUTCMinutes();
      const currentTime = currentHour * 60 + currentMinute;
      const openingTime = openHour * 60 + openMinute;
      const closingTime = closeHour * 60 + closeMinute;
      
      // 處理跨午夜的情況 (例如 20:00-05:00)
      if (closingTime <= openingTime) {
        return currentTime >= openingTime || currentTime < closingTime;
      } else {
        return currentTime >= openingTime && currentTime < closingTime;
      }
    }
    
    return false;
  } catch (error) {
    console.error('Error parsing operating hours:', error);
    return true; // 如果解析失敗，預設為營業中
  }
}

export async function getActiveRestaurantsWithCoupons() {
  const db = await getDb();
  if (!db) return [];
  
  // 查詢所有啟用的店家
  const activeRestaurants = await db.select().from(restaurants).where(eq(restaurants.isActive, true)).orderBy(restaurants.name);
  
  // 過濾非營業時間的店家
  const openRestaurants = activeRestaurants.filter(restaurant => isRestaurantOpen(restaurant.operatingHours));
  
  // 為每家店家查詢所有優惠券（不限制數量）
  const restaurantsWithCoupons = await Promise.all(
    openRestaurants.map(async (restaurant) => {
      const restaurantCoupons = await db.select().from(coupons).where(
        and(
          eq(coupons.restaurantId, restaurant.id),
          eq(coupons.isActive, true),
          eq(coupons.isCheckInReward, false)  // 排除簽到獎勵優惠券
        )
      );
      
      return {
        ...restaurant,
        coupons: restaurantCoupons,  // 返回所有優惠券
        coupon: restaurantCoupons.length > 0 ? restaurantCoupons[0] : null  // 保留預設優惠券以向後相容
      };
    })
  );
  
  // 只返回有優惠券的店家
  return restaurantsWithCoupons.filter(r => r.coupons.length > 0);
}

export async function getRestaurantById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(restaurants).where(eq(restaurants.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function createRestaurant(data: InsertRestaurant) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(restaurants).values(data);
  return result;
}

export async function updateRestaurant(id: number, data: Partial<InsertRestaurant>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(restaurants).set(data).where(eq(restaurants.id, id));
}

export async function deleteRestaurant(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(restaurants).where(eq(restaurants.id, id));
}

// ========== 優惠券管理 ==========

export async function getCouponsByRestaurantId(restaurantId: number) {
  const db = await getDb();
  if (!db) return [];
  // 強制過濾簽到獎勵優惠券，確保轉盤中永遠不會出現
  return db.select().from(coupons).where(
    and(
      eq(coupons.restaurantId, restaurantId),
      eq(coupons.isCheckInReward, false)
    )
  );
}

export async function getActiveCouponsByRestaurantId(restaurantId: number) {
  const db = await getDb();
  if (!db) return [];
  // 強制過濾簽到獎勵優惠券，確保轉盤中永遠不會出現
  return db.select().from(coupons).where(
    and(
      eq(coupons.restaurantId, restaurantId),
      eq(coupons.isActive, true),
      eq(coupons.isCheckInReward, false)
    )
  );
}

export async function getCouponById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(coupons).where(eq(coupons.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function createCoupon(data: InsertCoupon) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  // 如果是簽到獎勵，自動設置過期時間為當前時間 + 7 天
  const insertData = { ...data };
  if (data.isCheckInReward === true && !data.expiresAt) {
    const now = new Date();
    const expiryDate = new Date(now);
    expiryDate.setDate(expiryDate.getDate() + 7);
    expiryDate.setHours(23, 59, 59, 999);
    insertData.expiresAt = expiryDate;
  }
  
  const result = await db.insert(coupons).values(insertData);
  return result;
}

export async function updateCoupon(id: number, data: Partial<InsertCoupon>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  // 如果是簽到獎勵，自動設置過期時間為當前時間 + 7 天
  const updateData = { ...data };
  if (data.isCheckInReward === true) {
    const now = new Date();
    const expiryDate = new Date(now);
    expiryDate.setDate(expiryDate.getDate() + 7);
    expiryDate.setHours(23, 59, 59, 999);
    updateData.expiresAt = expiryDate;
  }
  
  await db.update(coupons).set(updateData).where(eq(coupons.id, id));
}

export async function deleteCoupon(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(coupons).where(eq(coupons.id, id));
}

// ========== 轉盤記錄 ==========

export async function createSpinHistory(data: InsertSpinHistory) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(spinHistory).values(data);
  return result;
}

export async function getSpinHistoryByUserId(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(spinHistory).where(eq(spinHistory.userId, userId)).orderBy(desc(spinHistory.createdAt));
}

export async function getAllSpinHistory() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(spinHistory).orderBy(desc(spinHistory.createdAt));
}

export async function getSpinHistoryById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(spinHistory).where(eq(spinHistory.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function markSpinAsShared(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(spinHistory).set({ isShared: true }).where(eq(spinHistory.id, id));
}

export async function getTodaySpinCountByPeriod(userId: number, mealPeriod: string) {
  const db = await getDb();
  if (!db) return 0;
  
  // 獲取今天的開始時間 (00:00:00)
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const result = await db.select().from(spinHistory).where(
    and(
      eq(spinHistory.userId, userId),
      eq(spinHistory.mealPeriod, mealPeriod as any),
      gte(spinHistory.createdAt, today)
    )
  );
  
  return result.length;
}

export async function getTodayTotalSpinCount(userId: number) {
  const db = await getDb();
  if (!db) return 0;
  
  // 獲取今天的開始時間 (00:00:00)
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const result = await db.select().from(spinHistory).where(
    and(
      eq(spinHistory.userId, userId),
      gte(spinHistory.createdAt, today)
    )
  );
  
  return result.length;
}

// ========== 優惠券兌換記錄 ==========

export async function createCouponRedemption(data: InsertCouponRedemption) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(couponRedemptions).values(data);
  return result;
}

export async function getCouponRedemptionsByUserId(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(couponRedemptions).where(eq(couponRedemptions.userId, userId)).orderBy(desc(couponRedemptions.redeemedAt));
}

export async function checkIfCouponRedeemed(userId: number, spinHistoryId: number) {
  const db = await getDb();
  if (!db) return false;
  const result = await db.select().from(couponRedemptions).where(
    and(
      eq(couponRedemptions.userId, userId),
      eq(couponRedemptions.spinHistoryId, spinHistoryId)
    )
  ).limit(1);
  return result.length > 0;
}

export async function getAllCouponRedemptions() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(couponRedemptions).orderBy(desc(couponRedemptions.redeemedAt));
}

// ========== 簽到系統 ==========

export async function getTodayCheckIn(userId: number, date: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(checkInRecords).where(
    and(
      eq(checkInRecords.userId, userId),
      eq(checkInRecords.checkInDate, date)
    )
  ).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getLastCheckIn(userId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(checkInRecords)
    .where(eq(checkInRecords.userId, userId))
    .orderBy(desc(checkInRecords.createdAt))
    .limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function createCheckInRecord(data: InsertCheckInRecord) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(checkInRecords).values(data);
  return result;
}

export async function updateCheckInRecord(id: number, data: Partial<InsertCheckInRecord>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(checkInRecords).set(data).where(eq(checkInRecords.id, id));
}

export async function getCheckInHistory(userId: number, limit: number = 30) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(checkInRecords)
    .where(eq(checkInRecords.userId, userId))
    .orderBy(desc(checkInRecords.createdAt))
    .limit(limit);
}

// ========== 轉盤使用限制 ==========

export async function getSpinLimit(userId: number, date: string, mealPeriod: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(spinLimits).where(
    and(
      eq(spinLimits.userId, userId),
      eq(spinLimits.date, date),
      eq(spinLimits.mealPeriod, mealPeriod as any)
    )
  ).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getDailySpinLimits(userId: number, date: string) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(spinLimits).where(
    and(
      eq(spinLimits.userId, userId),
      eq(spinLimits.date, date)
    )
  );
}

export async function createSpinLimit(data: InsertSpinLimit) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(spinLimits).values(data);
  return result;
}

export async function updateSpinLimit(id: number, data: Partial<InsertSpinLimit>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(spinLimits).set(data).where(eq(spinLimits.id, id));
}

export async function incrementSpinLimit(userId: number, date: string, mealPeriod: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const existing = await getSpinLimit(userId, date, mealPeriod);
  
  if (existing) {
    await updateSpinLimit(existing.id, {
      usedCount: existing.usedCount + 1,
    });
  } else {
    await createSpinLimit({
      userId,
      date,
      mealPeriod: mealPeriod as any,
      usedCount: 1,
      dailyCouponCount: 0,
    });
  }
}

export async function incrementDailyCouponCount(userId: number, date: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const limits = await getDailySpinLimits(userId, date);
  
  if (limits.length > 0) {
    // 更新第一筆記錄的 dailyCouponCount
    await updateSpinLimit(limits[0].id, {
      dailyCouponCount: limits[0].dailyCouponCount + 1,
    });
  }
}

export async function getDailyCouponCount(userId: number, date: string): Promise<number> {
  const db = await getDb();
  if (!db) return 0;
  
  const limits = await getDailySpinLimits(userId, date);
  
  if (limits.length > 0) {
    return limits[0].dailyCouponCount;
  }
  
  return 0;
}

// ========== 推播訊息 ==========

export async function getAllPushNotifications() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(pushNotifications).orderBy(desc(pushNotifications.createdAt));
}

export async function getPushNotificationById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(pushNotifications).where(eq(pushNotifications.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function createPushNotification(data: InsertPushNotification) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(pushNotifications).values(data);
  return result;
}

export async function updatePushNotification(id: number, data: Partial<InsertPushNotification>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(pushNotifications).set(data).where(eq(pushNotifications.id, id));
}

export async function deletePushNotification(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(pushNotifications).where(eq(pushNotifications.id, id));
}

export async function getSentPushNotifications() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(pushNotifications)
    .where(eq(pushNotifications.status, "sent"))
    .orderBy(desc(pushNotifications.sentAt));
}

export async function getUnreadNotifications(userId: number) {
  const db = await getDb();
  if (!db) return [];
  
  // 取得所有已發送的推播
  const sentNotifications = await getSentPushNotifications();
  
  // 取得使用者已讀的推播 ID
  const readRecords = await db.select().from(userNotificationReads)
    .where(eq(userNotificationReads.userId, userId));
  
  const readIds = new Set(readRecords.map(r => r.notificationId));
  
  // 過濾出未讀的推播
  return sentNotifications.filter(n => !readIds.has(n.id));
}

// ========== 使用者優惠券 ==========

/**
 * 查詢使用者的所有優惠券（從 spinHistory 查詢）
 * 過濾超過 1 天（24 小時）的過期優惠券
 */
export async function getUserCoupons(userId: number) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user coupons: database not available");
    return [];
  }

  try {
    // 計算 1 天前的時間（24 小時前）
    const oneDayAgo = new Date();
    oneDayAgo.setDate(oneDayAgo.getDate() - 1);
    oneDayAgo.setHours(0, 0, 0, 0);

    const result = await db
      .select()
      .from(spinHistory)
      .where(
        and(
          eq(spinHistory.userId, userId),
          // 過濾超過 1 天的記錄
          gte(spinHistory.createdAt, oneDayAgo)
        )
      )
      .orderBy(desc(spinHistory.createdAt));

    return result;
  } catch (error) {
    console.error("[Database] Failed to get user coupons:", error);
    return [];
  }
}

// TODO: add feature queries here as your schema grows.

export async function markNotificationAsRead(userId: number, notificationId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  // 檢查是否已經標記為已讀
  const existing = await db.select().from(userNotificationReads).where(
    and(
      eq(userNotificationReads.userId, userId),
      eq(userNotificationReads.notificationId, notificationId)
    )
  ).limit(1);
  
  if (existing.length === 0) {
    await db.insert(userNotificationReads).values({
      userId,
      notificationId,
    });
  }
}

// ========== 系統設定 ==========

export async function getSystemSetting(key: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(systemSettings).where(eq(systemSettings.key, key)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function setSystemSetting(key: string, value: string, updatedBy?: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const existing = await getSystemSetting(key);
  
  if (existing) {
    await db.update(systemSettings).set({ value, updatedBy }).where(eq(systemSettings.key, key));
  } else {
    await db.insert(systemSettings).values({ key, value, updatedBy });
  }
}

export async function getAllSystemSettings() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(systemSettings);
}

// ========== 管理員管理 ==========

export async function getAllAdmins() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(users).where(eq(users.role, "admin")).orderBy(users.name);
}

export async function updateUserRole(userId: number, role: "user" | "admin") {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(users).set({ role }).where(eq(users.id, userId));
}

export async function getAllUsers() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(users).orderBy(desc(users.lastSignedIn));
}

export async function getUserById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

// ========== 優惠券過期處理 ==========

export async function expireOldCoupons(date: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  // 標記所有在指定日期之前且未兌換的優惠券為過期
  await db.update(spinHistory).set({ isExpired: true }).where(
    and(
      lte(spinHistory.createdAt, new Date(date)),
      eq(spinHistory.isExpired, false)
    )
  );
}

export async function getActiveSpinHistory(userId: number) {
  const db = await getDb();
  if (!db) return [];
  
  // 取得未過期且未兌換的轉盤記錄
  return db.select().from(spinHistory).where(
    and(
      eq(spinHistory.userId, userId),
      eq(spinHistory.isExpired, false)
    )
  ).orderBy(desc(spinHistory.createdAt));
}

// ========== 簽到獎勵店家 ==========

export async function getCheckInRewardRestaurants() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(restaurants).where(
    and(
      eq(restaurants.isActive, true),
      eq(restaurants.providesCheckInReward, true)
    )
  ).orderBy(restaurants.name);
}

// ========== 簡易登入相關函數 ==========

/**
 * 根據手機號碼或 Email 查詢使用者
 */
export async function getUserByPhoneOrEmail(phone?: string, email?: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  try {
    let result;
    if (phone) {
      result = await db.select().from(users).where(eq(users.phone, phone)).limit(1);
    } else if (email) {
      result = await db.select().from(users).where(eq(users.email, email)).limit(1);
    } else {
      return undefined;
    }
    
    return result.length > 0 ? result[0] : undefined;
  } catch (error) {
    console.error("[Database] Failed to get user by phone or email:", error);
    return undefined;
  }
}

/**
 * 建立簡易登入使用者
 */
export async function createSimpleUser(data: {
  phone?: string;
  email?: string;
  deviceId: string;
  loginMethod: string;
}) {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  try {
    const now = new Date();
    const insertData: InsertUser = {
      phone: data.phone || null,
      email: data.email || null,
      deviceId: data.deviceId,
      deviceBoundAt: now,
      loginMethod: data.loginMethod,
      lastSignedIn: now,
      openId: null, // 簡易登入不需要 openId
    };

    await db.insert(users).values(insertData);
    
    // 查詢剛建立的使用者
    if (data.phone) {
      return await getUserByPhoneOrEmail(data.phone, undefined);
    } else if (data.email) {
      return await getUserByPhoneOrEmail(undefined, data.email);
    }
    
    throw new Error("Failed to create user");
  } catch (error) {
    console.error("[Database] Failed to create simple user:", error);
    throw error;
  }
}

/**
 * 更新使用者裝置綁定
 */
export async function updateUserDevice(userId: number, deviceId: string) {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  try {
    await db
      .update(users)
      .set({ 
        deviceId, 
        deviceBoundAt: new Date() 
      })
      .where(eq(users.id, userId));
  } catch (error) {
    console.error("[Database] Failed to update user device:", error);
    throw error;
  }
}

/**
 * 更新使用者最後登入時間
 */
export async function updateUserLastSignIn(userId: number) {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  try {
    await db
      .update(users)
      .set({ lastSignedIn: new Date() })
      .where(eq(users.id, userId));
  } catch (error) {
    console.error("[Database] Failed to update user last sign in:", error);
    throw error;
  }
}

/**
 * 建立使用者 session（使用 JWT）
 */
export async function createUserSession(userId: number): Promise<string> {
  // 使用現有的 SDK 機制
  const { sdk } = await import('./_core/sdk');
  
  // 查詢使用者資料
  const user = await getUserById(userId);
  if (!user) {
    throw new Error('User not found');
  }
  
  // 為簡易登入使用者生成 openId
  const openId = user.openId || `simple_${user.id}`;
  
  const token = await sdk.createSessionToken(openId, {
    name: user.name || user.email || user.phone || '',
    expiresInMs: 30 * 24 * 60 * 60 * 1000, // 30 天
  });
  
  return token;
}

// ========== 自訂轉盤樣式管理 ==========

export async function createCustomWheelStyle(data: InsertCustomWheelStyle) {
  const db = await getDb();
  if (!db) {
    throw new Error('Database not available');
  }
  
  const result = await db.insert(customWheelStyles).values(data);
  return result;
}

export async function listCustomWheelStyles() {
  const db = await getDb();
  if (!db) return [];
  
  return db.select().from(customWheelStyles).orderBy(customWheelStyles.createdAt);
}

export async function getCustomWheelStyleById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  
  const result = await db.select().from(customWheelStyles).where(eq(customWheelStyles.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function deleteCustomWheelStyle(id: number) {
  const db = await getDb();
  if (!db) {
    throw new Error('Database not available');
  }
  
  // 檢查是否為預設樣式
  const style = await getCustomWheelStyleById(id);
  if (style?.isDefault) {
    throw new Error('Cannot delete default wheel style');
  }
  
  await db.delete(customWheelStyles).where(eq(customWheelStyles.id, id));
}

export async function updateCustomWheelStyle(id: number, data: Partial<InsertCustomWheelStyle>) {
  const db = await getDb();
  if (!db) {
    throw new Error('Database not available');
  }
  
  // 檢查是否為預設樣式（預設樣式無法修改）
  const style = await getCustomWheelStyleById(id);
  if (style?.isDefault) {
    throw new Error('Cannot update default wheel style');
  }
  
  await db.update(customWheelStyles).set({ ...data, updatedAt: new Date() }).where(eq(customWheelStyles.id, id));
}


// ========== 商家管理相關函數 ==========
// 匯出 merchantDb.ts 中的所有函數
// export * from './merchantDb';
