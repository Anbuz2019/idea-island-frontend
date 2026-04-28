import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties, type PointerEvent } from 'react';

type Point = { x: number; y: number };
type WorkspaceSummary = {
  topicName?: string;
  topicCount: number;
  activeInbox: number;
  activeLibrary: number;
  activeUnread: number;
  totalMaterials: number;
  totalInbox: number;
  totalLibrary: number;
  totalUnread: number;
};
type MaterialSummary = {
  id: number;
  title: string;
  status: 'INBOX' | 'PENDING_REVIEW' | 'COLLECTED' | 'ARCHIVED' | 'INVALID';
  score?: number | null;
  tagCount: number;
  hasComment: boolean;
  hasDescription: boolean;
};
type CompanionMode = 'quiet' | 'normal' | 'lively';

const WIDGET_WIDTH = 210;
const WIDGET_HEIGHT = 302;
const POSITION_KEY = 'idea-island-live2d-position';
const POSITION_VERSION_KEY = 'idea-island-live2d-position-version';
const POSITION_VERSION = 3;
const HIDDEN_KEY = 'idea-island-live2d-hidden';
const SCALE_KEY = 'idea-island-live2d-scale';
const MODE_KEY = 'idea-island-live2d-mode';
const BRIEF_DATE_KEY = 'idea-island-live2d-brief-date';
const ACHIEVEMENT_KEY = 'idea-island-live2d-achievement';
const STATIC_MASCOT_URL = '/mascot/xingxian-mascot.png';
const ANIMATED_MASCOT_URL = '/mascot/xingxian-mascot-animated.png';
const ANIMATION_DURATION_MS = 1700;
const REST_REMINDER_MS = 45 * 60 * 1000;
const MIN_SCALE = 0.7;
const MAX_SCALE = 1.3;
const SCALE_STEP = 0.1;
const ACHIEVEMENT_STEPS = [10, 30, 50, 100, 200, 500, 1000];

const idleLines = [
  '灵感频道已连接。',
  '要不要把刚刚的想法记录下来？',
  '我可以陪你整理碎片资料。',
  '点子先收进来，后面再慢慢沉淀。',
  '看到有价值的内容，先收进来不会亏。',
  '今天也可以给资料做一点点整理。',
  '标签不用一次想完，先分组就很有帮助。',
  '我在这里，随时帮你盯着灵感流。',
];

const praiseLines = [
  '你已经在把零散信息变成自己的资料库了，很厉害。',
  '今天整理一点点，未来检索时就会轻松很多。',
  '能持续沉淀资料，本身就是很强的工作能力。',
  '这条资料被认真处理后，就不再只是路过的信息啦。',
  '你正在搭一座可复用的知识岛，稳稳推进就好。',
  '先收集、再判断、再沉淀，这个节奏很专业。',
  '每次给资料补上标签，都是在帮未来的自己省时间。',
  '已经做得不错了，剩下的慢慢整理也来得及。',
];

const cuteLines = [
  '沐沐的雷达响了：附近有一只野生好点子。',
  '如果灵感会发光，那这里现在有点亮。',
  '资料太多不要怕，沐沐先帮你眨眼压压惊。',
  '这个标签看起来很有精神，给它安排个位置吧。',
  '我不是在偷懒，我是在进行后台卖萌计算。',
  '点子先别跑，排队进收件箱。',
  '今天的资料也在努力变得井井有条。',
  '沐沐提醒：喝水、眨眼、保存灵感，三件事都重要。',
  '谁说我像唱歌的人鱼法师来着？',
  '一天，一天，贴近你的心❤~',
  '我们一起看月亮爬~上~来~',
  '你开心❤，我~安心~🤗',
];

