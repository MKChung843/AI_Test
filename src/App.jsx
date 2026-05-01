import React, { useState, useEffect, useMemo } from 'react';
import {
  BarChart, Bar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar,
  ResponsiveContainer, XAxis, YAxis, Tooltip, LabelList
} from 'recharts';
import {
  Sparkles, ChevronRight, ChevronLeft, RefreshCw, BarChart3, Users,
  Compass, Search, Layers, Network, ArrowLeft, Check, AlertCircle, Loader2,
  Info, X, BookOpen, ChevronDown, ChevronUp, Clock, Briefcase, MapPin
} from 'lucide-react';
import {
  localStore,
  saveClassResult,
  fetchClassResults,
  filterCurrentSession,
  isSupabaseReady,
  SESSION_GAP_MS,
  SESSION_DURATION_MS,
} from './storage';

// ==================== 設計變數 ====================
const COLORS = {
  cream: '#f5efe4',
  paper: '#faf6ed',
  ink: '#1a2332',
  inkSoft: '#3d4a5c',
  accent: '#b8431e',
  accentSoft: '#d4694a',
  teal: '#1f5f5b',
  gold: '#c89b3c',
  warmGray: '#8a8275',
  border: '#d9cfbf',
};

// 簡單的 markdown 粗體渲染：**text** → <strong>text</strong>
// 用於優勢與成長段落中標示重點論述
function renderBold(text) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((p, i) => {
    if (p.startsWith('**') && p.endsWith('**')) {
      return (
        <strong key={i} style={{ color: COLORS.ink, fontWeight: 600 }}>
          {p.slice(2, -2)}
        </strong>
      );
    }
    return <React.Fragment key={i}>{p}</React.Fragment>;
  });
}

// ==================== 維度元資料 ====================
const DIMENSIONS = [
  {
    code: 'EF',
    name: '探索廣度',
    poles: ['E 探索', 'F 專精'],
    polesShort: ['探索', '專精'],
    icon: Compass,
    description: '你傾向廣泛嘗試新工具，還是深度使用少數工具？',
    concept: '個人在 AI 工具生態中，傾向廣泛採納多種工具還是深度專精少數工具的行為傾向。',
    operational: '透過工具數量、新工具反應速度、資訊追蹤行為、工具切換意願、社群學習行為等指標觀察。',
    theory: '對應 Rogers (2003) 的創新採用者光譜，將使用者分為創新者、早期採用者、早期多數、晚期多數與落後者。',
    interpretation: {
      high: '偏向「探索者」：你樂於嘗試新工具，對 AI 領域的新發展保持高度敏感。優勢是視野開闊；盲點可能是缺乏深度。',
      mid: '介於兩端：你會嘗試新工具，但不會一窩蜂追逐潮流，具有平衡的策略選擇。',
      low: '偏向「專精者」：你選擇深度使用少數工具，把它們用得很精熟。優勢是工具掌握度高；盲點可能是錯過更適合的新選擇。',
    },
  },
  {
    code: 'TC',
    name: '判斷傾向',
    poles: ['T 信任', 'C 批判'],
    polesShort: ['信任', '批判'],
    icon: Search,
    description: '你傾向接受 AI 的輸出，還是習慣性查證、批判？',
    concept: '個人對 AI 輸出的信任程度與查證習慣——是傾向接受 AI 的回答，還是維持批判懷疑？',
    operational: '透過一般查證習慣、引用文獻查證、錯誤歸因、資料事實查證、認知衝突處理等指標觀察。',
    theory: '對應 Ng 等人 (2021) 提出的 AI 素養四面向中的「評估與創造 AI」(Evaluate and Create AI)，以及資訊素養領域的批判性思維框架。',
    interpretation: {
      high: '偏向「批判者」：你對 AI 輸出保持警覺，習慣性查證。優勢是不易被誤導，適合學術情境；盲點可能是過度懷疑會降低效率。',
      mid: '介於兩端：你會視情況查證，在效率與嚴謹之間取得平衡。',
      low: '偏向「信任者」：你較傾向接受 AI 的輸出，使用上順暢但須警覺 AI 幻覺與引文造假等風險。建議至少對學術引用進行查證。',
    },
  },
  {
    code: 'IS',
    name: '操作方法',
    poles: ['I 直覺', 'S 結構'],
    polesShort: ['直覺', '結構'],
    icon: Layers,
    description: '你的 prompt 是隨意對話，還是有明確的結構與設計？',
    concept: '個人撰寫 prompt 與操作 AI 的方法論成熟度——是憑直覺對話，還是有結構化的設計與系統？',
    operational: '透過 prompt 撰寫方式、模板化程度、失敗應對、主動學習、任務拆解等指標觀察。',
    theory: '對應 Liu 等人 (2023) 整理的 prompt engineering 研究脈絡，以及 Flavell (1979) 的元認知 (metacognition) 概念——對自己 AI 互動過程的反思與優化能力。',
    interpretation: {
      high: '偏向「結構者」：你有清楚的 prompt 設計方法與可重用模板。優勢是輸出品質穩定可控；盲點可能是過度結構限制創意。',
      mid: '介於兩端：你會視任務複雜度選擇結構或直覺，操作彈性高。',
      low: '偏向「直覺者」：你習慣即興對話、邊問邊調整。優勢是上手快、不被框架綁住；盲點是不易產出可重複、可優化的工作流程。',
    },
  },
  {
    code: 'PN',
    name: '應用情境',
    poles: ['P 個人', 'N 網絡'],
    polesShort: ['個人', '網絡'],
    icon: Network,
    description: '你主要把 AI 當成個人工具使用，還是會跟他人交流、共學、協作？',
    concept: '個人 AI 使用在「人際協作網絡」中的位置——是孤立地獨自使用，還是融入分享、共學、協調的社群網絡之中？',
    operational: '透過知識共享行為、向他人學習的意願、團隊協調、社群參與、討論意願等指標觀察。',
    theory: '對應 Hutchins (1995) 的分散式認知 (distributed cognition) 概念——智慧不只在個人腦中，也分散在工具、夥伴、社群之中；以及 Wenger (1998) 的實踐社群 (communities of practice) 觀點，強調知識在協作互動中產生與深化。',
    interpretation: {
      high: '偏向「網絡型」：你已將 AI 使用融入協作網絡——會分享、會討論、會跟他人共學。優勢是知識成長速度快、影響力擴及團隊；進階方向是把這份協作能力轉化為更系統的知識共享機制。',
      mid: '介於兩端：你會偶爾跟他人討論 AI，但主要還是個人使用。',
      low: '偏向「個人型」：你主要把 AI 當作個人工具使用。對學生階段這很正常；成長方向是嘗試跟同儕分享經驗、從別人的使用方式學習，你會發現視野與效率都會跟著提升。',
    },
  },
];

// ==================== 題目設計 ====================
const QUESTIONS = [
  // ========== 維度 1: EF ==========
  { dim: 'EF', text: '看到剛發布的 AI 新工具，我會馬上去試試看。', reverse: false },
  { dim: 'EF', text: '我經常追蹤 AI 領域的新聞與產品發布。', reverse: false },
  { dim: 'EF', text: '我傾向同時使用多種不同的 AI 工具，而不是專注在一兩個。', reverse: false },
  { dim: 'EF', text: '面對新任務，我會主動尋找最適合的 AI 工具，而不是用熟悉的。', reverse: false },
  { dim: 'EF', text: '別人分享新的 AI 應用技巧，我會找時間嘗試各種新方法。', reverse: false },
  { dim: 'EF', text: '我會主動了解新發布的 AI 模型或工具，與既有工具有什麼差異。', reverse: false },
  { dim: 'EF', text: '我習慣使用一兩個 AI 工具搞定大部分事情，不太想換。', reverse: true },
  { dim: 'EF', text: '只有在實際需要時，我才會評估是否採用新的 AI 工具。', reverse: true },

  // ========== 維度 2: TC ==========
  { dim: 'TC', text: 'AI 給出的引用文獻，我一定會查原文確認其真實性。', reverse: false },
  { dim: 'TC', text: 'AI 提供的統計數據或事實陳述，我會交叉驗證原始來源。', reverse: false },
  { dim: 'TC', text: '當 AI 的答案跟我既有的認知衝突時，我會先質疑 AI 的回答。', reverse: false },
  { dim: 'TC', text: 'AI 寫的程式碼，我會逐行檢查並測試，而不是直接執行。', reverse: false },
  { dim: 'TC', text: '對於重要決定，我絕不會只依賴 AI 的建議。', reverse: false },
  { dim: 'TC', text: '即使 AI 答得很有自信，我也會懷疑它可能在編造內容。', reverse: false },
  { dim: 'TC', text: 'AI 的答案看起來合理，我通常就直接採用。', reverse: true },
  { dim: 'TC', text: '比起花時間查資料庫或教科書，我覺得直接問 AI 更划算。', reverse: true },

  // ========== 維度 3: IS ==========
  { dim: 'IS', text: '我寫 prompt 時會先構思結構與目標，再仔細寫出來。', reverse: false },
  { dim: 'IS', text: '我有自己反覆使用並持續優化的 prompt 模板。', reverse: false },
  { dim: 'IS', text: '面對不滿意的答案，我會分析問題在哪，系統性調整 prompt。', reverse: false },
  { dim: 'IS', text: '我會回顧自己跟 AI 的對話，思考下次怎麼問會更好。', reverse: false },
  { dim: 'IS', text: '面對複雜任務，我會將任務拆解成步驟，分階段請 AI 處理。', reverse: false },
  { dim: 'IS', text: '我會在 prompt 裡明確指定輸出格式、語氣或風格。', reverse: false },
  { dim: 'IS', text: '我寫 prompt 通常想到什麼問什麼，邊問邊調整。', reverse: true },
  { dim: 'IS', text: '對我來說，跟 AI 對話自然就會了，不需要刻意學技巧。', reverse: true },

  // ========== 維度 4: PN ==========
  // v6 重新定錨：聚焦於「人際協作網絡」，將「流程整合」題移除（與 IS 維度概念重疊）
  { dim: 'PN', text: '我經常與同學或同事分享 AI 使用心得，共同優化方法。', reverse: false },
  { dim: 'PN', text: '我會把好用的 prompt 或工作流主動分享給同學/同事。', reverse: false },
  { dim: 'PN', text: '我經常從別人的 AI 使用方式學到新東西或新技巧。', reverse: false },
  { dim: 'PN', text: '我會在團體作業或專案中協調大家如何使用 AI。', reverse: false },
  { dim: 'PN', text: '我會閱讀或追蹤他人分享的 AI 使用案例(社群、論壇、教學影片等)。', reverse: false },
  { dim: 'PN', text: '跟別人討論 AI 使用方法，會幫我發現自己沒注意到的盲點。', reverse: false },
  { dim: 'PN', text: '我用 AI 主要是處理個人任務，較少涉及與他人協作。', reverse: true },
  { dim: 'PN', text: '我不太會跟別人討論 AI 使用方法，主要還是自己用。', reverse: true },
];

