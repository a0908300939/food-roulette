import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import { z } from "zod";
import * as db from "./db";
import { TRPCError } from '@trpc/server';
import { lineAuthRouter } from "./lineAuth";
import { checkInRouter } from "./checkInRouter";
import { spinLimitRouter } from "./spinLimitRouter";
import { pushNotificationRouter } from "./pushNotificationRouter";
import { adminRouter } from "./adminRouter";
import { notificationRouter } from "./routers/notificationRouter";
import { userManagementRouter } from "./routers/userManagementRouter";
// import { merchantAdminRouter, merchantRouter } from "./merchantRouter";
import { initDbRouter } from "./initDbRouter";
import { storagePut } from "./storage";
import { tempUpgradeRouter } from "./tempUpgradeRouter";

// 管理員權限檢查
const adminProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.user.role !== 'admin') {
    throw new TRPCError({ code: 'FORBIDDEN', message: '需要管理員權限' });
  }
  return next({ ctx });
});

export const appRouter = router({
  system: systemRouter,
  lineAuth: lineAuthRouter,
  checkIn: checkInRouter,
  spinLimit: spinLimitRouter,
  pushNotification: pushNotificationRouter,
  admin: adminRouter,
  notification: notificationRouter,
  userManagement: userManagementRouter,
  // merchantAdmin: merchantAdminRouter,
  // merchant: merchantRouter,
  initDb: initDbRouter,
  tempUpgrade: tempUpgradeRouter,
  
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
    
    // 簡易登入（手機或 Email）
    simpleLogin: publicProcedure
      .input(z.object({
        phone: z.string().optional(),
        email: z.string().optional(),
        deviceId: z.string(),
        deviceInfo: z.object({
          userAgent: z.string(),
          screenResolution: z.string(),
          timezone: z.string(),
        }),
      }))
      .mutation(async ({ input, ctx }) => {
        const { phone, email, deviceId, deviceInfo } = input;
        
        // 至少需要提供手機或 Email 其中之一
        if (!phone && !email) {
          throw new TRPCError({ 
            code: 'BAD_REQUEST', 
            message: '請提供手機號碼或 Email' 
          });
        }
        
        // 驗證格式
        if (phone) {
          const { validatePhoneNumber } = await import('../shared/deviceFingerprint');
          if (!validatePhoneNumber(phone)) {
            throw new TRPCError({ 
              code: 'BAD_REQUEST', 
              message: '手機號碼格式錯誤，請輸入09開頭的10位數字' 
            });
          }
        }
        
        if (email) {
          const { validateEmail } = await import('../shared/deviceFingerprint');
          if (!validateEmail(email)) {
            throw new TRPCError({ 
              code: 'BAD_REQUEST', 
              message: 'Email 格式錯誤' 
            });
          }
        }
        
        // 查詢是否已經有這個帳號
        const existingUser = await db.getUserByPhoneOrEmail(phone, email);
        
        if (existingUser) {
          // 帳號已存在，檢查裝置是否相同
          if (existingUser.deviceId && existingUser.deviceId !== deviceId) {
            // 不同裝置，自動解綁舊裝置，綁定新裝置
            await db.updateUserDevice(existingUser.id, deviceId);
          }
          
          // 更新最後登入時間
          await db.updateUserLastSignIn(existingUser.id);
          
          // 生成 session token
          const token = await db.createUserSession(existingUser.id);
          
          // 設定 cookie
          const cookieOptions = getSessionCookieOptions(ctx.req);
          ctx.res.cookie(COOKIE_NAME, token, cookieOptions);
          
          return {
            success: true,
            user: existingUser,
            isNewUser: false,
          };
        } else {
          // 新帳號，建立使用者
          const newUser = await db.createSimpleUser({
            phone,
            email,
            deviceId,
            loginMethod: 'simple',
          });
          
          if (!newUser) {
            throw new Error('建立使用者失敗');
          }
          
          // 生成 session token
          const token = await db.createUserSession(newUser.id);
          
          // 設定 cookie
          const cookieOptions = getSessionCookieOptions(ctx.req);
          ctx.res.cookie(COOKIE_NAME, token, cookieOptions);
          
          return {
            success: true,
            user: newUser,
            isNewUser: true,
          };
        }
      }),
  }),

  // ========== 店家管理 (管理員專用) ==========
  restaurants: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      const user = ctx.user;
      
      // 管理員可以看到所有店舖
      if (user.role === 'admin') {
        return db.getAllRestaurants();
      }
      
      // 店舖擁有者只能看到被指派的店舖
      if (user.role === 'merchant') {
        const userRestaurants = await db.getUserRestaurants(user.id);
        const restaurantIds = userRestaurants.map(ur => ur.restaurantId);
        
        if (restaurantIds.length === 0) {
          return [];
        }
        
        const allRestaurants = await db.getAllRestaurants();
        return allRestaurants.filter(r => restaurantIds.includes(r.id));
      }
      
      // 一般使用者可以看到所有啟用的店舖
      return db.getActiveRestaurants();
    }),
    
    listActive: publicProcedure.query(async () => {
      return db.getActiveRestaurants();
    }),
    
    listActiveWithCoupons: publicProcedure.query(async () => {
      return db.getActiveRestaurantsWithCoupons();
    }),
    
    getById: publicProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        return db.getRestaurantById(input.id);
      }),
    
    create: adminProcedure
      .input(z.object({
        name: z.string().min(1),
        address: z.string().min(1),
        latitude: z.string().optional(),
        longitude: z.string().optional(),
        phone: z.string().optional(),
        description: z.string().optional(),
        photoUrl: z.string().optional(),
        operatingHours: z.string().min(1),
        providesCheckInReward: z.boolean().default(false),
        isActive: z.boolean().default(true),
      }))
      .mutation(async ({ input }) => {
        return db.createRestaurant(input);
      }),
    
    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        name: z.string().min(1).optional(),
        address: z.string().min(1).optional(),
        latitude: z.string().optional(),
        longitude: z.string().optional(),
        phone: z.string().optional(),
        description: z.string().optional(),
        photoUrl: z.string().optional(),
        operatingHours: z.string().optional(),
        providesCheckInReward: z.boolean().optional(),
        isActive: z.boolean().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const { id, ...data } = input;
        const user = ctx.user;
        
        // 管理員可以修改任何店舖
        if (user.role === 'admin') {
          return db.updateRestaurant(id, data);
        }
        
        // 店舖擁有者只能修改被指派的店舖
        if (user.role === 'merchant') {
          const canManage = await db.canUserManageRestaurant(user.id, id);
          if (!canManage) {
            throw new TRPCError({ code: 'FORBIDDEN', message: '您沒有權限管理這個店舖' });
          }
          return db.updateRestaurant(id, data);
        }
        
        throw new TRPCError({ code: 'FORBIDDEN', message: '沒有權限' });
      }),
    
    delete: adminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        return db.deleteRestaurant(input.id);
      }),
    
    // 上傳店家照片
    uploadPhoto: adminProcedure
      .input(z.object({
        restaurantId: z.number(),
        imageData: z.string(), // Base64 encoded image
        mimeType: z.string(),
      }))
      .mutation(async ({ input }) => {
        // 將 Base64 轉換為 Buffer
        const base64Data = input.imageData.replace(/^data:image\/\w+;base64,/, '');
        const buffer = Buffer.from(base64Data, 'base64');
        
        // 上傳到 S3
        const fileKey = `restaurants/${input.restaurantId}-${Date.now()}.${input.mimeType.split('/')[1]}`;
        const { url } = await storagePut(fileKey, buffer, input.mimeType);
        
        // 更新店家照片 URL
        await db.updateRestaurant(input.restaurantId, { photoUrl: url });
        
        return { url };
      }),
  }),

  // ========== 優惠券管理 (管理員專用) ==========
  coupons: router({
    listByRestaurant: publicProcedure
      .input(z.object({ restaurantId: z.number() }))
      .query(async ({ input }) => {
        return db.getCouponsByRestaurantId(input.restaurantId);
      }),
    
    listActiveByRestaurant: publicProcedure
      .input(z.object({ restaurantId: z.number() }))
      .query(async ({ input }) => {
        return db.getActiveCouponsByRestaurantId(input.restaurantId);
      }),
    
    getById: publicProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        return db.getCouponById(input.id);
      }),
    
    create: adminProcedure
      .input(z.object({
        restaurantId: z.number(),
        title: z.string().min(1),
        description: z.string().min(1),
        imageUrl: z.string().optional(),
        type: z.enum(["discount", "gift", "cashback", "check_in_reward"]).default("discount"),
        isCheckInReward: z.boolean().default(false),
        weight: z.number().min(1).max(10).default(5),
        expiresAt: z.date().optional(),
        isActive: z.boolean().default(true),
      }))
      .mutation(async ({ input }) => {
        return db.createCoupon(input);
      }),
    
    update: adminProcedure
      .input(z.object({
        id: z.number(),
        title: z.string().min(1).optional(),
        description: z.string().min(1).optional(),
        imageUrl: z.string().optional(),
        type: z.enum(["discount", "gift", "cashback", "check_in_reward"]).optional(),
        isCheckInReward: z.boolean().optional(),
        weight: z.number().min(1).max(10).optional(),
        expiresAt: z.date().optional(),
        isActive: z.boolean().optional(),
      }))
      .mutation(async ({ input }) => {
        const { id, ...data } = input;
        return db.updateCoupon(id, data);
      }),
    
    delete: adminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        return db.deleteCoupon(input.id);
      }),
    
    // 上傳優惠券圖片
    uploadImage: adminProcedure
      .input(z.object({
        couponId: z.number(),
        imageData: z.string(), // Base64 encoded image
        mimeType: z.string(),
      }))
      .mutation(async ({ input }) => {
        // 將 Base64 轉換為 Buffer
        const base64Data = input.imageData.replace(/^data:image\/\w+;base64,/, '');
        const buffer = Buffer.from(base64Data, 'base64');
        
        // 上傳到 S3
        const fileKey = `coupons/${input.couponId}-${Date.now()}.${input.mimeType.split('/')[1]}`;
        const { url } = await storagePut(fileKey, buffer, input.mimeType);
        
        // 更新優惠券圖片 URL
        await db.updateCoupon(input.couponId, { imageUrl: url });
        
        return { url };
      }),
    
    // AI 生成優惠內容
    generateDescription: adminProcedure
      .input(z.object({
        title: z.string().min(1),
      }))
      .mutation(async ({ input }) => {
        try {
          const { OpenAI } = await import('openai');
          
          // 檢查環境變數
          const apiKey = process.env.OPENAI_API_KEY;
          if (!apiKey) {
            throw new TRPCError({
              code: 'INTERNAL_SERVER_ERROR',
              message: '伺服器未設定 OPENAI_API_KEY 環境變數，請聯絡管理員',
            });
          }
          
          const openai = new OpenAI({
            apiKey: apiKey,
          });
          
          const completion = await openai.chat.completions.create({
            model: 'gpt-4.1-mini',
            messages: [
              {
                role: 'system',
                content: '你是一個專業的優惠券內容編寫助手。根據優惠券標題，生成一段 50-100 字的詳細優惠內容說明。內容應該包括：優惠條件、使用方式、注意事項。請直接輸出內容，不要加上「優惠內容：」等前綴。',
              },
              {
                role: 'user',
                content: `優惠券標題：${input.title}`,
              },
            ],
            temperature: 0.7,
            max_tokens: 200,
          });
          
          const description = completion.choices[0]?.message?.content?.trim() || '';
          
          if (!description) {
            throw new TRPCError({
              code: 'INTERNAL_SERVER_ERROR',
              message: 'AI 生成內容失敗',
            });
          }
          
          return { description };
        } catch (error: any) {
          console.error('AI 生成優惠內容錯誤:', error);
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: `AI 生成失敗：${error.message}`,
          });
        }
      }),
  }),

  // ========== 轉盤功能 (使用者) ==========
  spin: router({
    // 取得轉盤資料（預先分配每個店家的優惠券）
    getWheelData: publicProcedure
      .input(z.object({
        restaurantIds: z.array(z.number()),
      }))
      .query(async ({ input }) => {
        // 為每個店家預先分配一張優惠券
        const wheelSlices = await Promise.all(
          input.restaurantIds.map(async (restaurantId) => {
            const restaurant = await db.getRestaurantById(restaurantId);
            if (!restaurant) return null;
            
            // 查詢該店家的所有優惠券（已過濾簽到獎勵券）
            const coupons = await db.getCouponsByRestaurantId(restaurantId);
            const availableCoupons = coupons.filter(c => c.isActive && !c.isCheckInReward);
            
            // 隨機選擇一張優惠券
            let selectedCoupon = null;
            if (availableCoupons.length > 0) {
              const randomIndex = Math.floor(Math.random() * availableCoupons.length);
              selectedCoupon = availableCoupons[randomIndex];
            }
            
            return {
              restaurantId,
              restaurant,
              coupon: selectedCoupon,
            };
          })
        );
        
        // 過濾掉 null 值
        return wheelSlices.filter(slice => slice !== null);
      }),
    
    // 查詢當日剩餘抽獎次數
    getRemainingSpins: protectedProcedure
      .input(z.object({
        mealPeriod: z.enum(["breakfast", "lunch", "afternoon_tea", "dinner", "late_night"]),
      }))
      .query(async ({ ctx, input }) => {
        // 管理員無限次數
        if (ctx.user.role === 'admin') {
          return {
            remainingInPeriod: 999,
            remainingInDay: 999,
            usedInPeriod: 0,
            usedInDay: 0,
            canSpin: true,
            isAdmin: true,
          };
        }
        
        const periodCount = await db.getTodaySpinCountByPeriod(ctx.user.id, input.mealPeriod);
        const totalCount = await db.getTodayTotalSpinCount(ctx.user.id);
        
        const MAX_SPINS_PER_PERIOD = 2;
        const MAX_SPINS_PER_DAY = 10;
        
        const remainingInPeriod = Math.max(0, MAX_SPINS_PER_PERIOD - periodCount);
        const remainingInDay = Math.max(0, MAX_SPINS_PER_DAY - totalCount);
        
        return {
          remainingInPeriod,
          remainingInDay,
          usedInPeriod: periodCount,
          usedInDay: totalCount,
          canSpin: remainingInPeriod > 0 && remainingInDay > 0,
          isAdmin: false,
        };
      }),
    
    // 新的抽獎 API：前端決定位置，後端根據位置記錄結果
    draw: protectedProcedure
      .input(z.object({
        mealPeriod: z.enum(["breakfast", "lunch", "afternoon_tea", "dinner", "late_night"]),
        selectedIndex: z.number(), // 前端傳入指針指向的扇形索引
        restaurantId: z.number(), // 前端傳入指針指向的店家 ID
        couponId: z.number().nullable(), // 前端傳入指針指向的優惠券 ID
      }))
      .mutation(async ({ ctx, input }) => {
        // 管理員不受次數限制
        const isAdmin = ctx.user.role === 'admin';
        
        if (!isAdmin) {
          // 驗證抽獎次數（一般使用者）
          const periodCount = await db.getTodaySpinCountByPeriod(ctx.user.id, input.mealPeriod);
          const totalCount = await db.getTodayTotalSpinCount(ctx.user.id);
          
          const MAX_SPINS_PER_PERIOD = 2;
          const MAX_SPINS_PER_DAY = 10;
          
          if (periodCount >= MAX_SPINS_PER_PERIOD) {
            throw new TRPCError({
              code: 'BAD_REQUEST',
              message: '本時段抽獎次數已用完，請於下個時段再來！',
            });
          }
          
          if (totalCount >= MAX_SPINS_PER_DAY) {
            throw new TRPCError({
              code: 'BAD_REQUEST',
              message: '今日抽獎次數已達上限（10 次），明天再來吧！',
            });
          }
        }
        
        console.log('[spin.draw] 前端傳入結果:');
        console.log('  selectedIndex:', input.selectedIndex);
        console.log('  restaurantId:', input.restaurantId);
        console.log('  couponId:', input.couponId);
        
        // 查詢店家資訊
        const restaurant = await db.getRestaurantById(input.restaurantId);
        if (!restaurant) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: '店家不存在',
          });
        }
        
        // 查詢優惠券資訊（如果有）
        let selectedCoupon = null;
        if (input.couponId) {
          selectedCoupon = await db.getCouponById(input.couponId);
          
          // 最後一層驗證：確保選中的優惠券不是簽到獎勵
          if (selectedCoupon && selectedCoupon.isCheckInReward) {
            console.error('[CRITICAL] 簽到獎勵優惠券被選中，強制設為 null');
            selectedCoupon = null;
          }
        }
        
        console.log('[spin.draw] 確認結果:');
        console.log('  店家:', restaurant.name);
        console.log('  優惠券:', selectedCoupon?.title || '無優惠券');
        
        // 記錄到資料庫
        const spinHistory = await db.createSpinHistory({
          userId: ctx.user.id,
          restaurantId: input.restaurantId,
          couponId: selectedCoupon?.id,
          mealPeriod: input.mealPeriod,
        });
        
        // 返回抽獎結果
        return {
          restaurant,
          coupon: selectedCoupon,
          spinHistoryId: (spinHistory as any)[0]?.insertId,
        };
      }),
    
    recordSpin: protectedProcedure
      .input(z.object({
        restaurantId: z.number(),
        couponId: z.number().optional(),
        mealPeriod: z.enum(["breakfast", "lunch", "afternoon_tea", "dinner", "late_night"]),
      }))
      .mutation(async ({ ctx, input }) => {
        // 管理員不受次數限制
        const isAdmin = ctx.user.role === 'admin';
        
        if (!isAdmin) {
          // 驗證抽獎次數（一般使用者）
          const periodCount = await db.getTodaySpinCountByPeriod(ctx.user.id, input.mealPeriod);
          const totalCount = await db.getTodayTotalSpinCount(ctx.user.id);
          
          const MAX_SPINS_PER_PERIOD = 2;
          const MAX_SPINS_PER_DAY = 10;
          
          if (periodCount >= MAX_SPINS_PER_PERIOD) {
            throw new TRPCError({
              code: 'BAD_REQUEST',
              message: '本時段抽獎次數已用完，請於下個時段再來！',
            });
          }
          
          if (totalCount >= MAX_SPINS_PER_DAY) {
            throw new TRPCError({
              code: 'BAD_REQUEST',
              message: '今日抽獎次數已達上限（10 次），明天再來吧！',
            });
          }
        }
        
        return db.createSpinHistory({
          userId: ctx.user.id,
          restaurantId: input.restaurantId,
          couponId: input.couponId,
          mealPeriod: input.mealPeriod,
        });
      }),
    
    myHistory: protectedProcedure.query(async ({ ctx }) => {
      return db.getSpinHistoryByUserId(ctx.user.id);
    }),
    
    allHistory: adminProcedure.query(async () => {
      return db.getAllSpinHistory();
    }),
    
    // 記錄分享並獲得額外轉盤機會
    recordShare: protectedProcedure
      .input(z.object({
        spinHistoryId: z.number(),
      }))
      .mutation(async ({ ctx, input }) => {
        // 檢查是否已經分享過
        const spinRecord = await db.getSpinHistoryById(input.spinHistoryId);
        
        if (!spinRecord) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: '找不到該優惠券記錄',
          });
        }
        
        if (spinRecord.userId !== ctx.user.id) {
          throw new TRPCError({
            code: 'FORBIDDEN',
            message: '無權操作此優惠券',
          });
        }
        
        if (spinRecord.isShared) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: '此優惠券已經分享過，無法重複獲得獎勵',
          });
        }
        
        // 標記為已分享
        await db.markSpinAsShared(input.spinHistoryId);
        
        // 獲得 1 次額外轉盤機會（透過簽到系統實現）
        // 注意：這裡使用簽到系統的機制，因為它已經有「獎勵轉盤次數」的功能
        const today = new Date().toISOString().split('T')[0];
        await db.createCheckInRecord({
          userId: ctx.user.id,
          checkInDate: today,
          consecutiveDays: 1,
          rewardClaimed: false, // 設為 false，讓使用者可以獲得 +1 次轉盤機會
        });
        
        return {
          success: true,
          message: '分享成功！獲得 1 次額外轉盤機會',
        };
      }),
  }),

  // ========== 優惠券兌換 (使用者) ==========
  redemptions: router({
    redeem: protectedProcedure
      .input(z.object({
        restaurantId: z.number(),
        couponId: z.number(),
        spinHistoryId: z.number().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        // 檢查是否已經兌換過
        if (input.spinHistoryId) {
          const alreadyRedeemed = await db.checkIfCouponRedeemed(ctx.user.id, input.spinHistoryId);
          if (alreadyRedeemed) {
            throw new TRPCError({ code: 'BAD_REQUEST', message: '此優惠券已經兌換過了' });
          }
        }
        
        return db.createCouponRedemption({
          userId: ctx.user.id,
          restaurantId: input.restaurantId,
          couponId: input.couponId,
          spinHistoryId: input.spinHistoryId,
        });
      }),
    
    myRedemptions: protectedProcedure.query(async ({ ctx }) => {
      return db.getCouponRedemptionsByUserId(ctx.user.id);
    }),
    
    allRedemptions: adminProcedure.query(async () => {
      return db.getAllCouponRedemptions();
    }),
    
    checkRedeemed: protectedProcedure
      .input(z.object({ spinHistoryId: z.number() }))
      .query(async ({ ctx, input }) => {
        return db.checkIfCouponRedeemed(ctx.user.id, input.spinHistoryId);
      }),
  }),

  // ========== 使用者管理 (管理員) ==========
  users: router({    list: adminProcedure.query(async () => {
      return db.getAllUsers();
    }),
    
    getById: adminProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        return db.getUserById(input.id);
      }),
    
    // 獲取使用者活動記錄
    getActivity: adminProcedure
      .input(z.object({ userId: z.number() }))
      .query(async ({ input }) => {
        const spinHistory = await db.getSpinHistoryByUserId(input.userId);
        const redemptions = await db.getCouponRedemptionsByUserId(input.userId);
        
        // 取得最近 10 筆轉盤記錄的詳細資訊
        const recentSpins = await Promise.all(
          spinHistory.slice(0, 10).map(async (spin) => {
            const restaurant = await db.getRestaurantById(spin.restaurantId);
            const coupon = spin.couponId ? await db.getCouponById(spin.couponId) : null;
            // 檢查是否已兌換：從 redemptions 中查找是否有對應的 spinHistoryId
            const isRedeemed = redemptions.some(r => r.spinHistoryId === spin.id);
            return {
              id: spin.id,
              createdAt: spin.createdAt,
              restaurantName: restaurant?.name || '未知店家',
              couponTitle: coupon?.title || '未知優惠券',
              isRedeemed,
              isExpired: spin.isExpired,
            };
          })
        );
        
        return {
          spinCount: spinHistory.length,
          couponCount: spinHistory.length,
          redeemedCount: redemptions.length,
          recentSpins,
        };
      }),
    
    // 更新使用者角色
    updateRole: adminProcedure
      .input(z.object({ 
        userId: z.number(),
        role: z.enum(['user', 'admin']),
      }))
      .mutation(async ({ input }) => {
        await db.updateUserRole(input.userId, input.role);
        return { success: true };
      }),
  }),

  // ========== 背景圖片設定 (管理員) ==========
  background: router({
    upload: adminProcedure
      .input(z.object({
        imageBase64: z.string(),
      }))
      .mutation(async ({ ctx, input }) => {
        try {
          // 解析 base64 圖片
          const matches = input.imageBase64.match(/^data:image\/(\w+);base64,(.+)$/);
          if (!matches) {
            throw new TRPCError({ code: 'BAD_REQUEST', message: '無效的圖片格式' });
          }
          
          const [, ext, base64Data] = matches;
          const buffer = Buffer.from(base64Data, 'base64');
          
          // 上傳到 S3
          const fileKey = `backgrounds/bg-${Date.now()}.${ext}`;
          const { url } = await storagePut(fileKey, buffer, `image/${ext}`);
          
          // 儲存到 system_settings
          await db.setSystemSetting('background_image', url, ctx.user.id);
          
          return { url };
        } catch (error) {
          console.error('背景圖片上傳失敗:', error);
          throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: '圖片上傳失敗' });
        }
      }),
    
    get: publicProcedure.query(async () => {
      const setting = await db.getSystemSetting('background_image');
      return setting ? { url: setting.value } : { url: null };
    }),
    
    clear: adminProcedure.mutation(async ({ ctx }) => {
      await db.setSystemSetting('background_image', '', ctx.user.id);
      return { success: true };
    }),
  }),

  // ========== 轉盤版本設定 (管理员) ==========
  wheel: router({
    // 設定轉盤版本（儲存版本編號）
    setVersion: adminProcedure
      .input(z.object({
        version: z.enum(['v1', 'v2', 'v3', 'canvas', 'rainbow', 'redwhite', 'colorful']),
      }))
      .mutation(async ({ ctx, input }) => {
        await db.setSystemSetting('wheel_version', input.version, ctx.user.id);
        return { success: true, version: input.version };
      }),
    
    // 獲取當前轉盤版本
    getVersion: publicProcedure.query(async () => {
      const setting = await db.getSystemSetting('wheel_version');
      return { version: setting?.value || 'canvas' };
    }),

    // 建立自訂轉盤樣式
    createCustomStyle: adminProcedure
      .input(z.object({
        name: z.string().min(1, '轉盤名稱不能為空'),
        type: z.enum(['canvas', 'image']),
        style: z.string().min(1, '轉盤樣式不能為空'),
        imageUrl: z.string().optional(),
        config: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const result = await db.createCustomWheelStyle({
          name: input.name,
          type: input.type,
          style: input.style,
          imageUrl: input.imageUrl,
          config: input.config,
          isDefault: false,
          createdBy: ctx.user.id,
        });
        return { success: true, id: (result as any).insertId };
      }),

    // 查詢所有自訂轉盤樣式
    listCustomStyles: publicProcedure.query(async () => {
      const styles = await db.listCustomWheelStyles();
      return styles;
    }),

    // 刪除自訂轉盤樣式
    deleteCustomStyle: adminProcedure
      .input(z.object({
        id: z.number().int().positive(),
      }))
      .mutation(async ({ input }) => {
        try {
          await db.deleteCustomWheelStyle(input.id);
          return { success: true };
        } catch (error) {
          if (error instanceof Error && error.message.includes('default')) {
            throw new TRPCError({
              code: 'BAD_REQUEST',
              message: '無法刪除預設轉盤樣式',
            });
          }
          throw error;
        }
      }),

    // 更新自訂轉盤樣式
    updateCustomStyle: adminProcedure
      .input(z.object({
        id: z.number().int().positive(),
        name: z.string().min(1).optional(),
        config: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        try {
          await db.updateCustomWheelStyle(input.id, {
            name: input.name,
            config: input.config,
          });
          return { success: true };
        } catch (error) {
          if (error instanceof Error && error.message.includes('default')) {
            throw new TRPCError({
              code: 'BAD_REQUEST',
              message: '無法修改預設轉盤樣式',
            });
          }
          throw error;
        }
      }),



  }),

  // ========== 數據分析 (管理员) ==========
  analytics: router({
    overview: adminProcedure.query(async () => {
      const [allSpins, allRedemptions, allRestaurants] = await Promise.all([
        db.getAllSpinHistory(),
        db.getAllCouponRedemptions(),
        db.getAllRestaurants(),
      ]);

      // 計算各時段使用次數
      const periodStats = allSpins.reduce((acc, spin) => {
        acc[spin.mealPeriod] = (acc[spin.mealPeriod] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      // 計算店家抽出次數
      const restaurantSpinCount = allSpins.reduce((acc, spin) => {
        acc[spin.restaurantId] = (acc[spin.restaurantId] || 0) + 1;
        return acc;
      }, {} as Record<number, number>);

      // 計算店家兌換次數
      const restaurantRedemptionCount = allRedemptions.reduce((acc, redemption) => {
        acc[redemption.restaurantId] = (acc[redemption.restaurantId] || 0) + 1;
        return acc;
      }, {} as Record<number, number>);

      return {
        totalSpins: allSpins.length,
        totalRedemptions: allRedemptions.length,
        redemptionRate: allSpins.length > 0 ? (allRedemptions.length / allSpins.length) * 100 : 0,
        periodStats,
        restaurantSpinCount,
        restaurantRedemptionCount,
        totalRestaurants: allRestaurants.length,
        activeRestaurants: allRestaurants.filter(r => r.isActive).length,
      };
    }),
  }),

  // ========== 使用者優惠券 ==========
  userCoupons: router({
    // 查詢使用者的所有優惠券
    list: protectedProcedure.query(async ({ ctx }) => {
      const spinRecords = await db.getUserCoupons(ctx.user.id);
      
      // 為每筆記錄查詢店家與優惠券資訊
      const couponsWithDetails = await Promise.all(
        spinRecords.map(async (spin) => {
          const restaurant = await db.getRestaurantById(spin.restaurantId);
          const coupon = spin.couponId ? await db.getCouponById(spin.couponId) : null;
          const isRedeemed = await db.checkIfCouponRedeemed(ctx.user.id, spin.id);
          
          return {
            id: spin.id,
            restaurantId: spin.restaurantId,
            restaurantName: restaurant?.name || '未知店家',
            restaurantAddress: restaurant?.address || '',
            restaurantPhone: restaurant?.phone || '',
            restaurantLatitude: restaurant?.latitude || '',
            restaurantLongitude: restaurant?.longitude || '',
            couponId: spin.couponId,
            couponTitle: coupon?.title || '未知優惠券',
            couponDescription: coupon?.description || '',
            couponImageUrl: coupon?.imageUrl || '',
            isRedeemed,
            isCheckInReward: Boolean(coupon?.isCheckInReward),
            createdAt: spin.createdAt,
          };
        })
      );
      
      return couponsWithDetails;
    }),
  }),
});

export type AppRouter = typeof appRouter;