const dailyLines = [
  '坐久了可以伸个懒腰，沐沐帮你守着这里。',
  '今天有没有好好吃饭？先照顾自己也很重要。',
  '天气不管怎么样，桌边放杯水总是没错的。',
  '眼睛有点累的话，可以看远处二十秒。',
  '如果今天已经很努力了，就允许自己慢一点。',
  '沐沐觉得，舒服的椅子也是生产力的一部分。',
  '工作间隙听首喜欢的歌，心情会顺一点。',
  '桌面乱一点也没关系，思路清楚就很好。',
  '先深呼吸一下，再继续处理手上的事情。',
  '今天的小目标可以小一点，但要真实完成。',
  '如果卡住了，换杯水回来也许就顺了。',
  '沐沐正在认真陪班，没有摸鱼，只是表情比较可爱。',
  '夜深的时候，别和困难硬碰硬，明天也可以继续。',
  '偶尔发呆不是浪费时间，脑子也需要缓存。',
  '今天也辛苦啦，能坐到这里已经很不容易。',
  '沐沐刚刚认真待机了三分钟，应该也算努力吧。',
  '如果今天有点累，那就先把事情切成小小一块。',
  '我想喝奶茶，但我只是一个桌面小助手。',
  '刚才那一下不是发呆，是在加载可爱能量。',
  '你忙你的，我在旁边安静冒泡。',
  '要是心情有点乱，可以先把桌上的东西摆正一点。',
  '沐沐宣布：现在适合奖励自己一口喜欢的东西。',
  '有些事情慢慢做也没关系，进度条还在往前走。',
  '我会乖乖待在这里，不突然打扰你的节奏。',
  '今天的你已经完成了很多看不见的小任务。',
  '如果不知道先做什么，就先做最容易开始的那一件。',
  '沐沐的今日状态：精神满格，偶尔想吃甜点。',
  '休息不是暂停人生，是给下一段路充电。',
  '你看起来需要一点点夸夸，沐沐已经准备好了。',
  '别急，很多事情都是先乱一下，才慢慢变清楚。',
  '如果可以的话，今天也请对自己温柔一点。',
  '沐沐正在练习成熟稳重，但可爱部分暂时藏不住。',
  '屏幕前的人类，请查收一份小小的元气补给。',
];

const actionLines = [
  '位置已经保存。',
  '这里视野不错。',
  '收到新的灵感信号。',
  '资料整理也可以很轻松。',
  '嗯，我动起来了。',
  '这里也不错，我先待一会儿。',
  '已经记住这个位置啦。',
];

const tipLines = [
  '小提示：资料先放收件箱，确认有价值后再收录。',
  '小提示：评分可以代表复看优先级，不一定是内容质量。',
  '小提示：标签组适合表达维度，标签适合表达具体判断。',
  '小提示：搜索时可以把关键词、类型和标签组合起来。',
  '小提示：已归档资料适合放暂时不用、但以后可能回看的内容。',
];

const greetingLines = [
  '欢迎回来，今天也来整理一点灵感吧。',
  '工作台已就绪，我会安静陪着你。',
  '灵感岛已连接，先从最重要的资料开始吧。',
];

const hoverLines = [
  '我在。',
  '需要我给点整理建议吗？',
  '点我可以换一句提示。',
  '双击我也可以互动哦。',
];

const pageLines: Record<string, string[]> = {
  收件箱: ['这里适合处理刚收进来的资料。', '未读资料可以先快速扫一遍，再决定是否收录。'],
  资料库: ['资料库适合回看和沉淀。', '按评分或最近加入排序，能更快找到值得复看的内容。'],
  搜索: ['搜索时可以把关键词、类型和标签组合起来。', '标签条件越清晰，结果越容易收敛。'],
  主题设置: ['主题下面是标签组，标签组下面才是标签。', '单选组适合阶段，多选组适合特征。'],
  统计: ['统计页会更适合观察长期沉淀情况。', '数据积累起来后，这里会更有价值。'],
  灵感助手: ['灵感助手还在开发中，我先陪你值班。', '以后这里可以围绕资料直接对话。'],
  个人中心: ['这里可以调整主题色、明暗模式和界面风格。', '外观设置会被记住，下次打开还会保留。'],
  失效资料: ['失效资料放在这里，避免干扰正常资料库。', '需要时可以把资料恢复回来继续整理。'],
};

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function randomLine<T>(lines: T[]) {
  return lines[Math.floor(Math.random() * lines.length)] ?? lines[0];
}

