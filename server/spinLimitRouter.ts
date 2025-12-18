import { z } from "zod";
import { protectedProcedure, router } from "./_core/trpc";
import * as db from "./db";
import { TRPCError } from "@trpc/server";

const MAX_SPINS_PER_PERIOD = 2;
const MAX_DAILY_COUPONS = 10;

/**
 * 轉盤使用限制路由
 */
export const spinLimitRouter = router({
  /**
   * 檢查是否可以轉盤
   */
  canSpin: protectedProcedure
    .input(z.object({
      mealPeriod: z.enum(["breakfast", "lunch", "afternoon_tea", "dinner", "late_night"]),
    }))
    .query(async ({ ctx, input }) => {
      const today = new Date().toISOString().split('T')[0];
      const limit = await db.getSpinLimit(ctx.user.id, today, input.mealPeriod);
      const dailyCouponCount = await db.getDailyCouponCount(ctx.user.id, today);
      
      const usedCount = limit?.usedCount || 0;
      const canSpin = usedCount < MAX_SPINS_PER_PERIOD;
      const canGetCoupon = dailyCouponCount < MAX_DAILY_COUPONS;
      
      return {
        canSpin,
        canGetCoupon,
        usedCount,
        remainingSpins: MAX_SPINS_PER_PERIOD - usedCount,
        dailyCouponCount,
        remainingCoupons: MAX_DAILY_COUPONS - dailyCouponCount,
      };
    }),

  /**
   * 記錄轉盤使用
   */
  recordSpin: protectedProcedure
    .input(z.object({
      restaurantId: z.number(),
      couponId: z.number().optional(),
      mealPeriod: z.enum(["breakfast", "lunch", "afternoon_tea", "dinner", "late_night"]),
    }))
    .mutation(async ({ ctx, input }) => {
      const today = new Date().toISOString().split('T')[0];
      
      // 檢查是否可以轉盤
      const limit = await db.getSpinLimit(ctx.user.id, today, input.mealPeriod);
      const usedCount = limit?.usedCount || 0;
      
      if (usedCount >= MAX_SPINS_PER_PERIOD) {
        throw new TRPCError({ 
          code: 'BAD_REQUEST', 
          message: `本時段轉盤次數已用完（${MAX_SPINS_PER_PERIOD}/${MAX_SPINS_PER_PERIOD}）` 
        });
      }
      
      // 檢查每日優惠券數量
      const dailyCouponCount = await db.getDailyCouponCount(ctx.user.id, today);
      const canGetCoupon = dailyCouponCount < MAX_DAILY_COUPONS;
      
      // 記錄轉盤使用
      await db.incrementSpinLimit(ctx.user.id, today, input.mealPeriod);
      
      // 如果有優惠券且未達上限，則增加優惠券計數
      if (input.couponId && canGetCoupon) {
        await db.incrementDailyCouponCount(ctx.user.id, today);
      }
      
      // 建立轉盤歷史記錄
      await db.createSpinHistory({
        userId: ctx.user.id,
        restaurantId: input.restaurantId,
        couponId: canGetCoupon ? input.couponId : undefined,
        mealPeriod: input.mealPeriod,
        isExpired: false,
      });
      
      return {
        success: true,
        gotCoupon: canGetCoupon && !!input.couponId,
        dailyCouponCount: canGetCoupon && input.couponId ? dailyCouponCount + 1 : dailyCouponCount,
        message: canGetCoupon || !input.couponId 
          ? '轉盤成功！' 
          : `今日優惠券已達上限（${MAX_DAILY_COUPONS}張），但您仍可繼續轉盤尋找餐廳`,
      };
    }),

  /**
   * 取得今日使用統計
   */
  getTodayStats: protectedProcedure.query(async ({ ctx }) => {
    const today = new Date().toISOString().split('T')[0];
    const limits = await db.getDailySpinLimits(ctx.user.id, today);
    const dailyCouponCount = await db.getDailyCouponCount(ctx.user.id, today);
    
    const stats = {
      breakfast: 0,
      lunch: 0,
      afternoon_tea: 0,
      dinner: 0,
      late_night: 0,
    };
    
    limits.forEach(limit => {
      stats[limit.mealPeriod] = limit.usedCount;
    });
    
    return {
      periodStats: stats,
      dailyCouponCount,
      maxSpinsPerPeriod: MAX_SPINS_PER_PERIOD,
      maxDailyCoupons: MAX_DAILY_COUPONS,
    };
  }),
});
