// 评分体系词典（来源：个人写作风格分析系统技术文档 第 6 节）
// 所有词典均按"长词优先"匹配，避免短词误命中（如"我"命中"我们"）

// 口语词
export const COLLOQUIAL_WORDS = [
  "其实",
  "就是",
  "感觉",
  "挺",
  "蛮",
  "真的",
  "有点",
  "怎么说",
  "说白了",
  "某种程度上",
];

// 书面词
export const FORMAL_WORDS = [
  "因此",
  "然而",
  "此外",
  "由此可见",
  "综上",
  "换言之",
  "进一步而言",
  "相较于",
];

// AI 腔词语
export const AI_CLICHE_WORDS = [
  "赋能",
  "闭环",
  "提升效率",
  "降本增效",
  "深度挖掘",
  "全方位",
  "多维度",
  "显著提升",
  "至关重要",
  "不可或缺",
  "综上所述",
  "值得注意的是",
  "不难发现",
  "众所周知",
  "在当今社会",
];

// 转折词
export const CONTRAST_WORDS = [
  "但是",
  "但",
  "不过",
  "然而",
  "可",
  "问题是",
  "真正的问题是",
];

// 因果词
export const CAUSAL_WORDS = [
  "因为",
  "所以",
  "因此",
  "导致",
  "意味着",
  "原因是",
];

// 递进词
export const PROGRESSIVE_WORDS = [
  "而且",
  "进一步",
  "更重要的是",
  "不只是",
  "甚至",
];

// 总结词
export const SUMMARY_WORDS = [
  "总之",
  "归根结底",
  "说白了",
  "简单来说",
  "总结一下",
];

// 举例词
export const EXAMPLE_WORDS = [
  "比如",
  "例如",
  "举个例子",
  "拿",
];

// 模糊限定词
export const HEDGING_WORDS = [
  "可能",
  "大概",
  "某种程度上",
  "不一定",
  "相对来说",
  "我倾向于认为",
];

// 第一人称单数
export const FIRST_PERSON_SINGULAR = [
  "对我来说",
  "我自己",
  "我的",
  "我",
];

// 第一人称复数
export const FIRST_PERSON_PLURAL = ["我们", "咱们", "我们的"];

// 第二人称
export const SECOND_PERSON = ["你们", "你的", "大家", "各位", "你"];

// 自我经验表达
export const SELF_EXPERIENCE = [
  "我发现",
  "我觉得",
  "我认为",
  "我遇到",
  "我的经验是",
  "我之前",
];

// 读者指向表达
export const READER_POINTING = [
  "你会发现",
  "你可能会",
  "如果你",
  "你需要",
  "你可以",
];

// 强判断词
export const STRONG_JUDGMENT_WORDS = [
  "一定",
  "必须",
  "绝对",
  "显然",
  "毫无疑问",
  "肯定",
  "必然",
];

// 弱判断词
export const WEAK_JUDGMENT_WORDS = [
  "可能",
  "也许",
  "大概",
  "倾向于",
  "某种程度上",
  "不一定",
  "我猜",
];

// 建议词
export const SUGGESTION_WORDS = ["可以", "建议", "最好", "值得", "适合", "不妨"];

// 命令词
export const COMMAND_WORDS = ["必须", "不要", "立刻", "马上", "一定要", "千万别"];

// 负面词
export const NEGATIVE_WORDS = [
  "糟糕",
  "失败",
  "问题",
  "风险",
  "危险",
  "低效",
  "浪费",
];

// 正面词
export const POSITIVE_WORDS = [
  "优秀",
  "有效",
  "清晰",
  "稳定",
  "值得",
  "好用",
  "舒服",
];

// 夸张词
export const EXAGGERATION_WORDS = [
  "极其",
  "超级",
  "爆炸",
  "离谱",
  "震惊",
  "封神",
  "天花板",
];

export const HUMOR_WORDS = [
  "哈哈",
  "笑死",
  "离谱",
  "有意思",
  "好玩",
  "梗",
  "段子",
  "吐槽",
  "绷不住",
];

export const INFECTIOUS_WORDS = [
  "惊喜",
  "兴奋",
  "热爱",
  "值得",
  "相信",
  "希望",
  "一起",
  "期待",
  "打动",
  "共鸣",
];

// 问题触发词（开场判断）
export const QUESTION_TRIGGERS = [
  "为什么",
  "怎么",
  "是不是",
  "有没有",
  "到底",
  "难道",
];

// 结论先行词
export const CONCLUSION_TRIGGERS = [
  "我认为",
  "我的判断是",
  "核心是",
  "关键是",
  "结论是",
  "最重要的是",
];

// 故事开场词
export const STORY_TRIGGERS = [
  "昨天",
  "今天",
  "最近",
  "之前",
  "有一次",
  "我遇到",
  "我发现",
  "一个朋友",
];

// 反常识开场词
export const COUNTERINTUITIVE_TRIGGERS = [
  "很多人以为",
  "但其实",
  "真正的问题不是",
  "这件事反而",
  "我一开始也以为",
];

// 案例驱动词
export const CASE_DRIVER_WORDS = [
  "比如",
  "例如",
  "举个例子",
  "我之前",
  "我遇到",
  "一个朋友",
  "某公司",
];

// 数据驱动词
export const DATA_DRIVER_WORDS = [
  "%",
  "倍",
  "万",
  "亿",
  "美元",
  "人民币",
  "增长",
  "下降",
  "转化率",
  "成本",
];

// 概念驱动词
export const CONCEPT_DRIVER_WORDS = [
  "本质是",
  "核心是",
  "定义为",
  "所谓",
  "可以理解为",
];

// 问题驱动词
export const PROBLEM_DRIVER_WORDS = [
  "问题是",
  "难点是",
  "为什么",
  "怎么解决",
  "瓶颈",
  "风险",
];

// 方法论驱动词
export const METHOD_DRIVER_WORDS = [
  "第一步",
  "第二步",
  "方法",
  "体系",
  "框架",
  "流程",
  "路径",
  "策略",
];

// 中文停用词（用于高频词提取时过滤）
export const STOP_WORDS = new Set([
  "的",
  "了",
  "是",
  "在",
  "我",
  "有",
  "和",
  "就",
  "不",
  "人",
  "都",
  "一",
  "一个",
  "上",
  "也",
  "很",
  "到",
  "说",
  "要",
  "去",
  "你",
  "会",
  "着",
  "没有",
  "看",
  "好",
  "自己",
  "这",
  "那",
  "他",
  "她",
  "它",
  "我们",
  "他们",
  "但",
  "而",
  "与",
  "或",
  "把",
  "被",
  "让",
  "从",
  "向",
  "对",
  "为",
  "以",
  "于",
  "及",
  "等",
  "之",
  "其",
  "个",
  "里",
  "中",
  "下",
  "后",
  "前",
  "时",
  "地",
  "得",
]);
