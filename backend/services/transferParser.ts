/**
 * transferParser.ts — 从手机银行/支付短信文本中提取转账记账信息。
 * 纯本地正则解析（离线可用），为 AI 自动添加转账记账提供结构化结果。
 */

export interface ParsedTransfer {
  matched: boolean;
  type: 'income' | 'expense';
  amount: string; // "500.00"
  category: string;
  description: string;
  occurredAt: string; // YYYY-MM-DD
  raw: string;
}

// 收入关键词（按优先级）
const INCOME_KEYWORDS = [
  '收入', '入账', '到账', '收到转账', '收款', '收到', '转入',
  '工资', '薪资', '薪酬', '存入', '退款', '退票', '红包收入', '中奖', '佣金',
];
// 支出关键词
const EXPENSE_KEYWORDS = [
  '支出', '消费', '付款', '支付', '扣款', '扣费', '转出', '购买',
  '缴费', '充值', '转账支出', '红包支出', '还款', '还贷',
];

const CATEGORY_KEYWORDS: Array<{ value: string; keywords: string[] }> = [
  { value: 'salary', keywords: ['工资', '薪资', '薪酬', '奖金', '津贴', '代发'] },
  { value: 'food', keywords: ['餐饮', '外卖', '吃饭', '美团', '饿了么', '餐厅', '食堂', '咖啡', '奶茶', '超市', '便利店'] },
  { value: 'transport', keywords: ['交通', '地铁', '公交', '打车', '滴滴', '出租车', '加油', '高铁', '火车', '机票', '航空'] },
  { value: 'shopping', keywords: ['购物', '淘宝', '天猫', '京东', '拼多多', '唯品会', '商店', '商城', '服装', '鞋'] },
  { value: 'housing', keywords: ['房租', '物业', '水电', '燃气', '供暖', '家居'] },
  { value: 'entertainment', keywords: ['娱乐', '电影', '游戏', '会员', '视频', '音乐', 'KTV', '景点', '旅游'] },
  { value: 'medical', keywords: ['医疗', '医院', '诊所', '药店', '药房', '挂号', '体检'] },
  { value: 'education', keywords: ['教育', '学费', '课程', '培训', '书本', '学习', '考试'] },
  { value: 'transfer', keywords: ['转账', '汇款', '转帐'] },
];

function guessCategory(text: string): string {
  for (const item of CATEGORY_KEYWORDS) {
    if (item.keywords.some((k) => text.includes(k))) return item.value;
  }
  return 'other';
}

function detectDirection(text: string): 'income' | 'expense' | null {
  // 先处理组合关键词，避免“收到转账”被判成支出
  if (INCOME_KEYWORDS.some((k) => text.includes(k))) return 'income';
  if (EXPENSE_KEYWORDS.some((k) => text.includes(k))) return 'expense';
  // 纯“转账”按上下文：向/给…转账=支出；来自/收到=收入
  if (text.includes('转账') || text.includes('转帐')) {
    if (/(向|给|转给).{0,20}转账/.test(text)) return 'expense';
    if (/(来自|收到).{0,20}转账/.test(text)) return 'income';
    return 'expense'; // 默认视为支出，更保守
  }
  return null;
}

function extractAmount(text: string): string | null {
  // 匹配 ¥12.34 / 人民币12.34元 / 12.34元 / 12.34
  const patterns = [
    /[¥￥]\s*([0-9][0-9,]*(?:\.[0-9]{1,2})?)/,
    /人民币\s*([0-9][0-9,]*(?:\.[0-9]{1,2})?)/,
    /([0-9][0-9,]*(?:\.[0-9]{1,2})?)\s*元/,
    /([0-9][0-9,]*(?:\.[0-9]{1,2})?)/,
  ];
  for (const pattern of patterns) {
    const m = text.match(pattern);
    if (m?.[1]) {
      const cleaned = m[1].replace(/,/g, '');
      const num = Number(cleaned);
      if (!Number.isNaN(num) && num > 0) return num.toFixed(2);
    }
  }
  return null;
}