// ==================== 16 種類型(敘事性描述，粗體標記重點)====================
const TYPES = {
  ETIP: {
    name: '好奇嘗鮮者',
    english: 'The Eager Sampler',
    headline: '對 AI 充滿熱情、勇於嘗試新事物的探險家',
    description: '你像一位站在 AI 應用起跑線上的探險家——眼睛閃閃發亮，看到新工具就忍不住想試試看。你樂於探索各種 AI 工具，信任 AI 的能力，採用直覺式對話，主要應用在個人學習與任務上。你的世界裡，AI 是充滿可能性的玩具箱。',
    strengths: '身為一位 「ETIP」，你最迷人的地方在於那股「**對未知的好奇與行動力**」。當其他人還在觀望、評估、糾結要不要嘗試新工具時，你已經點開了註冊頁面開始玩了。這種「**低門檻的學習姿態**」讓你比同儕更早累積到「手感」，在 AI 工具更迭快速的當下，你的反應速度就是你的優勢。你不害怕踩雷，「**「先試了再說」的個性**」讓你能直觀感受到不同工具的差異——這是看書、看教學影片都學不來的**隱性知識**。再加上你對 AI 的信任使你能放手讓工具發揮，任務完成度通常不錯。在朋友圈裡，你大概是那個會說「欸我最近發現一個超酷的工具」的人。',
    growth: '不過，「**真正能讓你從「玩家」進階為「使用者」的關鍵**」，在於補上一個你目前比較少做的動作：「**查證**」。AI 雖然強大，但會「一本正經地胡說八道」——尤其是引用文獻、統計數據、歷史事件，這些 AI 最容易產生幻覺的地方，正好也是你做學術作業最需要嚴謹的地方。建議你從「**最小成本的查證習慣**」開始：每次 AI 給你引文，就花 30 秒 google 一下文獻是否真實存在。第二個方向是「學習結構化的 prompt 寫法」，這不是要你變得拘謹，而是讓你的「直覺」可以被複製、可以教給別人。最後，試著「**把 AI 整合到一個固定的工作流程中**」(例如：每週筆記整理、每月學習回顧)，你的廣度加上方法論，會讓你變得很可怕。',
  },

  ETIN: {
    name: '自由實驗者',
    english: 'The Free Experimenter',
    headline: '愛玩、愛分享、愛協作的 AI 玩家',
    description: '你是 AI 學習圈裡的能量補充包——什麼新工具大家不確定要不要碰，你已經試過三個了，還順便拉了同學一起加入測試。你樂於嘗試各種新工具，喜歡與他人分享經驗、共同創作，使用方式偏直覺式，且信任 AI 的輸出。在團隊裡你是潤滑劑，也是話題的引爆點。',
    strengths: '身為一位 「ETIN」，你最大的魅力在於把 AI 學習這件事「**從個人活動變成集體活動**」的能力。你不只是試新工具，你還會把使用心得整理成「乾貨」分享出去——可能是 IG 限動、可能是社團文、也可能是吃飯時隨口聊起。這種「**自然的分享傾向**」讓你身邊的朋友 AI 素養都跟著提升。你的協作精神是團隊裡最稀缺的資源，因為你願意當第一隻白老鼠去踩雷，然後把經驗變成大家的共同資產。再加上你跨工具整合的反應快、對社群動態敏感，你經常是那個「**最早知道某個新功能能怎麼用的人**」。在 AI 應用的「社群擴散」這條路上，你是天然的節點。',
    growth: '你的成長重點不在於「玩更多工具」(這你已經很擅長了)，而在於「**把熱情轉化為更紮實的能力**」。第一個方向是「**強化批判性查證**」——你的高度信任加上廣泛分享，如果遇到 AI 出錯而你又把錯誤資訊傳出去，影響範圍會比一般人更大。建議你在「分享前」多一道驗證程序。第二個方向是「**培養結構化的 prompt 思維**」，這會讓你分享出去的不只是「這個工具好酷」，而是「這個工具可以這樣用，效果會更好」——從感性推薦升級為方法論教學。最後，試著「**建立一些可重複使用的工作模板**」，把直覺轉成 SOP，你的影響力會從「啟發別人嘗試」進化為「讓別人少走彎路」。',
  },

  ETSP: {
    name: '探索工程師',
    english: 'The Exploration Engineer',
    headline: '愛玩新工具，也愛把 prompt 寫得漂亮的 DIY 玩家',
    description: '你是 AI 領域裡的 DIY 玩家——既有探索新工具的好奇心，又有把 prompt 寫得結構化、漂亮的工匠精神。你既廣泛嘗試新工具，又懂得用結構化方法寫 prompt，但相對信任 AI 輸出，主要應用於個人任務。在你眼裡，每個 AI 工具都是一把瑞士刀，而你樂於研究每一個刀片怎麼用最順手。',
    strengths: '身為一位 「ETSP」，你最大的優勢是「**「廣度」與「方法」並行**」。多數人在這兩個極端只能取一——廣泛嘗試的人通常不深入，深入研究的人通常不換工具。你卻能在試用新工具的同時，「**快速建立起對應的使用方法**」，這需要的不只是聰明，更是一種「**對「優雅解」的追求**」。你寫的 prompt 不是隨便丟一句話，而是會考慮結構、語氣、輸出格式；你選工具不是看誰最熱門，而是看誰最適合手上的任務。這種「**「為每個任務找最佳解」的工程師心態**」，讓你的個人生產力很高，而且累積的 prompt 模板會隨著時間越來越值錢。你大概是同學眼中「AI 很厲害」的那個人。',
    growth: '你的下一步，是把目前的「強個人能力」往兩個方向擴張。第一個方向是「**補上批判性查證**」——你的方法論已經夠成熟，但對 AI 輸出的信任度偏高，這會在學術或專業情境踩雷。建議你「**把「驗證」也納入你的 prompt 流程**」，例如在 prompt 結尾加上「請列出來源並標明確定性等級」，讓查證變成系統的一部分，而非額外的負擔。第二個方向是「**從個人走向團隊**」。你的方法論如果只停留在個人筆記裡，就只能造福你一個人——試著把它「**寫成可以分享的指南**」，在小組作業或實習裡帶領同伴使用。最後，挑戰「**多人協作的 AI 工作流**」(例如：用 AI 共筆協作、設計團隊用的提示語庫)，你會發現自己的價值不只是「會用 AI」，而是「能設計 AI 流程」。',
  },

  ETSN: {
    name: '全棧整合者',
    english: 'The Full-Stack Integrator',
    headline: '把 AI 編織進整個工作流程的高階整合師',
    description: '你已經不是「在用 AI」，而是「在 AI 之中工作」——AI 對你來說不是工具，而是工作流程裡的隱形夥伴。你嘗試多種工具、結構化使用、整合進工作流程與團隊，在 AI 應用的成熟度上，你已經走得比大多數同儕都遠。你的工作流像是一台精密儀器，各種 AI 工具是不同零件，而你是設計這台儀器的工程師。',
    strengths: '身為一位 「ETSN」，你已經是「**進階使用者中的進階使用者**」。你具備了「廣度」「結構」「網絡化」三項能力——這在大學生中相當稀有。你的工作流不是憑直覺拼湊出來的，而是「**經過多次試錯、優化、再試錯的結果**」。你能設計出讓多個 AI 工具串接協作的流程，能帶領團隊一起使用 AI，能寫出可重用、可擴充的 prompt 模板。你的生產力與學習速度都遠超平均，而且你的能力不只是「個人」的，而是「**會帶動整個小團體往前走**」。如果說多數人是 AI 的使用者，你已經接近 AI 工作流的「設計者」。',
    growth: '你的成長空間，正好是你最容易忽略的地方：「**對 AI 的信任度需要補上批判力**」。能力越強的使用者，如果對 AI 過度信任，造成的傷害也越大——因為你的產出影響的是整個團隊。建議你「**把「輸出驗證」內建為 SOP 的一部分**」，例如：重要報告必過引文驗證、數據必對原始來源、AI 寫的程式必跑邊界測試。第二個方向是「**訓練「AI 幻覺」的辨識能力**」——學會看到 AI 用語裡的「虛構特徵」(過度具體的數字、不存在的研究、模糊的歸因)。第三，在分享給團隊時，「**別只傳遞工具與方法，也要傳遞「懷疑」**」——讓你的團隊不只會用 AI，也會質疑 AI。當你補上批判這一塊，你就接近專家級了。',
  },

  ECIP: {
    name: '警覺評估者',
    english: 'The Cautious Evaluator',
    headline: '探索廣、批判敏銳的個人使用者',
    description: '你是 AI 工具的試藥員——願意嘗試，但隨時帶著放大鏡。你樂於嘗試新工具，但保持批判懷疑，使用方式偏直覺，主要應用於個人任務。你不會被 AI 的甜言蜜語牽著走，也不會因為害怕風險就拒絕嘗試。在「樂於嘗試」與「保持懷疑」之間，你找到了自己的平衡點。',
    strengths: '身為一位 「ECIP」，你最寶貴的能力是「**不被 AI 誤導**」——這在這個 AI 越來越會「說好聽話」的時代，簡直是稀缺資源。你會嘗試新工具，但不會盲目崇拜；你會用 AI 的答案，但不會直接複製貼上；你會聽 AI 的建議，但最後做決定的還是你自己。這種「**「保持距離的好奇」**」讓你比信任型的使用者更不容易踩雷，在學術寫作、報告查證等情境裡，你的把關習慣會救你很多次。你也對工具的好壞有自己的判斷力，不會因為某個工具很紅就一窩蜂去用，而是會評估「它真的能幫我嗎？」。在資訊爆炸的時代，「**你的批判性是一種抗噪能力**」。',
    growth: '你的限制，主要在於「**「直覺式對話」可能讓你的批判力沒有完全發揮**」。你已經有很好的查證習慣，但如果 prompt 寫得不夠清楚，AI 一開始給的答案就偏了，你的查證再厲害也只是在補洞。建議你「**學習一些結構化的 prompt 寫法**」——不需要變得很死板，只是在重要的任務上把目標、限制、輸出格式說清楚，你會發現 AI 的回答品質提升一個層次，連帶你查證的工作量也會下降。第二個方向是「**建立你自己的 prompt 模板**」，把那些常用的提問結構固定下來，讓批判力不再是每次都要重新出力。最後，試著「**把你的方法分享給同儕**」——你的批判能力是稀缺品，別只用在自己身上，讓你的朋友也能因此少踩坑。',
  },

  ECIN: {
    name: '質性研究者',
    english: 'The Qualitative Researcher',
    headline: '批判精神 + 廣泛探索 + 團隊協作的研究型使用者',
    description: '你像是一位田野研究者——重視驗證、講究情境、強調對話。你廣泛探索、批判性強、整合進團隊應用，但偏好直覺式對話而非結構化 prompt。在 AI 應用上，你不太相信「一個 prompt 套天下」的工廠思維，你相信每個任務、每個情境都有它自己的紋理。',
    strengths: '身為一位 「ECIN」，你的批判性思維是團隊裡最珍貴的資產。你不只懷疑 AI，你還會「**質疑大家對 AI 的集體共識**」——當一群人都在說某個工具很厲害、某個用法很潮的時候，你會是那個追問「真的有用嗎？有什麼侷限？」的人。這種「**保持距離的反思能力**」讓你在團隊應用 AI 時扮演了不可或缺的「品質守門員」角色。你也擅長把 AI 應用拓展到團隊層面，願意跟人討論、共同優化方法。對 AI 倫理、資料隱私、引文真實性等議題，你比一般人更敏感——這在 AI 治理越來越重要的時代，是非常前瞻的素養。簡單說，「**你是那種會把 AI 用得「對」而不只是「快」的人**」。',
    growth: '你最值得補強的，是把「**直覺式的批判轉化為結構化的方法**」。你目前的批判力很大程度依賴經驗與直覺，但這種能力很難傳承給別人——別人請教你「你怎麼判斷 AI 是不是在亂講？」，你可能很難具體說明。建議你「**學習一些 prompt engineering 的框架**」(例如 chain-of-thought、few-shot、role-prompting)，把你的直覺翻譯成可以教學的語言。第二個方向是「**把對話經驗整理為團隊 SOP**」——你的批判過程如果能變成團隊共用的「驗證檢查清單」，你的影響力會放大十倍。最後，「**建立你常用的提問結構模板**」，讓批判從「每次重新思考」變成「結構化反射」，你會省下很多力氣去做更重要的事。',
  },

  ECSP: {
    name: '嚴謹方法論者',
    english: 'The Rigorous Methodologist',
    headline: '探索、批判、結構俱備，缺一個整合的舞台',
    description: '你是個低調但火力強大的 AI 使用者——如果有 AI 應用的「個人冠軍賽」，你大概可以拿牌。你具備探索、批判、結構化的三項能力，但目前偏個人應用。你的 prompt 寫得漂亮、查證做得確實、工具選得精準——只可惜這些能力大部分還停留在你自己的世界裡，沒有被外界看見。',
    strengths: '身為一位 「ECSP」，你的方法論成熟度令人讚嘆。你寫 prompt 時會先構思結構、確認目標、設計輸出格式；你拿到 AI 的回答後會自動進入查證模式；你選擇工具時不是跟著潮流走，而是評估「這個任務最適合哪個」。「**你的個人 AI 工作流像是一個精緻的小型實驗室**」——什麼工具放在什麼位置、什麼任務用什麼模板，你都清楚。輸出品質可控、可重複、可優化，這在 AI 應用裡是非常難得的境界。你對 AI 的態度既不過度浪漫也不過度悲觀，「**就是把它當成一個強大但會犯錯的工具**」，這也是最健康的使用心態。',
    growth: '你的下一個成長突破點，在於「**把個人能力轉化為集體資產**」。你目前最大的「機會成本」是：你的方法論再強，如果只用在你一個人身上，影響力就被鎖在那個範圍。建議你做的第一件事是「**把方法論文件化**」——挑你最常用、最有效的 prompt 模板，寫成簡短的使用指南分享給同學或學長姐。第二個方向是「**與同儕共建工作流程**」，在團體作業或專案裡擔任「AI 流程設計者」的角色，你會發現自己的能力在多人協作中被放大。最後，試著「**探索多人協作的 AI 應用情境**」(例如：多代理人協作、團隊用的 prompt 庫、AI 輔助的同儕回饋)，你的個人方法論加上協作經驗，會讓你跨入下一個層次。',
  },

  ECSN: {
    name: '專業質檢工程師',
    english: 'The Professional QA Engineer',
    headline: '⭐ 全方位高階 AI 使用者',
    description: '你已經達到大學生中極為罕見的層級——探索、批判、結構、整合四項能力齊備。你能設計流程、把關品質、帶動團隊、推動分享，在 AI 應用上，你不只是「會用」，你是「能教」「能領」「能設計」的那種人。簡單說，你是這個量表裡的 ⭐ 五星級玩家。',
    strengths: '身為一位 「ECSN」，你具備了「**四維度全面均衡發展**」的稀有特質。你能持續探索新工具，保持批判性查證，使用結構化方法寫 prompt，並且把 AI 整合進團隊與工作流程裡。你的方法論成熟到可以教學，你的批判力深入到可以設計驗證 SOP，你的網絡化思維讓你能把個人經驗轉化為組織資產。在你身邊的人，通常會因為你的存在而 AI 素養大幅提升——你不只是「強」，「**你是會讓周圍的人也跟著變強的那種強**」。在大學階段你已經接近專業使用者的水準，這是值得驕傲、也值得珍惜的位置。',
    growth: '當一個人四個維度都已經發展得很好，「**下一階段的挑戰就不再是「能力」，而是「角色」**」。建議你開始思考自己作為「AI 應用引領者」的責任。第一個方向是「**建立教學與分享機制**」——可以是工作坊、可以是 IG 教學、可以是學習社群，把你的能力「**從個人擁有轉為集體共享**」。第二個方向是「**探索 AI 治理與倫理議題**」，你已經有方法論的基礎，接下來要思考「該不該用」「怎麼用才對」「使用後造成什麼影響」這些更深層的問題。最後，挑戰「**前沿的 AI 應用**」(例如：多代理人系統、客製化 GPT、本地端模型微調、AI 安全議題)，這些是會讓你真正跨入「專家」的領域。你已經走得很遠，但風景還在前方。',
  },

  FTIP: {
    name: '輕度使用者',
    english: 'The Casual User',
    headline: 'AI 的初階個人使用者，正站在進步空間最大的起點',
    description: '你是 AI 應用的「樸素派」——不追潮流、不鑽研技巧，有需要就用，沒需要就放著。你專注於少數熟悉的工具，傾向信任 AI，採用直覺對話，主要用於個人任務。這是大多數初學者的起點，聽起來好像不夠厲害，但有個好消息：「你正站在進步空間最大的位置」——四個維度都還有大幅提升的空間，只要踏出一步，改變就很明顯。',
    strengths: '身為一位 「FTIP」，你的優勢其實常被低估。你的「**使用門檻低**」，不會被太多選擇困擾，不會花時間糾結要用 ChatGPT 還是 Claude——你就是把眼前的任務完成。這種「**「不被工具焦慮綁架」的心態**」，在資訊爆炸的時代反而是一種清醒。你的學習曲線平緩，不會因為一開始太複雜就放棄。你也不會被 AI 圈的各種潮流牽著鼻子走，某種程度上保持了「**一種樸素的實用主義**」——這個態度本身沒有錯，問題只在於「夠不夠用」。對你來說，AI 是個好用的工具，如此而已。這聽起來簡單，但它讓你跟 AI 的關係相對健康。',
    growth: '你能進步的空間非常大，而且「**每一步的回報都很明顯**」——這是你目前最幸福的地方。第一個方向是「**嘗試 1 到 2 個新工具拓展視野**」，不需要每個都精通，光是知道「原來還有這種選擇」就會打開新世界。建議從「跟你目前主力工具不同類型」的開始(例如：你常用對話型 AI，可以試試生成圖像的 AI;你常用文字工具，可以試試簡報生成工具)。第二個方向是「**養成基本的查證習慣**」，特別是 AI 給你的引用、數據、年代，30 秒 google 一下就能避免被誤導。第三，「**學習 prompt 的結構化寫法**」——不需要變得很複雜，光是學會「角色設定 + 任務描述 + 輸出格式」這個三段式結構，你的 AI 對話品質就會立刻提升。最後，「**找一兩個同學一起聊聊 AI 怎麼用**」，你會發現原來大家都在踩坑，經驗分享是最快的成長路徑。',
  },

  FTIN: {
    name: '工具熟手',
    english: 'The Tool Adept',
    headline: '深用一兩個工具，且整合進團隊的協作型使用者',
    description: '你是「鐵粉型」使用者——一兩個工具用到滾瓜爛熟，而且願意把這份熟練分享給團隊。你深度使用 1 到 2 個工具，已將 AI 整合進團隊或專案，但偏直覺式對話且信任 AI 輸出。在團隊裡，你是大家的「工具諮詢窗口」，雖然不是最會探索新工具的那種，但你對主力工具的掌握度，讓你成為實用價值很高的協作者。',
    strengths: '身為一位 「FTIN」，你最大的優勢是「**「深度」加上「人脈」**」。你對主力工具非常熟練——別人還在點選介面找功能，你已經知道某個快捷鍵、某個設定可以省下半小時。這種「**深度使用累積出來的經驗**」，讓你在團隊裡可以扮演引導者的角色。再加上你願意把 AI 整合進團隊或專案，溝通協作能力強，你成為了那種「不只自己會用，還能讓團隊一起用得起來」的稀缺角色。在大學生族群中，大多數人是「個人玩家」，你已經跨入「團隊協作」這一層，「**這比你想像的還要前面**」。',
    growth: '你的成長重點不是「再學一個工具」，而是「**補強質的層面**」。你的「深度」與「網絡化」已經有了，但「批判」與「結構」這兩塊比較薄。第一個方向是「**訓練 AI 輸出的查證能力**」——當你的影響力擴及團隊，如果 AI 給你錯誤的答案而你又分享出去，影響範圍會比一般人大。建議你建立一個簡單的「重要輸出必驗證」的習慣。第二個方向是「**學習 prompt engineering 框架**」，把你的「直覺對話」轉成可以複製的方法。你已經會用工具，只是還沒把「怎麼用得更好」系統化——這部分一旦補上，你的效率會再提升一個檔次。第三，「**嘗試 1 到 2 個其他類型的工具**」，避免「工具同溫層」——你目前太熟悉主力工具了，可能錯過了更適合某些任務的選擇。',
  },

  FTSP: {
    name: '模板達人',
    english: 'The Template Master',
    headline: '深度使用且結構化的個人應用高手',
    description: '你是 prompt 模板的收藏家——你那一兩個主力工具，被你寫的模板餵得結構分明、輸出穩定。你專精於少數工具，採用結構化方法，但傾向信任 AI，主要用於個人任務。在你的個人生產力世界裡，AI 是一台調校得很好的機器，而你已經是熟練的操作員。',
    strengths: '身為一位 「FTSP」，你最迷人的特質是「**「穩」**」。你不追新工具，但你把手上的工具用到精；你不嘗試各種花式技巧，但你那幾個固定的 prompt 模板能持續產出高品質的結果。「**這種穩定度在 AI 工具更迭快速的時代，反而是一種反潮流的優雅**」。你的個人生產力強，輸出品質一致，工具掌握度高——這意味著你不會浪費時間在「該不該換工具」「該不該學新技巧」這些焦慮上，你直接把時間花在產出。在朋友眼中，你大概是「不太聲張但東西很穩」的那種使用者。',
    growth: '你的方法論已經很完整，「下一步是**把「穩」的能力擴張範圍**」。第一個方向是「**加強查證與批判**」——你的結構化讓你的輸出穩定，但「穩定的輸出」不等於「正確的輸出」。如果 AI 一開始就給你錯資訊，你的好模板只是把錯誤穩定地呈現出來。建議你在重要任務的模板裡「**加入「自我檢查」段落**」(例如：結尾要 AI 列出來源、確定性等級、可能的錯誤)。第二個方向是「**與他人分享你的模板**」——你的模板是你最寶貴的資產，如果只用在自己身上太可惜。試著挑一兩個模板寫成短指南分享給同學，你會驚訝於別人對它的反應。第三，「**嘗試新工具或新功能**」，避免「工具同溫層」——你太熟悉主力工具了，可能錯過了更適合某些任務的新選擇。最後，試著「把工作流擴展到團隊」，你的方法論在多人協作裡會發揮更大價值。',
  },

  FTSN: {
    name: '流程優化師',
    english: 'The Workflow Optimizer',
    headline: '深用、結構化、整合進工作流程的高效協作者',
    description: '你是工作流程的工程師——你看世界的方式，是把每件事拆解成步驟、流程、模板。你深度使用主力工具、採用結構化方法、整合進團隊工作流程，但對 AI 較信任。對你來說，AI 不是新奇玩具，而是流程裡的一個關鍵零件——你關心的不是「AI 能做什麼」，而是「AI 在你跟同事的協作流程裡能扮演什麼角色」。',
    strengths: '身為一位 「FTSN」，你的核心能力是「**「設計」**」——你不只在用 AI，你在設計 AI 怎麼被用。你的工作流程不是隨機拼湊的，而是經過反覆優化的結果；你的 prompt 模板不是臨時想的，而是會持續迭代的版本控制；你不只自己用得好，你還能設計讓團隊一起用得起來的流程。「這種**把個人效率與團隊協作整合在一起的能力**」，在大學生族群裡相當稀有。你的產出穩定、可預期、可複製——這對任何專案管理者來說，都是夢寐以求的合作對象。',
    growth: '你的成長空間，在於「**補上「批判」與「探索」這兩塊**」。你的工作流再精緻，如果建立在錯誤的 AI 輸出上，等於蓋在沙灘上。第一個方向是「**建立 AI 輸出的查證機制**」——把「驗證」也設計進你的流程，例如重要文件必過事實檢查、引文必查、數據必對照原始來源。你的結構化能力剛好可以把「批判」也結構化，這對你來說不會太難。第二個方向是「**探索新工具補強現有流程**」——你太熟悉現有工具了，可能錯過了更適合某些環節的新選擇。可以從「現有流程裡哪個環節最痛」開始，針對痛點找新工具。第三，「**增加對 AI 倫理的反思**」——當你的流程影響到團隊，你需要思考的不只是「效率」，還有「公平」「透明」「可問責」等議題。',
  },

  FCIP: {
    name: '謹慎初學者',
    english: 'The Prudent Beginner',
    headline: '保守但批判性強的個人使用者',
    description: '你是 AI 圈裡的學者型使用者——不浮誇、不追潮流，但對 AI 的每個輸出都會多想一秒。你專注於少數工具，批判性強，採直覺對話，個人應用為主。你不會被 AI 牽著鼻子走，在學術或專業情境裡，「你是相對「安全」的那種使用者」。在這個 AI 越來越會「說好聽話」的時代，你的謹慎反而是稀缺品。',
    strengths: '身為一位 「FCIP」，你最大的優勢是「**「不容易被誤導」**」。你不會因為 AI 講得頭頭是道就直接相信，不會因為某個工具紅就一窩蜂去用，不會因為朋友推薦就馬上嘗試。「這種**「保持距離」的習慣**」，讓你在學術寫作、報告撰寫、資料查證等情境裡，踩坑的機率比同儕低很多。你的使用節奏穩健，尊重資訊正確性——對於需要嚴謹的學術情境，你的人格特質就是你的最佳配備。在「速度為王」的 AI 時代，「**你選擇了「正確優先」的路徑**」，這條路雖然慢一點，但走得比較遠。',
    growth: '你的限制，主要在於「**「保守」可能讓你錯過 AI 帶來的真正紅利**」。你的批判力很好，但如果使用範圍太窄、方法太直覺，你的批判力就只能用在很有限的場景裡。第一個方向是「**嘗試擴展工具種類**」——不需要追新潮流，但可以挑 1 到 2 個跟你目前主力工具不同類型的工具試試看，你會發現有些任務原本你以為「AI 做不好」，其實是「你還沒找到對的工具」。第二個方向是「**學習結構化的 prompt 方法**」，你的批判力配上結構化思維，會讓 AI 的輸出品質提升很多——前期把 prompt 寫好，後期查證的工作量會大幅下降。第三，試著「**把 AI 整合到一個固定的工作流程中**」(例如每週的學習回顧、報告寫作流程)，讓 AI 從「偶爾用一下的工具」變成「常規流程的一部分」，你的效率會明顯提升。',
  },

  FCIN: {
    name: '守成驗證者',
    english: 'The Verification Guardian',
    headline: '深用、批判、整合，但偏直覺的品質守門員',
    description: '你是團隊裡的品質守門員——別人在歡呼 AI 又解決了一個問題的時候，你會先問一句「等等，這個答案可靠嗎？」。你深度使用、批判性強、整合進團隊，但偏直覺對話。在專案裡你扮演把關角色，你的存在讓整個團隊的 AI 應用品質提高一個檔次。',
    strengths: '身為一位 「FCIN」，你是團隊裡那個「**讓人安心的存在**」。你的深度使用讓你對主力工具的脾氣很熟悉，你的批判性讓你能看出 AI 哪裡在說謊，你的網絡化讓你願意把這份警覺分享給團隊。「**「會用 AI」的人不少，「會質疑 AI」的人不多，「願意把質疑分享給團隊」的人更稀缺**」——而你三者俱備。你對 AI 風險有敏銳意識，在專案裡是大家的最後一道防線；你的可信度高，團隊在重要決策時會想聽聽你的意見。這種角色在 AI 越來越重要的時代，只會越來越搶手。',
    growth: '你的限制，在於「**直覺式的批判難以被系統化、難以被傳承**」。你的批判力很強，但很大程度依賴經驗——別人請教你「你怎麼判斷 AI 是不是在亂講」，你可能很難具體回答。第一個方向是「**學習 prompt engineering 技巧**」，讓你的「直覺批判」轉換為「結構化驗證」。例如，可以在 prompt 裡明確要求 AI 列出來源、標明確定性等級、提供反例——把批判工作部分內建到提問本身。第二個方向是「**把個人查證經驗轉成團隊 SOP**」，你的批判過程如果能變成共用的「驗證檢查清單」，你的影響力會放大十倍——別人不需要靠經驗，跟著清單走就能達到一定的把關水準。第三，「**嘗試新工具拓展能力**」，避免「工具同溫層」——你太熟悉主力工具了，但有些工具可能更適合特定任務，值得探索。',
  },

  FCSP: {
    name: '精確操作者',
    english: 'The Precision Operator',
    headline: '深、批、結三項能力俱備的個人冠軍',
    description: '你是個人 AI 應用的工藝家——對你來說，用 AI 不是「快速完成任務」，而是「優雅地解決問題」。你深度使用、批判性強、結構化方法，但應用範圍偏個人。你的個人方法論非常成熟，差的只是把它擴張的舞台。你像是一位閉門修煉的劍客——招式已經很精，只是還沒下山而已。',
    strengths: '身為一位 「FCSP」，你的方法論成熟度非常高。你深度使用主力工具——什麼設定、什麼快捷鍵、什麼隱藏功能，你都清楚；你批判性強——AI 給的答案你會自動進入查證模式；你結構化——你的 prompt 不是隨便寫的，而是經過設計的。「**這三項能力的組合，讓你的輸出品質非常可控**」。你寫的 prompt 別人很難複製，你做的查證別人沒那個耐心，**你的方法論是真正「練出來的」**。在你個人的世界裡，AI 是一個調校得很好的機器，而你是這台機器最熟練的操作員。',
    growth: '你已經是個人冠軍，「下一步是**離開個人擂台，走向更大的舞台**」。第一個方向是「**把方法分享給同儕或團隊**」——你的能力如果只用在自己身上，就只能造福你一個人；但如果分享出去，影響的範圍會大幅擴張。建議你先挑一兩個你最常用、最有效的方法，寫成短短的分享文或 PPT，你會發現「教別人」這件事還會反過來讓你的方法論更精煉。第二個方向是「**探索其他 AI 工具**」，避免「工具同溫層」——你太熟悉主力工具了，可能錯過了某些更適合特定任務的選擇。第三，「**嘗試多工具串接的工作流**」，例如：用 AI A 生成初稿、用 AI B 檢查事實、用 AI C 優化文字。這種組合會讓你跨入「流程設計者」的層次，而不只是「工具使用者」。',
  },

  FCSN: {
    name: '領域專家',
    english: 'The Domain Specialist',
    headline: '⭐ 專精領域的 AI 高階使用者',
    description: '你是 AI 應用的職人——在你專精的領域裡，你的工作流程已經像老師傅的工坊一樣，每件工具都在它該在的位置，每個流程都被反覆打磨過。你深耕特定工具、批判性強、結構化方法、且融入團隊與專業社群的協作之中。在專精領域裡你是高手中的高手，你的問題從來不是「能不能做到」，而是「該怎麼做得更精緻」。',
    strengths: '身為一位 「FCSN」，你具備了「深度」「批判」「結構」「網絡化」四項能力——這是專業使用者的標準配備。你在特定領域有深厚的專業，輸出品質與穩定性高，「**是團隊或專業圈的支柱角色**」。你的工作流程精緻、可預期、可複製——這意味著別人想複製你的成果很難，因為那不是「用了某個工具」就能達成的，而是「整套方法論」的累積。在專業圈裡，你的意見有份量，你的方法被別人模仿，你的存在讓整個團隊的水準往上提一個檔次。「**這已經是接近「專家」的層次**」。',
    growth: '正因為你太精了，「**你最大的風險反而是「精到深處的盲區」**」——也就是「工具同溫層」。當一個方法論被優化到極致，人就容易停止探索其他可能性。第一個方向是「**定期探索新工具**」，即使你的現有工具已經夠用，也要保留 5% 到 10% 的時間給「不熟悉的選擇」，避免技術滯後。第二個方向是「**與其他領域的使用者交流**」——你在自己的領域是高手，但在其他領域可能會看到完全不同的應用思路，跨領域對話是打破盲區最有效的方法。第三，「**挑戰新的 AI 應用情境**」(例如：多代理人協作、本地端模型、AI 輔助的決策系統)，這些前沿領域會讓你重新體會「初學者」的感覺，而那種感覺正是讓你保持成長的關鍵。',
  },
};

