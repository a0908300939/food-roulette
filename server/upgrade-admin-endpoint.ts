import { router, publicProcedure } from './trpc';
import { z } from 'zod';
import { db } from '../db';

export const upgradeAdminRouter = router({
  upgradeToAdmin: publicProcedure
    .input(z.object({
      email: z.string().email(),
      secret: z.string(),
    }))
    .mutation(async ({ input }) => {
      // 簡單的密碼保護
      if (input.secret !== 'upgrade-admin-2025') {
        throw new Error('Invalid secret');
      }
      
      // 查詢用戶
      const user = await db.execute(
        'SELECT id, email, role FROM users WHERE email = ?',
        [input.email]
      );
      
      if (!user || user.length === 0) {
        throw new Error('User not found');
      }
      
      // 更新為管理員
      await db.execute(
        'UPDATE users SET role = ? WHERE email = ?',
        ['admin', input.email]
      );
      
      return {
        success: true,
        message: 'User upgraded to admin successfully',
      };
    }),
});