function extractDate(text: string): string | null {
  // 2026-11-01 / 2026/11/01 / 2026年11月1日
  const full = text.match(/(\d{4})[年\/\-.](\d{1,2})[月\/\-.](\d{1,2})[日号]?/);
  if (full) {
    const y = full[1];
    const m = full[2].padStart(2, '0');
    const d = full[3].padStart(2, '0');
    return `${y}-${m}-${d}`;
  }
  // 11月1日 / 11月01日
  const short = text.match(/(\d{1,2})月(\d{1,2})[日号]?/);
  if (short) {
    const now = new Date();
    const y = now.getFullYear();
    const m = short[1].padStart(2, '0');
    const d = short[2].padStart(2, '0');
    // 若解析出的月份大于当前月份，视为去年（短信常见跨年场景）
    if (Number(short[1]) > now.getMonth() + 1) {
      return `${y - 1}-${m}-${d}`;
    }
    return `${y}-${m}-${d}`;
  }
  // 今天 / 昨日
  if (text.includes('今天')) {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  }
  if (text.includes('昨日') || text.includes('昨天')) {
    const now = new Date();
    now.setDate(now.getDate() - 1);
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  }
  return null;
}

function extractDescription(text: string, type: 'income' | 'expense'): string {
  let desc = '';
  if (type === 'income') {
    const from = text.match(/来自(.{1,20}?)(?:的)?(?:转账|付款|收款|转入)/);
    const payee = text.match(/(?:收到|收款|入账)(.{1,15}?)(?:转账|付款|支付)/);
    if (from?.[1]) desc = from[1].trim();
    else if (payee?.[1]) desc = payee[1].trim();
    else if (text.includes('工资')) desc = '工资收入';
    else if (text.includes('退款')) desc = '退款入账';
  } else {
    const to = text.match(/向(.{1,20}?)(?:转账|付款|支付)/);
    const merchantParen = text.match(/消费(?:人民币)?\s*[¥￥]?\s*[0-9][0-9,]*(?:\.[0-9]{1,2})?\s*元?\s*[（(](.{1,15})[)）]/);
    const merchantPlain = text.match(/消费(?:人民币)?\s*[¥￥]?\s*[0-9][0-9,]*(?:\.[0-9]{1,2})?\s*元?\s*(.{1,15}?)(?:余额|，|,|。|$)/);
    const payee2 = text.match(/(?:付款|支付)(.{1,15}?)(?:消费|[0-9])/);
    const action = text.match(/^(.{1,15}?)(?:扣款|扣费|缴费|充值|还款|付款|支付|消费|转账)/);
    if (to?.[1]) desc = to[1].trim();
    else if (merchantParen?.[1]) desc = merchantParen[1].trim();
    else if (merchantPlain?.[1]) desc = merchantPlain[1].trim();
    else if (payee2?.[1]) desc = payee2[1].trim();
    else if (action?.[1]) desc = action[1].trim();
  }
  // 清理常见前缀，保留关键信息
  return desc.replace(/^(今日|今天|昨日|昨天|您|我)/, '').trim();
}

/** 解析一条转账/收支短信，返回结构化记账信息。 */
export function parseTransfer(text: string): ParsedTransfer {
  const raw = String(text || '').trim();
  if (!raw) {
    return { matched: false, type: 'expense', amount: '', category: 'other', description: '', occurredAt: '', raw };
  }

  const type = detectDirection(raw);
  const amount = extractAmount(raw);
  const occurredAt = extractDate(raw) || new Date().toISOString().slice(0, 10);
  const category = guessCategory(raw);
  const description = extractDescription(raw, type || 'expense');

  if (!type || !amount) {
    return { matched: false, type: 'expense', amount: '', category, description, occurredAt, raw };
  }

  return {
    matched: true,
    type,
    amount,
    category,
    description: description || (type === 'income' ? '转账收入' : '转账支出'),
    occurredAt,
    raw,
  };
}

/** 判断一段文本是否“疑似转账/收支信息”（用于前端触发解析）。 */
export function looksLikeTransfer(text: string): boolean {
  return /(转账|转帐|收入|入账|到账|收款|支出|消费|付款|支付|扣款|扣费|工资|退款|汇款|存入|充值|缴费|还款)/.test(text);
}
