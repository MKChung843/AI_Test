// storage.js — Storage adapter
// ─────────────────────────────
// 私人資料(lastResult)走 localStorage,班級資料走 Supabase。
// Session 過濾邏輯:從最近一筆紀錄往前找連續鏈,
//   - 相鄰兩筆超過 30 分鐘視為斷檔(避免上一堂課與下一堂混在一起)
//   - 從 chain 起點起算 1 小時為硬上限
// ─────────────────────────────

import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY

// 若環境變數未設定,班級統計功能會降級為「僅本機暫存」,但不會 crash
const supabase =
  SUPABASE_URL && SUPABASE_ANON_KEY
    ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
    : null

export const isSupabaseReady = !!supabase

// ─────────────────────────────
// 私人資料(lastResult):localStorage
// ─────────────────────────────
export const localStore = {
  get(key) {
    try {
      const v = localStorage.getItem(key)
      return v ? { value: v } : null
    } catch {
      return null
    }
  },
  set(key, value) {
    try {
      localStorage.setItem(key, value)
      return { value }
    } catch {
      return null
    }
  },
}

// ─────────────────────────────
// 班級資料:Supabase
// ─────────────────────────────
export async function saveClassResult({ classCode, id, type, scores, nickname }) {
  if (!supabase) {
    throw new Error('Supabase 尚未設定,無法上傳班級統計。請聯繫課程教師。')
  }
  const payload = {
    id,
    class_code: classCode,
    type,
    scores,
    nickname: nickname || null,
  }
  const { data, error } = await supabase.from('class_results').insert([payload])
  if (error) {
    console.error('saveClassResult error:', error)
    throw error
  }
  return data
}

export async function fetchClassResults(classCode) {
  if (!supabase) {
    throw new Error('Supabase 尚未設定,無法讀取班級統計。')
  }
  const { data, error } = await supabase
    .from('class_results')
    .select('id, class_code, type, scores, nickname, created_at')
    .eq('class_code', classCode)
    .order('created_at', { ascending: true })
  if (error) {
    console.error('fetchClassResults error:', error)
    throw error
  }
  return data || []
}

// ─────────────────────────────
// Session 過濾:取得「目前時段」的紀錄
// ─────────────────────────────
// 規則:
//  1. 從最新一筆紀錄往前找連續鏈,相鄰兩筆 created_at 差距 > SESSION_GAP 視為斷檔
//  2. Chain 起點 = 該段連續鏈中最早的一筆
//  3. 顯示時窗 = [chainStart, chainStart + SESSION_DURATION]
//  4. 該時窗內的紀錄即為「目前時段」
//
// 預設值:斷檔閾值 30 分鐘,session 上限 60 分鐘
// ─────────────────────────────
export const SESSION_GAP_MS = 30 * 60 * 1000 // 30 分鐘
export const SESSION_DURATION_MS = 60 * 60 * 1000 // 60 分鐘

export function filterCurrentSession(records, options = {}) {
  const gapMs = options.gapMs ?? SESSION_GAP_MS
  const durationMs = options.durationMs ?? SESSION_DURATION_MS

  if (!records || records.length === 0) {
    return {
      records: [],
      sessionStart: null,
      sessionEnd: null,
      totalAllTime: 0,
      hasSession: false,
    }
  }

  // 確保升序(防呆)
  const sorted = [...records].sort((a, b) => {
    const ta = new Date(a.created_at).getTime()
    const tb = new Date(b.created_at).getTime()
    return ta - tb
  })

  const lastIdx = sorted.length - 1
  let chainStartIdx = lastIdx

  // 從最新一筆往前找連續鏈
  for (let i = lastIdx; i > 0; i--) {
    const tCurr = new Date(sorted[i].created_at).getTime()
    const tPrev = new Date(sorted[i - 1].created_at).getTime()
    if (tCurr - tPrev > gapMs) break
    chainStartIdx = i - 1
  }

  const chainStart = new Date(sorted[chainStartIdx].created_at)
  const windowEnd = new Date(chainStart.getTime() + durationMs)

  const sessionRecords = sorted.filter((r) => {
    const t = new Date(r.created_at)
    return t >= chainStart && t <= windowEnd
  })

  return {
    records: sessionRecords,
    sessionStart: chainStart,
    sessionEnd: windowEnd,
    totalAllTime: sorted.length,
    hasSession: true,
  }
}
