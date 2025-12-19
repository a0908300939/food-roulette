import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import { z } from "zod";
import * as db from "./db";
import { TRPCError } from '@trpc/server';

/**
 * 管理員權限檢查
 */
const adminProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.user.role !== 'admin') {
    throw new TRPCError({ code: 'FORBIDDEN', message: '需要管理員權限' });
  }
  return next({ ctx });
});

/**
 * 商家權限檢查
 */
const merchantProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.user.role !== 'merchant' && ctx.user.role !== 'admin') {
    throw new TRPCError({ code: 'FORBIDDEN', message: '需要商家或管理員權限' });
  }
  return next({ ctx });
});

/**
 * 商家管理 Router（管理員專用）
 */
export const merchantAdminRouter = router({
  // 列出所有商家
  list: adminProcedure.query(async () => {
    return db.getAllMerchants();
  }),

  // 取得商家詳情
  getById: adminProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      return db.getMerchantById(input.id);
    }),

  // 建立商家帳號
  create: adminProcedure
    .input(z.object({
      phone: z.string().optional(),
      email: z.string().optional(),
      name: z.string().min(1),
      contactPhone: z.string().optional(),
      contactEmail: z.string().optional(),
      notes: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      // 至少需要提供手機或 Email 其中之一
      if (!input.phone && !input.email) {
        throw new TRPCError({ 
          code: 'BAD_REQUEST', 
          message: '請提供手機號碼或 Email' 
        });
      }

      // 驗證格式
      if (input.phone) {
        const { validatePhoneNumber } = await import('../shared/deviceFingerprint');
        if (!validatePhoneNumber(input.phone)) {
          throw new TRPCError({ 
            code: 'BAD_REQUEST', 
            message: '手機號碼格式錯誤，請輸入09開頭的10位數字' 
          });
        }
      }

      if (input.email) {
        const { validateEmail } = await import('../shared/deviceFingerprint');
        if (!validateEmail(input.email)) {
          throw new TRPCError({ 
            code: 'BAD_REQUEST', 
            message: 'Email 格式錯誤' 
          });
        }
      }

      // 檢查是否已經存在
      const existingUser = await db.getUserByPhoneOrEmail(input.phone, input.email);
      if (existingUser) {
        throw new TRPCError({ 
          code: 'CONFLICT', 
          message: '此手機號碼或 Email 已被使用' 
        });
      }

      // 建立使用者帳號（role: merchant）
      const user = await db.createMerchantUser({
        phone: input.phone,
        email: input.email,
        name: input.name,
      });

      // 建立商家資料
      const merchant = await db.createMerchant({
        userId: user.id,
        name: input.name,
        contactPhone: input.contactPhone || input.phone,
        contactEmail: input.contactEmail || input.email,
        notes: input.notes,
        createdBy: ctx.user.id,
      });

      return { user, merchant };
    }),

  // 更新商家資訊
  update: adminProcedure
    .input(z.object({
      id: z.number(),
      name: z.string().min(1).optional(),
      contactPhone: z.string().optional(),
      contactEmail: z.string().optional(),
      status: z.enum(["active", "suspended", "inactive"]).optional(),
      notes: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const { id, ...data } = input;
      return db.updateMerchant(id, data);
    }),

  // 刪除商家帳號
  delete: adminProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      return db.deleteMerchant(input.id);
    }),

  // 綁定店鋪到商家
  bindRestaurant: adminProcedure
    .input(z.object({
      merchantId: z.number(),
      restaurantId: z.number(),
    }))
    .mutation(async ({ input, ctx }) => {
      // 檢查商家是否存在
      const merchant = await db.getMerchantById(input.merchantId);
      if (!merchant) {
        throw new TRPCError({ code: 'NOT_FOUND', message: '商家不存在' });
      }

      // 檢查店鋪是否存在
      const restaurant = await db.getRestaurantById(input.restaurantId);
      if (!restaurant) {
        throw new TRPCError({ code: 'NOT_FOUND', message: '店鋪不存在' });
      }

      // 檢查是否已經綁定
      const existing = await db.getMerchantRestaurantBinding(input.merchantId, input.restaurantId);
      if (existing) {
        throw new TRPCError({ code: 'CONFLICT', message: '此店鋪已綁定到該商家' });
      }

      // 建立綁定
      return db.bindMerchantRestaurant({
        merchantId: input.merchantId,
        restaurantId: input.restaurantId,
        boundBy: ctx.user.id,
      });
    }),

  // 解除店鋪綁定
  unbindRestaurant: adminProcedure
    .input(z.object({
      merchantId: z.number(),
      restaurantId: z.number(),
    }))
    .mutation(async ({ input }) => {
      return db.unbindMerchantRestaurant(input.merchantId, input.restaurantId);
    }),

  // 取得商家管理的所有店鋪
  getRestaurants: adminProcedure
    .input(z.object({ merchantId: z.number() }))
    .query(async ({ input }) => {
      return db.getMerchantRestaurants(input.merchantId);
    }),
});

