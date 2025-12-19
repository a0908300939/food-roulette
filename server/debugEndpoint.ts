/**
 * 診斷端點 - 檢查環境變數
 */

import { Router } from 'express';

export const debugEndpoint = Router();

debugEndpoint.get('/debug-env', async (req, res) => {
  const envVars = {
    MYSQL_PRIVATE_DOMAIN: process.env.MYSQL_PRIVATE_DOMAIN || 'NOT SET',
    MYSQLHOST: process.env.MYSQLHOST || 'NOT SET',
    MYSQLPORT: process.env.MYSQLPORT || 'NOT SET',
    MYSQLUSER: process.env.MYSQLUSER || 'NOT SET',
    MYSQLDATABASE: process.env.MYSQLDATABASE || 'NOT SET',
    MYSQLPASSWORD: process.env.MYSQLPASSWORD ? '***SET***' : 'NOT SET',
    DATABASE_URL: process.env.DATABASE_URL ? '***SET***' : 'NOT SET',
  };

  res.json({
    message: '環境變數診斷',
    env: envVars,
    connectionConfig: {
      host: process.env.MYSQL_PRIVATE_DOMAIN || process.env.MYSQLHOST,
      port: process.env.MYSQL_PRIVATE_DOMAIN ? 3306 : parseInt(process.env.MYSQLPORT || '3306'),
      user: process.env.MYSQLUSER || 'root',
      database: process.env.MYSQLDATABASE || 'railway'
    }
  });
});
