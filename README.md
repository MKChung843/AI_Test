# AI 使用者類型測驗 v6（網路版）

從 4 個維度（探索廣度、判斷傾向、操作方法、應用情境）認識自己跟 AI 的相處方式，產出 16 種類型其中之一。本版本支援班級即時統計，1 小時時窗內的填答會被聚合顯示。

---

## 功能特色

- **32 題 Likert 量表**，約 6–8 分鐘完成
- **4 維度雷達圖** + **16 種類型敘事**
- **填答一致性檢核**：偵測「全選同意」之類的填答偏誤
- **45–55 灰帶**：分數接近平衡時，類型字母旁加註 `~` 並提示讀「另一端」描述
- **班級即時統計**：學生輸入班級代碼後可上傳結果，教師端顯示類型分布、維度傾向、個別清單
- **1 小時時窗**：教師端只顯示「目前時段」的填答（從第一位填答者起算 1 小時內，相鄰填答間隔 ≤ 30 分鐘視為同一個時段）
- **30 秒自動重整**：教師端開著就能看到學生陸續填答進來

---

## 部署步驟（總時間約 30–40 分鐘）

整個流程分四大階段，**每個階段結束前都有檢查點**，沒過就先別往下走。

### 階段 1：建立 Supabase 專案（10 分鐘）

#### 1-1. 註冊 Supabase

