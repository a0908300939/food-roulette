import { eq, and, desc, gte, lte, inArray, sql } from "drizzle-orm";
import {
  merchants,
  merchantRestaurants,
  restaurantStatistics,
  restaurantReviews,
  restaurants,
  spinHistory,
  couponRedemptions,
  users,
  InsertMerchant,
  InsertMerchantRestaurant,
  InsertRestaurantStatistic,
  Merchant,
  MerchantRestaurant,
  Restaurant,
  RestaurantStatistic,
} from "../drizzle/schema";
import { getDb } from "./db";

// ========== 商家管理 (Admin) ==========

/**
 * 列出所有商家
 */
export async function getAllMerchants(): Promise<Merchant[]> {
  const db = await getDb();
  if (!db) return [];
  
  try {
    const result = await db
      .select()
      .from(merchants)
      .orderBy(desc(merchants.createdAt));
    return result;
  } catch (error) {
    console.error("[merchantDb] Failed to get all merchants:", error);
    return [];
  }
}

/**
 * 根據 ID 取得商家資訊
 */
export async function getMerchantById(id: number): Promise<Merchant | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  
  try {
    const result = await db
      .select()
      .from(merchants)
      .where(eq(merchants.id, id))
      .limit(1);
    return result.length > 0 ? result[0] : undefined;
  } catch (error) {
    console.error("[merchantDb] Failed to get merchant by id:", error);
    return undefined;
  }
}

/**
 * 根據 userId 取得商家資訊
 */
export async function getMerchantByUserId(userId: number): Promise<Merchant | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  
  try {
    const result = await db
      .select()
      .from(merchants)
      .where(eq(merchants.userId, userId))
      .limit(1);
    return result.length > 0 ? result[0] : undefined;
  } catch (error) {
    console.error("[merchantDb] Failed to get merchant by userId:", error);
    return undefined;
  }
}

/**
 * 建立商家帳號
 */
export async function createMerchant(data: InsertMerchant): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  try {
    const result = await db.insert(merchants).values(data);
    return Number(result[0].insertId);
  } catch (error) {
    console.error("[merchantDb] Failed to create merchant:", error);
    throw error;
  }
}

/**
 * 更新商家資訊
 */
export async function updateMerchant(id: number, data: Partial<InsertMerchant>): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  try {
    await db.update(merchants).set(data).where(eq(merchants.id, id));
  } catch (error) {
    console.error("[merchantDb] Failed to update merchant:", error);
    throw error;
  }
}

/**
 * 刪除商家帳號
 */
export async function deleteMerchant(id: number): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  try {
    // 先刪除所有關聯的店鋪綁定
    await db.delete(merchantRestaurants).where(eq(merchantRestaurants.merchantId, id));
    // 再刪除商家
    await db.delete(merchants).where(eq(merchants.id, id));
  } catch (error) {
    console.error("[merchantDb] Failed to delete merchant:", error);
    throw error;
  }
}

// ========== 商家與店鋪綁定 (Admin) ==========

/**
 * 綁定店鋪到商家
 */
export async function bindRestaurantToMerchant(data: InsertMerchantRestaurant): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  try {
    // 檢查是否已經綁定
    const existing = await db
      .select()
      .from(merchantRestaurants)
      .where(
        and(
          eq(merchantRestaurants.merchantId, data.merchantId),
          eq(merchantRestaurants.restaurantId, data.restaurantId)
        )
      )
      .limit(1);
    
    if (existing.length > 0) {
      throw new Error("Restaurant already bound to this merchant");
    }
    
    const result = await db.insert(merchantRestaurants).values(data);
    return Number(result[0].insertId);
  } catch (error) {
    console.error("[merchantDb] Failed to bind restaurant to merchant:", error);
    throw error;
  }
}

/**
 * 解除店鋪綁定
 */
