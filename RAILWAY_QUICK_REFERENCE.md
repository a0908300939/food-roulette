# Railway 部署快速參考卡

## 🚀 5 分鐘快速部署

### 步驟 1: 準備 GitHub 儲存庫
```bash
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/YOUR_USERNAME/food-roulette.git
git push -u origin main
```

### 步驟 2: 在 Railway 建立專案
1. 訪問 https://railway.app
2. 點擊「New Project」→「Deploy from GitHub repo」
3. 選擇您的儲存庫

### 步驟 3: 新增 MySQL 資料庫
1. 在專案中點擊「+ New」→「Database」→「MySQL」
2. 等待建立完成

### 步驟 4: 設定環境變數
在「Variables」標籤新增：
```env
VITE_APP_TITLE=草屯美食轉盤
VITE_APP_ID=food-roulette-app
VITE_OAUTH_PORTAL_URL=https://manus.im
OAUTH_SERVER_URL=https://api.manus.im
JWT_SECRET=your-random-secret-key
NODE_ENV=production
PORT=3000
```

### 步驟 5: 初始化資料庫
```bash
railway login
railway link
railway run pnpm db:push
```

### 步驟 6: 取得公開網址
1. 點擊「Settings」→「Networking」
2. 點擊「Generate Domain」
3. 完成！

---

## 📝 必要環境變數

| 變數名稱 | 說明 | 範例值 |
|---------|------|--------|
| `VITE_APP_TITLE` | 應用程式標題 | 草屯美食轉盤 |
| `VITE_APP_ID` | 應用程式 ID | food-roulette-app |
| `VITE_OAUTH_PORTAL_URL` | OAuth 入口 | https://manus.im |
| `OAUTH_SERVER_URL` | OAuth API | https://api.manus.im |
| `JWT_SECRET` | JWT 密鑰 | 隨機字串（32+ 字元） |
| `NODE_ENV` | 環境模式 | production |
| `PORT` | 伺服器埠號 | 3000 |

**注意**: `DATABASE_URL` 由 Railway 自動設定，不需要手動新增。

---

## 🔧 常用指令

### Railway CLI
```bash
# 安裝 CLI
npm install -g @railway/cli

# 登入
railway login

# 連結專案
railway link

# 執行指令
railway run <command>

# 查看日誌
railway logs

# 開啟專案
railway open
```

### 資料庫操作
```bash
# 執行 migration
railway run pnpm db:push

# 連線到資料庫
railway run mysql

# 備份資料庫
railway run mysqldump database_name > backup.sql
```

### Git 操作
```bash
# 提交變更
git add .
git commit -m "更新說明"
git push origin main

# Railway 會自動重新部署
```

---

## 🐛 常見問題速查

### 建置失敗
- 檢查 `package.json` 的 build script
- 查看 Railway 建置日誌
- 確認所有依賴已安裝

### 資料庫連線失敗
- 確認 MySQL 服務已啟動
- 檢查 `DATABASE_URL` 是否正確
- 確認已執行 `pnpm db:push`

### 網站顯示 503
- 檢查服務是否運行
- 查看部署日誌
- 確認 `PORT` 設定正確

### 環境變數未生效
- 確認變數已正確設定
- 重新部署服務
- 等待部署完成後測試

---

## 💰 費用預估

| 項目 | 預估費用 |
|------|---------|
| Web 服務 | $5-10/月 |
| MySQL 資料庫 | $5/月 |
| **總計** | **$10-15/月** |

**免費額度**: $5/月  
**適合**: 小型專案和測試

---

## 📞 需要幫助？

- **詳細指南**: 查看 `RAILWAY_DEPLOYMENT_GUIDE.md`
- **專案文件**: 查看 `PROJECT_DOCUMENTATION.md`
- **Railway 文件**: https://docs.railway.app
- **Railway 社群**: https://discord.gg/railway

---

**最後更新**: 2024-11-30
