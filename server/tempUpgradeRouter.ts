import { z } from "zod";
import { publicProcedure, router } from "./_core/trpc";
import * as db from "./db";

/**
 * 臨時的升級管理員路由（僅用於初始設置）
 * 使用後應該刪除此文件
 */
export const tempUpgradeRouter = router({
  /**
   * 升級用戶為管理員（臨時端點，需要密碼保護）
   */
  upgradeToAdmin: publicProcedure
    .input(z.object({
      email: z.string().email(),
      secret: z.string(),
    }))
    .mutation(async ({ input }) => {
      // 簡單的密碼保護
      if (input.secret !== 'temp-upgrade-2025-food-roulette') {
        throw new Error('Invalid secret key');
      }
      
      // 查詢用戶
      const user = await db.getUserByPhoneOrEmail(undefined, input.email);
      
      if (!user) {
        throw new Error('User not found');
      }
      
      // 更新為管理員
      await db.updateUserRole(user.id, 'admin');
      
      return {
        success: true,
        message: `User ${input.email} upgraded to admin successfully`,
        userId: user.id,
      };
    }),
});