// ==================== AI 時代的跨領域人才地圖(v7 新增)====================
// 五群人才類型,將 16 種測驗類型映射到 AI 時代的職涯競爭力路徑。
// 設計精神:聚焦於「社科背景如何在 AI 時代發揮獨特價值」,
// 不做能力高低排序,而是讓每個類型都看到自己的生態位。
const CAREER_ARCHETYPES = {
  governance: {
    id: 'governance',
    name: 'AI 治理與倫理建構者',
    english: 'The Governance Architect',
    headline: '在 AI 越來越強的時代,制定規則、設計制度、把關倫理的「社會性架構師」',
    coreCapabilities: '批判 + 結構 + 網絡',
    capabilityCodes: ['C', 'S', 'N'],
    types: ['ECIN', 'ECSN', 'FCIN', 'FCSN'],
    role: '全球都在爭辯 AI 該怎麼管——演算法歧視、隱私侵犯、勞動衝擊、學術誠信、假訊息洪流。這些都不是純技術問題,**核心是價值衝突與制度設計**。社會不缺寫程式的人,缺的是能看見技術後果、能跟政策圈與技術圈雙向溝通的「治理翻譯者」。',
    socialScienceValue: '你的批判思維、對權力結構的敏感度、對社會脈絡的理解,**正是工程師最缺乏的**。當 AI 公司急著推出新功能時,你能問出「這對誰有利、誰受影響?」「這會放大既有的不平等嗎?」——這些問題 AI 自己回答不出來,工程師也不一定看得見。',
    careers: [
      { category: '政府部門', items: '數位發展部、NCC、國科會、AI 影響評估辦公室' },
      { category: '智庫與政策研究', items: '中研院、台經院、資策會 MIC' },
      { category: '企業治理', items: 'Chief AI Ethics Officer、AI 風險長、合規長' },
      { category: '跨國組織', items: 'OECD、UNESCO、世界經濟論壇 AI 治理倡議' },
      { category: '學術界', items: 'AI 倫理、科技與社會(STS)、資訊社會學' },
    ],
    howToGrowIn: '批判(C)+ 結構(S)+ 網絡(N)三項缺一不可。批判讓你看見問題、結構讓你提出系統性解方、網絡讓你的聲音傳得出去。',
  },

  integrator: {
    id: 'integrator',
    name: '跨域整合者',
    english: 'The Curator-Integrator',
    headline: '把 AI 的能力翻譯成特定領域的解決方案,讓技術為人文服務的「雙語人才」',
    coreCapabilities: '探索 + 結構 + 網絡',
    capabilityCodes: ['E', 'S', 'N'],
    types: ['ETIN', 'ETSN', 'FTSN'],
    role: '真正改變世界的不是 AI 工具本身,而是「有人想到把 AI 用在某個從沒被想過的領域」。法律 AI 助理、教育 AI 評量、新聞編輯 AI 流程、社工個案管理、田野資料 AI 分析——這些都不是工程師獨力能做的,**需要深入理解該領域的人扮演整合者**。',
    socialScienceValue: '社會科學訓練給你「跨脈絡翻譯」的能力——你聽得懂律師、社工、教師、記者、研究員的真實工作流程,也能設想 AI 如何切入。多數工程師看到的問題是「這個演算法精準度是 87% 還是 92%」,你看到的是「這個工具會不會被基層使用者抗拒」「這會不會無意間排除某些族群」。這種**領域敏感度**讓你能設計出真正可用的應用,而非實驗室裡漂亮但無人使用的 demo。',
    careers: [
      { category: '法律科技(LegalTech)', items: '法律 AI 助理、判決資料庫、合約自動化' },
      { category: '教育科技(EdTech)', items: '個人化學習、AI 評量、教師助理工具' },
      { category: '政府數位轉型', items: '智慧城市、公民參與平台、行政流程優化' },
      { category: '媒體與內容產業', items: 'AI 編輯流程、事實查核工具、內容策展' },
      { category: '文化資產', items: 'AI 藏品管理、博物館互動展示、無形文化資產數位化' },
      { category: '產品與設計', items: 'UX 研究、產品策略、服務設計' },
    ],
    howToGrowIn: 'E(探索)+ S(結構)+ N(網絡)的三角組合。最好的起步是**找一個你深愛的領域並深耕**,不要當什麼都會但什麼都不精的 AI 通才。',
  },

  methodologist: {
    id: 'methodologist',
    name: '方法論工程師',
    english: 'The Methodologist',
    headline: '把 AI 工具精緻地嵌入研究、分析、評估的流程,讓嚴謹方法論在 AI 時代煥發新生的「精雕細琢者」',
    coreCapabilities: '結構 + 批判',
    capabilityCodes: ['S', 'C'],
    types: ['ECSP', 'ETSP', 'FCSP', 'FTSP'],
    role: '社科研究中,許多原本費時費力的工作——逐字稿轉錄、文本內容分析、跨國比較、政策文件編碼、田野筆記主題萃取——AI 可以協助加速十倍。但前提是有人懂方法論、懂 AI 限制、會設計可驗證的工作流程。**這種「方法論 × AI」的能力會成為下一代研究者的分水嶺**。',
    socialScienceValue: '社會科學的核心是方法論——研究設計、效度信度、抽樣偏差、詮釋學、紮根理論。**這些是 AI 自己學不會的人類學問**。當你把這些方法論嵌入 AI 工作流程,你做出來的研究會比「亂用 ChatGPT 的人」扎實十倍,也比「拒絕用 AI 的傳統研究者」效率高十倍。雙翼齊備才能飛。',
    careers: [
      { category: '學術研究', items: '碩博士生、博後、年輕學者(AI 將拉開研究產出差距)' },
      { category: '智庫與政策研究', items: '政策分析、社會影響評估、SROI 報告' },
      { category: '市場調查與 UX 研究', items: '質性深度訪談、文本分析、消費者洞察' },
      { category: '企業策略與顧問業', items: '競業分析、組織診斷' },
      { category: '永續報告與 ESG', items: '揭露分析、TNFD/CDP 評估、利害關係人映射' },
      { category: '新聞調查報導', items: '資料新聞、調查記者、深度報導' },
    ],
    howToGrowIn: '核心是 S(結構)+ C(批判)。光有結構容易產出「結構化但錯誤」的結果,光有批判容易停留在「我發現問題了」而沒有改進方法。如果你還偏 P(個人)端,未來可以再補上 N(網絡),讓你的方法論能傳承給研究團隊。',
  },

  catalyst: {
    id: 'catalyst',
    name: '數位社群引導者',
    english: 'The Community Catalyst',
    headline: '把使用經驗轉化為他人的成長養分,帶動組織與社群一起跟上 AI 時代的「人際樞紐」',
    coreCapabilities: '探索 + 網絡',
    capabilityCodes: ['E', 'N'],
    types: ['ETIP', 'ETIN', 'FTIN'],
    role: 'AI 工具再強,多數人不會主動學。**真正讓組織轉型的,往往是某個願意嘗試、樂於分享的人**——他們不一定是技術最強的,但他們是團隊裡的「催化劑」。這種角色在 AI 素養越來越重要的時代,價值正快速上升。',
    socialScienceValue: '社科訓練讓你理解人——理解學習動機、抗拒心理、群體動力、組織文化。**這些「軟知識」決定了 AI 推廣的成敗**。多數工程師教 AI 工具時只會講功能;你會想到「對 50 歲的同事我該怎麼講」「對一個害怕被取代的基層員工我該怎麼陪伴」「怎麼設計一個讓主管不感到威脅的轉型路徑」。這是 AI 時代最需要、卻最少人在做的工作。',
    careers: [
      { category: '教育與培訓', items: '中小學教師、大學助教、企業內訓講師' },
      { category: '線上內容創作', items: 'Hahow、PressPlay、YouTube 的 AI 教學、社群自媒體' },
      { category: '企業數位轉型顧問', items: '協助組織導入 AI、處理員工焦慮' },
      { category: 'NGO 與社區工作', items: '銀髮族 AI 素養、弱勢族群數位賦能' },
      { category: '出版業', items: '教材設計、AI 應用書籍、線上課程設計' },
      { category: 'HR 與組織發展', items: 'AI 轉型期的人才培訓' },
    ],
    howToGrowIn: '核心是 E(探索)+ N(網絡)。如果你還偏 I(直覺)端,可以再補上 S(結構),讓你的分享從「我覺得這個工具很酷」升級成「這個工具適用於這些情境,這樣用會最有效」——從感性推薦升級為方法論教學。',
  },

  guardian: {
    id: 'guardian',
    name: '批判性守門員',
    english: 'The Critical Guardian',
    headline: '在 AI 假訊息與幻覺氾濫的時代,守護資訊真實性與社會信任的「最後一道防線」',
    coreCapabilities: '批判為核心',
    capabilityCodes: ['C'],
    types: ['ECIP', 'FCIP'],
    role: 'AI 越強,假訊息越精緻。Deepfake 影音、AI 寫的假學術論文、AI 編造的歷史事件、AI 偽造的引用文獻——這些已經不是科幻情節,而是**正在發生的日常**。需要有人專職把關。',
    socialScienceValue: '社會科學訓練的核心之一就是「批判性思考」——對來源的懷疑、對方法的審視、對權力的警覺、對偏見的覺察。**這正是 AI 時代最需要的能力**。當 AI 給你一個「看起來合理」的答案時,社科背景的批判反射會讓你問:「這個來源是什麼?這個觀點代表了誰?這個論述是否預設了某種價值立場?」——這些是 AI 自己回答不了的問題。',
    careers: [
      { category: '事實查核', items: 'Taiwan FactCheck Center、MyGoPen、Cofacts' },
      { category: '新聞編輯與調查報導', items: '報社編輯、深度報導記者、資料新聞' },
      { category: '法律合規', items: '法律事務所合規部、企業法遵' },
      { category: '學術同儕審查', items: '期刊編輯、研究倫理審查委員(IRB)' },
      { category: 'AI 紅隊測試(Red Team)', items: '找出 AI 系統的漏洞與偏差' },
      { category: '內容審核與信任安全', items: '平台的內容政策、安全研究' },
    ],
    howToGrowIn: '核心是 C(批判),但光有批判力不夠,還需要「**值得守護的東西**」——對某個專業領域有深度才有意義。建議搭配你感興趣的議題(人權、環境、健康、選舉等),讓批判力有用武之地。如果想擴大影響力,可以再補上 S(結構)讓批判變成系統化的工作流程,或補上 N(網絡)讓你的把關能力傳承到團隊。',
  },
};

