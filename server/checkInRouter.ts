import { z } from "zod";
import { protectedProcedure, router } from "./_core/trpc";
import * as db from "./db";
import { TRPCError } from "@trpc/server";

/**
 * 簽到系統路由
 */
export const checkInRouter = router({
  /**
   * 取得使用者的簽到狀態
   */
  getStatus: protectedProcedure.query(async ({ ctx }) => {
    const today = new Date().toISOString().split('T')[0];
    const todayCheckIn = await db.getTodayCheckIn(ctx.user.id, today);
    const lastCheckIn = await db.getLastCheckIn(ctx.user.id);
    
    return {
      hasCheckedInToday: !!todayCheckIn,
      consecutiveDays: todayCheckIn?.consecutiveDays || 0,
      rewardClaimed: todayCheckIn?.rewardClaimed || false,
      lastCheckInDate: lastCheckIn?.checkInDate,
    };
  }),

  /**
   * 執行簽到
   */
  checkIn: protectedProcedure.mutation(async ({ ctx }) => {
    const today = new Date().toISOString().split('T')[0];
    const todayCheckIn = await db.getTodayCheckIn(ctx.user.id, today);
    
    if (todayCheckIn) {
      throw new TRPCError({ code: 'BAD_REQUEST', message: '今天已經簽到過了' });
    }
    
    const lastCheckIn = await db.getLastCheckIn(ctx.user.id);
    let consecutiveDays = 1;
    
    if (lastCheckIn) {
      const lastDate = new Date(lastCheckIn.checkInDate);
      const todayDate = new Date(today);
      const diffDays = Math.floor((todayDate.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24));
      
      if (diffDays === 1) {
        // 連續簽到
        consecutiveDays = lastCheckIn.consecutiveDays + 1;
      } else if (diffDays > 1) {
        // 中斷，重新計算
        consecutiveDays = 1;
      }
    }
    
    await db.createCheckInRecord({
      userId: ctx.user.id,
      checkInDate: today,
      consecutiveDays,
      rewardClaimed: false,
    });
    
    // 簽到獎勵：+1 次轉盤機會（透過前端處理）
    
    // 連續簽到 7 天獎勵：5 折專屬優惠券
    let rewardCoupon = null;
    if (consecutiveDays >= 7) {
      // 隨機選擇一家提供簽到獎勵的店家
      const rewardRestaurants = await db.getCheckInRewardRestaurants();
      
      if (rewardRestaurants.length > 0) {
        const randomRestaurant = rewardRestaurants[Math.floor(Math.random() * rewardRestaurants.length)];
        
        // 建立簽到獎勵優惠券記錄（在 spinHistory 中）
        const expiryDate = new Date();
        expiryDate.setDate(expiryDate.getDate() + 7); // 7 天後過期
        
        // 取得該店家的簽到獎勵優惠券
        const coupons = await db.getCouponsByRestaurantId(randomRestaurant.id);
        const rewardCouponData = coupons.find(c => c.isCheckInReward);
        
        if (rewardCouponData) {
          await db.createSpinHistory({
            userId: ctx.user.id,
            restaurantId: randomRestaurant.id,
            couponId: rewardCouponData.id,
            mealPeriod: 'lunch', // 預設為午餐時段
            isExpired: false,
          });
          
          rewardCoupon = {
            restaurant: randomRestaurant,
            coupon: rewardCouponData,
          };
        }
      }
    }
    
    return {
      success: true,
      consecutiveDays,
      rewardCoupon,
    };
  }),

  /**
   * 取得簽到歷史
   */
  getHistory: protectedProcedure
    .input(z.object({
      limit: z.number().default(30),
    }))
    .query(async ({ ctx, input }) => {
      return db.getCheckInHistory(ctx.user.id, input.limit);
    }),
});