function timeGreeting() {
  const hour = new Date().getHours();
  if (hour < 6) return '夜深了，整理资料可以轻一点。';
  if (hour < 11) return '早上好，适合先处理最重要的资料。';
  if (hour < 14) return '午间也可以做一点轻整理。';
  if (hour < 18) return '下午好，适合把零散资料归类一下。';
  return '晚上好，回看资料时别太累。';
}

function workStatusLines(summary?: WorkspaceSummary) {
  if (!summary) return ['我还在读取你的工作台近况。'];
  const topicName = summary.topicName || '当前主题';
  const lines = [
    `现在共有 ${summary.topicCount} 个主题，累计 ${summary.totalMaterials} 条资料。`,
    `${topicName} 里有 ${summary.activeInbox} 条收件箱资料、${summary.activeLibrary} 条已沉淀资料。`,
    `全部主题里还有 ${summary.totalInbox} 条资料等待处理。`,
    `资料库已经沉淀 ${summary.totalLibrary} 条内容，回看时会很方便。`,
  ];
  if (summary.activeUnread > 0) {
    lines.push(`${topicName} 还有 ${summary.activeUnread} 条未读资料，可以先快速扫一遍。`);
  }
  if (summary.totalUnread > 0) {
    lines.push(`全部工作区合计 ${summary.totalUnread} 条未读资料，慢慢处理就好。`);
  }
  if (summary.totalMaterials === 0) {
    lines.push('资料库还很清爽，可以从第一条链接或图片开始收集。');
  }
  if (summary.totalInbox === 0 && summary.totalMaterials > 0) {
    lines.push('当前待处理资料不多，很适合做一轮复盘。');
  }
  return lines;
}

function dailyBriefLine(summary?: WorkspaceSummary) {
  if (!summary) return '今天的工作台还在加载，沐沐稍后再汇报。';
  const topicName = summary.topicName || '当前主题';
  return `今日简报：${topicName} 有 ${summary.activeInbox} 条待处理、${summary.activeLibrary} 条已沉淀，全部主题还有 ${summary.totalUnread} 条未读。`;
}

function materialAdviceLines(material?: MaterialSummary) {
  if (!material) return ['选中一条资料后，沐沐可以给你一点处理建议。'];
  const title = material.title ? `《${material.title.slice(0, 18)}${material.title.length > 18 ? '...' : ''}》` : '这条资料';
  const lines: string[] = [];
  if (material.status === 'INBOX' || material.status === 'PENDING_REVIEW') {
    lines.push(`${title} 还在收件箱，可以补上评分、评语和标签后再收录。`);
    if (!material.hasComment) lines.push(`${title} 还没有评语，写一句复看理由会很有用。`);
    if (!material.hasDescription) lines.push(`${title} 还缺少描述，可以补一句它为什么值得保留。`);
  }
  if (material.status === 'COLLECTED') {
    lines.push(`${title} 已经收录，可以继续补标签，或者评估是否归档。`);
    if (material.score == null) lines.push(`${title} 还没有评分，可以给它一个复看优先级。`);
    if (!material.hasComment) lines.push(`${title} 已收录但没有评语，未来回看时可能不太好判断价值。`);
  }
  if (material.status === 'ARCHIVED') {
    lines.push(`${title} 已归档，适合当作长期资料安静沉淀。`);
  }
  if (material.status === 'INVALID') {
    lines.push(`${title} 当前已失效，需要时可以恢复后重新整理。`);
  }
  if (material.tagCount === 0 && material.status !== 'INVALID') {
    lines.push(`${title} 还没有用户标签，补一个标签会更容易被搜到。`);
  }
  return lines;
}

function modeLabel(mode: CompanionMode) {
  if (mode === 'quiet') return '安静';
  if (mode === 'lively') return '活泼';
  return '标准';
}

function modeInterval(mode: CompanionMode) {
  if (mode === 'quiet') return 36_000;
  if (mode === 'lively') return 12_000;
  return 20_000;
}

