import mysql from 'mysql2/promise';

// Railway 資料庫連線資訊（從 Railway 環境變數獲取）
const DATABASE_URL = 'mysql://root:nBfqnvVRCPQVwJMUXGqcmvNxCYJrDPYa@junction.proxy.rlwy.net:18492/railway';

async function upgradeToAdmin() {
  const connection = await mysql.createConnection(DATABASE_URL);
  
  try {
    // 查詢用戶
    console.log('正在查詢用戶...');
    const [users] = await connection.execute(
      'SELECT id, email, phone, role, createdAt FROM users WHERE email = ?',
      ['a0923188353@gmail.com']
    );
    
    if (users.length === 0) {
      console.log('❌ 找不到該用戶');
      return;
    }
    
    console.log('找到用戶:', users[0]);
    
    // 更新為管理員
    console.log('\n正在升級為管理員...');
    await connection.execute(
      'UPDATE users SET role = ? WHERE email = ?',
      ['admin', 'a0923188353@gmail.com']
    );
    
    // 再次查詢確認
    const [updatedUsers] = await connection.execute(
      'SELECT id, email, phone, role, createdAt FROM users WHERE email = ?',
      ['a0923188353@gmail.com']
    );
    
    console.log('✅ 升級成功！');
    console.log('更新後的用戶資料:', updatedUsers[0]);
    
  } catch (error) {
    console.error('❌ 錯誤:', error);
  } finally {
    await connection.end();
  }
}

upgradeToAdmin();
