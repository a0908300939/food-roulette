import mysql from 'mysql2/promise';

const config = {
  host: 'junction.proxy.rlwy.net',
  port: 18492,
  user: 'root',
  password: 'nBfqnvVRCPQVwJMUXGqcmvNxCYJrDPYa',
  database: 'railway',
};

async function main() {
  console.log('連接資料庫...');
  const connection = await mysql.createConnection(config);
  
  try {
    // 查詢用戶
    console.log('\n查詢用戶 a0923188353@gmail.com...');
    const [users] = await connection.execute(
      'SELECT id, email, phone, role FROM users WHERE email = ?',
      ['a0923188353@gmail.com']
    );
    
    if (users.length === 0) {
      console.log('❌ 找不到該用戶');
      return;
    }
    
    console.log('找到用戶:', users[0]);
    
    // 更新為管理員
    console.log('\n升級為管理員...');
    await connection.execute(
      'UPDATE users SET role = ? WHERE email = ?',
      ['admin', 'a0923188353@gmail.com']
    );
    
    // 再次查詢確認
    const [updated] = await connection.execute(
      'SELECT id, email, phone, role FROM users WHERE email = ?',
      ['a0923188353@gmail.com']
    );
    
    console.log('\n✅ 升級成功！');
    console.log('更新後:', updated[0]);
    
  } catch (error) {
    console.error('❌ 錯誤:', error.message);
  } finally {
    await connection.end();
  }
}

main();