function nextMode(mode: CompanionMode): CompanionMode {
  if (mode === 'normal') return 'lively';
  if (mode === 'lively') return 'quiet';
  return 'normal';
}

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

function safeRead<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) as T : fallback;
  } catch {
    return fallback;
  }
}

function safeWrite<T>(key: string, value: T) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Local storage is optional for this decorative widget.
  }
}

function widgetWidth(scale: number) {
  return WIDGET_WIDTH * scale;
}

function widgetHeight(scale: number) {
  return WIDGET_HEIGHT * scale;
}

function defaultPosition(scale = 1): Point {
  return {
    x: 24,
    y: Math.max(12, window.innerHeight - widgetHeight(scale) - 54),
  };
}

function FallbackCharacter() {
  return (
    <div className="live2d-fallback-character" aria-hidden="true">
      <div className="anime-character">
        <span className="anime-hair anime-hair-back" />
        <span className="anime-face" />
        <span className="anime-bang bang-left" />
        <span className="anime-bang bang-right" />
        <span className="anime-eye eye-left" />
        <span className="anime-eye eye-right" />
        <span className="anime-blush blush-left" />
        <span className="anime-blush blush-right" />
        <span className="anime-smile" />
        <span className="anime-neck" />
        <span className="anime-body" />
        <span className="anime-collar collar-left" />
        <span className="anime-collar collar-right" />
        <span className="anime-arm arm-left" />
        <span className="anime-arm arm-right" />
        <span className="anime-tablet" />
        <span className="anime-skirt" />
        <span className="anime-leg leg-left" />
        <span className="anime-leg leg-right" />
      </div>
    </div>
  );
}

