import mysql from 'mysql2/promise';

// 從環境變數讀取資料庫連接資訊
const config = {
  host: process.env.MYSQLHOST || 'localhost',
  port: parseInt(process.env.MYSQLPORT || '3306'),
  user: process.env.MYSQLUSER || 'root',
  password: process.env.MYSQLPASSWORD || '',
  database: process.env.MYSQLDATABASE || 'railway',
};

async function upgradeToAdmin() {
  console.log('連線資訊:', { ...config, password: '***' });
  
  const connection = await mysql.createConnection(config);
  
  try {
    // 查詢用戶
    console.log('\n正在查詢用戶...');
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
    
    console.log('\n✅ 升級成功！');
    console.log('更新後的用戶資料:', updatedUsers[0]);
    
  } catch (error) {
    console.error('❌ 錯誤:', error.message);
  } finally {
    await connection.end();
  }
}

upgradeToAdmin();
