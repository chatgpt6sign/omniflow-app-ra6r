import { parseTransfer, looksLikeTransfer } from './backend/services/transferParser';

const samples = [
  '您的尾号1234的银行卡于11月01日11:22收到转账收入人民币500.00元，余额1,000.00元。',
  '您尾号1234卡11月01日10:00向张三转账支出500.00元，余额1,000.00元。',
  '您尾号5678卡11月02日消费人民币50.00元（美团），余额200.00元。',
  '您的工资卡11月03日入账工资8,000.00元，余额8,500.00元。',
  '微信支付-转账收款300.00元，来自李四。',
  '支付宝向王五付款100.50元。',
  '您的退款入账100.00元（京东），余额500.00元。',
  '今日地铁出行扣款4.00元。',
  '你的订阅会员扣费25元。',
];

for (const s of samples) {
  const r = parseTransfer(s);
  console.log('---');
  console.log('文本:', s);
  console.log('触发:', looksLikeTransfer(s), '| 匹配:', r.matched, '| 类型:', r.type, '| 金额:', r.amount, '| 分类:', r.category, '| 日期:', r.occurredAt, '| 备注:', r.description);
}
