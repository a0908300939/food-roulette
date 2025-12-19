/**
 * 商家管理相關的資料庫操作函數
 */

import { db } from "./db";
import { eq, and, sql, desc, asc } from "drizzle-orm";
import {
  users,
  merchants,
  merchantRestaurants,
  restaurants,
  restaurantStatistics,
  coupons,
  spinHistory,
  couponRedemptions,
  type Merchant,
  type InsertMerchant,
  type MerchantRestaurant,
  type InsertMerchantRestaurant,
  type RestaurantStatistic,
  type InsertRestaurantStatistic,
} from "../drizzle/schema";

// ========== 商家管理 ==========

/**
 * 取得所有商家
 */
export async function getAllMerchants() {
  return db
    .select({
      id: merchants.id,
      userId: merchants.userId,
      name: merchants.name,
      contactPhone: merchants.contactPhone,
      contactEmail: merchants.contactEmail,
      status: merchants.status,
      notes: merchants.notes,
      createdBy: merchants.createdBy,
      createdAt: merchants.createdAt,
      updatedAt: merchants.updatedAt,
      // 關聯使用者資料
      userPhone: users.phone,
      userEmail: users.email,
    })
    .from(merchants)
    .leftJoin(users, eq(merchants.userId, users.id))
    .orderBy(desc(merchants.createdAt));
}

/**
 * 根據 ID 取得商家
 */
export async function getMerchantById(id: number) {
  const result = await db
    .select({
      id: merchants.id,
      userId: merchants.userId,
      name: merchants.name,
      contactPhone: merchants.contactPhone,
      contactEmail: merchants.contactEmail,
      status: merchants.status,
      notes: merchants.notes,
      createdBy: merchants.createdBy,
      createdAt: merchants.createdAt,
      updatedAt: merchants.updatedAt,
      // 關聯使用者資料
      userPhone: users.phone,
      userEmail: users.email,
      userRole: users.role,
    })
    .from(merchants)
    .leftJoin(users, eq(merchants.userId, users.id))
    .where(eq(merchants.id, id))
    .limit(1);

  return result[0] || null;
}

/**
 * 根據 userId 取得商家
 */
export async function getMerchantByUserId(userId: number) {
  const result = await db
    .select()
    .from(merchants)
    .where(eq(merchants.userId, userId))
    .limit(1);

  return result[0] || null;
}

/**
 * 建立商家使用者
 */
export async function createMerchantUser(data: {
  phone?: string;
  email?: string;
  name: string;
}) {
  const result = await db.insert(users).values({
    phone: data.phone,
    email: data.email,
    loginMethod: 'simple',
    role: 'merchant',
  });

  const userId = Number(result.insertId);

  // 查詢並返回新建立的使用者
  const newUser = await db
    .select()
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  return newUser[0];
}

/**
 * 建立商家
 */
export async function createMerchant(data: {
  userId: number;
  name: string;
  contactPhone?: string;
  contactEmail?: string;
  notes?: string;
  createdBy: number;
}) {
  const result = await db.insert(merchants).values({
    userId: data.userId,
    name: data.name,
    contactPhone: data.contactPhone,
    contactEmail: data.contactEmail,
    notes: data.notes,
    createdBy: data.createdBy,
    status: 'active',
  });

  const merchantId = Number(result.insertId);

  // 查詢並返回新建立的商家
  const newMerchant = await db
    .select()
    .from(merchants)
    .where(eq(merchants.id, merchantId))
    .limit(1);

  return newMerchant[0];
}

/**
 * 更新商家資訊
 */
export async function updateMerchant(
  id: number,
  data: Partial<Omit<Merchant, 'id' | 'userId' | 'createdBy' | 'createdAt' | 'updatedAt'>>
) {
  await db
    .update(merchants)
    .set(data)
    .where(eq(merchants.id, id));

  return getMerchantById(id);
}

/**
 * 刪除商家
 */
export async function deleteMerchant(id: number) {
  // 先刪除商家與店鋪的綁定關係
  await db
    .delete(merchantRestaurants)
    .where(eq(merchantRestaurants.merchantId, id));

  // 刪除商家資料
  await db
    .delete(merchants)
    .where(eq(merchants.id, id));

  // 注意：不刪除使用者帳號，只是將角色改回 user
  const merchant = await getMerchantById(id);
  if (merchant) {
    await db
      .update(users)
      .set({ role: 'user' })
      .where(eq(users.id, merchant.userId));
  }

  return { success: true };
}

// ========== 商家與店鋪綁定 ==========

/**
 * 綁定店鋪到商家
 */
export async function bindMerchantRestaurant(data: {
  merchantId: number;
  restaurantId: number;
  boundBy: number;
}) {
  const result = await db.insert(merchantRestaurants).values({
    merchantId: data.merchantId,
    restaurantId: data.restaurantId,
    boundBy: data.boundBy,
  });

  return { success: true, id: Number(result.insertId) };
}

