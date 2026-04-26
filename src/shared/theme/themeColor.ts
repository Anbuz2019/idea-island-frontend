export const DEFAULT_THEME_COLOR = '#1d6f5f';
export const THEME_COLOR_STORAGE_KEY = 'idea-island-theme-color';
export const APPEARANCE_STORAGE_KEY = 'idea-island-appearance';

export type AppearanceMode = 'light' | 'dark';

type Rgb = {
  r: number;
  g: number;
  b: number;
};

function normalizeHexColor(value?: string | null) {
  if (!value) return DEFAULT_THEME_COLOR;
  const trimmed = value.trim();
  if (/^#[0-9a-fA-F]{6}$/.test(trimmed)) return trimmed.toLowerCase();
  if (/^#[0-9a-fA-F]{3}$/.test(trimmed)) {
    return `#${trimmed
      .slice(1)
      .split('')
      .map((part) => part + part)
      .join('')}`.toLowerCase();
  }
  return DEFAULT_THEME_COLOR;
}

function hexToRgb(value: string): Rgb {
  const normalized = normalizeHexColor(value).slice(1);
  const numeric = Number.parseInt(normalized, 16);
  return {
    r: (numeric >> 16) & 255,
    g: (numeric >> 8) & 255,
    b: numeric & 255,
  };
}

function rgbToHex({ r, g, b }: Rgb) {
  return `#${[r, g, b]
    .map((part) => Math.round(part).toString(16).padStart(2, '0'))
    .join('')}`;
}

function mixColor(source: string, target: string, amount: number) {
  const from = hexToRgb(source);
  const to = hexToRgb(target);
  return rgbToHex({
    r: from.r + (to.r - from.r) * amount,
    g: from.g + (to.g - from.g) * amount,
    b: from.b + (to.b - from.b) * amount,
  });
}

function readableTextColor({ r, g, b }: Rgb) {
  const linear = [r, g, b].map((part) => {
    const channel = part / 255;
    return channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
  });
  const luminance = 0.2126 * linear[0] + 0.7152 * linear[1] + 0.0722 * linear[2];
  return luminance > 0.48 ? '#13231f' : '#ffffff';
}

function buildThemeVariables(value: string) {
  const color = normalizeHexColor(value);
  const rgb = hexToRgb(color);
  const strong = mixColor(color, '#000000', 0.08);
  const soft = mixColor(color, '#ffffff', 0.84);
  return {
    '--theme': color,
    '--theme-strong': strong,
    '--theme-soft': soft,
    '--theme-softer': mixColor(color, '#ffffff', 0.93),
    '--theme-chip': mixColor(color, '#ffffff', 0.94),
    '--theme-text': mixColor(color, '#000000', 0.04),
    '--theme-on': readableTextColor(rgb),
    '--theme-comment': mixColor(color, '#000000', 0.34),
    '--theme-rgb': `${rgb.r}, ${rgb.g}, ${rgb.b}`,
    '--theme-ink-rgb': Object.values(hexToRgb(mixColor(color, '#000000', 0.55))).join(', '),
    '--green': color,
    '--green-strong': strong,
    '--green-soft': soft,
  };
}

export function applyThemeColor(value: string) {
  const color = normalizeHexColor(value);
  if (typeof document === 'undefined') return color;
  Object.entries(buildThemeVariables(color)).forEach(([name, variableValue]) => {
    document.documentElement.style.setProperty(name, variableValue);
  });
  return color;
}

export function readStoredThemeColor() {
  if (typeof localStorage === 'undefined') return DEFAULT_THEME_COLOR;
  return normalizeHexColor(localStorage.getItem(THEME_COLOR_STORAGE_KEY));
}

export function saveThemeColor(value: string) {
  const color = applyThemeColor(value);
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem(THEME_COLOR_STORAGE_KEY, color);
  }
  return color;
}

export function applyAppearanceMode(value: AppearanceMode) {
  if (typeof document !== 'undefined') {
    document.documentElement.dataset.theme = value;
  }
  return value;
}

export function readStoredAppearanceMode(): AppearanceMode {
  if (typeof localStorage === 'undefined') return 'light';
  const saved = localStorage.getItem(APPEARANCE_STORAGE_KEY);
  if (saved === 'dark' || saved === 'light') return saved;
  if (typeof window !== 'undefined' && window.matchMedia?.('(prefers-color-scheme: dark)').matches) {
    return 'dark';
  }
  return 'light';
}

export function saveAppearanceMode(value: AppearanceMode) {
  const mode = applyAppearanceMode(value);
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem(APPEARANCE_STORAGE_KEY, mode);
  }
  return mode;
}