// ─────────────────────────────────────────────
// 類型 → 人才群映射表
// 多屬制:某些類型(如 ETIN)同時屬於多群,呈現時兩條路徑都會列出。
// ─────────────────────────────────────────────
const TYPE_TO_ARCHETYPES = {
  // 治理建構者
  ECIN: ['governance'],
  ECSN: ['governance'],
  FCIN: ['governance'],
  FCSN: ['governance'],
  // 跨域整合者
  ETSN: ['integrator'],
  FTSN: ['integrator'],
  // 多屬:跨域整合者 + 數位社群引導者
  ETIN: ['integrator', 'catalyst'],
  // 方法論工程師
  ECSP: ['methodologist'],
  ETSP: ['methodologist'],
  FCSP: ['methodologist'],
  FTSP: ['methodologist'],
  // 數位社群引導者
  ETIP: ['catalyst'],
  FTIN: ['catalyst'],
  // 批判性守門員
  ECIP: ['guardian'],
  FCIP: ['guardian'],
  // 特殊處理:起點型
  FTIP: ['starter'],
};

// FTIP 特殊類型(起點型探索者)
const STARTER_ARCHETYPE = {
  id: 'starter',
  name: '起點型探索者',
  english: 'The Open Starter',
  headline: '站在進步空間最大的位置,所有路徑都向你開放',
  isStarter: true,
  description: '你目前的測驗結果是 FTIP——四個維度都還在發展中。這不是壞事,反而是個珍貴的時刻:因為**沒有先入為主的習慣**,你可以最自由地選擇想往哪走。',
  advice: '不要急著被分類,先做一件事——**選一條你最有興趣的路徑試走 3-6 個月**。',
  pathHints: [
    { path: 'AI 治理建構者', hint: '對「制度與規則」感興趣 → 先強化批判與結構' },
    { path: '跨域整合者', hint: '對「特定領域應用」感興趣 → 先深耕一個領域' },
    { path: '方法論工程師', hint: '享受「研究、分析、寫作」 → 先學結構化方法' },
    { path: '數位社群引導者', hint: '享受「教別人、帶領團隊」 → 先強化分享習慣' },
    { path: '批判性守門員', hint: '重視「真實、嚴謹、把關」 → 先培養查證習慣' },
  ],
  closing: '試走過程中,你會自然從 FTIP 移動到某個更具體的類型。半年後重做測驗,會看到位置改變——這就是成長的具體證據。',
};

// ==================== 計算邏輯 ====================
function calculateType(answers) {
  const dimSums = { EF: 0, TC: 0, IS: 0, PN: 0 };

  QUESTIONS.forEach((q, i) => {
    const ans = answers[i];
    if (!ans) return;
    const score = q.reverse ? (3 - ans) : (ans - 3);
    dimSums[q.dim] += score;
  });

  const scores = {
    EF: Math.round(((dimSums.EF + 16) / 32) * 100),
    TC: Math.round(((dimSums.TC + 16) / 32) * 100),
    IS: Math.round(((dimSums.IS + 16) / 32) * 100),
    PN: Math.round(((dimSums.PN + 16) / 32) * 100),
  };

  const displayScores = {
    EF: 100 - scores.EF,
    TC: scores.TC,
    IS: scores.IS,
    PN: scores.PN,
  };

  const finalType =
    (scores.EF >= 50 ? 'E' : 'F') +
    (scores.TC >= 50 ? 'C' : 'T') +
    (scores.IS >= 50 ? 'S' : 'I') +
    (scores.PN >= 50 ? 'N' : 'P');

  // ===== v6 新增:填答一致性檢核 =====
  // 對每個維度,計算正向題與反向題的平均答案。
  // 若兩者方向一致(都偏高或都偏低),代表使用者可能存在同意傾向偏誤(acquiescence bias)。
  // 檢查標準:正向題均值 >= 4 且反向題均值 >= 4(都同意),或都 <= 2(都不同意)。
  const consistency = {};
  ['EF', 'TC', 'IS', 'PN'].forEach((code) => {
    const forward = [];
    const reverse = [];
    QUESTIONS.forEach((q, i) => {
      if (q.dim !== code || !answers[i]) return;
      if (q.reverse) reverse.push(answers[i]);
      else forward.push(answers[i]);
    });
    const fAvg = forward.length ? forward.reduce((a, b) => a + b, 0) / forward.length : 3;
    const rAvg = reverse.length ? reverse.reduce((a, b) => a + b, 0) / reverse.length : 3;
    // 兩端方向一致 = 偏誤訊號
    const bothHigh = fAvg >= 4 && rAvg >= 4;
    const bothLow = fAvg <= 2 && rAvg <= 2;
    consistency[code] = { fAvg: +fAvg.toFixed(2), rAvg: +rAvg.toFixed(2), flagged: bothHigh || bothLow };
  });
  const flaggedDims = Object.values(consistency).filter((c) => c.flagged).length;
  // 兩個以上維度出現偏誤訊號,提示使用者檢視填答態度
  const consistencyFlag = flaggedDims >= 2;

  // ===== v6 新增:灰帶標記 =====
  // 落在 45-55 之間的維度視為「接近平衡」,結果頁會以特殊樣式呈現,
  // 並在類型字母旁加註「~」提示穩定度較低。
  const grayBand = {};
  ['EF', 'TC', 'IS', 'PN'].forEach((code) => {
    grayBand[code] = scores[code] >= 45 && scores[code] <= 55;
  });

  return {
    type: finalType,
    scores: displayScores,
    rawScores: scores,
    consistency,
    consistencyFlag,
    grayBand,
  };
}

function genId() {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}

// ==================== 元件：歡迎頁 ====================
function Welcome({ onStart, onViewStats, onShowMethodology, onShowCareerMap, lastResult }) {
  const [classCode, setClassCode] = useState('');
  const [nickname, setNickname] = useState('');
  const [statsCode, setStatsCode] = useState('');
  const [showStatsInput, setShowStatsInput] = useState(false);

  return (
    <div className="max-w-3xl mx-auto px-6 py-12">
      <div className="mb-12">
        <div className="flex items-center gap-2 mb-6 text-sm tracking-widest" style={{ color: COLORS.warmGray }}>
          <div className="h-px w-12" style={{ background: COLORS.accent }} />
          <span style={{ fontFamily: 'Fraunces, serif' }}>AI USER TYPOLOGY · v7.0</span>
        </div>
        <h1
          className="text-6xl md:text-7xl mb-4 leading-none"
          style={{ fontFamily: 'Fraunces, "Noto Serif TC", serif', color: COLORS.ink, fontWeight: 400, fontStyle: 'italic' }}
        >
          你是哪一種
          <br />
          <span style={{ color: COLORS.accent }}>AI 玩家？</span>
        </h1>
        <div className="mt-6 space-y-4 text-lg leading-relaxed" style={{ color: COLORS.inkSoft, fontFamily: '"Noto Sans TC", sans-serif' }}>
          <p>
            ChatGPT 出來都已經三年多了——你還在用它幫你寫作業嗎？ 🤔
          </p>
          <p>
            每個人跟 AI 的相處方式都不一樣：有人愛追新工具，有人專情於一兩個老朋友；有人對 AI 的話照單全收，有人連標點符號都要查證一次；有人把 AI 當成個人助理，也有人已經把它編織進整個工作流程。
          </p>
          <p>
            這個小測驗會花你 6-8 分鐘，從幾個面向剖析你跟 AI 的相處模式，給你一個四個字母組成的「<span style={{ color: COLORS.accent, fontWeight: 600 }}>AI 使用者類型</span>」——一共 16 種，你會是哪一種？
          </p>
          <p>
            測驗結果不只告訴你「你是誰」，還會告訴你<span style={{ color: COLORS.ink, fontWeight: 600 }}>下一步可以往哪裡進步</span>。畢竟在 AI 工具滿天飛的時代，有方向地學習，比亂槍打鳥地嘗試，重要太多了。
          </p>
          <p className="text-base" style={{ color: COLORS.warmGray }}>
            ✦ 沒有對錯，沒有優劣，只有適不適合你的使用方式
          </p>
        </div>
      </div>

      {/* 四維度方框已移除，首頁專注於激發填答動機 */}

      {lastResult && (
        <div className="mb-6 p-4 border-l-4" style={{ borderColor: COLORS.gold, background: COLORS.paper }}>
          <p className="text-sm" style={{ color: COLORS.inkSoft, fontFamily: '"Noto Sans TC", sans-serif' }}>
            上次測驗結果：
            <span className="ml-2 font-bold tracking-widest" style={{ color: COLORS.ink, fontFamily: 'Fraunces, serif' }}>
              {lastResult.type}
            </span>
            <span className="ml-2">{TYPES[lastResult.type]?.name}</span>
          </p>
        </div>
      )}

      <div className="p-8 border-2" style={{ background: 'white', borderColor: COLORS.ink }}>
        <h2 className="text-2xl mb-6" style={{ fontFamily: '"Noto Serif TC", serif', color: COLORS.ink }}>
          準備好認識自己了嗎？
        </h2>

        <div className="space-y-4 mb-6">
          <div>
            <label className="block text-sm mb-2" style={{ color: COLORS.inkSoft, fontFamily: '"Noto Sans TC", sans-serif' }}>
              暱稱 <span style={{ color: COLORS.warmGray }}>(選填，僅供你辨識自己的結果)</span>
            </label>
            <input
              type="text"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              placeholder="可以隨意取一個"
              className="w-full px-4 py-3 border outline-none"
              style={{
                borderColor: COLORS.border,
                background: COLORS.paper,
                color: COLORS.ink,
                fontFamily: '"Noto Sans TC", sans-serif',
              }}
            />
          </div>
          <div>
            <label className="block text-sm mb-2" style={{ color: COLORS.inkSoft, fontFamily: '"Noto Sans TC", sans-serif' }}>
              班級代碼 <span style={{ color: COLORS.warmGray }}>(由老師提供，用於統計)</span>
            </label>
            <input
              type="text"
              value={classCode}
              onChange={(e) => setClassCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8))}
              placeholder="例如 GIS2026"
              className="w-full px-4 py-3 border outline-none tracking-widest"
              style={{
                borderColor: COLORS.border,
                background: COLORS.paper,
                color: COLORS.ink,
                fontFamily: 'Fraunces, monospace',
              }}
            />
          </div>
        </div>

        <button
          onClick={() => onStart(classCode, nickname)}
          className="w-full py-4 flex items-center justify-center gap-2 transition-all hover:opacity-90"
          style={{
            background: COLORS.ink,
            color: COLORS.cream,
            fontFamily: '"Noto Sans TC", sans-serif',
          }}
        >
          開始測驗
          <ChevronRight size={18} />
        </button>

        <div className="mt-4 pt-4 border-t" style={{ borderColor: COLORS.border }}>
          {!showStatsInput ? (
            <button
              onClick={() => setShowStatsInput(true)}
              className="w-full py-3 text-sm flex items-center justify-center gap-2 transition-colors"
              style={{ color: COLORS.accent, fontFamily: '"Noto Sans TC", sans-serif' }}
            >
              <BarChart3 size={16} />
              老師：查看班級統計
            </button>
          ) : (
            <div className="flex gap-2">
              <input
                type="text"
                value={statsCode}
                onChange={(e) => setStatsCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8))}
                placeholder="輸入班級代碼"
                className="flex-1 px-4 py-2 border outline-none tracking-widest text-sm"
                style={{
                  borderColor: COLORS.border,
                  background: COLORS.paper,
                  color: COLORS.ink,
                  fontFamily: 'Fraunces, monospace',
                }}
              />
              <button
                onClick={() => statsCode && onViewStats(statsCode)}
                className="px-4 py-2 text-sm"
                style={{
                  background: COLORS.accent,
                  color: 'white',
                  fontFamily: '"Noto Sans TC", sans-serif',
                }}
              >
                查看
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="text-center mt-8 space-y-2">
        <div className="text-xs" style={{ color: COLORS.warmGray, fontFamily: 'Fraunces, serif' }}>
          共 {QUESTIONS.length} 題 · 約 6-8 分鐘 · 沒有對錯之分
        </div>
        <div className="flex items-center justify-center gap-4 text-xs" style={{ color: COLORS.warmGray }}>
          <button
            onClick={onShowMethodology}
            className="underline transition-colors hover:opacity-70"
            style={{ fontFamily: '"Noto Sans TC", sans-serif' }}
          >
            查看方法論說明
          </button>
          <span>·</span>
          <button
            onClick={onShowCareerMap}
            className="underline transition-colors hover:opacity-70 inline-flex items-center gap-1"
            style={{ fontFamily: '"Noto Sans TC", sans-serif' }}
          >
            <MapPin size={11} />
            AI 時代的跨領域人才地圖
          </button>
        </div>
      </div>
    </div>
  );
}