到 [https://supabase.com](https://supabase.com) 點 **Start your project** → 用 GitHub 或 Google 登入。

#### 1-2. 建立新專案

登入後點 **New project**，填入：

- **Name**：`ai-typology`（隨便取）
- **Database Password**：隨便產一組強密碼，**用密碼管理器存好**（之後不會再問你，但官方介面查不到）
- **Region**：選 `Northeast Asia (Tokyo)` 或 `Southeast Asia (Singapore)`，台灣連線都不錯
- **Pricing Plan**：Free（永久免費，限額對教學情境完全夠用）

按下 **Create new project** 後等 1–2 分鐘讓 Supabase 把資料庫初始化好。

#### 1-3. 跑 SQL 建立資料表

進入專案後，左側選單點 **SQL Editor** → **New query** → 把專案中 `supabase-setup.sql` 整份內容貼上 → 按右下角 **Run**。

成功應該看到 `Success. No rows returned`。

#### 1-4. 取得 API 金鑰

左側選單點 **Project Settings**（齒輪圖示）→ **API**。

把這兩個值複製到記事本暫存：

- **Project URL**：類似 `https://abcdefg.supabase.co`
- **anon / public key**（不是 service_role key！）：很長一串 `eyJhbGc...` 開頭的字串

> ⚠️ **service_role key 不要用、不要 commit、不要外流**。我們只會用 anon key。

#### 階段 1 檢查點

- [ ] Supabase 專案建好
- [ ] SQL Editor 跑過 setup script 沒報錯
- [ ] Table Editor 中看得到 `class_results` 這張表
- [ ] 已經把 Project URL 與 anon key 抄起來

---

### 階段 2：上傳到 GitHub（5 分鐘）

#### 2-1. 建立新 repo

到 [https://github.com/new](https://github.com/new) 建一個新 repo：

- **Repository name**：`ai-typology-v6`（自己取）
- **Public** 或 **Private** 都可以（Vercel 兩種都支援）
- **不要勾** Add a README、不要勾 Add .gitignore（我們已經有了）
- 按 **Create repository**

#### 2-2. 上傳檔案（網頁拖曳）

建好之後 GitHub 會跳到 repo 頁面，點頁面中間的 **uploading an existing file** 連結（在 quick setup 的方框裡）。

把這份專案資料夾**裡面的所有檔案**（不是把資料夾本身拖進去，是拖**內容**）拖到網頁上。確認頁面上看得到以下檔案/資料夾：

```
.env.example
.gitignore
README.md
index.html
package.json
postcss.config.js
supabase-setup.sql
tailwind.config.js
vite.config.js
src/
  ├── App.jsx
  ├── index.css
  ├── main.jsx
  └── storage.js
```

⚠️ **注意**：要確認 `.env.example` 有上傳但 `.env.local` **沒有**上傳（後者包含金鑰，不能 commit）。如果你還沒建立 `.env.local` 那當然也不會被上傳到。

下方 commit message 填 `Initial commit` 之類的，按 **Commit changes**。

#### 階段 2 檢查點

- [ ] GitHub repo 建好
- [ ] 上面 12 個檔案都看得到
- [ ] `src/` 資料夾裡有 4 個檔案
- [ ] `.env.local` 或 `.env` 沒有出現在 repo 裡

---

### 階段 3：部署到 Vercel（5 分鐘）

#### 3-1. 註冊 Vercel

到 [https://vercel.com](https://vercel.com) → **Sign Up** → 用 **Continue with GitHub**。授權 Vercel 讀取你的 repo。

#### 3-2. Import Project

進入 Vercel Dashboard 後點 **Add New...** → **Project** → 找到剛剛的 `ai-typology-v6` repo，按 **Import**。

#### 3-3. 設定環境變數（最重要的一步）

在 Configure Project 頁面找到 **Environment Variables** 區塊，**展開**它，新增兩筆：

| Key | Value |
|---|---|
| `VITE_SUPABASE_URL` | 階段 1-4 抄下來的 Project URL |
| `VITE_SUPABASE_ANON_KEY` | 階段 1-4 抄下來的 anon key |

⚠️ **變數名稱必須完全一致**，包含 `VITE_` 前綴。

其他設定全部用 Vercel 自動偵測的預設值（Framework: Vite，Build Command: `vite build`，Output Directory: `dist`）。

按 **Deploy**。等待 1–2 分鐘 build 完成。

#### 3-4. 取得網址

部署成功後 Vercel 會給你一個網址，類似：

```
https://ai-typology-v6.vercel.app
https://ai-typology-v6-mkchung.vercel.app
```

點開就能看到你的測驗網站了。

#### 階段 3 檢查點

- [ ] Vercel build 成功（沒看到紅字錯誤）
- [ ] 網址能打開，看到「你是哪一種 AI 玩家？」首頁
- [ ] 字體正確顯示（中文與襯線英文）
- [ ] 試填一份測驗（隨便輸入班級代碼如 `TEST123`），看到結果頁

---

### 階段 4：驗證班級統計功能（5 分鐘）

#### 4-1. 提交一筆測試資料

- 在你的 Vercel 網址打開
- 班級代碼填 `TEST123`，暱稱隨便取
- 完成測驗
- 在結果頁點 **加入班級統計**
- 應該看到「已將你的結果加入班級 TEST123 的統計」

#### 4-2. 查看統計頁

- 回到首頁，點 **老師：查看班級統計**
- 輸入 `TEST123` 按 **查看**
- 應該看到：
  - 上方時窗條：本時段日期與時間範圍
  - 本時段填答：1 人
  - 累計：1 人
  - 類型分布長條圖（只有一筆所以只有一條）
  - 維度傾向各維度條
  - 下方個別結果表格

#### 4-3. 在 Supabase 端確認

- 回 Supabase Dashboard → **Table Editor** → `class_results`
- 應該看到那一筆紀錄

#### 階段 4 檢查點

- [ ] 提交班級統計成功（沒跳錯誤）
- [ ] 教師端看得到該筆資料
- [ ] Supabase 表格中能看到對應的 row

---

## 產生 QR Code

拿到 Vercel 網址後，產 QR 的方式：

- **最簡單**：[https://qr.io](https://qr.io)、[https://qrcode-monkey.com](https://qrcode-monkey.com)，貼網址下載 PNG
- **手機快速產**：iOS 內建「捷徑」、Android 多數瀏覽器分享選單都有
- **Chrome 內建**：在頁面網址列右側點分享圖示 → 產生 QR code

把 QR 貼到投影片或印出來，學生掃描即可進入測驗。

---

## 如何修改題目或類型描述

所有可調整的內容都在 `src/App.jsx`：

- **題目**：搜尋 `const QUESTIONS = [`，每題格式為 `{ dim: '維度代碼', text: '題目', reverse: true/false }`
- **類型描述**：搜尋 `const TYPES = {`，16 個類型的 `description`、`strengths`、`growth` 都在這
- **維度說明**：搜尋 `const DIMENSIONS = [`，包含每維度的概念、操作化、理論、解讀

修改後重新 push 到 GitHub，Vercel 會自動 build 並部署新版本（約 1 分鐘）。

---

## 故障排除

### 問題：學生提交時跳錯誤「儲存失敗」

可能原因：
- 班級代碼不符合格式（必須 4–8 位大寫英數字）
- Supabase 環境變數沒設好 → 到 Vercel 專案的 Settings → Environment Variables 確認
- Supabase RLS policy 拒絕了該筆 → 到 Supabase → SQL Editor 重跑一次 setup script

### 問題：教師端統計頁顯示「讀取失敗」

可能原因：
- 環境變數沒設好（同上）
- 該班級代碼還沒人填過

### 問題：學生填答後，老師看不到資料

可能原因：
- **時窗已過**：1 小時時窗已經結束，新填答會啟動新時段。確認大家的填答時間是否在同一個時段內
- **斷檔**：兩個學生的填答間隔超過 30 分鐘，會被視為不同時段
- **班級代碼打錯**：學生輸入的班級代碼跟老師查的不同（最常見的問題）

### 問題：環境變數改了但網站沒更新

Vercel 環境變數改完後**必須重新部署**才會生效：到 Vercel 專案 → Deployments → 最上方那筆右側 `...` → Redeploy。

### 問題：想清空所有測試資料重新開始

到 Supabase → SQL Editor → 跑：

```sql
DELETE FROM class_results;
```

或者整張表砍掉重建（會清光所有設定）：

```sql
DROP TABLE class_results;
```

然後重跑 `supabase-setup.sql`。

---

## 本機開發（選用）

如果你想在自己電腦上跑開發版本：

```bash
# 安裝 Node.js 18+ 之後
git clone https://github.com/你的帳號/ai-typology-v6.git
cd ai-typology-v6
npm install

# 建立 .env.local
cp .env.example .env.local
# 編輯 .env.local 填入 Supabase URL 與 anon key

npm run dev
# 打開 http://localhost:5173
```

---

## 成本

**完全免費**，前提是：

- Supabase Free Plan：500 MB 資料庫 + 50,000 月活躍使用者（單堂 60 人課程占不到 0.1%）
- Vercel Hobby Plan：100 GB 頻寬/月（足夠數百次測驗）

如果一個學期下來資料累積過多，可以定期到 Supabase 跑 `DELETE FROM class_results WHERE created_at < NOW() - INTERVAL '30 days'` 清掉舊資料。

---

## 版本紀錄

- **v6.0**（網路版）：以 Vite + React + Supabase + Vercel 重構，加入 1 小時時窗、自動重整
- **v6.0**（Artifact 版）：題組重設（PN 維度純化為協作網絡）、加入填答一致性檢核、45–55 灰帶
- **v5.0**：MBTI 風格 16 類型敘事、四字母代碼、教學版方法論說明
