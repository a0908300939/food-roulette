# 草屯美食抽抽樂 - Zeabur 部署指引

## 📋 部署步驟

### 1. 推送代碼到 GitHub

```bash
# 初始化 Git（如果還沒有）
git init
git add .
git commit -m "feat: 初始版本 - UI優化與刮刮樂功能"

# 連接到您的 GitHub 倉庫
git remote add origin https://github.com/您的用戶名/您的倉庫名.git
git branch -M main
git push -u origin main
```

### 2. 在 Zeabur 創建專案

1. 登入 [Zeabur](https://zeabur.com)
2. 點擊「Create Project」
3. 選擇「Import from GitHub」
4. 選擇您的倉庫

### 3. 添加 MySQL 服務

1. 在專案中點擊「Add Service」
2. 選擇「MySQL」
3. 等待 MySQL 服務啟動
4. 複製 MySQL 連線資訊

### 4. 配置環境變數

在 Zeabur 專案設定中添加以下環境變數：

#### 後端環境變數
```
NODE_ENV=production
PORT=3000
DATABASE_URL=mysql://用戶名:密碼@主機:端口/資料庫名
JWT_SECRET=your-secret-key-here
CORS_ORIGIN=https://您的前端域名.zeabur.app
```

#### 前端環境變數
```
VITE_API_URL=https://您的後端域名.zeabur.app
```

### 5. 部署應用

1. Zeabur 會自動偵測並部署
2. 等待構建完成
3. 訪問您的網站

### 6. 初始化資料庫

部署完成後，需要執行資料庫遷移：

1. 在 Zeabur 控制台找到您的服務
2. 進入「Terminal」
3. 執行：
```bash
cd server
pnpm db:push
```

## 🎨 已包含的功能

- ✅ UI 優化（登入介面、Logo 整合）
- ✅ 刮刮樂功能（優惠券 ≥ 15 張自動切換）
- ✅ 手機端優化
- ✅ Nano Banana 設計風格

## 📝 注意事項

1. **資料庫連線**：確保 DATABASE_URL 正確配置
2. **CORS 設定**：前後端域名需要正確設定
3. **環境變數**：所有敏感資訊都應設定在 Zeabur 環境變數中

## 🔧 故障排除

### 構建失敗
- 檢查 Node.js 版本（需要 >= 18）
- 確認 pnpm 已安裝

### 資料庫連線失敗
- 檢查 DATABASE_URL 格式
- 確認 MySQL 服務已啟動

### CORS 錯誤
- 檢查 CORS_ORIGIN 設定
- 確認前後端域名正確

## 📞 需要幫助？

如有問題，請檢查：
1. Zeabur 構建日誌
2. 應用程式日誌
3. 環境變數配置
