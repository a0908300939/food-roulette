# Railway 部署完整指南

## 🚀 草屯美食轉盤 - Railway 永久部署教學

本指南將帶您一步步完成專案的永久部署，讓您的網站 24/7 穩定運行。

---

## 📋 部署前準備

### 1. 註冊 Railway 帳號

1. 訪問 [Railway.app](https://railway.app)
2. 點擊右上角「Login」
3. 使用 GitHub 帳號登入（推薦）或 Email 註冊
4. 完成註冊流程

### 2. 安裝 Git（如果還沒有）

**Windows**:
- 下載並安裝 [Git for Windows](https://git-scm.com/download/win)

**macOS**:
```bash
brew install git
```

**Linux**:
```bash
sudo apt-get install git  # Ubuntu/Debian
sudo yum install git      # CentOS/RHEL
```

### 3. 準備專案檔案

下載並解壓縮 `food-roulette-core.zip`

---

## 🎯 部署步驟

### 步驟 1: 建立 Git 儲存庫

在專案目錄中執行：

```bash
# 進入專案目錄
cd /path/to/food-roulette

# 初始化 Git
git init

# 新增所有檔案
git add .

# 提交變更
git commit -m "Initial commit: 草屯美食轉盤"
```

### 步驟 2: 推送到 GitHub

1. **在 GitHub 建立新儲存庫**
   - 訪問 [GitHub](https://github.com)
   - 點擊右上角「+」→「New repository」
   - 儲存庫名稱: `food-roulette`
   - 設定為 Private（私有）
   - **不要**勾選「Initialize with README」
   - 點擊「Create repository」

2. **推送程式碼**
   ```bash
   # 新增遠端儲存庫（替換成您的 GitHub 使用者名稱）
   git remote add origin https://github.com/YOUR_USERNAME/food-roulette.git
   
   # 推送到 GitHub
   git branch -M main
   git push -u origin main
   ```

### 步驟 3: 在 Railway 建立專案

1. **登入 Railway**
   - 訪問 [Railway Dashboard](https://railway.app/dashboard)

2. **建立新專案**
   - 點擊「New Project」
   - 選擇「Deploy from GitHub repo」
   - 授權 Railway 存取您的 GitHub
   - 選擇 `food-roulette` 儲存庫

3. **Railway 會自動開始建置**
   - 等待建置完成（約 3-5 分鐘）

### 步驟 4: 新增 MySQL 資料庫

1. **在專案中新增資料庫**
   - 在 Railway 專案頁面
   - 點擊「+ New」
   - 選擇「Database」→「Add MySQL」

2. **等待資料庫建立**
   - Railway 會自動建立 MySQL 實例
   - 自動設定 `DATABASE_URL` 環境變數

### 步驟 5: 設定環境變數

1. **進入專案設定**
   - 點擊您的服務（food-roulette）
   - 點擊「Variables」標籤

2. **新增必要的環境變數**

點擊「+ New Variable」，逐一新增以下變數：

```env
# 應用程式設定
VITE_APP_TITLE=草屯美食轉盤
VITE_APP_ID=food-roulette-app

# OAuth 設定（使用 Railway 提供的網址）
VITE_OAUTH_PORTAL_URL=https://manus.im
OAUTH_SERVER_URL=https://api.manus.im

# JWT Secret（請改成隨機字串）
JWT_SECRET=請改成您自己的隨機密鑰

# 擁有者 OpenID（超級管理員，可以先留空）
OWNER_OPEN_ID=

# 環境設定
NODE_ENV=production
PORT=3000
```

**重要**: `DATABASE_URL` 會自動由 Railway 設定，不需要手動新增。

3. **儲存變更**
   - Railway 會自動重新部署

### 步驟 6: 初始化資料庫

資料庫建立後，需要執行 migration：

**方法 1: 使用 Railway CLI（推薦）**

```bash
# 安裝 Railway CLI
npm install -g @railway/cli

# 登入
railway login

# 連結到專案
railway link

# 執行 migration
railway run pnpm db:push
```

**方法 2: 使用 Railway Dashboard**

1. 在 Railway 專案中點擊您的服務
2. 點擊「Settings」→「Deploy Triggers」
3. 新增一個一次性的部署指令：
   ```bash
   pnpm db:push
   ```

### 步驟 7: 取得公開網址

1. **啟用公開網域**
   - 在服務設定中
   - 點擊「Settings」→「Networking」
   - 點擊「Generate Domain」

2. **您的網站網址**
   - Railway 會生成一個網址，例如：
   - `https://food-roulette-production.up.railway.app`

3. **（選填）設定自訂網域**
   - 如果您有自己的網域名稱
   - 在「Custom Domains」中新增
   - 按照指示設定 DNS

---

## ✅ 部署完成檢查清單

部署完成後，請確認：

- [ ] 網站可以正常訪問
- [ ] 首頁顯示「草屯美食轉盤」
- [ ] 時間和時段顯示正常
- [ ] 登入按鈕存在
- [ ] 資料庫連線正常
- [ ] 可以進入後台管理頁面（`/admin`）

---

## 🔧 後續設定

### 1. 新增店家資料

1. 訪問後台管理: `https://your-app.up.railway.app/admin`
2. 使用管理員帳號登入
3. 點擊「店家管理」→「新增店家」
4. 填寫店家資訊並儲存

### 2. 新增優惠券

1. 在後台點擊「優惠券管理」
2. 點擊「新增優惠券」
3. 選擇店家並設定優惠內容

### 3. 測試轉盤功能

1. 回到首頁
2. 點擊「開始抽獎」
3. 確認轉盤正常運作

---

## 💰 費用說明

### Railway 免費方案

Railway 提供免費方案，包含：
- **$5 USD 免費額度/月**
- 適合小型專案和測試
- 超過額度後需要升級

### 預估使用量

這個專案的預估月費用：
- **Web 服務**: ~$5-10 USD/月
- **MySQL 資料庫**: ~$5 USD/月
- **總計**: ~$10-15 USD/月

如果流量不大，免費額度可能足夠使用。

### 升級方案

如果需要更多資源：
- 點擊專案右上角「Upgrade」
- 選擇適合的方案
- 綁定信用卡

---

## 🐛 常見問題排解

### 問題 1: 建置失敗

**錯誤訊息**: `Build failed`

**解決方案**:
1. 檢查 `package.json` 中的 build script
2. 確認所有依賴都已正確安裝
3. 查看 Railway 的建置日誌找出具體錯誤

### 問題 2: 資料庫連線失敗

**錯誤訊息**: `Cannot connect to database`

**解決方案**:
1. 確認 MySQL 服務已啟動
2. 檢查 `DATABASE_URL` 環境變數是否正確
3. 確認已執行 `pnpm db:push`

### 問題 3: 網站顯示 503 錯誤

**錯誤訊息**: `Service Unavailable`

**解決方案**:
1. 檢查服務是否正在運行
2. 查看 Railway 的部署日誌
3. 確認 `PORT` 環境變數設定正確

### 問題 4: 環境變數未生效

**解決方案**:
1. 確認環境變數已正確設定
2. 重新部署服務（點擊「Deploy」）
3. 等待部署完成後再測試

### 問題 5: 無法登入後台

**解決方案**:
1. 確認 `OWNER_OPEN_ID` 已設定
2. 或在資料庫中手動設定管理員：
   ```sql
   UPDATE users SET role = 'admin' WHERE openId = 'your-openid';
   ```

---

## 📊 監控和維護

### 查看部署日誌

1. 在 Railway 專案中點擊您的服務
2. 點擊「Deployments」標籤
3. 查看即時日誌

### 查看資源使用

1. 在專案頁面查看「Usage」
2. 監控 CPU、記憶體、網路使用量

### 設定警報

1. 在專案設定中
2. 設定使用量警報
3. 當接近額度時會收到通知

---

## 🔄 更新部署

當您修改程式碼後：

```bash
# 提交變更
git add .
git commit -m "更新說明"

# 推送到 GitHub
git push origin main
```

Railway 會自動偵測變更並重新部署。

---

## 🎨 自訂網域設定

### 1. 購買網域名稱

推薦的網域註冊商：
- [Namecheap](https://www.namecheap.com)
- [GoDaddy](https://www.godaddy.com)
- [Cloudflare](https://www.cloudflare.com)

### 2. 在 Railway 新增自訂網域

1. 在服務設定中點擊「Settings」→「Networking」
2. 在「Custom Domains」中新增您的網域
3. 例如: `food-roulette.yourdomain.com`

### 3. 設定 DNS

在您的網域註冊商中新增 CNAME 記錄：

```
Type: CNAME
Name: food-roulette (或 @，如果是根網域)
Value: [Railway 提供的網址]
TTL: 3600
```

### 4. 等待 DNS 生效

- 通常需要 5-30 分鐘
- 最長可能需要 48 小時

---

## 🔒 安全性建議

### 1. 更改 JWT Secret

```env
# 使用強密碼生成器建立隨機字串
JWT_SECRET=your-very-long-random-secret-key-here
```

### 2. 限制資料庫存取

- Railway 的 MySQL 預設只能從專案內部存取
- 如需外部存取，請謹慎設定白名單

### 3. 啟用 HTTPS

- Railway 自動提供 HTTPS
- 確認所有請求都使用 HTTPS

### 4. 定期備份資料庫

使用 Railway CLI 備份：

```bash
# 匯出資料庫
railway run mysqldump -u root database_name > backup.sql
```

---

## 📞 需要協助？

### Railway 官方資源
- 文件: https://docs.railway.app
- Discord 社群: https://discord.gg/railway
- 支援: support@railway.app

### 專案相關
- 查看 `PROJECT_DOCUMENTATION.md`
- 查看 `QUICK_START.md`

---

## 🎉 恭喜！

您已經成功將「草屯美食轉盤」部署到 Railway！

您的網站現在是：
- ✅ 24/7 永久運行
- ✅ 自動 HTTPS 加密
- ✅ 全球 CDN 加速
- ✅ 自動備份和恢復

開始使用您的網站，並享受穩定的服務吧！🚀

---

**最後更新**: 2024-11-30  
**版本**: 1.0.0