export async function unbindRestaurantFromMerchant(merchantId: number, restaurantId: number): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  try {
    await db
      .delete(merchantRestaurants)
      .where(
        and(
          eq(merchantRestaurants.merchantId, merchantId),
          eq(merchantRestaurants.restaurantId, restaurantId)
        )
      );
  } catch (error) {
    console.error("[merchantDb] Failed to unbind restaurant from merchant:", error);
    throw error;
  }
}

/**
 * 取得商家管理的所有店鋪
 */
export async function getRestaurantsByMerchantId(merchantId: number): Promise<Restaurant[]> {
  const db = await getDb();
  if (!db) return [];
  
  try {
    const result = await db
      .select({
        id: restaurants.id,
        name: restaurants.name,
        address: restaurants.address,
        latitude: restaurants.latitude,
        longitude: restaurants.longitude,
        phone: restaurants.phone,
        description: restaurants.description,
        photoUrl: restaurants.photoUrl,
        operatingHours: restaurants.operatingHours,
        providesCheckInReward: restaurants.providesCheckInReward,
        isActive: restaurants.isActive,
        createdAt: restaurants.createdAt,
        updatedAt: restaurants.updatedAt,
      })
      .from(merchantRestaurants)
      .innerJoin(restaurants, eq(merchantRestaurants.restaurantId, restaurants.id))
      .where(eq(merchantRestaurants.merchantId, merchantId))
      .orderBy(restaurants.name);
    
    return result;
  } catch (error) {
    console.error("[merchantDb] Failed to get restaurants by merchant id:", error);
    return [];
  }
}

/**
 * 檢查商家是否有權限管理某個店鋪
 */
export async function checkMerchantRestaurantAccess(merchantId: number, restaurantId: number): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;
  
  try {
    const result = await db
      .select()
      .from(merchantRestaurants)
      .where(
        and(
          eq(merchantRestaurants.merchantId, merchantId),
          eq(merchantRestaurants.restaurantId, restaurantId)
        )
      )
      .limit(1);
    
    return result.length > 0;
  } catch (error) {
    console.error("[merchantDb] Failed to check merchant restaurant access:", error);
    return false;
  }
}

// ========== 店鋪統計資料 ==========

/**
 * 取得店鋪統計資料（指定日期範圍）
 */
export async function getRestaurantStatistics(
  restaurantId: number,
  startDate: string,
  endDate: string
): Promise<RestaurantStatistic[]> {
  const db = await getDb();
  if (!db) return [];
  
  try {
    const result = await db
      .select()
      .from(restaurantStatistics)
      .where(
        and(
          eq(restaurantStatistics.restaurantId, restaurantId),
          gte(restaurantStatistics.date, startDate),
          lte(restaurantStatistics.date, endDate)
        )
      )
      .orderBy(restaurantStatistics.date);
    
    return result;
  } catch (error) {
    console.error("[merchantDb] Failed to get restaurant statistics:", error);
    return [];
  }
}

/**
 * 更新或建立店鋪統計資料
 */
export async function upsertRestaurantStatistic(data: InsertRestaurantStatistic): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  try {
    await db
      .insert(restaurantStatistics)
      .values(data)
      .onDuplicateKeyUpdate({
        set: {
          totalSpins: data.totalSpins,
          breakfastSpins: data.breakfastSpins,
          lunchSpins: data.lunchSpins,
          afternoonTeaSpins: data.afternoonTeaSpins,
          dinnerSpins: data.dinnerSpins,
          lateNightSpins: data.lateNightSpins,
          couponsIssued: data.couponsIssued,
          couponsRedeemed: data.couponsRedeemed,
          redemptionRate: data.redemptionRate,
          uniqueUsers: data.uniqueUsers,
          updatedAt: new Date(),
        },
      });
  } catch (error) {
    console.error("[merchantDb] Failed to upsert restaurant statistic:", error);
    throw error;
  }
}

/**
 * 計算並更新店鋪統計資料（從 spin_history 和 coupon_redemptions 計算）
 */
