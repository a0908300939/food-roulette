import { Express } from 'express';
import * as db from './db';

/**
 * 臨時的升級管理員端點
 * 使用後應該刪除此文件
 */
export function setupUpgradeEndpoint(app: Express) {
  app.post('/api/upgrade-admin', async (req, res) => {
    try {
      const { email, secret } = req.body;
      
      // 簡單的密碼保護
      if (secret !== 'temp-upgrade-2025-food-roulette') {
        return res.status(403).json({ error: 'Invalid secret key' });
      }
      
      // 查詢用戶
      const user = await db.getUserByPhoneOrEmail(undefined, email);
      
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }
      
      // 更新為管理員
      await db.updateUserRole(user.id, 'admin');
      
      res.json({
        success: true,
        message: `User ${email} upgraded to admin successfully`,
        userId: user.id,
        userRole: 'admin'
      });
    } catch (error: any) {
      console.error('Upgrade error:', error);
      res.status(500).json({ error: error.message });
    }
  });
}