// ==================== 元件：測驗(Likert 5 點，置中對齊)====================
function Quiz({ onComplete, onBack }) {
  const [current, setCurrent] = useState(0);
  const [answers, setAnswers] = useState({});
  const [transitioning, setTransitioning] = useState(false);

  const q = QUESTIONS[current];
  const answeredCount = Object.keys(answers).length;
  const progress = (answeredCount / QUESTIONS.length) * 100;
  const dimMeta = DIMENSIONS.find((d) => d.code === q.dim);

  const select = (value) => {
    if (transitioning) return;
    const newAnswers = { ...answers, [current]: value };
    setAnswers(newAnswers);
    setTransitioning(true);
    setTimeout(() => {
      if (current < QUESTIONS.length - 1) {
        setCurrent(current + 1);
        setTransitioning(false);
      } else {
        onComplete(newAnswers);
      }
    }, 300);
  };

  const goPrev = () => {
    if (current > 0) {
      setCurrent(current - 1);
    } else {
      onBack();
    }
  };

  // 統一兩行顯示，讓「普通」也佔兩行高度，視覺上完全對齊
  const likertOptions = [
    { value: 1, line1: '完全', line2: '不符合' },
    { value: 2, line1: '不太', line2: '符合' },
    { value: 3, line1: '普', line2: '通' },
    { value: 4, line1: '有點', line2: '符合' },
    { value: 5, line1: '完全', line2: '符合' },
  ];

  return (
    <div className="max-w-2xl mx-auto px-6 py-10">
      {/* Progress */}
      <div className="mb-12">
        <div className="flex justify-between items-center mb-3 text-xs" style={{ color: COLORS.warmGray, fontFamily: 'Fraunces, serif' }}>
          <span>{String(current + 1).padStart(2, '0')} / {QUESTIONS.length}</span>
          <span style={{ color: COLORS.accent }}>{dimMeta.name}</span>
        </div>
        <div className="h-px w-full" style={{ background: COLORS.border }}>
          <div
            className="h-full transition-all duration-500"
            style={{ width: `${progress}%`, background: COLORS.ink }}
          />
        </div>
      </div>

      {/* Question */}
      <div
        className="transition-opacity duration-300"
        style={{ opacity: transitioning ? 0.3 : 1 }}
      >
        <div className="text-xs tracking-widest mb-3 text-center" style={{ color: COLORS.warmGray, fontFamily: 'Fraunces, serif' }}>
          請評估以下敘述符合你的程度
        </div>
        <h2
          className="text-2xl md:text-3xl mb-12 leading-snug min-h-[5rem] text-center"
          style={{ color: COLORS.ink, fontFamily: '"Noto Serif TC", serif' }}
        >
          {q.text}
        </h2>

        {/* Likert 5-point scale - 置中對齊，所有按鈕高度與字數對齊一致 */}
        <div className="flex justify-center">
          <div className="grid grid-cols-5 gap-2 md:gap-3 w-full max-w-2xl">
            {likertOptions.map((opt) => {
              const selected = answers[current] === opt.value;
              return (
                <button
                  key={opt.value}
                  onClick={() => select(opt.value)}
                  disabled={transitioning}
                  className="border-2 transition-all hover:scale-[1.03] flex flex-col items-center justify-center"
                  style={{
                    borderColor: selected ? COLORS.ink : COLORS.border,
                    background: selected ? COLORS.ink : 'white',
                    color: selected ? COLORS.cream : COLORS.ink,
                    height: '110px',
                    padding: '12px 4px',
                  }}
                >
                  {/* 數字置中 */}
                  <span
                    className="text-xl mb-2"
                    style={{
                      fontFamily: 'Fraunces, serif',
                      color: selected ? COLORS.gold : COLORS.warmGray,
                      lineHeight: 1,
                    }}
                  >
                    {opt.value}
                  </span>
                  {/* 兩行文字統一行高，讓所有選項視覺對齊 */}
                  <div
                    className="text-xs text-center"
                    style={{
                      fontFamily: '"Noto Sans TC", sans-serif',
                      lineHeight: '1.4',
                    }}
                  >
                    <div>{opt.line1}</div>
                    <div>{opt.line2}</div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Scale anchors */}
        <div className="flex justify-between mt-4 text-xs px-1" style={{ color: COLORS.warmGray, fontFamily: '"Noto Sans TC", sans-serif' }}>
          <span>← 不同意</span>
          <span>同意 →</span>
        </div>
      </div>

      <div className="mt-10 flex justify-between items-center">
        <button
          onClick={goPrev}
          className="flex items-center gap-2 text-sm transition-colors"
          style={{ color: COLORS.inkSoft, fontFamily: '"Noto Sans TC", sans-serif' }}
        >
          <ChevronLeft size={16} />
          {current === 0 ? '回到首頁' : '上一題'}
        </button>
        <span className="text-xs" style={{ color: COLORS.warmGray, fontFamily: 'Fraunces, serif' }}>
          選擇後自動進入下一題
        </span>
      </div>
    </div>
  );
}

// ==================== 元件：維度詳細解釋 ====================
function DimensionExpander({ dim, score, onShowMethodology }) {
  const [open, setOpen] = useState(false);
  const Icon = dim.icon;

  let interpKey = 'mid';
  if (score >= 65) interpKey = 'high';
  else if (score <= 35) interpKey = 'low';

  // 計算偏離中點的程度,用於描述偏向強度
  const distance = Math.abs(score - 50);
  let strengthLabel;
  if (distance < 5) strengthLabel = '幾乎位於中立點';
  else if (distance <= 5) strengthLabel = '輕微偏向';
  else if (distance < 20) strengthLabel = '有些微偏向';
  else if (distance < 35) strengthLabel = '明顯偏向';
  else strengthLabel = '強烈偏向';
  const directionLabel = score >= 50 ? dim.poles[1] : dim.poles[0];
  // v6:45-55 灰帶判定
  const isGrayBand = score >= 45 && score <= 55;

  return (
    <div className="border" style={{ borderColor: COLORS.border, background: 'white' }}>
      <button
        onClick={() => setOpen(!open)}
        className="w-full p-4 flex items-center justify-between transition-colors hover:bg-opacity-50"
        style={{ background: open ? COLORS.paper : 'white' }}
      >
        <div className="flex items-center gap-3 text-left">
          <Icon size={18} style={{ color: COLORS.accent }} />
          <div>
            <div className="flex items-baseline gap-2">
              <span className="text-xs tracking-widest" style={{ color: COLORS.warmGray, fontFamily: 'Fraunces, serif' }}>
                {dim.code}
              </span>
              <span className="text-sm font-medium" style={{ color: COLORS.ink, fontFamily: '"Noto Sans TC", sans-serif' }}>
                {dim.name}
              </span>
              {/* v6:灰帶徽章 */}
              {isGrayBand && (
                <span
                  className="text-[10px] px-1.5 py-0.5"
                  style={{
                    color: COLORS.warmGray,
                    border: `1px dashed ${COLORS.warmGray}`,
                    fontFamily: '"Noto Sans TC", sans-serif',
                    letterSpacing: '0.05em',
                  }}
                >
                  接近平衡
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 mt-1.5 text-xs" style={{ fontFamily: 'Fraunces, serif' }}>
              <span style={{ color: score < 50 && !isGrayBand ? COLORS.ink : COLORS.warmGray, fontWeight: score < 50 && !isGrayBand ? 600 : 400 }}>
                {dim.poles[0]}
              </span>
              <div className="w-32 md:w-40 h-1.5 relative" style={{ background: COLORS.border }}>
                {/* v6:45-55 灰帶區塊 */}
                <div
                  className="absolute top-0 h-full"
                  style={{
                    background: COLORS.warmGray,
                    opacity: 0.25,
                    left: '45%',
                    width: '10%',
                  }}
                />
                <div
                  className="absolute top-0 h-full"
                  style={{
                    background: isGrayBand ? COLORS.warmGray : COLORS.accent,
                    left: score >= 50 ? '50%' : `${score}%`,
                    right: score >= 50 ? `${100 - score}%` : '50%',
                  }}
                />
                <div
                  className="absolute top-1/2 w-px h-3"
                  style={{ background: COLORS.ink, left: '50%', transform: 'translate(-50%, -50%)' }}
                />
              </div>
              <span style={{ color: score >= 50 && !isGrayBand ? COLORS.ink : COLORS.warmGray, fontWeight: score >= 50 && !isGrayBand ? 600 : 400 }}>
                {dim.poles[1]}
              </span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs" style={{ color: COLORS.warmGray, fontFamily: 'Fraunces, serif' }}>
            {score}/100
          </span>
          {open ? <ChevronUp size={16} style={{ color: COLORS.warmGray }} /> : <ChevronDown size={16} style={{ color: COLORS.warmGray }} />}
        </div>
      </button>

      {open && (
        <div className="px-4 pb-4 pt-2 border-t space-y-4" style={{ borderColor: COLORS.border, background: COLORS.paper }}>
          {/* 你的得分意涵 */}
          <div>
            <div className="text-xs mb-1.5 font-medium" style={{ color: COLORS.accent, fontFamily: '"Noto Sans TC", sans-serif' }}>
              你的得分意涵
            </div>
            <p className="text-sm leading-relaxed" style={{ color: COLORS.ink, fontFamily: '"Noto Sans TC", sans-serif' }}>
              {dim.interpretation[interpKey]}
            </p>
            {/* v6:接近平衡的提醒 */}
            {isGrayBand && (
              <p
                className="mt-2 text-xs leading-relaxed p-2"
                style={{
                  background: 'white',
                  borderLeft: `2px solid ${COLORS.warmGray}`,
                  color: COLORS.inkSoft,
                  fontFamily: '"Noto Sans TC", sans-serif',
                }}
              >
                <strong style={{ color: COLORS.ink }}>注意:</strong>你在這個維度上接近平衡點(45-55),類型字母只是勉強落在某一端。建議「另一端」的說明也讀一讀,可能更貼近你的真實狀態。
              </p>
            )}
          </div>

          {/* 這個刻度怎麼看 */}
          <div>
            <div className="text-xs mb-1.5 font-medium" style={{ color: COLORS.warmGray, fontFamily: '"Noto Sans TC", sans-serif' }}>
              這個刻度怎麼看
            </div>
            <p className="text-sm leading-relaxed mb-2" style={{ color: COLORS.inkSoft, fontFamily: '"Noto Sans TC", sans-serif' }}>
              你目前的分數是 <strong style={{ color: COLORS.ink }}>{score} / 100</strong>，{strengthLabel}「{directionLabel}」這一端。
            </p>
            <p className="text-sm leading-relaxed" style={{ color: COLORS.inkSoft, fontFamily: '"Noto Sans TC", sans-serif' }}>
              刻度上的<strong style={{ color: COLORS.ink }}>黑色細線</strong>是 50 分中立點，<strong style={{ color: COLORS.warmGray }}>灰色區塊</strong>是 45-55 的「平衡帶」(分數落這邊代表沒有強烈偏好)，<span style={{ color: COLORS.accent, fontWeight: 600 }}>紅色橫條</span>則是從中立點延伸到你的得分位置——條子越長，代表你越偏向那一端。記住:分數高低沒有好壞之分，只是反映你跟 AI 相處的不同風格。
            </p>
          </div>

          {/* 這個維度在問什麼 */}
          <div>
            <div className="text-xs mb-1.5 font-medium" style={{ color: COLORS.warmGray, fontFamily: '"Noto Sans TC", sans-serif' }}>
              這個維度在問什麼
            </div>
            <p className="text-sm leading-relaxed" style={{ color: COLORS.inkSoft, fontFamily: '"Noto Sans TC", sans-serif' }}>
              {dim.concept}
            </p>
          </div>

          {/* 透過哪些行為觀察 */}
          <div>
            <div className="text-xs mb-1.5 font-medium" style={{ color: COLORS.warmGray, fontFamily: '"Noto Sans TC", sans-serif' }}>
              透過哪些行為觀察
            </div>
            <p className="text-sm leading-relaxed" style={{ color: COLORS.inkSoft, fontFamily: '"Noto Sans TC", sans-serif' }}>
              {dim.operational}
            </p>
          </div>

          {/* 引導至方法論文件 */}
          <div className="pt-2 border-t" style={{ borderColor: COLORS.border }}>
            <button
              onClick={onShowMethodology}
              className="text-xs underline transition-opacity hover:opacity-70 inline-flex items-center gap-1"
              style={{ color: COLORS.warmGray, fontFamily: '"Noto Sans TC", sans-serif' }}
            >
              <BookOpen size={12} />
              想知道這個維度背後的學術依據？查看方法論說明
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ==================== 元件：方法論文件 ====================
function MethodologyModal({ onClose }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center p-4 overflow-y-auto"
      style={{ background: 'rgba(26, 35, 50, 0.7)' }}
      onClick={onClose}
    >
      <div
        className="max-w-3xl w-full my-8 relative"
        style={{ background: COLORS.cream }}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 transition-colors hover:opacity-70"
          style={{ color: COLORS.ink }}
        >
          <X size={20} />
        </button>

        <div className="p-8 md:p-12">
          {/* Header */}
          <div className="mb-8 pb-6 border-b" style={{ borderColor: COLORS.border }}>
            <div className="text-xs tracking-widest mb-2" style={{ color: COLORS.warmGray, fontFamily: 'Fraunces, serif' }}>
              附錄 · 這份測驗是怎麼設計出來的？
            </div>
            <h1 className="text-3xl md:text-4xl mb-2" style={{ color: COLORS.ink, fontFamily: '"Noto Serif TC", serif' }}>
              方法論說明
            </h1>
            <p className="text-sm leading-relaxed" style={{ color: COLORS.inkSoft, fontFamily: '"Noto Sans TC", sans-serif' }}>
              如果你想知道這份測驗背後的設計邏輯、四個維度從哪裡來、計分怎麼算、又有哪些限制——這份文件就是寫給你看的。我會盡量用白話說明，但也會把學術依據附上，讓你知道這不是憑空想出來的。
            </p>
          </div>

          {/* 一、為什麼是這四個維度？ */}
          <section className="mb-10">
            <h2 className="text-xl mb-3" style={{ color: COLORS.ink, fontFamily: '"Noto Serif TC", serif' }}>
              一、為什麼是這四個維度？
            </h2>
            <div className="space-y-4 text-sm leading-relaxed" style={{ color: COLORS.inkSoft, fontFamily: '"Noto Sans TC", sans-serif' }}>
              <p>
                想像一個情境：你有兩個朋友，A 同學每週都會試新的 AI 工具，但拿到答案就直接用；B 同學只用一個 ChatGPT，但每個答案都會去查證。他們都在「使用 AI」，但使用方式天差地遠。如果只用「用了多少」來衡量他們，你會錯過所有有意思的差異。
              </p>
              <p>
                這份測驗的設計起點，就是想<span style={{ color: COLORS.ink, fontWeight: 600 }}>抓住這些「使用方式」的差異</span>。經過爬梳既有研究，發現有四個面向最能區分不同的 AI 使用者，而且這四個面向都對應到一些經得起時間考驗的學術理論：
              </p>
              <ol className="space-y-2 ml-2">
                <li>
                  <span style={{ color: COLORS.ink, fontWeight: 600 }}>1. 你會嘗試多少種工具？</span>(探索廣度)
                  <br />
                  這個問題其實很古老，Rogers (2003) 在研究農夫怎麼採用新種子、醫生怎麼採用新藥的時候，就發現人對「新事物」的反應大致可以分成五種：有人是先驅者(看到就試)，有人是早期採用者，有人是大多數，有人是落後者。AI 工具的採用其實也是這個邏輯。
                </li>
                <li>
                  <span style={{ color: COLORS.ink, fontWeight: 600 }}>2. 你信任 AI 的話嗎？</span>(判斷傾向)
                  <br />
                  Ng 等人 (2021) 整理了「AI 素養」的四個層次，其中最關鍵的一層叫「評估與創造 AI」(Evaluate and Create AI)——也就是「你能不能判斷 AI 的輸出對不對」。在 AI 會「一本正經胡說八道」(專業術語叫 hallucination，幻覺)的時代，這個能力比過去更重要。
                </li>
                <li>
                  <span style={{ color: COLORS.ink, fontWeight: 600 }}>3. 你會「設計」對話嗎？</span>(操作方法)
                  <br />
                  你跟 AI 講話的方式，專業上叫做 prompt(提示語)。Liu 等人 (2023) 的研究整理了上百種寫 prompt 的技巧。而 Flavell (1979) 早在四十多年前就提出「元認知」(metacognition)概念——也就是「對自己思考方式的反思」。會反思自己怎麼跟 AI 對話的人，長期下來進步速度會比直覺對話的人快很多。
                </li>
                <li>
                  <span style={{ color: COLORS.ink, fontWeight: 600 }}>4. AI 在你跟其他人之間扮演什麼角色？</span>(應用情境)
                  <br />
                  Hutchins (1995) 提出「分散式認知」概念,簡單說就是:聰明不只在你的腦袋裡,也分散在你使用的工具、合作的夥伴之中。Wenger (1998) 進一步提出「實踐社群」的觀點——知識會在共同實踐者的互動裡累積、深化。一個習慣分享、討論、跟別人共學的 AI 使用者,會比孤軍奮戰的人成長得快很多。所以這個維度問的不是「你用了多少」,而是「你是孤獨地用 AI,還是在一個會討論、會交流的網絡之中用 AI」。
                </li>
              </ol>
              <div className="mt-3 p-4 text-sm leading-relaxed" style={{ background: COLORS.paper, color: COLORS.inkSoft }}>
                <span style={{ color: COLORS.accent, fontWeight: 600 }}>誠實聲明：</span>用「四個字母組成類型」這種呈現方式，是為了讓測驗結果好記、好分享。但這種二分法的呈現，會把原本是連續的分數壓縮成類別，可能讓兩個分數很接近的人被分到不同類型——這是這種設計天生的限制。所以結果頁也提供連續分數(0-100)，建議搭配一起看。
              </div>
            </div>
          </section>

          {/* 二、每個維度具體在測什麼 */}
          <section className="mb-10">
            <h2 className="text-xl mb-3" style={{ color: COLORS.ink, fontFamily: '"Noto Serif TC", serif' }}>
              二、每個維度具體在測什麼？
            </h2>
            <p className="text-sm leading-relaxed mb-5" style={{ color: COLORS.inkSoft, fontFamily: '"Noto Sans TC", sans-serif' }}>
              四個維度聽起來很抽象，但每個都對應到一些可以觀察的具體行為。以下是每個維度「在問你什麼」的細節：
            </p>

            {DIMENSIONS.map((d) => {
              const Icon = d.icon;
              return (
                <div key={d.code} className="mb-6 pb-6 border-b last:border-b-0" style={{ borderColor: COLORS.border }}>
                  <div className="flex items-center gap-2 mb-3">
                    <Icon size={18} style={{ color: COLORS.accent }} />
                    <span className="text-xs tracking-widest" style={{ color: COLORS.warmGray, fontFamily: 'Fraunces, serif' }}>{d.code}</span>
                    <h3 className="text-lg" style={{ color: COLORS.ink, fontFamily: '"Noto Serif TC", serif' }}>
                      {d.name}({d.poles[0]} ↔ {d.poles[1]})
                    </h3>
                  </div>
                  <div className="space-y-2 text-sm leading-relaxed" style={{ fontFamily: '"Noto Sans TC", sans-serif' }}>
                    <p style={{ color: COLORS.inkSoft }}>
                      <span style={{ color: COLORS.ink, fontWeight: 600 }}>這個維度在問什麼：</span>{d.concept}
                    </p>
                    <p style={{ color: COLORS.inkSoft }}>
                      <span style={{ color: COLORS.ink, fontWeight: 600 }}>透過哪些行為觀察：</span>{d.operational}
                    </p>
                    <p style={{ color: COLORS.inkSoft }}>
                      <span style={{ color: COLORS.ink, fontWeight: 600 }}>學術依據：</span>{d.theory}
                    </p>
                  </div>
                </div>
              );
            })}
          </section>

          {/* 三、計分怎麼算？ */}
          <section className="mb-10">
            <h2 className="text-xl mb-3" style={{ color: COLORS.ink, fontFamily: '"Noto Serif TC", serif' }}>
              三、計分怎麼算？
            </h2>
            <div className="space-y-3 text-sm leading-relaxed" style={{ color: COLORS.inkSoft, fontFamily: '"Noto Sans TC", sans-serif' }}>
              <p>
                每個維度有 8 題，加起來總共 32 題。題目用的是 Likert 5 點量表——這是學術界最常用的態度測量方式，從「完全不符合」到「完全符合」分成 5 個程度。
              </p>
              <p>
                <span style={{ color: COLORS.ink, fontWeight: 600 }}>關於反向題：</span>
                每個維度的 8 題裡有 6 題正向題、2 題反向題。為什麼要這樣設計？因為人在填問卷時，常會不自覺選擇「聽起來比較好聽」的答案——這在心理學叫「社會期望偏誤」(social desirability bias)。例如「我會查證 AI 的答案」聽起來就比「我懶得查證」高尚，大家容易往前者答。加入反向題之後，如果你真的是個「不太查證」的人，正向題與反向題的答案會互相印證；如果只是想討好量表，反向題就會讓你露餡。
              </p>
              <p>
                <span style={{ color: COLORS.ink, fontWeight: 600 }}>計分轉換：</span>
                你選 1 到 5 分，正向題會減 3 變成 -2 到 +2(中性是 0)，反向題則是 3 減去答案(同樣得到 -2 到 +2)。每個維度 8 題加起來，範圍是 -16 到 +16，再線性映射到 0 到 100，以 50 為中立點——這樣就有一個直觀的「你偏向哪一端」的分數。
              </p>
              <p>
                <span style={{ color: COLORS.ink, fontWeight: 600 }}>類型怎麼決定：</span>
                每個維度看你比 50 高還是低，決定那個維度的字母，四個維度組合起來就是你的四字母類型(共 16 種可能組合)。
              </p>
              <p>
                <span style={{ color: COLORS.ink, fontWeight: 600 }}>遇到剛好 50 分怎麼辦？</span>
                判斷傾向(T/C)和操作方法(I/S)如果剛好 50 分，我們會選 C(批判)和 S(結構)這一邊。為什麼？因為從教育的角度，引導學生<span style={{ color: COLORS.ink }}>「再多查證一點」「再多結構一點」</span>比較不會出問題；反過來告訴學生「你可以更輕信 AI」就有點奇怪。所以這個平手規則不是隨便定的，是有教育意義的選擇。
              </p>
              <p>
                <span style={{ color: COLORS.ink, fontWeight: 600 }}>v6 新增:45-55 平衡帶 (Gray Band)。</span>
                如果你在某個維度的分數落在 45 到 55 之間,代表你「沒有強烈偏好」——勉強被切到某一端,但其實另一端的描述也適用於你。這種情況我們會在類型字母旁邊加註「~」記號,並在四維度詳解裡標示「接近平衡」。建議你在這些維度上,把兩端的描述都讀一讀。
              </p>
              <p>
                <span style={{ color: COLORS.ink, fontWeight: 600 }}>v6 新增:填答一致性檢核。</span>
                量表的反向題本來是要抓「同意傾向偏誤」(acquiescence bias)——也就是不分題目都偏向「同意」的填答風格。如果系統偵測到你在多個維度上,正向題與反向題答案方向一致(例如兩邊都答 4、5),會出現提醒,建議重做。這不是要懲罰誰,只是希望結果真的反映你的使用樣貌。
              </p>
            </div>
          </section>

          {/* 四、這份測驗有哪些限制？ */}
          <section className="mb-10">
            <h2 className="text-xl mb-3" style={{ color: COLORS.ink, fontFamily: '"Noto Serif TC", serif' }}>
              四、這份測驗有哪些限制？
            </h2>
            <p className="text-sm leading-relaxed mb-4" style={{ color: COLORS.inkSoft, fontFamily: '"Noto Sans TC", sans-serif' }}>
              所有測量工具都有限制，坦承說明限制是研究倫理的基本要求。下面這些是我認為你應該知道的事情：
            </p>
            <ol className="space-y-4 text-sm leading-relaxed" style={{ color: COLORS.inkSoft, fontFamily: '"Noto Sans TC", sans-serif' }}>
              <li>
                <span style={{ color: COLORS.ink, fontWeight: 600 }}>1. 還沒做正式的信效度檢驗</span>
                <br />
                這份測驗是教學工具，還沒做過完整的心理計量驗證——例如因素分析(看四維度結構是不是真的成立)、Cronbach's α(看每維度的題目是不是真的在測同一件事)、效標關聯效度(跟其他類似量表的相關性)。如果有人想拿這份量表來寫論文，需要先做這些檢驗。
              </li>
              <li>
                <span style={{ color: COLORS.ink, fontWeight: 600 }}>2. 「四個字母」這種呈現會犧牲精度</span>
                <br />
                如果你某個維度剛好接近 50 分，你跟另一個分數類似的同學可能被分到不同類型，但其實你們很像。所以結果頁同時提供連續分數(0-100)，建議你看「字母類型」之外，也看雷達圖跟具體分數。
              </li>
              <li>
                <span style={{ color: COLORS.ink, fontWeight: 600 }}>3. 學生可能會選「聽起來比較好聽」的答案</span>
                <br />
                C(批判)、S(結構)、N(網絡)這幾個方向聽起來都比較像「好學生」。雖然加了反向題降低偏誤，還是無法完全消除。如果你發現自己看題目時會想「我應該選哪個」，而不是「我實際上怎麼做」，結果就會偏掉。請盡量誠實作答。
              </li>
              <li>
                <span style={{ color: COLORS.ink, fontWeight: 600 }}>4. 大學生在「應用情境」維度可能整體偏低</span>
                <br />
                應用情境(P↔N)維度測的是「你跟其他人在 AI 使用上的協作網絡」。但大學生本來就比較少有需要持續協作的情境(課程多半是個人作業、報告),也較少有穩定的共學社群。所以這個維度的 N 端分數,大學生族群可能整體偏低。這不代表你「不夠好」,只是反映了生命階段的特徵。
              </li>
              <li>
                <span style={{ color: COLORS.ink, fontWeight: 600 }}>5. 不同學科背景可能會有差異</span>
                <br />
                判斷傾向(T↔C)維度可能受學科訓練影響——社會科學訓練的人對論述、引用、來源的批判模式，跟理工科對程式、實驗、數據的批判模式，本質不太一樣。所以跨科系直接比較分數，意義有限。
              </li>
              <li>
                <span style={{ color: COLORS.ink, fontWeight: 600 }}>6. AI 領域變太快，題目需要定期更新</span>
                <br />
                這份題目反映的是 2025-2026 年的 AI 使用情境。隨著 AI 模型能力進步(例如「推理模型」越來越強)，有些題目的重要性會變化——例如過去「結構化 prompt」很重要，但未來如果 AI 自己會推理、會反問你需求，prompt 寫法的差異可能就沒那麼關鍵。所以這份量表本身需要不斷更新。
              </li>
            </ol>
          </section>

          {/* 五、參考文獻 */}
          <section className="mb-4">
            <h2 className="text-xl mb-3" style={{ color: COLORS.ink, fontFamily: '"Noto Serif TC", serif' }}>
              五、參考文獻
            </h2>
            <p className="text-sm leading-relaxed mb-4" style={{ color: COLORS.inkSoft, fontFamily: '"Noto Sans TC", sans-serif' }}>
              如果你對這個主題有興趣，以下是設計這份測驗時主要參考的文獻。前三篇是 AI 素養與 AI 使用行為相關的近期研究，後面是經典的科技採用與認知理論。文獻採用 APA 第 7 版格式。
            </p>
            <ul className="space-y-2 text-xs leading-relaxed" style={{ color: COLORS.inkSoft, fontFamily: '"Noto Sans TC", sans-serif' }}>
              <li>Davis, F. D. (1989). Perceived usefulness, perceived ease of use, and user acceptance of information technology. <em>MIS Quarterly, 13</em>(3), 319-340.</li>
              <li>Flavell, J. H. (1979). Metacognition and cognitive monitoring: A new area of cognitive-developmental inquiry. <em>American Psychologist, 34</em>(10), 906-911.</li>
              <li>Hutchins, E. (1995). <em>Cognition in the wild</em>. MIT Press.</li>
              <li>Liu, P., Yuan, W., Fu, J., Jiang, Z., Hayashi, H., &amp; Neubig, G. (2023). Pre-train, prompt, and predict: A systematic survey of prompting methods in natural language processing. <em>ACM Computing Surveys, 55</em>(9), 1-35.</li>
              <li>Long, D., &amp; Magerko, B. (2020). What is AI literacy? Competencies and design considerations. <em>Proceedings of the 2020 CHI Conference on Human Factors in Computing Systems</em>, 1-16.</li>
              <li>Ng, D. T. K., Leung, J. K. L., Chu, S. K. W., &amp; Qiao, M. S. (2021). Conceptualizing AI literacy: An exploratory review. <em>Computers and Education: Artificial Intelligence, 2</em>, 100041.</li>
              <li>Rogers, E. M. (2003). <em>Diffusion of innovations</em> (5th ed.). Free Press.</li>
              <li>Wang, B., Rau, P. L. P., &amp; Yuan, T. (2023). Measuring user competence in using artificial intelligence: Validation of artificial intelligence literacy questionnaire. <em>Behaviour &amp; Information Technology, 42</em>(9), 1324-1337.</li>
              <li>Wenger, E. (1998). <em>Communities of practice: Learning, meaning, and identity</em>. Cambridge University Press.</li>
            </ul>
          </section>

          <div className="mt-8 pt-6 border-t text-xs leading-relaxed" style={{ borderColor: COLORS.border, color: COLORS.warmGray, fontFamily: '"Noto Sans TC", sans-serif' }}>
            這份方法論說明會隨工具版本更新。如果你有任何改進建議、想問為什麼某題這樣設計、或者對 AI 素養研究有興趣想合作，歡迎跟課程教師聯繫。
          </div>
        </div>
      </div>
    </div>
  );
}

// ==================== v7 元件:結果頁的「AI 時代潛在角色」區塊 ====================
function CareerArchetypeSection({ type, onShowCareerMap }) {
  const archetypeIds = TYPE_TO_ARCHETYPES[type] || [];
  const isStarter = archetypeIds.includes('starter');

  // FTIP 起點型特殊處理
  if (isStarter) {
    return (
      <div className="mb-10 p-8" style={{ background: COLORS.paper, border: `2px solid ${COLORS.gold}` }}>
        <h3 className="text-xl mb-4 flex items-center gap-2" style={{ color: COLORS.ink, fontFamily: '"Noto Serif TC", serif' }}>
          <MapPin size={20} style={{ color: COLORS.gold }} />
          你在 AI 時代的潛在角色
        </h3>
        <div className="mb-4">
          <div className="text-sm tracking-widest mb-1" style={{ color: COLORS.warmGray, fontFamily: 'Fraunces, serif' }}>
            {STARTER_ARCHETYPE.english}
          </div>
          <div className="text-2xl mb-2" style={{ color: COLORS.ink, fontFamily: '"Noto Serif TC", serif' }}>
            {STARTER_ARCHETYPE.name}
          </div>
          <div className="text-sm italic" style={{ color: COLORS.inkSoft }}>
            {STARTER_ARCHETYPE.headline}
          </div>
        </div>
        <p
          className="text-base leading-loose mb-4"
          style={{ color: COLORS.inkSoft, fontFamily: '"Noto Sans TC", sans-serif' }}
        >
          {renderBold(STARTER_ARCHETYPE.description)}
        </p>
        <p
          className="text-base leading-loose mb-4"
          style={{ color: COLORS.ink, fontFamily: '"Noto Sans TC", sans-serif' }}
        >
          {renderBold(STARTER_ARCHETYPE.advice)}
        </p>
        <button
          onClick={onShowCareerMap}
          className="mt-2 inline-flex items-center gap-2 text-sm underline transition-colors hover:opacity-70"
          style={{ color: COLORS.accent, fontFamily: '"Noto Sans TC", sans-serif' }}
        >
          <MapPin size={14} />
          展開完整的人才地圖,看看每條路徑長什麼樣子
        </button>
      </div>
    );
  }

  // 一般類型:可能對應到一個或多個人才群
  const archetypes = archetypeIds.map((id) => CAREER_ARCHETYPES[id]).filter(Boolean);

  if (archetypes.length === 0) return null;

  return (
    <div className="mb-10 p-8" style={{ background: COLORS.paper, border: `2px solid ${COLORS.teal}` }}>
      <h3 className="text-xl mb-2 flex items-center gap-2" style={{ color: COLORS.ink, fontFamily: '"Noto Serif TC", serif' }}>
        <Briefcase size={20} style={{ color: COLORS.teal }} />
        你在 AI 時代的潛在角色
      </h3>
      <p className="text-sm mb-6" style={{ color: COLORS.warmGray, fontFamily: '"Noto Sans TC", sans-serif' }}>
        {archetypes.length === 1
          ? '依你目前的類型,以下是最適合你發揮的人才路徑——尤其針對社會科學背景的學生:'
          : `依你目前的類型,你同時具備了 ${archetypes.length} 條路徑的潛力:`}
      </p>

      <div className="space-y-6">
        {archetypes.map((arch, idx) => (
          <div
            key={arch.id}
            className={idx > 0 ? 'pt-6 border-t' : ''}
            style={{ borderColor: COLORS.border }}
          >
            <div className="flex items-baseline gap-2 mb-2 flex-wrap">
              <div className="text-xs tracking-widest" style={{ color: COLORS.teal, fontFamily: 'Fraunces, serif' }}>
                {arch.english}
              </div>
              <div className="text-xs px-2 py-0.5" style={{ background: 'white', color: COLORS.warmGray, fontFamily: 'Fraunces, serif' }}>
                {arch.coreCapabilities}
              </div>
            </div>
            <h4 className="text-2xl mb-2" style={{ color: COLORS.ink, fontFamily: '"Noto Serif TC", serif' }}>
              {arch.name}
            </h4>
            <p className="text-sm italic mb-3" style={{ color: COLORS.inkSoft, fontFamily: '"Noto Sans TC", sans-serif' }}>
              {arch.headline}
            </p>
            <div className="mb-3">
              <div className="text-xs mb-1.5 font-medium" style={{ color: COLORS.accent, fontFamily: '"Noto Sans TC", sans-serif' }}>
                社科背景的特殊價值
              </div>
              <p className="text-base leading-loose" style={{ color: COLORS.inkSoft, fontFamily: '"Noto Sans TC", sans-serif' }}>
                {renderBold(arch.socialScienceValue)}
              </p>
            </div>
          </div>
        ))}
      </div>

      <button
        onClick={onShowCareerMap}
        className="mt-6 w-full py-3 flex items-center justify-center gap-2 text-sm transition-colors hover:opacity-90"
        style={{ background: COLORS.teal, color: 'white', fontFamily: '"Noto Sans TC", sans-serif' }}
      >
        <MapPin size={14} />
        探索完整人才地圖(看其他四條路徑)
      </button>
    </div>
  );
}

// ==================== v7 元件:完整的人才地圖 Modal ====================
function CareerMapModal({ currentType, onClose }) {
  const userArchetypeIds = currentType ? (TYPE_TO_ARCHETYPES[currentType] || []) : [];

  // 所有人才群(依設計上的順序排列)
  const allArchetypes = [
    CAREER_ARCHETYPES.governance,
    CAREER_ARCHETYPES.integrator,
    CAREER_ARCHETYPES.methodologist,
    CAREER_ARCHETYPES.catalyst,
    CAREER_ARCHETYPES.guardian,
  ];

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center p-4 overflow-y-auto"
      style={{ background: 'rgba(26, 35, 50, 0.7)' }}
      onClick={onClose}
    >
      <div
        className="max-w-4xl w-full my-8 relative"
        style={{ background: COLORS.cream }}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 transition-colors hover:opacity-70 z-10"
          style={{ color: COLORS.ink }}
        >
          <X size={20} />
        </button>

        <div className="p-8 md:p-12">
          {/* Header */}
          <div className="mb-8 pb-6 border-b" style={{ borderColor: COLORS.border }}>
            <div className="text-xs tracking-widest mb-2" style={{ color: COLORS.warmGray, fontFamily: 'Fraunces, serif' }}>
              CAREER ARCHETYPES · 五群 AI 時代人才類型
            </div>
            <h1 className="text-3xl md:text-4xl mb-3" style={{ color: COLORS.ink, fontFamily: '"Noto Serif TC", serif' }}>
              AI 時代的跨領域人才地圖
            </h1>
            <p className="text-sm leading-relaxed" style={{ color: COLORS.inkSoft, fontFamily: '"Noto Sans TC", sans-serif' }}>
              AI 越強,越會取代「純技術操作」的工作;越無法取代「需要判斷、脈絡、社會性」的工作。
              社會科學訓練的核心優勢——對人、對社會、對權力、對倫理的敏感度——在 AI 時代不是過時的技能,而是
              <strong style={{ color: COLORS.ink }}>最稀缺的互補性能力</strong>。
            </p>
            <p className="text-sm leading-relaxed mt-3" style={{ color: COLORS.inkSoft, fontFamily: '"Noto Sans TC", sans-serif' }}>
              關鍵不是「你會不會用 AI」,而是「<strong style={{ color: COLORS.ink }}>AI 無法取代你什麼</strong>」、
              「<strong style={{ color: COLORS.ink }}>你能跟 AI 形成什麼樣的能力組合</strong>」。
            </p>
          </div>

          {/* 你目前的位置(僅在有測驗結果時顯示) */}
          {currentType && (
            <div className="mb-8 p-4" style={{ background: COLORS.paper, border: `1px solid ${COLORS.gold}` }}>
              <div className="flex items-baseline gap-3 flex-wrap">
                <span className="text-xs tracking-widest" style={{ color: COLORS.warmGray, fontFamily: 'Fraunces, serif' }}>
                  你的位置
                </span>
                <span className="text-base font-medium" style={{ color: COLORS.ink, fontFamily: 'Fraunces, serif' }}>
                  {currentType}
                </span>
                <span className="text-sm" style={{ color: COLORS.inkSoft, fontFamily: '"Noto Sans TC", sans-serif' }}>
                  → {userArchetypeIds.includes('starter')
                    ? '起點型探索者(所有路徑開放)'
                    : userArchetypeIds.map((id) => CAREER_ARCHETYPES[id]?.name).filter(Boolean).join('、')}
                </span>
              </div>
            </div>
          )}

          {/* FTIP 特殊區塊 */}
          {userArchetypeIds.includes('starter') && (
            <div className="mb-10 p-6" style={{ background: 'white', border: `2px solid ${COLORS.gold}` }}>
              <h2 className="text-2xl mb-2 flex items-center gap-2" style={{ color: COLORS.ink, fontFamily: '"Noto Serif TC", serif' }}>
                {STARTER_ARCHETYPE.name}
                <span className="text-sm font-normal" style={{ color: COLORS.warmGray, fontFamily: 'Fraunces, serif', fontStyle: 'italic' }}>
                  {STARTER_ARCHETYPE.english}
                </span>
              </h2>
              <p className="text-sm italic mb-4" style={{ color: COLORS.inkSoft }}>
                {STARTER_ARCHETYPE.headline}
              </p>
              <p className="text-sm leading-loose mb-4" style={{ color: COLORS.inkSoft, fontFamily: '"Noto Sans TC", sans-serif' }}>
                {renderBold(STARTER_ARCHETYPE.description)}
              </p>
              <p className="text-base leading-loose mb-4" style={{ color: COLORS.ink, fontFamily: '"Noto Sans TC", sans-serif' }}>
                {renderBold(STARTER_ARCHETYPE.advice)}
              </p>
              <ul className="space-y-2 mb-4">
                {STARTER_ARCHETYPE.pathHints.map((hint, idx) => (
                  <li key={idx} className="text-sm leading-relaxed" style={{ color: COLORS.inkSoft, fontFamily: '"Noto Sans TC", sans-serif' }}>
                    <span style={{ color: COLORS.accent }}>·</span> <strong style={{ color: COLORS.ink }}>{hint.path}</strong>:{hint.hint}
                  </li>
                ))}
              </ul>
              <p className="text-sm leading-loose" style={{ color: COLORS.inkSoft, fontFamily: '"Noto Sans TC", sans-serif' }}>
                {STARTER_ARCHETYPE.closing}
              </p>
            </div>
          )}

          {/* 五群人才類型 */}
          <div className="space-y-10">
            {allArchetypes.map((arch) => {
              const isUserArchetype = userArchetypeIds.includes(arch.id);
              const includesUserType = currentType && arch.types.includes(currentType);

              return (
                <section
                  key={arch.id}
                  className="p-6"
                  style={{
                    background: 'white',
                    borderLeft: `4px solid ${isUserArchetype ? COLORS.accent : COLORS.border}`,
                  }}
                >
                  {/* 群標題 */}
                  <div className="mb-4">
                    <div className="flex items-baseline gap-2 mb-2 flex-wrap">
                      <div className="text-xs tracking-widest" style={{ color: COLORS.warmGray, fontFamily: 'Fraunces, serif' }}>
                        {arch.english}
                      </div>
                      <div className="text-xs px-2 py-0.5" style={{ background: COLORS.paper, color: COLORS.inkSoft, fontFamily: 'Fraunces, serif' }}>
                        核心能力:{arch.coreCapabilities}
                      </div>
                      {isUserArchetype && (
                        <div className="text-xs px-2 py-0.5 font-medium" style={{ background: COLORS.accent, color: 'white' }}>
                          你的位置
                        </div>
                      )}
                    </div>
                    <h2 className="text-2xl mb-1" style={{ color: COLORS.ink, fontFamily: '"Noto Serif TC", serif' }}>
                      {arch.name}
                    </h2>
                    <p className="text-sm italic" style={{ color: COLORS.inkSoft }}>
                      {arch.headline}
                    </p>
                  </div>

                  {/* 包含類型 */}
                  <div className="mb-4 flex items-baseline gap-2 flex-wrap">
                    <span className="text-xs" style={{ color: COLORS.warmGray, fontFamily: '"Noto Sans TC", sans-serif' }}>
                      包含類型:
                    </span>
                    {arch.types.map((t) => (
                      <span
                        key={t}
                        className="text-xs px-2 py-0.5 tracking-widest"
                        style={{
                          background: t === currentType ? COLORS.accent : COLORS.paper,
                          color: t === currentType ? 'white' : COLORS.inkSoft,
                          fontFamily: 'Fraunces, serif',
                        }}
                      >
                        {t}
                      </span>
                    ))}
                  </div>

                  {/* 社會角色 */}
                  <div className="mb-4">
                    <div className="text-xs mb-1.5 font-medium" style={{ color: COLORS.warmGray, fontFamily: '"Noto Sans TC", sans-serif' }}>
                      社會角色與獨特價值
                    </div>
                    <p className="text-sm leading-loose" style={{ color: COLORS.inkSoft, fontFamily: '"Noto Sans TC", sans-serif' }}>
                      {renderBold(arch.role)}
                    </p>
                  </div>

                  {/* 社科背景的特殊價值 */}
                  <div className="mb-4">
                    <div className="text-xs mb-1.5 font-medium" style={{ color: COLORS.accent, fontFamily: '"Noto Sans TC", sans-serif' }}>
                      社科背景的特殊價值
                    </div>
                    <p className="text-sm leading-loose" style={{ color: COLORS.inkSoft, fontFamily: '"Noto Sans TC", sans-serif' }}>
                      {renderBold(arch.socialScienceValue)}
                    </p>
                  </div>

                  {/* 典型職涯 */}
                  <div className="mb-4">
                    <div className="text-xs mb-2 font-medium" style={{ color: COLORS.warmGray, fontFamily: '"Noto Sans TC", sans-serif' }}>
                      典型職涯方向
                    </div>
                    <ul className="space-y-1">
                      {arch.careers.map((c, idx) => (
                        <li key={idx} className="text-sm leading-relaxed" style={{ color: COLORS.inkSoft, fontFamily: '"Noto Sans TC", sans-serif' }}>
                          <strong style={{ color: COLORS.ink }}>{c.category}</strong>:{c.items}
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* 想進這群需要強化的能力 */}
                  <div className="pt-4 mt-4 border-t" style={{ borderColor: COLORS.border }}>
                    <div className="text-xs mb-1.5 font-medium" style={{ color: COLORS.teal, fontFamily: '"Noto Sans TC", sans-serif' }}>
                      想進這群需要強化的能力
                    </div>
                    <p className="text-sm leading-loose" style={{ color: COLORS.inkSoft, fontFamily: '"Noto Sans TC", sans-serif' }}>
                      {renderBold(arch.howToGrowIn)}
                    </p>
                  </div>
                </section>
              );
            })}
          </div>

          {/* 結語 */}
          <div className="mt-10 p-6" style={{ background: COLORS.paper, border: `1px solid ${COLORS.border}` }}>
            <h3 className="text-lg mb-3" style={{ color: COLORS.ink, fontFamily: '"Noto Serif TC", serif' }}>
              不論走哪條路徑,「不可替代的人類能力」都是核心
            </h3>
            <p className="text-sm leading-loose mb-3" style={{ color: COLORS.inkSoft, fontFamily: '"Noto Sans TC", sans-serif' }}>
              AI 時代真正稀缺的能力都包含:
            </p>
            <ul className="space-y-1.5 text-sm leading-relaxed" style={{ color: COLORS.inkSoft, fontFamily: '"Noto Sans TC", sans-serif' }}>
              <li><strong style={{ color: COLORS.ink }}>判斷力(Judgment)</strong>:在複雜、不確定、價值衝突的情境下做決定</li>
              <li><strong style={{ color: COLORS.ink }}>脈絡理解(Context)</strong>:知道不同情境下「合適」的標準不同</li>
              <li><strong style={{ color: COLORS.ink }}>倫理反思(Ethics)</strong>:不只問「能不能做」,更問「該不該做」</li>
              <li><strong style={{ color: COLORS.ink }}>人際協調(Coordination)</strong>:說服、談判、調解、團隊建設</li>
              <li><strong style={{ color: COLORS.ink }}>跨域翻譯(Translation)</strong>:把 A 領域的問題翻譯成 B 領域聽得懂的語言</li>
            </ul>
            <p className="text-sm leading-loose mt-4" style={{ color: COLORS.inkSoft, fontFamily: '"Noto Sans TC", sans-serif' }}>
              這些都是社會科學訓練的核心,而且短期內 AI 仍難以取代。
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ==================== 元件：結果頁 ====================
function Result({ result, nickname, classCode, onSaveToClass, onRestart, onViewStats, savedToClass, onShowMethodology, onShowCareerMap }) {
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(null);
  const t = TYPES[result.type];

  const radarData = DIMENSIONS.map((d) => ({
    dimension: d.polesShort[1],
    value: result.scores[d.code],
    fullName: d.name,
  }));

  const handleSave = async () => {
    if (!classCode) {
      setSaveError('未填寫班級代碼，無法加入統計');
      return;
    }
    setSaving(true);
    setSaveError(null);
    try {
      await onSaveToClass();
    } catch (e) {
      // 顯示具體錯誤訊息(Supabase 連線問題、RLS policy 拒絕等)
      const msg = e?.message || '儲存失敗，請稍後再試';
      setSaveError(msg);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-6 py-10">
      <div className="text-center mb-10">
        <div className="text-xs tracking-widest mb-3" style={{ color: COLORS.warmGray, fontFamily: 'Fraunces, serif' }}>
          {nickname ? `${nickname} 的結果` : '你的結果'} · YOUR AI USER TYPE
        </div>
        {/* v6:類型字母逐字顯示,落在灰帶(45-55)的維度以較淺顏色與「~」標記 */}
        <div
          className="text-7xl md:text-8xl tracking-widest mb-2"
          style={{
            fontFamily: 'Fraunces, serif',
            fontWeight: 300,
          }}
        >
          {result.type.split('').map((letter, idx) => {
            const code = ['EF', 'TC', 'IS', 'PN'][idx];
            const isGray = result.grayBand && result.grayBand[code];
            return (
              <span
                key={idx}
                style={{
                  color: isGray ? COLORS.accentSoft : COLORS.accent,
                  opacity: isGray ? 0.65 : 1,
                  position: 'relative',
                }}
              >
                {letter}
                {isGray && (
                  <span
                    style={{
                      position: 'absolute',
                      top: '-0.15em',
                      right: '-0.25em',
                      fontSize: '0.4em',
                      color: COLORS.warmGray,
                      fontWeight: 400,
                    }}
                  >
                    ~
                  </span>
                )}
              </span>
            );
          })}
        </div>
        <h1
          className="text-3xl md:text-4xl mb-2"
          style={{ color: COLORS.ink, fontFamily: '"Noto Serif TC", serif' }}
        >
          {t.name}
        </h1>
        <div className="text-base" style={{ color: COLORS.warmGray, fontFamily: 'Fraunces, serif', fontStyle: 'italic' }}>
          {t.english}
        </div>
        <div
          className="mt-4 inline-block px-4 py-2 text-sm"
          style={{ background: COLORS.paper, color: COLORS.inkSoft, fontFamily: '"Noto Sans TC", sans-serif' }}
        >
          {t.headline}
        </div>

        {/* v6:灰帶提示 */}
        {result.grayBand && Object.values(result.grayBand).some(Boolean) && (
          <div
            className="mt-5 mx-auto max-w-xl p-3 text-xs leading-relaxed text-left"
            style={{ background: COLORS.paper, border: `1px dashed ${COLORS.warmGray}`, color: COLORS.inkSoft, fontFamily: '"Noto Sans TC", sans-serif' }}
          >
            <span style={{ color: COLORS.accent, fontWeight: 600 }}>標有「~」的字母代表該維度接近平衡點(45-55)。</span>
            這表示你在那個維度上沒有強烈偏好,另一端類型的描述也值得一讀。雷達圖與下方四維度詳解能提供比字母更精細的訊息。
          </div>
        )}

        {/* v6:填答一致性提示 */}
        {result.consistencyFlag && (
          <div
            className="mt-3 mx-auto max-w-xl p-3 text-xs leading-relaxed text-left flex gap-2"
            style={{ background: '#fdf4e8', border: `1px solid ${COLORS.gold}`, color: COLORS.inkSoft, fontFamily: '"Noto Sans TC", sans-serif' }}
          >
            <AlertCircle size={14} style={{ color: COLORS.gold, flexShrink: 0, marginTop: 2 }} />
            <span>
              <span style={{ color: COLORS.ink, fontWeight: 600 }}>填答一致性提示:</span>
              你在多個維度的「正向題」與「反向題」答案方向一致,可能不自覺地偏向「都同意」或「都不同意」。建議重做一次,並在每題稍微停頓思考,結果會更貼近你真實的使用樣貌。
            </span>
          </div>
        )}
      </div>

      {/* 開頭描述 */}
      <div className="mb-10 p-8 border-l-4" style={{ borderColor: COLORS.accent, background: COLORS.paper }}>
        <p className="text-lg leading-relaxed" style={{ color: COLORS.ink, fontFamily: '"Noto Sans TC", sans-serif' }}>
          {t.description}
        </p>
      </div>

      {/* Radar */}
      <div className="mb-8 p-6" style={{ borderColor: COLORS.border, background: 'white', border: `1px solid ${COLORS.border}` }}>
        <h3 className="text-sm tracking-widest mb-4" style={{ color: COLORS.warmGray, fontFamily: 'Fraunces, serif' }}>
          DIMENSION RADAR
        </h3>
        <ResponsiveContainer width="100%" height={280}>
          <RadarChart data={radarData}>
            <PolarGrid stroke={COLORS.border} />
            <PolarAngleAxis
              dataKey="dimension"
              tick={{ fill: COLORS.ink, fontSize: 13, fontFamily: 'Noto Sans TC' }}
            />
            <PolarRadiusAxis angle={90} domain={[0, 100]} tick={false} stroke={COLORS.border} />
            <Radar
              dataKey="value"
              stroke={COLORS.accent}
              fill={COLORS.accent}
              fillOpacity={0.3}
              strokeWidth={2}
            />
          </RadarChart>
        </ResponsiveContainer>
      </div>

      {/* 維度詳解 */}
      <div className="mb-10">
        <div className="flex items-center gap-2 mb-4">
          <Info size={16} style={{ color: COLORS.accent }} />
          <h3 className="text-lg" style={{ color: COLORS.ink, fontFamily: '"Noto Serif TC", serif' }}>
            四維度詳解
          </h3>
          <span className="text-xs" style={{ color: COLORS.warmGray, fontFamily: '"Noto Sans TC", sans-serif' }}>
            (點擊各維度展開說明)
          </span>
        </div>
        <div className="space-y-2">
          {DIMENSIONS.map((d) => (
            <DimensionExpander key={d.code} dim={d} score={result.scores[d.code]} onShowMethodology={onShowMethodology} />
          ))}
        </div>
      </div>

      {/* 優勢敘事段落 */}
      <div className="mb-6 p-8" style={{ background: 'white', border: `1px solid ${COLORS.border}` }}>
        <h3 className="text-xl mb-4 flex items-center gap-2" style={{ color: COLORS.teal, fontFamily: '"Noto Serif TC", serif' }}>
          <Sparkles size={20} />
          你的優勢
        </h3>
        <p
          className="text-base leading-loose"
          style={{ color: COLORS.inkSoft, fontFamily: '"Noto Sans TC", sans-serif' }}
        >
          {renderBold(t.strengths)}
        </p>
      </div>

      {/* 成長方向敘事段落 */}
      <div className="mb-10 p-8" style={{ background: 'white', border: `1px solid ${COLORS.border}` }}>
        <h3 className="text-xl mb-4 flex items-center gap-2" style={{ color: COLORS.accent, fontFamily: '"Noto Serif TC", serif' }}>
          <Compass size={20} />
          可以精進的方向
        </h3>
        <p
          className="text-base leading-loose"
          style={{ color: COLORS.inkSoft, fontFamily: '"Noto Sans TC", sans-serif' }}
        >
          {renderBold(t.growth)}
        </p>
      </div>

      {/* v7 新增:AI 時代的潛在角色 */}
      <CareerArchetypeSection
        type={result.type}
        onShowCareerMap={onShowCareerMap}
      />

      {/* Save / Action */}
      <div className="border-t pt-8" style={{ borderColor: COLORS.border }}>
        {classCode && !savedToClass && (
          <div className="mb-4 p-5 border-2 border-dashed" style={{ borderColor: COLORS.gold, background: COLORS.paper }}>
            <div className="flex items-start gap-3 mb-3">
              <Users size={18} style={{ color: COLORS.gold, marginTop: 2 }} />
              <div>
                <p className="text-sm font-medium mb-1" style={{ color: COLORS.ink, fontFamily: '"Noto Sans TC", sans-serif' }}>
                  將結果加入班級 <span className="tracking-widest" style={{ fontFamily: 'Fraunces, serif' }}>{classCode}</span> 統計
                </p>
                <p className="text-xs" style={{ color: COLORS.inkSoft, fontFamily: '"Noto Sans TC", sans-serif' }}>
                  你的暱稱與結果類型會被記錄，老師可以看到全班的類型分布。
                </p>
              </div>
            </div>
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-5 py-2 text-sm flex items-center gap-2"
              style={{ background: COLORS.gold, color: COLORS.ink, fontFamily: '"Noto Sans TC", sans-serif' }}
            >
              {saving ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
              {saving ? '儲存中…' : '加入班級統計'}
            </button>
            {saveError && (
              <p className="mt-2 text-xs flex items-center gap-1" style={{ color: COLORS.accent }}>
                <AlertCircle size={12} /> {saveError}
              </p>
            )}
          </div>
        )}
        {savedToClass && (
          <div className="mb-4 p-4 flex items-center gap-2 text-sm" style={{ background: '#e8f0e8', color: COLORS.teal, fontFamily: '"Noto Sans TC", sans-serif' }}>
            <Check size={16} />
            已將你的結果加入班級 {classCode} 的統計
          </div>
        )}

        <div className="flex gap-3 mb-4">
          <button
            onClick={onRestart}
            className="flex-1 py-3 flex items-center justify-center gap-2 border-2"
            style={{ borderColor: COLORS.ink, color: COLORS.ink, fontFamily: '"Noto Sans TC", sans-serif' }}
          >
            <RefreshCw size={16} />
            重新測驗
          </button>
          {classCode && (
            <button
              onClick={() => onViewStats(classCode)}
              className="flex-1 py-3 flex items-center justify-center gap-2"
              style={{ background: COLORS.ink, color: COLORS.cream, fontFamily: '"Noto Sans TC", sans-serif' }}
            >
              <BarChart3 size={16} />
              查看班級統計
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          <button
            onClick={onShowCareerMap}
            className="w-full py-3 flex items-center justify-center gap-2 text-sm border transition-colors hover:opacity-70"
            style={{ borderColor: COLORS.border, color: COLORS.inkSoft, fontFamily: '"Noto Sans TC", sans-serif' }}
          >
            <MapPin size={14} />
            探索完整人才地圖
          </button>
          <button
            onClick={onShowMethodology}
            className="w-full py-3 flex items-center justify-center gap-2 text-sm border transition-colors hover:opacity-70"
            style={{ borderColor: COLORS.border, color: COLORS.inkSoft, fontFamily: '"Noto Sans TC", sans-serif' }}
          >
            <BookOpen size={14} />
            查看方法論說明(附錄)
          </button>
        </div>
      </div>
    </div>
  );
}

// ==================== 元件：班級統計頁 ====================
function Stats({ classCode, onBack }) {
  const [loading, setLoading] = useState(true);
  const [records, setRecords] = useState([]);
  const [sessionInfo, setSessionInfo] = useState({
    sessionStart: null,
    sessionEnd: null,
    totalAllTime: 0,
    hasSession: false,
  });
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);

  // ===== v6 web: 從 Supabase 抓取班級紀錄,並過濾出「目前時段」 =====
  const fetchData = async () => {
    try {
      setError(null);
      const all = await fetchClassResults(classCode);
      const session = filterCurrentSession(all);
      setRecords(session.records);
      setSessionInfo({
        sessionStart: session.sessionStart,
        sessionEnd: session.sessionEnd,
        totalAllTime: session.totalAllTime,
        hasSession: session.hasSession,
      });
      setLastUpdated(new Date());
    } catch (e) {
      setError(e.message || '讀取失敗');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    fetchData();
    // 每 30 秒自動重新整理一次,讓老師上課時可以看到即時更新
    const intervalId = setInterval(() => {
      if (mounted) fetchData();
    }, 30000);
    return () => {
      mounted = false;
      clearInterval(intervalId);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [classCode]);

  const typeDist = useMemo(() => {
    const counts = {};
    records.forEach((r) => { counts[r.type] = (counts[r.type] || 0) + 1; });
    return Object.entries(counts)
      .map(([type, count]) => ({ type, count, name: TYPES[type]?.name || type }))
      .sort((a, b) => b.count - a.count);
  }, [records]);

  const dimAvg = useMemo(() => {
    if (records.length === 0) return [];
    const sum = { EF: 0, TC: 0, IS: 0, PN: 0 };
    records.forEach((r) => {
      sum.EF += r.scores.EF;
      sum.TC += r.scores.TC;
      sum.IS += r.scores.IS;
      sum.PN += r.scores.PN;
    });
    return DIMENSIONS.map((d) => ({
      dimension: d.name,
      value: Math.round(sum[d.code] / records.length),
      poleLow: d.poles[0],
      poleHigh: d.poles[1],
    }));
  }, [records]);

  // 格式化時間顯示
  const formatTime = (date) => {
    if (!date) return '—';
    return date.toLocaleString('zh-TW', {
      month: 'numeric',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="max-w-5xl mx-auto px-6 py-10">
      <button
        onClick={onBack}
        className="flex items-center gap-2 text-sm mb-8 transition-colors"
        style={{ color: COLORS.inkSoft, fontFamily: '"Noto Sans TC", sans-serif' }}
      >
        <ArrowLeft size={16} />
        回到首頁
      </button>

      <div className="mb-8">
        <div className="text-xs tracking-widest mb-2" style={{ color: COLORS.warmGray, fontFamily: 'Fraunces, serif' }}>
          CLASS DASHBOARD
        </div>
        <h1 className="text-4xl mb-2" style={{ color: COLORS.ink, fontFamily: '"Noto Serif TC", serif' }}>
          班級 <span className="tracking-widest" style={{ color: COLORS.accent, fontFamily: 'Fraunces, serif' }}>{classCode}</span> 統計
        </h1>

        {/* v6 web: 1 小時時窗資訊條 */}
        {sessionInfo.hasSession && (
          <div
            className="mt-4 p-4 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm"
            style={{ background: COLORS.paper, border: `1px solid ${COLORS.border}`, fontFamily: '"Noto Sans TC", sans-serif' }}
          >
            <div className="flex items-center gap-2">
              <Clock size={14} style={{ color: COLORS.accent }} />
              <span style={{ color: COLORS.warmGray }}>本時段：</span>
              <span style={{ color: COLORS.ink, fontFamily: 'Fraunces, serif' }}>
                {formatTime(sessionInfo.sessionStart)} – {formatTime(sessionInfo.sessionEnd)}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span style={{ color: COLORS.warmGray }}>本時段填答：</span>
              <strong style={{ color: COLORS.ink }}>{records.length}</strong>
              <span style={{ color: COLORS.warmGray }}>人</span>
            </div>
            <div className="flex items-center gap-2">
              <span style={{ color: COLORS.warmGray }}>累計：</span>
              <span style={{ color: COLORS.inkSoft }}>{sessionInfo.totalAllTime} 人</span>
            </div>
            {lastUpdated && (
              <div className="flex items-center gap-2 ml-auto text-xs">
                <span style={{ color: COLORS.warmGray }}>更新於 {formatTime(lastUpdated)}</span>
                <button
                  onClick={fetchData}
                  className="underline hover:opacity-70"
                  style={{ color: COLORS.accent }}
                >
                  立即重整
                </button>
              </div>
            )}
          </div>
        )}

        {!sessionInfo.hasSession && !loading && !error && (
          <p className="text-sm mt-3" style={{ color: COLORS.inkSoft, fontFamily: '"Noto Sans TC", sans-serif' }}>
            尚未有資料
          </p>
        )}
      </div>

      {loading && (
        <div className="text-center py-20" style={{ color: COLORS.warmGray }}>
          <Loader2 className="animate-spin mx-auto mb-3" size={24} />
          <p style={{ fontFamily: '"Noto Sans TC", sans-serif' }}>讀取中…</p>
        </div>
      )}

      {!loading && error && (
        <div className="p-6 text-center" style={{ background: COLORS.paper, color: COLORS.accent, fontFamily: '"Noto Sans TC", sans-serif' }}>
          <AlertCircle className="mx-auto mb-2" />
          {error}
        </div>
      )}

      {!loading && !error && records.length === 0 && (
        <div className="p-12 text-center border-2 border-dashed" style={{ borderColor: COLORS.border, color: COLORS.inkSoft, fontFamily: '"Noto Sans TC", sans-serif' }}>
          <Users className="mx-auto mb-3" size={36} style={{ color: COLORS.warmGray }} />
          <p className="mb-2 text-lg">本時段尚無填答紀錄</p>
          <p className="text-sm" style={{ color: COLORS.warmGray }}>
            請學生輸入班級代碼 <strong style={{ fontFamily: 'Fraunces, serif' }}>{classCode}</strong> 並完成測驗。
          </p>
          <p className="text-xs mt-3" style={{ color: COLORS.warmGray }}>
            註:本頁僅顯示「目前時段」的填答(從第一位填答者起算 1 小時內,且相鄰填答間隔 ≤ 30 分鐘)
          </p>
        </div>
      )}

      {!loading && !error && records.length > 0 && (
        <>
          <div className="mb-10 p-6" style={{ background: 'white', border: `1px solid ${COLORS.border}` }}>
            <h2 className="text-xl mb-1" style={{ color: COLORS.ink, fontFamily: '"Noto Serif TC", serif' }}>
              類型分布
            </h2>
            <p className="text-xs mb-6" style={{ color: COLORS.warmGray, fontFamily: '"Noto Sans TC", sans-serif' }}>
              全班 16 種 AI 使用者類型的人數分布
            </p>
            <ResponsiveContainer width="100%" height={Math.max(280, typeDist.length * 36)}>
              <BarChart data={typeDist} layout="vertical" margin={{ left: 20, right: 40, top: 10, bottom: 10 }}>
                <XAxis type="number" allowDecimals={false} tick={{ fill: COLORS.warmGray, fontSize: 11 }} stroke={COLORS.border} />
                <YAxis
                  type="category"
                  dataKey="type"
                  tick={{ fill: COLORS.ink, fontSize: 12, fontFamily: 'Fraunces' }}
                  width={50}
                  stroke={COLORS.border}
                />
                <Tooltip
                  cursor={{ fill: COLORS.paper }}
                  contentStyle={{
                    background: 'white',
                    border: `1px solid ${COLORS.border}`,
                    fontFamily: '"Noto Sans TC", sans-serif',
                    fontSize: 13,
                  }}
                  formatter={(value, _, props) => [`${value} 人`, props.payload.name]}
                />
                <Bar dataKey="count" fill={COLORS.accent}>
                  <LabelList
                    dataKey="name"
                    position="right"
                    style={{ fill: COLORS.inkSoft, fontFamily: 'Noto Sans TC', fontSize: 12 }}
                  />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="mb-10 p-6" style={{ background: 'white', border: `1px solid ${COLORS.border}` }}>
            <h2 className="text-xl mb-1" style={{ color: COLORS.ink, fontFamily: '"Noto Serif TC", serif' }}>
              維度傾向
            </h2>
            <p className="text-xs mb-6" style={{ color: COLORS.warmGray, fontFamily: '"Noto Sans TC", sans-serif' }}>
              各維度的全班平均分數(0=完全偏左，100=完全偏右，50=中立)
            </p>
            <div className="space-y-5">
              {dimAvg.map((d) => (
                <div key={d.dimension}>
                  <div className="flex items-baseline justify-between mb-2">
                    <span className="text-sm font-medium" style={{ color: COLORS.ink, fontFamily: '"Noto Sans TC", sans-serif' }}>
                      {d.dimension}
                    </span>
                    <span className="text-xs" style={{ color: COLORS.warmGray, fontFamily: 'Fraunces, serif' }}>
                      平均 {d.value} / 100
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-xs" style={{ fontFamily: 'Fraunces, serif' }}>
                    <span style={{ color: COLORS.inkSoft, minWidth: 60 }}>{d.poleLow}</span>
                    <div className="flex-1 h-2 relative" style={{ background: COLORS.border }}>
                      <div
                        className="absolute top-0 h-full"
                        style={{ background: COLORS.accent, width: `${d.value}%` }}
                      />
                      <div
                        className="absolute top-1/2 w-px h-4"
                        style={{ background: COLORS.ink, left: '50%', transform: 'translate(-50%, -50%)' }}
                      />
                    </div>
                    <span style={{ color: COLORS.inkSoft, minWidth: 60, textAlign: 'right' }}>{d.poleHigh}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="p-6" style={{ background: 'white', border: `1px solid ${COLORS.border}` }}>
            <h2 className="text-xl mb-4" style={{ color: COLORS.ink, fontFamily: '"Noto Serif TC", serif' }}>
              個別結果
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm" style={{ fontFamily: '"Noto Sans TC", sans-serif' }}>
                <thead>
                  <tr className="border-b" style={{ borderColor: COLORS.border }}>
                    <th className="text-left py-2 px-3 font-normal" style={{ color: COLORS.warmGray, fontFamily: 'Fraunces' }}>#</th>
                    <th className="text-left py-2 px-3 font-normal" style={{ color: COLORS.warmGray }}>暱稱</th>
                    <th className="text-left py-2 px-3 font-normal" style={{ color: COLORS.warmGray, fontFamily: 'Fraunces' }}>類型</th>
                    <th className="text-left py-2 px-3 font-normal" style={{ color: COLORS.warmGray }}>名稱</th>
                    <th className="text-left py-2 px-3 font-normal" style={{ color: COLORS.warmGray }}>時間</th>
                  </tr>
                </thead>
                <tbody>
                  {records
                    .slice()
                    .sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0))
                    .map((r, i) => (
                      <tr key={r.id || i} className="border-b" style={{ borderColor: COLORS.paper }}>
                        <td className="py-2 px-3" style={{ color: COLORS.warmGray, fontFamily: 'Fraunces' }}>{i + 1}</td>
                        <td className="py-2 px-3" style={{ color: COLORS.ink }}>{r.nickname || <span style={{ color: COLORS.warmGray }}>匿名</span>}</td>
                        <td className="py-2 px-3 tracking-widest font-medium" style={{ color: COLORS.accent, fontFamily: 'Fraunces' }}>{r.type}</td>
                        <td className="py-2 px-3" style={{ color: COLORS.inkSoft }}>{TYPES[r.type]?.name}</td>
                        <td className="py-2 px-3 text-xs" style={{ color: COLORS.warmGray }}>
                          {r.created_at ? new Date(r.created_at).toLocaleString('zh-TW', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—'}
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// ==================== 主元件 ====================
export default function App() {
  const [stage, setStage] = useState('welcome');
  const [classCode, setClassCode] = useState('');
  const [nickname, setNickname] = useState('');
  const [result, setResult] = useState(null);
  const [savedToClass, setSavedToClass] = useState(false);
  const [statsCode, setStatsCode] = useState('');
  const [lastResult, setLastResult] = useState(null);
  const [showMethodology, setShowMethodology] = useState(false);
  const [showCareerMap, setShowCareerMap] = useState(false);

  // 字體已於 index.html 預先載入,不需要 useEffect 動態插入

  useEffect(() => {
    // v6 web: 從 localStorage 載入上次結果
    try {
      const r = localStore.get('lastResult');
      if (r) {
        setLastResult(JSON.parse(r.value));
      }
    } catch (e) {
      // 忽略 JSON parse 錯誤
    }
  }, []);

  const handleStart = (code, name) => {
    setClassCode(code);
    setNickname(name);
    setSavedToClass(false);
    setStage('quiz');
  };

  const handleQuizComplete = async (answers) => {
    const r = calculateType(answers);
    const fullResult = { ...r, answers, nickname, timestamp: Date.now(), id: genId() };
    setResult(fullResult);
    setStage('result');
    try {
      localStore.set('lastResult', JSON.stringify(fullResult));
      setLastResult(fullResult);
    } catch (e) {
      // 忽略 localStorage 配額錯誤
    }
  };

  const handleSaveToClass = async () => {
    if (!classCode || !result) return;
    const data = {
      classCode,
      id: result.id,
      type: result.type,
      scores: result.scores,
      nickname: nickname || '',
    };
    await saveClassResult(data);
    setSavedToClass(true);
  };

  const handleViewStats = (code) => {
    setStatsCode(code);
    setStage('stats');
  };

  const handleRestart = () => {
    setResult(null);
    setSavedToClass(false);
    setStage('welcome');
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        background: COLORS.cream,
        fontFamily: '"Noto Sans TC", sans-serif',
        backgroundImage: `radial-gradient(${COLORS.border}40 1px, transparent 1px)`,
        backgroundSize: '32px 32px',
      }}
    >
      {stage === 'welcome' && (
        <Welcome
          onStart={handleStart}
          onViewStats={handleViewStats}
          onShowMethodology={() => setShowMethodology(true)}
          onShowCareerMap={() => setShowCareerMap(true)}
          lastResult={lastResult}
        />
      )}
      {stage === 'quiz' && (
        <Quiz
          onComplete={handleQuizComplete}
          onBack={() => setStage('welcome')}
        />
      )}
      {stage === 'result' && result && (
        <Result
          result={result}
          nickname={nickname}
          classCode={classCode}
          onSaveToClass={handleSaveToClass}
          onRestart={handleRestart}
          onViewStats={handleViewStats}
          savedToClass={savedToClass}
          onShowMethodology={() => setShowMethodology(true)}
          onShowCareerMap={() => setShowCareerMap(true)}
        />
      )}
      {stage === 'stats' && (
        <Stats
          classCode={statsCode}
          onBack={() => setStage('welcome')}
        />
      )}

      {showMethodology && (
        <MethodologyModal onClose={() => setShowMethodology(false)} />
      )}

      {showCareerMap && (
        <CareerMapModal
          currentType={result?.type}
          onClose={() => setShowCareerMap(false)}
        />
      )}
    </div>
  );
}