export async function calculateAndUpdateRestaurantStatistics(
  restaurantId: number,
  date: string
): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  try {
    // 計算當日被抽中次數（按時段）
    const spins = await db
      .select({
        mealPeriod: spinHistory.mealPeriod,
        count: sql<number>`COUNT(*)`,
      })
      .from(spinHistory)
      .where(
        and(
          eq(spinHistory.restaurantId, restaurantId),
          sql`DATE(${spinHistory.createdAt}) = ${date}`
        )
      )
      .groupBy(spinHistory.mealPeriod);
    
    let totalSpins = 0;
    let breakfastSpins = 0;
    let lunchSpins = 0;
    let afternoonTeaSpins = 0;
    let dinnerSpins = 0;
    let lateNightSpins = 0;
    
    spins.forEach((spin) => {
      const count = Number(spin.count);
      totalSpins += count;
      
      switch (spin.mealPeriod) {
        case "breakfast":
          breakfastSpins = count;
          break;
        case "lunch":
          lunchSpins = count;
          break;
        case "afternoon_tea":
          afternoonTeaSpins = count;
          break;
        case "dinner":
          dinnerSpins = count;
          break;
        case "late_night":
          lateNightSpins = count;
          break;
      }
    });
    
    // 計算優惠券發放數量（當日）
    const couponsIssuedResult = await db
      .select({
        count: sql<number>`COUNT(*)`,
      })
      .from(spinHistory)
      .where(
        and(
          eq(spinHistory.restaurantId, restaurantId),
          sql`DATE(${spinHistory.createdAt}) = ${date}`,
          sql`${spinHistory.couponId} IS NOT NULL`
        )
      );
    
    const couponsIssued = couponsIssuedResult.length > 0 ? Number(couponsIssuedResult[0].count) : 0;
    
    // 計算優惠券兌換數量（當日）
    const couponsRedeemedResult = await db
      .select({
        count: sql<number>`COUNT(*)`,
      })
      .from(couponRedemptions)
      .where(
        and(
          eq(couponRedemptions.restaurantId, restaurantId),
          sql`DATE(${couponRedemptions.redeemedAt}) = ${date}`
        )
      );
    
    const couponsRedeemed = couponsRedeemedResult.length > 0 ? Number(couponsRedeemedResult[0].count) : 0;
    
    // 計算兌換率
    const redemptionRate = couponsIssued > 0 ? Math.round((couponsRedeemed / couponsIssued) * 100) : 0;
    
    // 計算不重複使用者數量
    const uniqueUsersResult = await db
      .select({
        count: sql<number>`COUNT(DISTINCT ${spinHistory.userId})`,
      })
      .from(spinHistory)
      .where(
        and(
          eq(spinHistory.restaurantId, restaurantId),
          sql`DATE(${spinHistory.createdAt}) = ${date}`
        )
      );
    
    const uniqueUsers = uniqueUsersResult.length > 0 ? Number(uniqueUsersResult[0].count) : 0;
    
    // 更新或建立統計資料
    await upsertRestaurantStatistic({
      restaurantId,
      date,
      totalSpins,
      breakfastSpins,
      lunchSpins,
      afternoonTeaSpins,
      dinnerSpins,
      lateNightSpins,
      couponsIssued,
      couponsRedeemed,
      redemptionRate,
      uniqueUsers,
    });
  } catch (error) {
    console.error("[merchantDb] Failed to calculate and update restaurant statistics:", error);
    throw error;
  }
}

/**
 * 取得所有店鋪的排名（按被抽中次數）
 */
