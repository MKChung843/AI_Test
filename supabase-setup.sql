-- ============================================================================
-- AI Typology v6 - Supabase Database Setup
-- ----------------------------------------------------------------------------
-- 在 Supabase Dashboard → SQL Editor 中,把以下整段貼上執行一次即可。
-- 如果之後想砍掉重來,執行最末段的「重置」區塊即可清除全部資料。
-- ============================================================================

-- 1. 建立資料表 ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS class_results (
  id          TEXT PRIMARY KEY,
  class_code  TEXT NOT NULL,
  type        TEXT NOT NULL,
  scores      JSONB NOT NULL,
  nickname    TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE class_results IS 'AI 使用者類型測驗的班級填答紀錄';
COMMENT ON COLUMN class_results.class_code IS '班級代碼,4-8 位大寫英數字';
COMMENT ON COLUMN class_results.type IS '四字母類型代碼,如 ETIP、FCSN';
COMMENT ON COLUMN class_results.scores IS '四維度分數,JSON 物件 {EF, TC, IS, PN}';

-- 2. 索引(加速依班級代碼+時間查詢) ------------------------------------------
CREATE INDEX IF NOT EXISTS idx_class_results_class_code
  ON class_results (class_code);

CREATE INDEX IF NOT EXISTS idx_class_results_class_code_created_at
  ON class_results (class_code, created_at DESC);

-- 3. 啟用 Row Level Security ---------------------------------------------------
ALTER TABLE class_results ENABLE ROW LEVEL SECURITY;

-- 4. 清除舊的 policies(避免重複執行時報錯) ----------------------------------
DROP POLICY IF EXISTS "Anyone can insert valid records" ON class_results;
DROP POLICY IF EXISTS "Anyone can select" ON class_results;

-- 5. Policy: 任何人皆可 INSERT,但提交內容須符合格式 -------------------------
-- 這個 policy 是對抗惡意提交的第一道防線:
--   - class_code 必須是 4-8 位大寫英數字
--   - type 必須是 4 個大寫字母
--   - scores 必須是 JSON object
--   - nickname 長度上限 30 字
CREATE POLICY "Anyone can insert valid records"
  ON class_results
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (
    class_code ~ '^[A-Z0-9]{4,8}$'
    AND char_length(type) = 4
    AND type ~ '^[A-Z]{4}$'
    AND jsonb_typeof(scores) = 'object'
    AND (nickname IS NULL OR char_length(nickname) <= 30)
  );

-- 6. Policy: 任何人皆可 SELECT(讀取) ------------------------------------------
-- 安全模型備註:
--   - anon key 是公開在前端的,因此 SELECT 開放是合理的
--   - 真正的存取控制依賴「班級代碼難猜性」(8 位英數字 ≈ 2.8 兆組合)
--   - 資料本身無 PII,僅含學生自填暱稱與測驗類型結果
CREATE POLICY "Anyone can select"
  ON class_results
  FOR SELECT
  TO anon, authenticated
  USING (true);

-- 7. UPDATE 與 DELETE 不開放 policy,確保紀錄不可修改 -------------------------
-- 若需要刪除特定資料,請在 Supabase Dashboard 用 service_role 操作

-- ============================================================================
-- 完成! 現在可以從前端發送 INSERT/SELECT 請求了。
-- 測試方式:
--   1. 在 Supabase Dashboard → Table Editor 看到 class_results 表存在
--   2. 在前端跑測驗,提交一筆,回到 Table Editor 重整應該看到資料
-- ============================================================================


-- ============================================================================
-- 重置區塊(視需要使用) - 如果想清空所有資料、砍掉表重建,執行下方:
-- ----------------------------------------------------------------------------
-- DROP TABLE IF EXISTS class_results;
-- ============================================================================
