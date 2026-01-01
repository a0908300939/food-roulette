# Railway 環境變數設定說明

## 必要的環境變數

### 1. OPENAI_API_KEY（AI 協作功能）

**用途**：用於 AI 生成優惠內容功能

**設定步驟**：

1. 前往 Railway Dashboard：https://railway.app/
2. 選擇「food-roulette」專案
3. 點擊您的服務（main 或 production）
4. 點擊上方的「Variables」標籤
5. 點擊「New Variable」
6. 輸入：
   - **Variable Name**：`OPENAI_API_KEY`
   - **Value**：您的 OpenAI API Key
7. 點擊「Add」
8. Railway 會自動重新部署

**如何取得 OpenAI API Key**：

1. 前往：https://platform.openai.com/
2. 登入或註冊帳號
3. 前往「API Keys」頁面
4. 點擊「Create new secret key」
5. 複製 API Key（只會顯示一次，請妥善保存）

---

## 其他已設定的環境變數

以下環境變數應該已經在 Railway 上設定好：

- `DATABASE_URL`：MySQL 資料庫連線字串（Railway 自動設定）
- `JWT_SECRET`：JWT 加密金鑰
- `VITE_APP_TITLE`：應用程式標題
- `VITE_APP_ID`：應用程式 ID
- `VITE_OAUTH_PORTAL_URL`：OAuth 入口網址
- `OAUTH_SERVER_URL`：OAuth 伺服器 API 網址
- `NODE_ENV`：環境模式（production）
- `PORT`：伺服器埠號（Railway 自動設定）

---

## 檢查環境變數是否設定成功

1. 在 Railway Dashboard 的「Variables」頁面
2. 確認 `OPENAI_API_KEY` 已經顯示在列表中
3. 等待部署完成（約 2-5 分鐘）
4. 測試 AI 協作功能

---

## 常見問題

### Q: 為什麼需要 OpenAI API Key？
A: AI 協作功能使用 OpenAI 的 GPT 模型來自動生成優惠內容描述。

### Q: OpenAI API 會收費嗎？
A: 是的，OpenAI API 是按使用量收費。GPT-4.1-mini 的費用較低，每次生成約 $0.0001-0.0005 USD。

### Q: 可以使用免費的 AI 模型嗎？
A: 可以，但需要修改程式碼。目前使用的是 OpenAI 的 GPT-4.1-mini 模型。

---

## 聯絡資訊

如有任何問題，請聯絡開發團隊。
