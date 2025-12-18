import { z } from "zod";
import { protectedProcedure, router } from "./_core/trpc";
import * as db from "./db";
import { TRPCError } from "@trpc/server";
import { storagePut } from "./storage";

// 管理員權限檢查
const adminProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.user.role !== 'admin') {
    throw new TRPCError({ code: 'FORBIDDEN', message: '需要管理員權限' });
  }
  return next({ ctx });
});

/**
 * 管理員管理路由
 */
export const adminRouter = router({
  /**
   * 取得所有管理員列表
   */
  listAdmins: adminProcedure.query(async () => {
    return db.getAllAdmins();
  }),

  /**
   * 取得所有使用者列表
   */
  listUsers: adminProcedure.query(async () => {
    return db.getAllUsers();
  }),

  /**
   * 提升使用者為管理員
   */
  promoteToAdmin: adminProcedure
    .input(z.object({ userId: z.number() }))
    .mutation(async ({ input }) => {
      await db.updateUserRole(input.userId, 'admin');
      return { success: true };
    }),

  /**
   * 移除管理員權限
   */
  demoteToUser: adminProcedure
    .input(z.object({ userId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      // 防止移除自己的管理員權限
      if (input.userId === ctx.user.id) {
        throw new TRPCError({ 
          code: 'BAD_REQUEST', 
          message: '無法移除自己的管理員權限' 
        });
      }
      
      await db.updateUserRole(input.userId, 'user');
      return { success: true };
    }),

  /**
   * 上傳背景圖片
   */
  uploadBackgroundImage: adminProcedure
    .input(z.object({
      imageData: z.string(), // Base64 encoded image
      mimeType: z.string(),
    }))
    .mutation(async ({ ctx, input }) => {
      // 將 Base64 轉換為 Buffer
      const base64Data = input.imageData.replace(/^data:image\/\w+;base64,/, '');
      const buffer = Buffer.from(base64Data, 'base64');
      
      // 上傳到 S3
      const fileKey = `backgrounds/bg-${Date.now()}.${input.mimeType.split('/')[1]}`;
      const { url } = await storagePut(fileKey, buffer, input.mimeType);
      
      // 儲存到系統設定
      await db.setSystemSetting('background_image', url, ctx.user.id);
      
      return { url };
    }),

  /**
   * 取得背景圖片
   */
  getBackgroundImage: adminProcedure.query(async () => {
    const setting = await db.getSystemSetting('background_image');
    return { url: setting?.value || null };
  }),

  /**
   * 上傳轉盤圖片
   */
  uploadWheelImage: adminProcedure
    .input(z.object({
      imageData: z.string(), // Base64 encoded image
      mimeType: z.string(),
    }))
    .mutation(async ({ ctx, input }) => {
      // 將 Base64 轉換為 Buffer
      const base64Data = input.imageData.replace(/^data:image\/\w+;base64,/, '');
      const buffer = Buffer.from(base64Data, 'base64');
      
      // 上傳到 S3
      const fileKey = `wheels/wheel-${Date.now()}.${input.mimeType.split('/')[1]}`;
      const { url } = await storagePut(fileKey, buffer, input.mimeType);
      
      // 儲存到系統設定
      await db.setSystemSetting('wheel_image', url, ctx.user.id);
      
      return { url };
    }),

  /**
   * 取得轉盤圖片
   */
  getWheelImage: adminProcedure.query(async () => {
    const setting = await db.getSystemSetting('wheel_image');
    return { url: setting?.value || null };
  }),

  /**
   * 取得所有系統設定
   */
  getSystemSettings: adminProcedure.query(async () => {
    return db.getAllSystemSettings();
  }),

  /**
   * 更新系統設定
   */
  updateSystemSetting: adminProcedure
    .input(z.object({
      key: z.string(),
      value: z.string(),
    }))
    .mutation(async ({ ctx, input }) => {
      await db.setSystemSetting(input.key, input.value, ctx.user.id);
      return { success: true };
    }),
});