export function XingxianLive2DWidget({
  viewLabel,
  captureOpen,
  noticeText,
  workspaceSummary,
  materialSummary,
}: {
  viewLabel?: string;
  captureOpen?: boolean;
  noticeText?: string;
  workspaceSummary?: WorkspaceSummary;
  materialSummary?: MaterialSummary;
}) {
  const bubbleTimerRef = useRef<number | undefined>(undefined);
  const animationTimerRef = useRef<number | undefined>(undefined);
  const hoverTimerRef = useRef<number | undefined>(undefined);
  const speakingRef = useRef(false);
  const lastViewRef = useRef<string | undefined>(viewLabel);
  const lastNoticeRef = useRef<string | undefined>(noticeText);
  const lastUnreadRef = useRef<number | undefined>(workspaceSummary?.activeUnread);
  const lastMaterialRef = useRef<number | undefined>(materialSummary?.id);
  const dragRef = useRef({ dragging: false, startX: 0, startY: 0, originX: 0, originY: 0 });
  const [bubble, setBubble] = useState('我是沐沐，灵感岛看板助手。');
  const [bubbleVisible, setBubbleVisible] = useState(true);
  const [hidden, setHidden] = useState(() => safeRead(HIDDEN_KEY, false));
  const [mascotFailed, setMascotFailed] = useState(false);
  const [animating, setAnimating] = useState(false);
  const [animationKey, setAnimationKey] = useState(0);
  const [mode, setMode] = useState<CompanionMode>(() => safeRead(MODE_KEY, 'normal' as CompanionMode));
  const [scale, setScaleState] = useState(() => clamp(safeRead(SCALE_KEY, 1), MIN_SCALE, MAX_SCALE));
  const [position, setPositionState] = useState<Point>(() => {
    if (typeof window === 'undefined') return { x: 24, y: 24 };
    const initialScale = clamp(safeRead(SCALE_KEY, 1), MIN_SCALE, MAX_SCALE);
    const positionVersion = safeRead(POSITION_VERSION_KEY, 0);
    if (positionVersion < POSITION_VERSION) {
      const next = defaultPosition(initialScale);
      safeWrite(POSITION_KEY, next);
      safeWrite(POSITION_VERSION_KEY, POSITION_VERSION);
      return next;
    }
    return safeRead(POSITION_KEY, defaultPosition(initialScale));
  });

  const setPosition = useCallback((next: Point) => {
    const safe = {
      x: clamp(next.x, 8, Math.max(8, window.innerWidth - widgetWidth(scale) - 8)),
      y: clamp(next.y, 8, Math.max(8, window.innerHeight - widgetHeight(scale) - 8)),
    };
    setPositionState(safe);
    safeWrite(POSITION_KEY, safe);
    safeWrite(POSITION_VERSION_KEY, POSITION_VERSION);
  }, [scale]);

  const setScale = useCallback((next: number) => {
    const safe = Math.round(clamp(next, MIN_SCALE, MAX_SCALE) * 10) / 10;
    setScaleState(safe);
    safeWrite(SCALE_KEY, safe);
    setPositionState((current) => {
      const nextPosition = {
        x: clamp(current.x, 8, Math.max(8, window.innerWidth - widgetWidth(safe) - 8)),
        y: clamp(current.y, 8, Math.max(8, window.innerHeight - widgetHeight(safe) - 8)),
      };
      safeWrite(POSITION_KEY, nextPosition);
      return nextPosition;
    });
  }, []);

  const showSpeech = useCallback((text: string, duration = 3600) => {
    speakingRef.current = true;
    setBubble(text);
    setBubbleVisible(true);
    setAnimating(true);
    setAnimationKey((current) => current + 1);
    if (bubbleTimerRef.current) window.clearTimeout(bubbleTimerRef.current);
    if (animationTimerRef.current) window.clearTimeout(animationTimerRef.current);
    bubbleTimerRef.current = window.setTimeout(() => {
      speakingRef.current = false;
      setBubbleVisible(false);
    }, duration);
    animationTimerRef.current = window.setTimeout(() => {
      setAnimating(false);
    }, ANIMATION_DURATION_MS);
  }, []);

  const speak = useCallback((text: string, duration = 3600, force = false) => {
    if (speakingRef.current && !force) {
      return;
    }
    showSpeech(text, duration);
  }, [showSpeech]);

  const playAnimation = useCallback(() => {
    setAnimating(true);
    setAnimationKey((current) => current + 1);
    if (animationTimerRef.current) window.clearTimeout(animationTimerRef.current);
    animationTimerRef.current = window.setTimeout(() => {
      setAnimating(false);
    }, ANIMATION_DURATION_MS);
  }, []);

  const resetPosition = useCallback(() => {
    setPosition(defaultPosition(scale));
    playAnimation();
    speak('已经回到默认位置。', 3600, true);
  }, [playAnimation, scale, setPosition, speak]);

  const speakTip = useCallback(() => {
    const groups = [
      tipLines,
      praiseLines,
      cuteLines,
      dailyLines,
      workStatusLines(workspaceSummary),
      materialAdviceLines(materialSummary),
    ];
    speak(randomLine(randomLine(groups)), 5600, true);
  }, [materialSummary, speak, workspaceSummary]);

  const onWidgetEnter = useCallback(() => {
    if (hoverTimerRef.current) window.clearTimeout(hoverTimerRef.current);
    hoverTimerRef.current = window.setTimeout(() => {
      speak(randomLine(hoverLines), 3000, true);
    }, 700);
  }, [speak]);

  const onWidgetLeave = useCallback(() => {
    if (hoverTimerRef.current) window.clearTimeout(hoverTimerRef.current);
  }, []);

  useEffect(() => () => {
    if (bubbleTimerRef.current) window.clearTimeout(bubbleTimerRef.current);
    if (animationTimerRef.current) window.clearTimeout(animationTimerRef.current);
    if (hoverTimerRef.current) window.clearTimeout(hoverTimerRef.current);
    speakingRef.current = false;
  }, []);

  useEffect(() => {
    if (hidden) return;
    const timer = window.setTimeout(() => {
      const today = todayKey();
      if (safeRead(BRIEF_DATE_KEY, '') !== today && workspaceSummary) {
        safeWrite(BRIEF_DATE_KEY, today);
        speak(`${randomLine(greetingLines)}${timeGreeting()} ${dailyBriefLine(workspaceSummary)}`, 7200);
        return;
      }
      speak(`${randomLine(greetingLines)}${timeGreeting()}`, 5200);
    }, 650);
    return () => window.clearTimeout(timer);
  }, [hidden, speak, workspaceSummary]);

  useEffect(() => {
    if (hidden) return;
    const timer = window.setInterval(() => {
      const groups = [
        idleLines,
        praiseLines,
        cuteLines,
        dailyLines,
        workStatusLines(workspaceSummary),
        materialAdviceLines(materialSummary),
      ];
      speak(randomLine(randomLine(groups)));
    }, modeInterval(mode));
    return () => window.clearInterval(timer);
  }, [hidden, materialSummary, mode, speak, workspaceSummary]);

  useEffect(() => {
    if (hidden || mode === 'quiet') return;
    const timer = window.setInterval(() => {
      speak(randomLine([
        '休息提醒：起来活动一下，眼睛也看看远处。',
        '沐沐提醒你喝一口水，再回来继续也不迟。',
        '坐太久啦，肩颈可以轻轻放松一下。',
      ]), 5600);
    }, REST_REMINDER_MS);
    return () => window.clearInterval(timer);
  }, [hidden, mode, speak]);

  useEffect(() => {
    if (hidden || !viewLabel || lastViewRef.current === viewLabel) return;
    lastViewRef.current = viewLabel;
    const lines = pageLines[viewLabel] ?? [`现在位于${viewLabel}。`];
    speak(randomLine(lines), 4400, true);
  }, [hidden, speak, viewLabel]);

  useEffect(() => {
    if (hidden || !workspaceSummary) return;
    const currentUnread = workspaceSummary.activeUnread;
    const previousUnread = lastUnreadRef.current;
    lastUnreadRef.current = currentUnread;
    if (previousUnread === undefined || currentUnread <= 0 || currentUnread === previousUnread) return;
    speak(`${workspaceSummary.topicName || '当前主题'} 现在有 ${currentUnread} 条未读资料，点开资料后我会帮你记成已读。`, 5600);
  }, [hidden, speak, workspaceSummary]);

  useEffect(() => {
    if (hidden || !materialSummary || lastMaterialRef.current === materialSummary.id) return;
    lastMaterialRef.current = materialSummary.id;
    const lines = materialAdviceLines(materialSummary);
    speak(randomLine(lines), 5600, true);
  }, [hidden, materialSummary, speak]);

  useEffect(() => {
    if (hidden || !workspaceSummary) return;
    const reached = ACHIEVEMENT_STEPS.filter((step) => workspaceSummary.totalMaterials >= step).pop();
    if (!reached) return;
    const saved = safeRead(ACHIEVEMENT_KEY, 0);
    if (saved >= reached) return;
    safeWrite(ACHIEVEMENT_KEY, reached);
    speak(`小成就达成：资料库累计 ${workspaceSummary.totalMaterials} 条资料啦，沐沐给你认真鼓掌。`, 6600);
  }, [hidden, speak, workspaceSummary]);

  useEffect(() => {
    if (hidden || !captureOpen) return;
    speak('正在采集资料。带星号的是必填项，图片也可以直接粘贴。', 5200);
  }, [captureOpen, hidden, speak]);

  useEffect(() => {
    if (hidden || !noticeText || lastNoticeRef.current === noticeText) return;
    lastNoticeRef.current = noticeText;
    speak(`${noticeText}。我已经看到结果啦。`, 4200);
  }, [hidden, noticeText, speak]);

  useEffect(() => {
    const handleResize = () => setPosition(position);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [position, setPosition]);

  const onDragPointerDown = useCallback((event: PointerEvent<HTMLDivElement>) => {
    event.currentTarget.setPointerCapture(event.pointerId);
    playAnimation();
    dragRef.current = {
      dragging: true,
      startX: event.clientX,
      startY: event.clientY,
      originX: position.x,
      originY: position.y,
    };
  }, [playAnimation, position.x, position.y]);

  const onDragPointerMove = useCallback((event: PointerEvent<HTMLDivElement>) => {
    if (!dragRef.current.dragging) return;
    setPosition({
      x: dragRef.current.originX + event.clientX - dragRef.current.startX,
      y: dragRef.current.originY + event.clientY - dragRef.current.startY,
    });
  }, [setPosition]);

  const onDragPointerUp = useCallback((event: PointerEvent<HTMLDivElement>) => {
    if (!dragRef.current.dragging) return;
    event.currentTarget.releasePointerCapture(event.pointerId);
    dragRef.current.dragging = false;
    playAnimation();
    speak(randomLine(actionLines), 3600, true);
  }, [playAnimation, speak]);

  const style = useMemo<CSSProperties>(() => ({
    width: widgetWidth(scale),
    height: widgetHeight(scale),
    left: position.x,
    top: position.y,
  }), [position.x, position.y, scale]);
  const bubbleOnRight = position.x < 360;

  if (hidden) {
    return (
      <button
        type="button"
        className="live2d-launcher"
        onClick={() => {
          setHidden(false);
          safeWrite(HIDDEN_KEY, false);
          playAnimation();
          speak('我回来啦。', 3600, true);
        }}
      >
        沐沐
      </button>
    );
  }

  return (
    <section
      className={`live2d-widget ${bubbleOnRight ? 'bubble-right' : ''}`}
      style={style}
      aria-label="沐沐 GIF 看板娘"
      onMouseEnter={onWidgetEnter}
      onMouseLeave={onWidgetLeave}
      onDoubleClick={() => {
        playAnimation();
        speakTip();
      }}
    >
      <div
        className="live2d-drag-handle"
        onPointerDown={onDragPointerDown}
        onPointerMove={onDragPointerMove}
        onPointerUp={onDragPointerUp}
        onPointerCancel={onDragPointerUp}
        title="拖拽移动沐沐"
      >
        <span className="live2d-dot" />
        <span className="live2d-name">沐沐</span>
      </div>

      <div className={`live2d-bubble ${bubbleVisible ? 'is-visible' : ''}`}>{bubble}</div>

      <div className="live2d-toolbar" aria-label="沐沐操作">
        <button
          type="button"
          onClick={() => {
            playAnimation();
            speakTip();
          }}
          title="整理建议"
        >
          ✦
        </button>
        <button
          type="button"
          onClick={() => {
            const next = nextMode(mode);
            setMode(next);
            safeWrite(MODE_KEY, next);
            playAnimation();
            speak(`陪伴模式切换为${modeLabel(next)}。`, 3600, true);
          }}
          title={`陪伴模式：${modeLabel(mode)}`}
        >
          {mode === 'quiet' ? '静' : mode === 'lively' ? '跃' : '常'}
        </button>
        <button type="button" onClick={resetPosition} title="回到默认位置">⌂</button>
        <button
          type="button"
          disabled={scale <= MIN_SCALE}
          onClick={() => {
            setScale(scale - SCALE_STEP);
            playAnimation();
            speak('我变小一点，少挡住你的资料。', 3600, true);
          }}
          title="缩小"
        >
          -
        </button>
        <button
          type="button"
          disabled={scale >= MAX_SCALE}
          onClick={() => {
            setScale(scale + SCALE_STEP);
            playAnimation();
            speak('我变大一点，这样更容易看到我。', 3600, true);
          }}
          title="放大"
        >
          +
        </button>
        <button
          type="button"
          onClick={() => {
            speak('我先收起来，需要时右下角叫我。', 3600, true);
            setHidden(true);
            safeWrite(HIDDEN_KEY, true);
          }}
          title="隐藏"
        >
          ×
        </button>
      </div>

      {mascotFailed ? (
        <FallbackCharacter />
      ) : (
        <img
          className="live2d-mascot-image"
          key={animating ? `animated-${animationKey}` : 'static'}
          src={animating ? ANIMATED_MASCOT_URL : STATIC_MASCOT_URL}
          alt=""
          draggable={false}
          onClick={() => {
            playAnimation();
            speak(randomLine([...actionLines, ...tipLines, ...praiseLines, ...cuteLines, ...dailyLines, ...materialAdviceLines(materialSummary)]), 3600, true);
          }}
          onError={() => setMascotFailed(true)}
        />
      )}
    </section>
  );
}