/**
 * 解除店鋪綁定
 */
export async function unbindMerchantRestaurant(merchantId: number, restaurantId: number) {
  await db
    .delete(merchantRestaurants)
    .where(
      and(
        eq(merchantRestaurants.merchantId, merchantId),
        eq(merchantRestaurants.restaurantId, restaurantId)
      )
    );

  return { success: true };
}

/**
 * 取得商家與店鋪的綁定關係
 */
export async function getMerchantRestaurantBinding(merchantId: number, restaurantId: number) {
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

  return result[0] || null;
}

/**
 * 檢查商家是否有權限存取店鋪
 */
export async function checkMerchantRestaurantAccess(merchantId: number, restaurantId: number) {
  const binding = await getMerchantRestaurantBinding(merchantId, restaurantId);
  return !!binding;
}

/**
 * 取得商家管理的所有店鋪
 */
export async function getMerchantRestaurants(merchantId: number) {
  return db
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
      // 綁定資訊
      boundAt: merchantRestaurants.boundAt,
    })
    .from(merchantRestaurants)
    .innerJoin(restaurants, eq(merchantRestaurants.restaurantId, restaurants.id))
    .where(eq(merchantRestaurants.merchantId, merchantId))
    .orderBy(desc(merchantRestaurants.boundAt));
}

// ========== 統計資料 ==========

/**
 * 取得店鋪統計資料
 */
export async function getRestaurantStatistics(
  restaurantId: number,
  startDate?: string,
  endDate?: string
) {
  let query = db
    .select()
    .from(restaurantStatistics)
    .where(eq(restaurantStatistics.restaurantId, restaurantId));

  if (startDate && endDate) {
    query = query.where(
      and(
        sql`${restaurantStatistics.date} >= ${startDate}`,
        sql`${restaurantStatistics.date} <= ${endDate}`
      )
    ) as any;
  } else if (startDate) {
    query = query.where(sql`${restaurantStatistics.date} >= ${startDate}`) as any;
  } else if (endDate) {
    query = query.where(sql`${restaurantStatistics.date} <= ${endDate}`) as any;
  }

  return query.orderBy(asc(restaurantStatistics.date));
}

/**
 * 取得商家的所有店鋪總覽統計
 */
export async function getMerchantOverviewStatistics(
  merchantId: number,
  startDate?: string,
  endDate?: string
) {
  // 先取得商家的所有店鋪 ID
  const merchantRestaurantList = await db
    .select({ restaurantId: merchantRestaurants.restaurantId })
    .from(merchantRestaurants)
    .where(eq(merchantRestaurants.merchantId, merchantId));

  const restaurantIds = merchantRestaurantList.map(r => r.restaurantId);

  if (restaurantIds.length === 0) {
    return {
      totalSpins: 0,
      totalCouponsIssued: 0,
      totalCouponsRedeemed: 0,
      averageRedemptionRate: 0,
      totalUniqueUsers: 0,
      restaurants: [],
    };
  }

  // 取得所有店鋪的統計資料
  let query = db
    .select()
    .from(restaurantStatistics)
    .where(sql`${restaurantStatistics.restaurantId} IN (${sql.join(restaurantIds, sql`, `)})`);

  if (startDate && endDate) {
    query = query.where(
      and(
        sql`${restaurantStatistics.date} >= ${startDate}`,
        sql`${restaurantStatistics.date} <= ${endDate}`
      )
    ) as any;
  } else if (startDate) {
    query = query.where(sql`${restaurantStatistics.date} >= ${startDate}`) as any;
  } else if (endDate) {
    query = query.where(sql`${restaurantStatistics.date} <= ${endDate}`) as any;
  }

  const stats = await query;

  // 計算總計
  const totalSpins = stats.reduce((sum, s) => sum + s.totalSpins, 0);
  const totalCouponsIssued = stats.reduce((sum, s) => sum + s.couponsIssued, 0);
  const totalCouponsRedeemed = stats.reduce((sum, s) => sum + s.couponsRedeemed, 0);
  const averageRedemptionRate = totalCouponsIssued > 0 
    ? Math.round((totalCouponsRedeemed / totalCouponsIssued) * 100)
    : 0;

  // 計算每個店鋪的總計
  const restaurantStats = restaurantIds.map(restaurantId => {
    const restaurantData = stats.filter(s => s.restaurantId === restaurantId);
    const spins = restaurantData.reduce((sum, s) => sum + s.totalSpins, 0);
    const couponsIssued = restaurantData.reduce((sum, s) => sum + s.couponsIssued, 0);
    const couponsRedeemed = restaurantData.reduce((sum, s) => sum + s.couponsRedeemed, 0);
    const redemptionRate = couponsIssued > 0 
      ? Math.round((couponsRedeemed / couponsIssued) * 100)
      : 0;

    return {
      restaurantId,
      totalSpins: spins,
      couponsIssued,
      couponsRedeemed,
      redemptionRate,
    };
  });

  return {
    totalSpins,
    totalCouponsIssued,
    totalCouponsRedeemed,
    averageRedemptionRate,
    restaurants: restaurantStats,
  };
}