/**
 * 商家 Router（商家專用）
 */
export const merchantRouter = router({
  // 取得自己的商家資訊
  getProfile: merchantProcedure.query(async ({ ctx }) => {
    const merchant = await db.getMerchantByUserId(ctx.user.id);
    if (!merchant) {
      throw new TRPCError({ code: 'NOT_FOUND', message: '商家資料不存在' });
    }
    return merchant;
  }),

  // 更新自己的商家資訊
  updateProfile: merchantProcedure
    .input(z.object({
      name: z.string().min(1).optional(),
      contactPhone: z.string().optional(),
      contactEmail: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const merchant = await db.getMerchantByUserId(ctx.user.id);
      if (!merchant) {
        throw new TRPCError({ code: 'NOT_FOUND', message: '商家資料不存在' });
      }
      return db.updateMerchant(merchant.id, input);
    }),

  // 取得自己管理的所有店鋪
  getMyRestaurants: merchantProcedure.query(async ({ ctx }) => {
    const merchant = await db.getMerchantByUserId(ctx.user.id);
    if (!merchant) {
      throw new TRPCError({ code: 'NOT_FOUND', message: '商家資料不存在' });
    }
    return db.getMerchantRestaurants(merchant.id);
  }),

  // 取得店鋪詳情（只能查看自己的店鋪）
  getRestaurant: merchantProcedure
    .input(z.object({ restaurantId: z.number() }))
    .query(async ({ input, ctx }) => {
      // 管理員可以查看所有店鋪
      if (ctx.user.role === 'admin') {
        return db.getRestaurantById(input.restaurantId);
      }

      // 商家只能查看自己的店鋪
      const merchant = await db.getMerchantByUserId(ctx.user.id);
      if (!merchant) {
        throw new TRPCError({ code: 'NOT_FOUND', message: '商家資料不存在' });
      }

      const hasAccess = await db.checkMerchantRestaurantAccess(merchant.id, input.restaurantId);
      if (!hasAccess) {
        throw new TRPCError({ code: 'FORBIDDEN', message: '您沒有權限查看此店鋪' });
      }

      return db.getRestaurantById(input.restaurantId);
    }),

  // 更新店鋪資訊（只能更新自己的店鋪，不含機率）
  updateRestaurant: merchantProcedure
    .input(z.object({
      restaurantId: z.number(),
      name: z.string().min(1).optional(),
      address: z.string().min(1).optional(),
      latitude: z.string().optional(),
      longitude: z.string().optional(),
      phone: z.string().optional(),
      description: z.string().optional(),
      photoUrl: z.string().optional(),
      operatingHours: z.string().optional(),
      providesCheckInReward: z.boolean().optional(),
      // 注意：商家不能修改 isActive 狀態
    }))
    .mutation(async ({ input, ctx }) => {
      const { restaurantId, ...data } = input;

      // 管理員可以更新所有店鋪
      if (ctx.user.role === 'admin') {
        return db.updateRestaurant(restaurantId, data);
      }

      // 商家只能更新自己的店鋪
      const merchant = await db.getMerchantByUserId(ctx.user.id);
      if (!merchant) {
        throw new TRPCError({ code: 'NOT_FOUND', message: '商家資料不存在' });
      }

      const hasAccess = await db.checkMerchantRestaurantAccess(merchant.id, restaurantId);
      if (!hasAccess) {
        throw new TRPCError({ code: 'FORBIDDEN', message: '您沒有權限修改此店鋪' });
      }

      return db.updateRestaurant(restaurantId, data);
    }),

  // 取得店鋪的統計資料
  getRestaurantStatistics: merchantProcedure
    .input(z.object({
      restaurantId: z.number(),
      startDate: z.string().optional(), // YYYY-MM-DD
      endDate: z.string().optional(),   // YYYY-MM-DD
    }))
    .query(async ({ input, ctx }) => {
      // 管理員可以查看所有店鋪的統計
      if (ctx.user.role === 'admin') {
        return db.getRestaurantStatistics(input.restaurantId, input.startDate, input.endDate);
      }

      // 商家只能查看自己的店鋪統計
      const merchant = await db.getMerchantByUserId(ctx.user.id);
      if (!merchant) {
        throw new TRPCError({ code: 'NOT_FOUND', message: '商家資料不存在' });
      }

      const hasAccess = await db.checkMerchantRestaurantAccess(merchant.id, input.restaurantId);
      if (!hasAccess) {
        throw new TRPCError({ code: 'FORBIDDEN', message: '您沒有權限查看此店鋪的統計資料' });
      }

      return db.getRestaurantStatistics(input.restaurantId, input.startDate, input.endDate);
    }),

  // 取得所有店鋪的總覽統計
  getOverviewStatistics: merchantProcedure
    .input(z.object({
      startDate: z.string().optional(),
      endDate: z.string().optional(),
    }))
    .query(async ({ input, ctx }) => {
      const merchant = await db.getMerchantByUserId(ctx.user.id);
      if (!merchant) {
        throw new TRPCError({ code: 'NOT_FOUND', message: '商家資料不存在' });
      }

      return db.getMerchantOverviewStatistics(merchant.id, input.startDate, input.endDate);
    }),

  // 取得排名資料
  getRanking: merchantProcedure
    .input(z.object({
      startDate: z.string().optional(),
      endDate: z.string().optional(),
      metric: z.enum(['totalSpins', 'couponsRedeemed', 'redemptionRate']).default('totalSpins'),
    }))
    .query(async ({ input, ctx }) => {
      const merchant = await db.getMerchantByUserId(ctx.user.id);
      if (!merchant) {
        throw new TRPCError({ code: 'NOT_FOUND', message: '商家資料不存在' });
      }

      return db.getRestaurantRanking(merchant.id, input.startDate, input.endDate, input.metric);
    }),

  // 管理優惠券
  coupons: router({
    // 列出店鋪的所有優惠券
    list: merchantProcedure
      .input(z.object({ restaurantId: z.number() }))
      .query(async ({ input, ctx }) => {
        // 檢查權限
        if (ctx.user.role !== 'admin') {
          const merchant = await db.getMerchantByUserId(ctx.user.id);
          if (!merchant) {
            throw new TRPCError({ code: 'NOT_FOUND', message: '商家資料不存在' });
          }

          const hasAccess = await db.checkMerchantRestaurantAccess(merchant.id, input.restaurantId);
          if (!hasAccess) {
            throw new TRPCError({ code: 'FORBIDDEN', message: '您沒有權限查看此店鋪的優惠券' });
          }
        }

        return db.getCouponsByRestaurantId(input.restaurantId);
      }),

    // 新增優惠券
    create: merchantProcedure
      .input(z.object({
        restaurantId: z.number(),
        title: z.string().min(1),
        description: z.string().min(1),
        imageUrl: z.string().optional(),
        type: z.enum(["discount", "gift", "cashback", "check_in_reward"]).default("discount"),
        isCheckInReward: z.boolean().default(false),
        expiresAt: z.date().optional(),
        isActive: z.boolean().default(true),
      }))
      .mutation(async ({ input, ctx }) => {
        // 檢查權限
        if (ctx.user.role !== 'admin') {
          const merchant = await db.getMerchantByUserId(ctx.user.id);
          if (!merchant) {
            throw new TRPCError({ code: 'NOT_FOUND', message: '商家資料不存在' });
          }

          const hasAccess = await db.checkMerchantRestaurantAccess(merchant.id, input.restaurantId);
          if (!hasAccess) {
            throw new TRPCError({ code: 'FORBIDDEN', message: '您沒有權限為此店鋪新增優惠券' });
          }
        }

        return db.createCoupon(input);
      }),

    // 更新優惠券
    update: merchantProcedure
      .input(z.object({
        id: z.number(),
        restaurantId: z.number(),
        title: z.string().min(1).optional(),
        description: z.string().min(1).optional(),
        imageUrl: z.string().optional(),
        type: z.enum(["discount", "gift", "cashback", "check_in_reward"]).optional(),
        isCheckInReward: z.boolean().optional(),
        expiresAt: z.date().optional(),
        isActive: z.boolean().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const { id, restaurantId, ...data } = input;

        // 檢查權限
        if (ctx.user.role !== 'admin') {
          const merchant = await db.getMerchantByUserId(ctx.user.id);
          if (!merchant) {
            throw new TRPCError({ code: 'NOT_FOUND', message: '商家資料不存在' });
          }

          const hasAccess = await db.checkMerchantRestaurantAccess(merchant.id, restaurantId);
          if (!hasAccess) {
            throw new TRPCError({ code: 'FORBIDDEN', message: '您沒有權限修改此優惠券' });
          }
        }

        return db.updateCoupon(id, data);
      }),

    // 刪除優惠券
    delete: merchantProcedure
      .input(z.object({
        id: z.number(),
        restaurantId: z.number(),
      }))
      .mutation(async ({ input, ctx }) => {
        // 檢查權限
        if (ctx.user.role !== 'admin') {
          const merchant = await db.getMerchantByUserId(ctx.user.id);
          if (!merchant) {
            throw new TRPCError({ code: 'NOT_FOUND', message: '商家資料不存在' });
          }

          const hasAccess = await db.checkMerchantRestaurantAccess(merchant.id, input.restaurantId);
          if (!hasAccess) {
            throw new TRPCError({ code: 'FORBIDDEN', message: '您沒有權限刪除此優惠券' });
          }
        }

        return db.deleteCoupon(input.id);
      }),
  }),
});
