import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties, type PointerEvent } from 'react';

type Point = { x: number; y: number };

const WIDGET_WIDTH = 210;
const WIDGET_HEIGHT = 302;
const POSITION_KEY = 'idea-island-live2d-position';
const HIDDEN_KEY = 'idea-island-live2d-hidden';
const SCALE_KEY = 'idea-island-live2d-scale';
const STATIC_MASCOT_URL = '/mascot/xingxian-mascot.png';
const ANIMATED_MASCOT_URL = '/mascot/xingxian-mascot-animated.png';
const ANIMATION_DURATION_MS = 1700;
const MIN_SCALE = 0.7;
const MAX_SCALE = 1.3;
const SCALE_STEP = 0.1;

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

function randomLine(lines: string[]) {
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
    x: Math.max(12, window.innerWidth - widgetWidth(scale) - 24),
    y: Math.max(12, window.innerHeight - widgetHeight(scale) - 24),
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
}: {
  viewLabel?: string;
  captureOpen?: boolean;
  noticeText?: string;
}) {
  const bubbleTimerRef = useRef<number | undefined>(undefined);
  const animationTimerRef = useRef<number | undefined>(undefined);
  const hoverTimerRef = useRef<number | undefined>(undefined);
  const lastViewRef = useRef<string | undefined>(viewLabel);
  const lastNoticeRef = useRef<string | undefined>(noticeText);
  const dragRef = useRef({ dragging: false, startX: 0, startY: 0, originX: 0, originY: 0 });
  const [bubble, setBubble] = useState('我是沐沐，灵感岛看板助手。');
  const [bubbleVisible, setBubbleVisible] = useState(true);
  const [hidden, setHidden] = useState(() => safeRead(HIDDEN_KEY, false));
  const [mascotFailed, setMascotFailed] = useState(false);
  const [animating, setAnimating] = useState(false);
  const [animationKey, setAnimationKey] = useState(0);
  const [scale, setScaleState] = useState(() => clamp(safeRead(SCALE_KEY, 1), MIN_SCALE, MAX_SCALE));
  const [position, setPositionState] = useState<Point>(() => {
    if (typeof window === 'undefined') return { x: 24, y: 24 };
    const initialScale = clamp(safeRead(SCALE_KEY, 1), MIN_SCALE, MAX_SCALE);
    return safeRead(POSITION_KEY, defaultPosition(initialScale));
  });

  const setPosition = useCallback((next: Point) => {
    const safe = {
      x: clamp(next.x, 8, Math.max(8, window.innerWidth - widgetWidth(scale) - 8)),
      y: clamp(next.y, 8, Math.max(8, window.innerHeight - widgetHeight(scale) - 8)),
    };
    setPositionState(safe);
    safeWrite(POSITION_KEY, safe);
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

  const speak = useCallback((text: string, duration = 3600) => {
    setBubble(text);
    setBubbleVisible(true);
    setAnimating(true);
    setAnimationKey((current) => current + 1);
    if (bubbleTimerRef.current) window.clearTimeout(bubbleTimerRef.current);
    if (animationTimerRef.current) window.clearTimeout(animationTimerRef.current);
    bubbleTimerRef.current = window.setTimeout(() => setBubbleVisible(false), duration);
    animationTimerRef.current = window.setTimeout(() => {
      setAnimating(false);
    }, ANIMATION_DURATION_MS);
  }, []);

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
    speak('已经回到右下角。');
  }, [playAnimation, scale, setPosition, speak]);

  const speakTip = useCallback(() => {
    speak(randomLine(tipLines), 5600);
  }, [speak]);

  const onWidgetEnter = useCallback(() => {
    if (hoverTimerRef.current) window.clearTimeout(hoverTimerRef.current);
    hoverTimerRef.current = window.setTimeout(() => {
      speak(randomLine(hoverLines), 3000);
    }, 700);
  }, [speak]);

  const onWidgetLeave = useCallback(() => {
    if (hoverTimerRef.current) window.clearTimeout(hoverTimerRef.current);
  }, []);

  useEffect(() => () => {
    if (bubbleTimerRef.current) window.clearTimeout(bubbleTimerRef.current);
    if (animationTimerRef.current) window.clearTimeout(animationTimerRef.current);
    if (hoverTimerRef.current) window.clearTimeout(hoverTimerRef.current);
  }, []);

  useEffect(() => {
    if (hidden) return;
    const timer = window.setTimeout(() => speak(`${randomLine(greetingLines)}${timeGreeting()}`, 5200), 650);
    return () => window.clearTimeout(timer);
  }, [hidden, speak]);

  useEffect(() => {
    if (hidden) return;
    const timer = window.setInterval(() => speak(randomLine(idleLines)), 18000);
    return () => window.clearInterval(timer);
  }, [hidden, speak]);

  useEffect(() => {
    if (hidden || !viewLabel || lastViewRef.current === viewLabel) return;
    lastViewRef.current = viewLabel;
    const lines = pageLines[viewLabel] ?? [`现在位于${viewLabel}。`];
    speak(randomLine(lines), 4400);
  }, [hidden, speak, viewLabel]);

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
    speak(randomLine(actionLines));
  }, [playAnimation, speak]);

  const style = useMemo<CSSProperties>(() => ({
    width: widgetWidth(scale),
    height: widgetHeight(scale),
    left: position.x,
    top: position.y,
  }), [position.x, position.y, scale]);

  if (hidden) {
    return (
      <button
        type="button"
        className="live2d-launcher"
        onClick={() => {
          setHidden(false);
          safeWrite(HIDDEN_KEY, false);
          playAnimation();
          speak('我回来啦。');
        }}
      >
        沐沐
      </button>
    );
  }

  return (
    <section
      className="live2d-widget"
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
        <button type="button" onClick={resetPosition} title="回到右下角">↘</button>
        <button
          type="button"
          disabled={scale <= MIN_SCALE}
          onClick={() => {
            setScale(scale - SCALE_STEP);
            playAnimation();
            speak('我变小一点，少挡住你的资料。');
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
            speak('我变大一点，这样更容易看到我。');
          }}
          title="放大"
        >
          +
        </button>
        <button
          type="button"
          onClick={() => {
            speak('我先收起来，需要时右下角叫我。');
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
            speak(randomLine([...actionLines, ...tipLines]));
          }}
          onError={() => setMascotFailed(true)}
        />
      )}
    </section>
  );
}