/**
 * 取得店鋪排名
 */
export async function getRestaurantRanking(
  merchantId: number,
  startDate?: string,
  endDate?: string,
  metric: 'totalSpins' | 'couponsRedeemed' | 'redemptionRate' = 'totalSpins'
) {
  // 取得所有店鋪的統計資料（不限於該商家）
  let query = db
    .select({
      restaurantId: restaurantStatistics.restaurantId,
      totalSpins: sql<number>`SUM(${restaurantStatistics.totalSpins})`,
      couponsIssued: sql<number>`SUM(${restaurantStatistics.couponsIssued})`,
      couponsRedeemed: sql<number>`SUM(${restaurantStatistics.couponsRedeemed})`,
    })
    .from(restaurantStatistics);

  if (startDate && endDate) {
    query = query.where(
      and(
        sql`${restaurantStatistics.date} >= ${startDate}`,
        sql`${restaurantStatistics.date} <= ${endDate}`
      )
    ) as any;
  } else if (startDate) {
    query = query.where(sql`${restaurantStatistics.date} >= ${startDate}`) as any;
  } else if (endDate) {
    query = query.where(sql`${restaurantStatistics.date} <= ${endDate}`) as any;
  }

  const stats = await query.groupBy(restaurantStatistics.restaurantId);

  // 計算兌換率並排序
  const rankedStats = stats.map(s => ({
    restaurantId: s.restaurantId,
    totalSpins: Number(s.totalSpins),
    couponsIssued: Number(s.couponsIssued),
    couponsRedeemed: Number(s.couponsRedeemed),
    redemptionRate: s.couponsIssued > 0 
      ? Math.round((Number(s.couponsRedeemed) / Number(s.couponsIssued)) * 100)
      : 0,
  })).sort((a, b) => {
    if (metric === 'totalSpins') return b.totalSpins - a.totalSpins;
    if (metric === 'couponsRedeemed') return b.couponsRedeemed - a.couponsRedeemed;
    return b.redemptionRate - a.redemptionRate;
  });

  // 取得商家的店鋪 ID
  const merchantRestaurantList = await db
    .select({ restaurantId: merchantRestaurants.restaurantId })
    .from(merchantRestaurants)
    .where(eq(merchantRestaurants.merchantId, merchantId));

  const merchantRestaurantIds = merchantRestaurantList.map(r => r.restaurantId);

  // 標記商家的店鋪並加上排名
  const rankedWithPosition = rankedStats.map((stat, index) => ({
    ...stat,
    rank: index + 1,
    isMine: merchantRestaurantIds.includes(stat.restaurantId),
  }));

  // 取得店鋪名稱
  const restaurantIds = rankedWithPosition.map(r => r.restaurantId);
  const restaurantNames = await db
    .select({
      id: restaurants.id,
      name: restaurants.name,
    })
    .from(restaurants)
    .where(sql`${restaurants.id} IN (${sql.join(restaurantIds, sql`, `)})`);

  const nameMap = new Map(restaurantNames.map(r => [r.id, r.name]));

  return rankedWithPosition.map(r => ({
    ...r,
    restaurantName: nameMap.get(r.restaurantId) || '未知店鋪',
  }));
}

/**
 * 更新店鋪統計資料（每次轉盤後呼叫）
 */
export async function updateRestaurantStatisticsOnSpin(
  restaurantId: number,
  mealPeriod: string,
  hasCoupon: boolean
) {
  const today = new Date().toISOString().split('T')[0];

  // 根據時段決定要更新哪個欄位
  const periodColumn = `${mealPeriod}Spins`;

  // 使用 INSERT ... ON DUPLICATE KEY UPDATE
  await db.execute(sql`
    INSERT INTO restaurant_statistics (
      restaurantId,
      date,
      totalSpins,
      ${sql.raw(periodColumn)},
      couponsIssued
    ) VALUES (
      ${restaurantId},
      ${today},
      1,
      1,
      ${hasCoupon ? 1 : 0}
    )
    ON DUPLICATE KEY UPDATE
      totalSpins = totalSpins + 1,
      ${sql.raw(periodColumn)} = ${sql.raw(periodColumn)} + 1,
      couponsIssued = couponsIssued + ${hasCoupon ? 1 : 0}
  `);
}

/**
 * 更新店鋪統計資料（優惠券兌換時呼叫）
 */
export async function updateRestaurantStatisticsOnRedeem(restaurantId: number) {
  const today = new Date().toISOString().split('T')[0];

  await db.execute(sql`
    UPDATE restaurant_statistics
    SET 
      couponsRedeemed = couponsRedeemed + 1,
      redemptionRate = ROUND((couponsRedeemed + 1) / couponsIssued * 100)
    WHERE restaurantId = ${restaurantId} AND date = ${today}
  `);
}