export async function getRestaurantRankings(startDate: string, endDate: string): Promise<any[]> {
  const db = await getDb();
  if (!db) return [];
  
  try {
    const result = await db
      .select({
        restaurantId: restaurantStatistics.restaurantId,
        restaurantName: restaurants.name,
        totalSpins: sql<number>`SUM(${restaurantStatistics.totalSpins})`,
        couponsIssued: sql<number>`SUM(${restaurantStatistics.couponsIssued})`,
        couponsRedeemed: sql<number>`SUM(${restaurantStatistics.couponsRedeemed})`,
      })
      .from(restaurantStatistics)
      .innerJoin(restaurants, eq(restaurantStatistics.restaurantId, restaurants.id))
      .where(
        and(
          gte(restaurantStatistics.date, startDate),
          lte(restaurantStatistics.date, endDate)
        )
      )
      .groupBy(restaurantStatistics.restaurantId, restaurants.name)
      .orderBy(desc(sql`SUM(${restaurantStatistics.totalSpins})`));
    
    return result.map((row, index) => ({
      rank: index + 1,
      restaurantId: row.restaurantId,
      restaurantName: row.restaurantName,
      totalSpins: Number(row.totalSpins),
      couponsIssued: Number(row.couponsIssued),
      couponsRedeemed: Number(row.couponsRedeemed),
      redemptionRate: Number(row.couponsIssued) > 0 
        ? Math.round((Number(row.couponsRedeemed) / Number(row.couponsIssued)) * 100) 
        : 0,
    }));
  } catch (error) {
    console.error("[merchantDb] Failed to get restaurant rankings:", error);
    return [];
  }
}

/**
 * 取得商家所有店鋪的總覽統計
 */
export async function getMerchantOverviewStatistics(
  merchantId: number,
  startDate: string,
  endDate: string
): Promise<any> {
  const db = await getDb();
  if (!db) return null;
  
  try {
    // 取得商家管理的所有店鋪 ID
    const merchantRestaurantIds = await db
      .select({ restaurantId: merchantRestaurants.restaurantId })
      .from(merchantRestaurants)
      .where(eq(merchantRestaurants.merchantId, merchantId));
    
    if (merchantRestaurantIds.length === 0) {
      return {
        totalRestaurants: 0,
        totalSpins: 0,
        totalCouponsIssued: 0,
        totalCouponsRedeemed: 0,
        averageRedemptionRate: 0,
        totalUniqueUsers: 0,
      };
    }
    
    const restaurantIds = merchantRestaurantIds.map((r) => r.restaurantId);
    
    // 計算總計
    const result = await db
      .select({
        totalSpins: sql<number>`SUM(${restaurantStatistics.totalSpins})`,
        totalCouponsIssued: sql<number>`SUM(${restaurantStatistics.couponsIssued})`,
        totalCouponsRedeemed: sql<number>`SUM(${restaurantStatistics.couponsRedeemed})`,
        totalUniqueUsers: sql<number>`SUM(${restaurantStatistics.uniqueUsers})`,
      })
      .from(restaurantStatistics)
      .where(
        and(
          inArray(restaurantStatistics.restaurantId, restaurantIds),
          gte(restaurantStatistics.date, startDate),
          lte(restaurantStatistics.date, endDate)
        )
      );
    
    const data = result.length > 0 ? result[0] : null;
    
    if (!data) {
      return {
        totalRestaurants: restaurantIds.length,
        totalSpins: 0,
        totalCouponsIssued: 0,
        totalCouponsRedeemed: 0,
        averageRedemptionRate: 0,
        totalUniqueUsers: 0,
      };
    }
    
    const totalSpins = Number(data.totalSpins) || 0;
    const totalCouponsIssued = Number(data.totalCouponsIssued) || 0;
    const totalCouponsRedeemed = Number(data.totalCouponsRedeemed) || 0;
    const totalUniqueUsers = Number(data.totalUniqueUsers) || 0;
    const averageRedemptionRate = totalCouponsIssued > 0 
      ? Math.round((totalCouponsRedeemed / totalCouponsIssued) * 100) 
      : 0;
    
    return {
      totalRestaurants: restaurantIds.length,
      totalSpins,
      totalCouponsIssued,
      totalCouponsRedeemed,
      averageRedemptionRate,
      totalUniqueUsers,
    };
  } catch (error) {
    console.error("[merchantDb] Failed to get merchant overview statistics:", error);
    return null;
  }
}
