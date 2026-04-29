import {
  Archive,
  BarChart3,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Edit3,
  Inbox,
  LogOut,
  Mail,
  MessageCircle,
  Plus,
  RotateCcw,
  Search,
  Settings,
  Shield,
  Tags,
  Trash2,
  User,
  X,
} from 'lucide-react';
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type ClipboardEvent as ReactClipboardEvent,
  type FormEvent,
  type ReactNode,
  type UIEvent,
} from 'react';
import {
  useInfiniteQuery,
  useMutation,
  useQueries,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import { readAuthToken, removeAuthToken, saveAuthToken } from '../../shared/api/client';
import { queryKeys } from '../../shared/api/queryKeys';
import {
  clampText,
  materialTypeLabels,
  scoreTone,
  serverTimeMs,
  shortDate,
  statusLabels,
} from '../../shared/utils/format';
import {
  readStoredThemeColor,
} from '../../shared/theme/themeColor';
import { DEFAULT_MATERIAL_COVER_URL, workspaceApi } from './api';
import { authApi } from './authApi';
import { MarkdownView } from './components/MarkdownView';
import { FilterPanel } from './components/filters/FilterPanel';
import { MaterialListPane, type StatusFilterOption } from './components/materials/MaterialListPane';
import { ProfileDashboard } from './components/profile/ProfileDashboard';
import { useMascotSummary, type TopicSidebarCount } from './hooks/useMascotSummary';
import { XingxianLive2DWidget } from './live2d/XingxianLive2DWidget';
import {
  flattenPages,
  removeMaterialFromInfiniteData,
  isDefaultMaterialCover,
  isMaterialUnread,
  materialCoverKey,
  tagStyle,
} from './utils/materialView';
import {
  applyInterfaceStyle,
  readInterfaceStyle,
  readWorkspacePrefs,
  saveWorkspacePrefs,
  workspaceFilterKey,
  type WorkspaceFilterPrefs,
} from './utils/workspacePrefs';
import type {
  Material,
  MaterialListParams,
  MaterialStatus,
  MaterialSortBy,
  MaterialTag,
  MaterialType,
  PageResponse,
  SubmitMaterialPayload,
  TagGroup,
  TagValue,
  Topic,
  UpdateMaterialPayload,
  ViewKey,
} from './types';

const pageSize = 8;

const materialTypes: MaterialType[] = ['article', 'social', 'media', 'image', 'excerpt', 'input'];

const animeWallpapers = Array.from(
  { length: 18 },
  (_, index) => `/anime-wallpapers/wallpaper-${String(index + 1).padStart(2, '0')}.png`,
);
const animeWallpaperSessionSeed = Math.floor(Math.random() * 10000);

function animeWallpaperForSeed(seed: number, salt = 0) {
  const index = Math.abs((seed * 37 + salt * 101 + animeWallpaperSessionSeed) % animeWallpapers.length);
  return animeWallpapers[index];
}

const viewLabels: Record<ViewKey, string> = {
  inbox: '收件箱',
  library: '资料库',
  invalid: '失效资料',
  search: '搜索',
  topicSettings: '主题设置',
  stats: '统计',
  assistant: '灵感助手',
  profile: '个人中心',
};

const viewDescriptions: Record<ViewKey, string> = {
  inbox: '处理刚采集、尚未完成整理的资料。',
  library: '回看已收录和已归档资料，用于检索和沉淀。',
  invalid: '查找已标记失效的资料，可按需恢复到收件箱。',
  search: '在当前主题内按状态、类型、标签和正文快速定位资料。',
  topicSettings: '设置主题之下的标签组和标签。',
  stats: '查看全局资料沉淀、处理效率和主题分布。',
  assistant: '围绕资料和主题进行 AI 对话整理。',
  profile: '管理个人资料、会员状态和外观偏好。',
};

const viewPaths: Record<ViewKey, string> = {
  inbox: '/app/inbox',
  library: '/app/library',
  invalid: '/app/invalid',
  search: '/app/search',
  topicSettings: '/app/topics/settings',
  stats: '/app/stats',
  assistant: '/app/assistant',
  profile: '/app/profile',
};

function shortTopicName(name?: string) {
  if (!name) return '';
  const chars = Array.from(name);
  return chars.length > 5 ? `${chars.slice(0, 5).join('')}...` : name;
}

function savedWorkspaceView() {
  const view = readWorkspacePrefs().activeView;
  return view && viewPaths[view] ? view : undefined;
}

function viewIcon(view: ViewKey, size = 18) {
  switch (view) {
    case 'inbox':
      return <Inbox size={size} />;
    case 'library':
      return <Archive size={size} />;
    case 'search':
      return <Search size={size} />;
    case 'assistant':
      return <MessageCircle size={size} />;
    case 'topicSettings':
      return <Settings size={size} />;
    case 'stats':
      return <BarChart3 size={size} />;
    case 'profile':
      return <User size={size} />;
    case 'invalid':
      return <Trash2 size={size} />;
    default:
      return <Inbox size={size} />;
  }
}

function useMediaQuery(query: string) {
  const [matches, setMatches] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia(query).matches;
  });

  useEffect(() => {
    const media = window.matchMedia(query);
    const listener = () => setMatches(media.matches);
    listener();
    media.addEventListener('change', listener);
    return () => media.removeEventListener('change', listener);
  }, [query]);

  return matches;
}

function useAnimeStyleActive() {
  const [active, setActive] = useState(() => document.documentElement.dataset.style === 'anime');

  useEffect(() => {
    const update = () => setActive(document.documentElement.dataset.style === 'anime');
    update();
    const observer = new MutationObserver(update);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-style'] });
    return () => observer.disconnect();
  }, []);

  return active;
}

function viewFromPath(pathname: string): ViewKey {
  if (pathname.includes('/library')) return 'library';
  if (pathname.includes('/invalid')) return 'invalid';
  if (pathname.includes('/search')) return 'search';
  if (pathname.includes('/topics/settings')) return 'topicSettings';
  if (pathname.includes('/stats')) return 'stats';
  if (pathname.includes('/assistant')) return 'assistant';
  if (pathname.includes('/profile')) return 'profile';
  return 'inbox';
}

function errorMessage(error: unknown) {
  if (error && typeof error === 'object' && 'message' in error) {
    return String((error as { message: string }).message);
  }
  return '操作失败';
}

function buildMaterialHistory(material: Material) {
  const statusRecords = [...(material.statusHistory ?? [])]
    .filter((record) => record.occurredAt)
    .sort((a, b) => serverTimeMs(a.occurredAt) - serverTimeMs(b.occurredAt));
  const fallback = statusRecords.length > 0 ? [] : [{
    status: 'CREATED',
    label: '创建',
    occurredAt: material.createdAt,
  }];

  return [...fallback, ...statusRecords]
    .filter((record) => record.occurredAt)
    .map((record) => ({
      key: `status-${record.status}-${record.occurredAt}`,
      status: record.status,
      title: statusActionLabel(record.status, record.label),
      occurredAt: record.occurredAt,
    }));
}

function statusActionLabel(status?: string, label?: string) {
  if (status === 'CREATED' || status === 'INBOX') return '创建';
  if (status === 'PENDING_REVIEW') return '待评价';
  if (status === 'COLLECTED') return '收录';
  if (status === 'ARCHIVED') return '归档';
  if (status === 'INVALID') return '失效';
  return label?.replace(/^已/, '') || '变更';
}

function StatusTimelineIcon({ status }: { status?: string }) {
  if (status === 'COLLECTED') return <Check size={15} />;
  if (status === 'ARCHIVED') return <Archive size={13} />;
  if (status === 'INVALID') return <X size={13} />;
  if (status === 'PENDING_REVIEW') return <Edit3 size={13} />;
  return <Inbox size={13} />;
}

function StatusChipIcon({ status }: { status: MaterialStatus }) {
  if (status === 'COLLECTED') return <CheckCircle2 className="status-icon-collected" size={17} />;
  if (status === 'ARCHIVED') return <Archive size={12} />;
  if (status === 'INVALID') return <X size={12} />;
  if (status === 'PENDING_REVIEW') return <Edit3 size={12} />;
  return <Inbox size={12} />;
}

type NotifySuccess = (text: string) => void;

function useCoverTone(imageUrl?: string) {
  const [tone, setTone] = useState<'dark' | 'light'>('dark');

  useEffect(() => {
    if (!imageUrl) {
      setTone('dark');
      return;
    }

    let cancelled = false;
    const image = new Image();
    image.crossOrigin = 'anonymous';
    image.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        const width = 24;
        const height = 24;
        canvas.width = width;
        canvas.height = height;
        const context = canvas.getContext('2d', { willReadFrequently: true });
        if (!context) return;
        context.drawImage(image, 0, 0, width, height);
        const pixels = context.getImageData(0, 0, width, height).data;
        let total = 0;
        for (let index = 0; index < pixels.length; index += 4) {
          total += 0.2126 * pixels[index] + 0.7152 * pixels[index + 1] + 0.0722 * pixels[index + 2];
        }
        const luminance = total / (pixels.length / 4);
        if (!cancelled) setTone(luminance > 150 ? 'light' : 'dark');
      } catch {
        if (!cancelled) setTone('dark');
      }
    };
    image.onerror = () => {
      if (!cancelled) setTone('dark');
    };
    image.src = imageUrl;

    return () => {
      cancelled = true;
    };
  }, [imageUrl]);

  return tone;
}

function LoginPage({ onLogin }: { onLogin: () => void }) {
  const [mode, setMode] = useState<'email' | 'phone'>('email');
  const [account, setAccount] = useState('demo@ideaisland.dev');
  const [password, setPassword] = useState('demo123456');

  const submit = (event: FormEvent) => {
    event.preventDefault();
    onLogin();
  };

  return (
    <main className="login-page">
      <section className="login-visual">
        <div className="brand login-brand">
          <div className="brand-mark" aria-hidden="true">
            <span className="brand-mark-island" />
            <span className="brand-mark-spark" />
          </div>
          <div>
            <strong>灵感岛</strong>
            <span>碎片灵感工作台</span>
          </div>
        </div>
        <div className="login-copy">
          <h1>快速采集，结构化整理，高效率找回。</h1>
          <p>把碎片资料先收进来，再围绕主题、标签组和状态完成沉淀。</p>
        </div>
      </section>

      <section className="login-card">
        <div>
          <h2>登录</h2>
          <p className="subtitle">当前默认使用 mock 登录，后续可直接接入认证接口。</p>
        </div>

        <div className="capture-tabs" style={{ gridTemplateColumns: '1fr 1fr' }}>
          <button className={`capture-tab ${mode === 'email' ? 'active' : ''}`} onClick={() => setMode('email')} type="button">
            <Mail size={16} /> 邮箱
          </button>
          <button className={`capture-tab ${mode === 'phone' ? 'active' : ''}`} onClick={() => setMode('phone')} type="button">
            <Shield size={16} /> 手机验证码
          </button>
        </div>

        <form className="form-grid" onSubmit={submit}>
          <label className="form-row">
            <span className="field-label">{mode === 'email' ? '邮箱' : '手机号'}</span>
            <input
              className="input"
              value={account}
              onChange={(event) => setAccount(event.target.value)}
              placeholder={mode === 'email' ? 'name@example.com' : '手机号'}
            />
          </label>
          <label className="form-row">
            <span className="field-label">{mode === 'email' ? '密码' : '验证码'}</span>
            <input
              className="input"
              type={mode === 'email' ? 'password' : 'text'}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder={mode === 'email' ? '密码' : '验证码'}
            />
          </label>
          <button className="btn primary" type="submit">进入工作台</button>
        </form>
      </section>
    </main>
  );
}

function AuthLoginPage({ onLogin }: { onLogin: (token: string, nickname?: string) => void }) {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [account, setAccount] = useState('');
  const [password, setPassword] = useState('');
  const [nickname, setNickname] = useState('');
  const [message, setMessage] = useState('');

  const mutation = useMutation({
    mutationFn: async () => {
      if (mode === 'register') {
        const result = await authApi.register({ email: account, password, nickname });
        return { token: result.token, nickname };
      }
      const result = await authApi.login({ email: account, password });
      return { token: result.token, nickname: result.nickname };
    },
    onSuccess: (result) => onLogin(result.token, result.nickname),
    onError: (error) => setMessage(errorMessage(error)),
  });

  const submit = (event: FormEvent) => {
    event.preventDefault();
    setMessage('');
    mutation.mutate();
  };

  return (
    <main className="login-page">
      <section className="login-visual">
        <div className="brand login-brand">
          <div className="brand-mark" aria-hidden="true">
            <span className="brand-mark-island" />
            <span className="brand-mark-spark" />
          </div>
          <div>
            <strong>灵感岛</strong>
            <span>碎片灵感工作台</span>
          </div>
        </div>
        <div className="login-copy">
          <h1>快速采集，结构化整理，高效率找回。</h1>
          <p>把碎片资料先收进来，再围绕主题、标签组和状态完成沉淀。</p>
        </div>
      </section>

      <section className="login-card">
        <div>
          <h2>{mode === 'register' ? '注册' : '登录'}</h2>
          <p className="subtitle">连接本地后端服务，登录后进入真实接口联调环境。</p>
        </div>

        <div className="capture-tabs" style={{ gridTemplateColumns: '1fr 1fr' }}>
          <button className={`capture-tab ${mode === 'login' ? 'active' : ''}`} onClick={() => setMode('login')} type="button">
            <Mail size={16} /> 登录
          </button>
          <button className={`capture-tab ${mode === 'register' ? 'active' : ''}`} onClick={() => setMode('register')} type="button">
            <Shield size={16} /> 注册
          </button>
        </div>

        <form className="form-grid" onSubmit={submit}>
          <label className="form-row">
            <span className="field-label">邮箱</span>
            <input className="input" value={account} onChange={(event) => setAccount(event.target.value)} placeholder="name@example.com" autoComplete="email" />
          </label>
          {mode === 'register' && (
            <label className="form-row">
              <span className="field-label">昵称</span>
              <input className="input" value={nickname} onChange={(event) => setNickname(event.target.value)} placeholder="用于显示的昵称" />
            </label>
          )}
          <label className="form-row">
            <span className="field-label">密码</span>
            <input className="input" type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="至少 6 位" />
          </label>
          {message && <span className="muted" style={{ color: 'var(--rose)' }}>{message}</span>}
          <button className="btn primary" type="submit" disabled={mutation.isPending}>
            {mutation.isPending ? '处理中...' : mode === 'register' ? '注册并进入' : '进入工作台'}
          </button>
        </form>
      </section>
    </main>
  );
}

export function WorkspaceApp() {
  const [authed, setAuthed] = useState(() => Boolean(readAuthToken()));

  const login = (token: string, nickname?: string) => {
    saveAuthToken(token);
    if (nickname) localStorage.setItem('idea-island-nickname', nickname);
    const nextView = savedWorkspaceView() ?? 'inbox';
    window.history.replaceState(null, '', viewPaths[nextView]);
    setAuthed(true);
  };

  const logout = () => {
    void authApi.logout().catch(() => undefined);
    removeAuthToken();
    setAuthed(false);
    window.history.replaceState(null, '', '/login');
  };

  if (!authed) {
    return <AuthLoginPage onLogin={login} />;
  }

  return <AuthenticatedWorkspace onLogout={logout} />;
}

function AuthenticatedWorkspace({ onLogout }: { onLogout: () => void }) {
  const queryClient = useQueryClient();
  const isMobile = useMediaQuery('(max-width: 640px)');
  const [activeView, setActiveView] = useState<ViewKey>(() => {
    const pathView = viewFromPath(window.location.pathname);
    return window.location.pathname === '/login' ? savedWorkspaceView() ?? pathView : pathView;
  });
  const [activeTopicId, setActiveTopicId] = useState<number>();
  const [selectedSettingsTopicId, setSelectedSettingsTopicId] = useState<number>();
  const [selectedMaterialId, setSelectedMaterialIdState] = useState<number | undefined>();
  const [captureOpen, setCaptureOpen] = useState(false);
  const [successNotice, setSuccessNotice] = useState<{ id: number; text: string }>();

  const notifySuccess: NotifySuccess = (text) => {
    setSuccessNotice({ id: Date.now(), text });
  };

  useEffect(() => {
    applyInterfaceStyle(readInterfaceStyle());
  }, []);

  useEffect(() => {
    if (window.location.pathname === '/login') {
      const nextView = savedWorkspaceView() ?? 'inbox';
      window.history.replaceState(null, '', viewPaths[nextView]);
      setActiveView(nextView);
    }
    const onPopState = () => {
      const nextView = viewFromPath(window.location.pathname);
      setActiveView(nextView);
      saveWorkspacePrefs((current) => ({ ...current, activeView: nextView }));
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  const changeView = (view: ViewKey) => {
    setActiveView(view);
    saveWorkspacePrefs((current) => ({ ...current, activeView: view }));
    window.history.pushState(null, '', viewPaths[view]);
  };

  useEffect(() => {
    saveWorkspacePrefs((current) => ({ ...current, activeView }));
  }, [activeView]);

  useEffect(() => {
    if (!activeTopicId) return;
    saveWorkspacePrefs((current) => ({ ...current, activeTopicId }));
  }, [activeTopicId]);

  const setSelectedMaterialId = (id: number | undefined) => {
    setSelectedMaterialIdState(id);
  };

  const markReadMutation = useMutation({
    mutationFn: (material: Material) => workspaceApi.markRead(material.id),
    onMutate: async (material) => {
      if (!material.unread) return;
      const applyMaterialPatch = (current: Material | undefined) => {
        if (!current || current.id !== material.id) return current;
        return {
          ...current,
          status: current.status === 'INBOX' ? 'PENDING_REVIEW' : current.status,
          unread: false,
        } satisfies Material;
      };
      queryClient.setQueryData(queryKeys.material(material.id), (current: Material | undefined) => applyMaterialPatch(current));
      queryClient.setQueriesData(
        { predicate: (query) => Array.isArray(query.queryKey) && ['inbox', 'materials', 'search'].includes(String(query.queryKey[0])) },
        (current: { pages?: PageResponse<Material>[] } | undefined) => {
          if (!current?.pages) return current;
          return {
            ...current,
            pages: current.pages.map((page) => ({
              ...page,
              items: page.items.map((item) => applyMaterialPatch(item) ?? item),
            })),
          };
        },
      );

      const unreadKey = material.status === 'COLLECTED'
        ? ['sidebar-unread', material.topicId, 'library'] as const
        : ['sidebar-unread', material.topicId, 'inbox'] as const;
      queryClient.setQueryData(unreadKey, (current: PageResponse<Material> | undefined) => {
        if (!current) return current;
        return {
          ...current,
          total: Math.max(current.total - 1, 0),
          items: current.items.filter((item) => item.id !== material.id),
        };
      });
    },
  });

  const topicsQuery = useQuery({
    queryKey: queryKeys.topics,
    queryFn: workspaceApi.listTopics,
  });

  const topics = topicsQuery.data ?? [];

  const topicCountQueries = useQueries({
    queries: topics.flatMap((topic) => [
      {
        queryKey: ['sidebar-count', topic.id, 'inbox'] as const,
        queryFn: () =>
          workspaceApi.listInbox({
            topicId: topic.id,
            status: ['INBOX', 'PENDING_REVIEW'],
            page: 1,
            pageSize: 1,
          }),
      },
      {
        queryKey: ['sidebar-count', topic.id, 'library'] as const,
        queryFn: () =>
          workspaceApi.listMaterials({
            topicId: topic.id,
            status: ['COLLECTED', 'ARCHIVED'],
            page: 1,
            pageSize: 1,
          }),
      },
    ]),
  });

  const unreadCountQueries = useQueries({
    queries: topics.flatMap((topic) => [
      {
        queryKey: ['sidebar-unread', topic.id, 'inbox'] as const,
        queryFn: () =>
          workspaceApi.listInbox({
            topicId: topic.id,
            status: ['INBOX'],
            unreadOnly: true,
            sortBy: 'statusAt',
            page: 1,
            pageSize: 1,
          }),
      },
      {
        queryKey: ['sidebar-unread', topic.id, 'library'] as const,
        queryFn: () =>
          workspaceApi.listMaterials({
            topicId: topic.id,
            status: ['COLLECTED'],
            unreadOnly: true,
            sortBy: 'statusAt',
            page: 1,
            pageSize: 1,
          }),
      },
    ]),
  });

  const topicCounts = useMemo(() => {
    const counts: Record<number, TopicSidebarCount> = {};
    topics.forEach((topic, index) => {
      const inbox = topicCountQueries[index * 2]?.data?.total ?? 0;
      const library = topicCountQueries[index * 2 + 1]?.data?.total ?? 0;
      const unreadInbox = unreadCountQueries[index * 2]?.data?.total ?? 0;
      const unreadLibrary = unreadCountQueries[index * 2 + 1]?.data?.total ?? 0;
      counts[topic.id] = {
        inbox,
        library,
        total: inbox + library,
        unreadInbox,
        unreadLibrary,
      };
    });
    return counts;
  }, [topicCountQueries, topics, unreadCountQueries]);

  useEffect(() => {
    if (!topics.length) return;
    const savedTopicId = readWorkspacePrefs().activeTopicId;
    const fallbackTopicId = savedTopicId && topics.some((topic) => topic.id === savedTopicId)
      ? savedTopicId
      : topics[0].id;
    setActiveTopicId((current) => current ?? fallbackTopicId);
    setSelectedSettingsTopicId((current) => current ?? fallbackTopicId);
  }, [topics]);

  const activeTopic = topics.find((topic) => topic.id === activeTopicId) ?? topics[0];
  const mascotMaterialQuery = useQuery({
    queryKey: queryKeys.material(selectedMaterialId),
    queryFn: () => workspaceApi.getMaterial(selectedMaterialId!),
    enabled: Boolean(selectedMaterialId),
    staleTime: 30_000,
  });
  const { workspaceSummary: mascotSummary, materialSummary: mascotMaterialSummary } = useMascotSummary({
    activeTopic,
    topics,
    topicCounts,
    selectedMaterial: mascotMaterialQuery.data,
  });

  const openTopicSettings = () => {
    changeView('topicSettings');
    setSelectedSettingsTopicId((current) => current ?? activeTopic?.id);
  };

  const invalidateWorkspace = () => {
    void queryClient.invalidateQueries();
  };

  const isWorkspaceView = activeView === 'inbox' || activeView === 'library' || activeView === 'search' || activeView === 'invalid';
  const pageTitle = isWorkspaceView && activeTopic
    ? `${activeTopic.name} / ${viewLabels[activeView]}`
    : viewLabels[activeView];
  const mobilePageTitle = viewLabels[activeView];

  return (
    <div className="app">
      <Sidebar
        topics={topics}
        topicCounts={topicCounts}
        activeView={activeView}
        activeTopicId={activeTopic?.id}
        onViewChange={changeView}
        onTopicSelect={(topicId) => {
          setActiveTopicId(topicId);
          saveWorkspacePrefs((current) => ({ ...current, activeTopicId: topicId }));
        }}
        onCapture={() => setCaptureOpen(true)}
        onSettings={openTopicSettings}
      />

      <main className="main">
        <header className="topbar">
          <div className="topbar-copy">
            <h1 className={isMobile ? 'mobile-topbar-title' : ''}>
              {isMobile && <span className="mobile-topbar-icon">{viewIcon(activeView, 18)}</span>}
              <span>{isMobile ? mobilePageTitle : pageTitle}</span>
            </h1>
            {!isMobile && <p>{viewDescriptions[activeView]}</p>}
          </div>
          {isMobile ? (
            isWorkspaceView && activeTopic ? (
              <MobileTopicSwitcher
                topics={topics}
                activeTopicId={activeTopic.id}
                onTopicSelect={(topicId) => {
                  setActiveTopicId(topicId);
                  setSelectedMaterialId(undefined);
                  saveWorkspacePrefs((current) => ({ ...current, activeTopicId: topicId }));
                }}
              />
            ) : <div />
          ) : (
            <div className="topbar-actions">
              {(activeView === 'library' || activeView === 'search' || activeView === 'invalid') && (
                <button className="btn compact ghost" onClick={() => changeView(activeView === 'invalid' ? 'library' : 'invalid')}>
                  {activeView === 'invalid' ? '返回资料库' : '失效资料'}
                </button>
              )}
              <button className="btn primary" onClick={() => setCaptureOpen(true)}>
                <Plus size={18} /> 采集资料
              </button>
            </div>
          )}
        </header>

        {activeView === 'topicSettings' ? (
          <TopicSettingsPage
            topics={topics}
            selectedTopicId={selectedSettingsTopicId ?? activeTopic?.id}
            onSelectTopic={(topicId) => {
              setSelectedSettingsTopicId(topicId);
            }}
            onChanged={invalidateWorkspace}
            onSuccess={notifySuccess}
          />
        ) : activeView === 'stats' ? (
          <StatsPlaceholder />
        ) : activeView === 'assistant' ? (
          <AssistantPlaceholder />
        ) : activeView === 'profile' ? (
          <ProfileDashboard topics={topics} topicCounts={topicCounts} onLogout={onLogout} onSuccess={notifySuccess} />
        ) : (
          <WorkspaceView
            view={activeView}
            activeTopic={activeTopic}
            selectedMaterialId={selectedMaterialId}
            onSelectMaterial={setSelectedMaterialId}
            onReadMaterial={(material) => {
              if (isMaterialUnread(material)) {
                markReadMutation.mutate(material);
              }
            }}
            onChanged={invalidateWorkspace}
            onSuccess={notifySuccess}
          />
        )}
      </main>

      <MobileBar
        activeView={activeView}
        inboxUnread={activeTopic ? (topicCounts[activeTopic.id]?.unreadInbox ?? 0) : 0}
        libraryUnread={activeTopic ? (topicCounts[activeTopic.id]?.unreadLibrary ?? 0) : 0}
        onViewChange={changeView}
        onCapture={() => setCaptureOpen(true)}
      />

      {captureOpen && (
        <CaptureModal
          topics={topics}
          activeTopicId={activeTopic?.id}
          onClose={() => setCaptureOpen(false)}
          onSuccess={notifySuccess}
          onCreated={(material) => {
            setCaptureOpen(false);
            setActiveTopicId(material.topicId);
            saveWorkspacePrefs((current) => ({ ...current, activeTopicId: material.topicId }));
            changeView('inbox');
            setSelectedMaterialId(material.id);
            invalidateWorkspace();
          }}
        />
      )}
      <XingxianLive2DWidget
        viewLabel={viewLabels[activeView]}
        captureOpen={captureOpen}
        noticeText={successNotice?.text}
        workspaceSummary={mascotSummary}
        materialSummary={mascotMaterialSummary}
      />
      <SuccessPopup notice={successNotice} onClose={() => setSuccessNotice(undefined)} />
    </div>
  );
}

function MobileTopicSwitcher({
  topics,
  activeTopicId,
  onTopicSelect,
}: {
  topics: Topic[];
  activeTopicId?: number;
  onTopicSelect: (topicId: number) => void;
}) {
  if (!topics.length) return null;

  return (
    <label className="mobile-topic-switcher">
      <span>
        <Tags size={14} />
      </span>
      <select value={activeTopicId} onChange={(event) => onTopicSelect(Number(event.target.value))}>
        {topics.map((topic) => (
          <option key={topic.id} value={topic.id}>{topic.name}</option>
        ))}
      </select>
    </label>
  );
}

function SuccessPopup({
  notice,
  onClose,
}: {
  notice?: { id: number; text: string };
  onClose: () => void;
}) {
  useEffect(() => {
    if (!notice) return;
    const timer = window.setTimeout(onClose, 1000);
    return () => window.clearTimeout(timer);
  }, [notice?.id, onClose]);

  if (!notice) return null;

  return (
    <div className="success-popup-layer" role="status" aria-live="polite">
      <div className="success-popup">
        <div className="success-popup-icon">
          <Check size={26} />
        </div>
        <div>
          <strong>操作成功</strong>
          <p>{notice.text}</p>
        </div>
      </div>
    </div>
  );
}

function Sidebar({
  topics,
  topicCounts,
  activeView,
  activeTopicId,
  onViewChange,
  onTopicSelect,
  onCapture,
  onSettings,
}: {
  topics: Topic[];
  topicCounts: Record<number, TopicSidebarCount>;
  activeView: ViewKey;
  activeTopicId?: number;
  onViewChange: (view: ViewKey) => void;
  onTopicSelect: (topicId: number) => void;
  onCapture: () => void;
  onSettings: () => void;
}) {
  const allTopicCounts = topics.reduce<TopicSidebarCount>(
    (summary, topic) => {
      const count = topicCounts[topic.id];
      return {
        inbox: summary.inbox + (count?.inbox ?? 0),
        library: summary.library + (count?.library ?? 0),
        total: summary.total + (count?.total ?? 0),
        unreadInbox: summary.unreadInbox + (count?.unreadInbox ?? 0),
        unreadLibrary: summary.unreadLibrary + (count?.unreadLibrary ?? 0),
      };
    },
    { inbox: 0, library: 0, total: 0, unreadInbox: 0, unreadLibrary: 0 },
  );
  const activeCounts = activeTopicId ? topicCounts[activeTopicId] : allTopicCounts;
  const [topicCollapsed, setTopicCollapsed] = useState(() => readWorkspacePrefs().topicNavCollapsed ?? false);
  const activeTopic = topics.find((topic) => topic.id === activeTopicId);

  const toggleTopicCollapsed = () => {
    setTopicCollapsed((current) => {
      const next = !current;
      saveWorkspacePrefs((prefs) => ({ ...prefs, topicNavCollapsed: next }));
      return next;
    });
  };

  return (
    <aside className="sidebar">
      <div className="brand">
        <div className="brand-mark" aria-hidden="true">
          <span className="brand-mark-island" />
          <span className="brand-mark-spark" />
        </div>
        <div>
          <strong>灵感岛</strong>
          <span>海量碎片灵感工作台</span>
        </div>
      </div>

      <button className="sidebar-capture" onClick={onCapture}>
        <Plus size={18} /> 采集资料
      </button>

      <nav className="nav-group">
        <p className="nav-section-title">工作区</p>
        <div className={`topic-nav ${topicCollapsed ? 'collapsed' : ''}`}>
          <button className="nav-section-toggle" type="button" onClick={toggleTopicCollapsed} aria-expanded={!topicCollapsed}>
            <span className="nav-label">
              <Tags size={17} />
              <span>主题</span>
            </span>
            <span className="topic-toggle-meta">
              {topicCollapsed && activeTopic ? <span className="topic-current-inline">{shortTopicName(activeTopic.name)}</span> : null}
              {topicCollapsed ? <ChevronRight size={15} /> : <ChevronDown size={15} />}
            </span>
          </button>
          {!topicCollapsed && (
            <div className="topic-nav-list">
              {topics.map((topic) => (
                <button
                  key={topic.id}
                  className={`nav-item ${topic.id === activeTopicId ? 'active' : ''}`}
                  onClick={() => {
                    onTopicSelect(topic.id);
                    setTopicCollapsed(true);
                    saveWorkspacePrefs((prefs) => ({ ...prefs, topicNavCollapsed: true }));
                  }}
                >
                  <span>{topic.name}</span>
                  <span className="nav-count">{topicCounts[topic.id]?.total ?? topic.materialCount}</span>
                </button>
              ))}
            </div>
          )}
        </div>
        <NavButton active={activeView === 'inbox'} onClick={() => onViewChange('inbox')} icon={<Inbox size={17} />} label="收件箱" count={activeCounts?.inbox ?? 0} unreadCount={activeCounts?.unreadInbox ?? 0} />
        <NavButton active={activeView === 'library'} onClick={() => onViewChange('library')} icon={<Archive size={17} />} label="资料库" count={activeCounts?.library ?? 0} unreadCount={activeCounts?.unreadLibrary ?? 0} />
        <NavButton active={activeView === 'search'} onClick={() => onViewChange('search')} icon={<Search size={17} />} label="搜索" />
      </nav>

      <nav className="nav-group utility-nav">
        <p className="nav-section-title">功能</p>
        <NavButton active={activeView === 'topicSettings'} onClick={onSettings} icon={<Settings size={17} />} label="主题设置" />
        <NavButton active={activeView === 'stats'} onClick={() => onViewChange('stats')} icon={<BarChart3 size={17} />} label="统计" />
        <NavButton active={activeView === 'assistant'} onClick={() => onViewChange('assistant')} icon={<MessageCircle size={17} />} label="灵感助手" />
      </nav>

      <nav className="nav-group sidebar-profile">
        <NavButton active={activeView === 'profile'} onClick={() => onViewChange('profile')} icon={<User size={17} />} label="个人中心" />
      </nav>
    </aside>
  );
}

function NavButton({
  active,
  icon,
  label,
  count,
  unreadCount,
  onClick,
}: {
  active: boolean;
  icon?: ReactNode;
  label: string;
  count?: number;
  unreadCount?: number;
  onClick: () => void;
}) {
  return (
    <button className={`nav-item ${active ? 'active' : ''}`} onClick={onClick}>
      <span className="nav-label">
        {icon}
        <span>{label}</span>
      </span>
      <span className="nav-count-row">
        {count != null && <span className="nav-count">{count}</span>}
        {unreadCount ? <span className="nav-unread">{unreadCount}</span> : null}
      </span>
    </button>
  );
}

function MobileBar({
  activeView,
  inboxUnread,
  libraryUnread,
  onViewChange,
  onCapture,
}: {
  activeView: ViewKey;
  inboxUnread: number;
  libraryUnread: number;
  onViewChange: (view: ViewKey) => void;
  onCapture: () => void;
}) {
  return (
    <nav className="mobile-bar">
      <button className={`${activeView === 'inbox' ? 'active' : ''} ${inboxUnread > 0 ? 'has-unread' : ''}`} onClick={() => onViewChange('inbox')}><span className="mobile-nav-icon"><Inbox size={18} /></span>收件箱</button>
      <button className={`${activeView === 'library' ? 'active' : ''} ${libraryUnread > 0 ? 'has-unread' : ''}`} onClick={() => onViewChange('library')}><span className="mobile-nav-icon"><Archive size={18} /></span>资料库</button>
      <button className={activeView === 'search' ? 'active' : ''} onClick={() => onViewChange('search')}><Search size={18} />搜索</button>
      <button className="mobile-capture-action" onClick={onCapture}><Plus size={20} />采集</button>
      <button className={activeView === 'assistant' ? 'active' : ''} onClick={() => onViewChange('assistant')}><MessageCircle size={18} />助手</button>
      <button className={activeView === 'topicSettings' ? 'active' : ''} onClick={() => onViewChange('topicSettings')}><Settings size={18} />主题</button>
      <button className={activeView === 'profile' ? 'active' : ''} onClick={() => onViewChange('profile')}><User size={18} />个人</button>
    </nav>
  );
}

function WorkspaceView({
  view,
  activeTopic,
  selectedMaterialId,
  onSelectMaterial,
  onReadMaterial,
  onChanged,
  onSuccess,
}: {
  view: Exclude<ViewKey, 'topicSettings' | 'stats' | 'assistant' | 'profile'>;
  activeTopic?: Topic;
  selectedMaterialId?: number;
  onSelectMaterial: (id: number | undefined) => void;
  onReadMaterial: (material: Material) => void;
  onChanged: () => void;
  onSuccess: NotifySuccess;
}) {
  const [statusFilter, setStatusFilter] = useState<MaterialStatus[]>([]);
  const [typeFilter, setTypeFilter] = useState<MaterialType[]>([]);
  const [keyword, setKeyword] = useState('');
  const [sortBy, setSortBy] = useState<Exclude<MaterialSortBy, 'status'>>('statusAt');
  const [tagFilters, setTagFilters] = useState<Record<string, string[]>>({});
  const [tagMenuOpen, setTagMenuOpen] = useState(false);
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [unreadSessionIds, setUnreadSessionIds] = useState<number[]>([]);
  const isMobile = useMediaQuery('(max-width: 760px)');
  const filterPrefsKey = workspaceFilterKey(view, activeTopic?.id);
  const skipNextFilterSave = useRef(false);

  useEffect(() => {
    const prefs = readWorkspacePrefs();
    const saved = prefs.filters?.[filterPrefsKey] ?? {};
    const hasSavedStatusFilter = Object.prototype.hasOwnProperty.call(saved, 'statusFilter');
    const defaultStatusFilter: MaterialStatus[] = view === 'library' ? ['COLLECTED'] : [];
    const validSorts: Exclude<MaterialSortBy, 'status'>[] = ['statusAt', 'updatedAt', 'createdAt', 'score'];
    const migratedSortBy = prefs.schemaVersion === 2 ? saved.sortBy : saved.sortBy === 'createdAt' ? 'statusAt' : saved.sortBy;
    const savedSortBy = migratedSortBy && validSorts.includes(migratedSortBy) ? migratedSortBy : 'statusAt';
    skipNextFilterSave.current = true;
    setStatusFilter(hasSavedStatusFilter ? (saved.statusFilter ?? []) : defaultStatusFilter);
    setTypeFilter(saved.typeFilter ?? []);
    setKeyword(saved.keyword ?? '');
    setSortBy(savedSortBy ?? 'statusAt');
    setTagFilters(saved.tagFilters ?? {});
    setUnreadOnly(saved.unreadOnly ?? false);
    setUnreadSessionIds([]);
    setTagMenuOpen(false);
  }, [filterPrefsKey]);

  useEffect(() => {
    if (skipNextFilterSave.current) {
      skipNextFilterSave.current = false;
      return;
    }
    saveWorkspacePrefs((current) => ({
      ...current,
      filters: {
        ...(current.filters ?? {}),
        [filterPrefsKey]: {
          keyword,
          sortBy,
          statusFilter,
          typeFilter,
          tagFilters,
          unreadOnly,
        },
      },
    }));
  }, [filterPrefsKey, keyword, sortBy, statusFilter, tagFilters, typeFilter, unreadOnly]);

  const tagGroupsQuery = useQuery({
    queryKey: queryKeys.tagGroups(activeTopic?.id),
    queryFn: () => workspaceApi.listTagGroups(activeTopic!.id),
    enabled: Boolean(activeTopic?.id),
  });

  const tagGroups = tagGroupsQuery.data ?? [];
  const animeStyleActive = useAnimeStyleActive();

  const params = useMemo<MaterialListParams>(() => {
    const base: MaterialListParams = {
      topicId: activeTopic?.id,
      keyword,
      materialType: typeFilter,
      tagFilters,
      sortBy,
      sortDirection: 'desc',
      pageSize,
    };

    if (view === 'library') {
      base.status = statusFilter.length ? statusFilter : ['COLLECTED', 'ARCHIVED'];
    } else if (view === 'invalid') {
      base.status = ['INVALID'];
    } else if (view === 'inbox') {
      base.status = ['INBOX', 'PENDING_REVIEW'];
    } else {
      base.status = statusFilter;
    }

    return base;
  }, [activeTopic?.id, keyword, sortBy, statusFilter, tagFilters, typeFilter, view]);

  const query = useInfiniteQuery({
    queryKey:
      view === 'search'
        ? queryKeys.search(params)
        : view === 'inbox'
          ? queryKeys.inbox(params)
          : queryKeys.materials(params),
    initialPageParam: 1,
    queryFn: ({ pageParam }) => {
      const pageParams = { ...params, page: pageParam as number };
      if (pageParams.keyword?.trim()) return workspaceApi.searchMaterials(pageParams);
      if (view === 'search') return workspaceApi.listMaterials(pageParams);
      if (view === 'inbox') return workspaceApi.listInbox(pageParams);
      return workspaceApi.listMaterials(pageParams);
    },
    getNextPageParam: (lastPage) => {
      const loaded = lastPage.page * lastPage.pageSize;
      return loaded < lastPage.total ? lastPage.page + 1 : undefined;
    },
    enabled: Boolean(activeTopic?.id),
  });

  const rawItems = flattenPages(query.data);
  const totalCount = query.data?.pages[0]?.total ?? rawItems.length;
  const [topUnreadIds, setTopUnreadIds] = useState<number[]>([]);
  const wasFetchingRef = useRef(false);
  const listScopeKey = useMemo(() => JSON.stringify({ view, params }), [params, view]);

  useEffect(() => {
    setTopUnreadIds(rawItems.filter(isMaterialUnread).map((item) => item.id));
  }, [listScopeKey]);

  useEffect(() => {
    if (query.isFetching) {
      wasFetchingRef.current = true;
      return;
    }
    if (query.isSuccess && wasFetchingRef.current) {
      setTopUnreadIds(rawItems.filter(isMaterialUnread).map((item) => item.id));
      wasFetchingRef.current = false;
    }
  }, [query.isFetching, query.isSuccess, rawItems]);

  const shouldPinUnread = sortBy !== 'statusAt' && sortBy !== 'updatedAt' && sortBy !== 'score';

  const items = useMemo(() => {
    if (!shouldPinUnread || !topUnreadIds.length) return rawItems;
    const unreadOrder = new Map(topUnreadIds.map((id, index) => [id, index]));
    return [...rawItems].sort((a, b) => {
      const aUnreadOrder = unreadOrder.get(a.id);
      const bUnreadOrder = unreadOrder.get(b.id);
      if (aUnreadOrder == null && bUnreadOrder == null) return 0;
      if (aUnreadOrder == null) return 1;
      if (bUnreadOrder == null) return -1;
      return aUnreadOrder - bUnreadOrder;
    });
  }, [rawItems, shouldPinUnread, topUnreadIds]);
  const unreadItemsCount = unreadOnly ? unreadSessionIds.length : items.filter(isMaterialUnread).length;
  useEffect(() => {
    if (!unreadOnly) {
      setUnreadSessionIds([]);
      return;
    }
    setUnreadSessionIds((current) => {
      const next = new Set(current);
      items.forEach((item) => {
        if (isMaterialUnread(item)) {
          next.add(item.id);
        }
      });
      return Array.from(next);
    });
  }, [items, unreadOnly]);

  const visibleItems = useMemo(
    () => unreadOnly ? items.filter((item) => unreadSessionIds.includes(item.id)) : items,
    [items, unreadOnly, unreadSessionIds],
  );

  useEffect(() => {
    if (!visibleItems.length) {
      onSelectMaterial(undefined);
      return;
    }
    if (selectedMaterialId && !visibleItems.some((item) => item.id === selectedMaterialId)) {
      onSelectMaterial(undefined);
    }
  }, [onSelectMaterial, selectedMaterialId, visibleItems]);

  const selectedId = selectedMaterialId;
  const selectedDetailQuery = useQuery({
    queryKey: queryKeys.material(selectedId),
    queryFn: () => workspaceApi.getMaterial(selectedId!),
    enabled: Boolean(selectedId),
  });

  const detail = selectedDetailQuery.data;

  const detailTagGroupsQuery = useQuery({
    queryKey: queryKeys.tagGroups(detail?.topicId),
    queryFn: () => workspaceApi.listTagGroups(detail!.topicId),
    enabled: Boolean(detail?.topicId),
  });

  const detailTagGroups = detailTagGroupsQuery.data ?? [];

  const selectedTagsCount = Object.values(tagFilters).reduce((sum, values) => sum + values.length, 0);

  const handleUnreadOnlyChange = (value: boolean) => {
    if (value) {
      setUnreadSessionIds(items.filter(isMaterialUnread).map((item) => item.id));
    } else {
      setUnreadSessionIds([]);
    }
    setUnreadOnly(value);
  };

  const selectMaterial = (material: Material) => {
    onSelectMaterial(material.id);
    onReadMaterial(material);
  };

  const handleDeleted = (id: number) => {
    if (selectedMaterialId === id) {
      onSelectMaterial(undefined);
    }
    onChanged();
  };
  const onScroll = (event: UIEvent<HTMLDivElement>) => {
    const element = event.currentTarget;
    const distance = element.scrollHeight - element.scrollTop - element.clientHeight;
    if (distance < 90 && query.hasNextPage && !query.isFetchingNextPage) {
      void query.fetchNextPage();
    }
  };

  const toggleType = (type: MaterialType) => {
    setTypeFilter((current) =>
      current.includes(type) ? current.filter((value) => value !== type) : [...current, type],
    );
  };

  const toggleTag = (group: TagGroup, value: string) => {
    setTagFilters((current) => {
      const key = String(group.id);
      const selected = current[key] ?? [];
      const next = group.exclusive
        ? selected.includes(value)
          ? []
          : [value]
        : selected.includes(value)
          ? selected.filter((entry) => entry !== value)
          : [...selected, value];
      const copy = { ...current, [key]: next };
      if (!copy[key].length) delete copy[key];
      return copy;
    });
  };

  const statusOptions: StatusFilterOption[] =
    view === 'library'
      ? [
          { value: 'COLLECTED', label: '已收录', statuses: ['COLLECTED'] },
          { value: 'ARCHIVED', label: '已归档', statuses: ['ARCHIVED'] },
        ]
      : view === 'invalid'
        ? [{ value: 'INVALID', label: '已失效', statuses: ['INVALID'] }]
      : view === 'inbox'
        ? []
        : [
            { value: 'INBOX', label: '收件箱', statuses: ['INBOX', 'PENDING_REVIEW'] },
            { value: 'COLLECTED', label: '已收录', statuses: ['COLLECTED'] },
            { value: 'ARCHIVED', label: '已归档', statuses: ['ARCHIVED'] },
            { value: 'INVALID', label: '已失效', statuses: ['INVALID'] },
          ];

  if (isMobile && selectedId) {
    return (
      <section className="workspace mobile-detail-workspace">
        <div className="mobile-detail-shell">
          <button className="btn compact ghost mobile-back-button" type="button" onClick={() => onSelectMaterial(undefined)}>
            <ChevronLeft size={15} /> 返回列表
          </button>
          <MaterialDetailPanel material={detail} tagGroups={detailTagGroups} onChanged={onChanged} onDeleted={handleDeleted} onSuccess={onSuccess} />
        </div>
      </section>
    );
  }

  return (
    <section className="workspace">
      {view === 'search' ? (
        <div className="search-workspace">
          <div className="search-body">
            <div className="list-pane">
              <FilterPanel
                prefsKey={filterPrefsKey}
                defaultCollapsed={false}
                keyword={keyword}
                setKeyword={setKeyword}
                sortBy={sortBy}
                setSortBy={setSortBy}
                typeFilter={typeFilter}
                toggleType={toggleType}
                tagGroups={tagGroups}
                tagFilters={tagFilters}
                selectedTagsCount={selectedTagsCount}
                tagMenuOpen={tagMenuOpen}
                setTagMenuOpen={setTagMenuOpen}
                toggleTag={toggleTag}
                showTopicHint
              />
              <MaterialListPane
                title="搜索结果"
                items={visibleItems}
                tagGroups={tagGroups}
                selectedId={selectedId}
                statusOptions={statusOptions}
                statusFilter={statusFilter}
                setStatusFilter={setStatusFilter}
                unreadOnly={unreadOnly}
                unreadCount={unreadItemsCount}
                totalCount={totalCount}
                onUnreadOnlyChange={handleUnreadOnlyChange}
                loading={query.isLoading}
                fetchingNext={query.isFetchingNextPage}
                hasNext={query.hasNextPage}
                onSelect={selectMaterial}
                onScroll={onScroll}
                animeStyleActive={animeStyleActive}
                animeFallbackCover={(material) => animeWallpaperForSeed(material.id, 3)}
              />
            </div>
            {!isMobile && (
              <MaterialDetailPanel material={detail} tagGroups={detailTagGroups} onChanged={onChanged} onDeleted={handleDeleted} onSuccess={onSuccess} />
            )}
          </div>
        </div>
      ) : (
        <div className="workspace-grid">
          <div className="list-pane">
            <FilterPanel
              prefsKey={filterPrefsKey}
              keyword={keyword}
              setKeyword={setKeyword}
              sortBy={sortBy}
              setSortBy={setSortBy}
              typeFilter={typeFilter}
              toggleType={toggleType}
              tagGroups={tagGroups}
              tagFilters={tagFilters}
              selectedTagsCount={selectedTagsCount}
              tagMenuOpen={tagMenuOpen}
              setTagMenuOpen={setTagMenuOpen}
              toggleTag={toggleTag}
            />
            <MaterialListPane
              title={view === 'library' ? '资料预览' : view === 'invalid' ? '失效资料' : '待处理资料'}
              items={visibleItems}
              tagGroups={tagGroups}
              selectedId={selectedId}
              statusOptions={statusOptions}
              statusFilter={statusFilter}
              setStatusFilter={setStatusFilter}
              unreadOnly={unreadOnly}
              unreadCount={unreadItemsCount}
              totalCount={totalCount}
              onUnreadOnlyChange={handleUnreadOnlyChange}
              loading={query.isLoading}
              fetchingNext={query.isFetchingNextPage}
              hasNext={query.hasNextPage}
              onSelect={selectMaterial}
              onScroll={onScroll}
              animeStyleActive={animeStyleActive}
              animeFallbackCover={(material) => animeWallpaperForSeed(material.id, 3)}
            />
          </div>
          {!isMobile && (
            <MaterialDetailPanel material={detail} tagGroups={detailTagGroups} onChanged={onChanged} onDeleted={handleDeleted} onSuccess={onSuccess} />
          )}
        </div>
      )}
    </section>
  );
}

function StatusChip({ status }: { status: MaterialStatus }) {
  return (
    <span className="status-chip">
      <StatusChipIcon status={status} />
      {statusLabels[status]}
    </span>
  );
}

function RequiredLabel({ children, required }: { children: React.ReactNode; required?: boolean }) {
  return (
    <span className={`field-label ${required ? 'required' : ''}`}>
      {children}
      {required && <span aria-hidden="true">*</span>}
    </span>
  );
}

function MaterialDetailPanel({
  material,
  tagGroups,
  onChanged,
  onDeleted,
  onSuccess,
}: {
  material?: Material;
  tagGroups: TagGroup[];
  onChanged: () => void;
  onDeleted: (id: number) => void;
  onSuccess: NotifySuccess;
}) {
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<UpdateMaterialPayload>({});
  const [tagSelection, setTagSelection] = useState<MaterialTag[]>([]);
  const [message, setMessage] = useState('');
  const [collectOpen, setCollectOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [collectScore, setCollectScore] = useState(8);
  const [collectComment, setCollectComment] = useState('');
  const [commentPreview, setCommentPreview] = useState(false);
  const [collectCommentPreview, setCollectCommentPreview] = useState(false);
  const [imagePreviewOpen, setImagePreviewOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(true);
  const [toast, setToast] = useState<{ tone: 'success' | 'error'; text: string }>();

  const showToast = (tone: 'success' | 'error', text: string) => {
    setToast({ tone, text });
    window.setTimeout(() => {
      setToast((current) => (current?.text === text ? undefined : current));
    }, 3200);
  };

  useEffect(() => {
    if (!material) return;
    setEditing(false);
    setMessage('');
    setForm({
      title: material.title,
      description: material.description,
      rawContent: material.rawContent,
      sourceUrl: material.sourceUrl,
      source: material.source,
      score: material.score,
      comment: material.comment,
      materialType: material.materialType,
    });
    setCollectOpen(false);
    setCommentPreview(false);
    setCollectCommentPreview(false);
    setImagePreviewOpen(false);
    setHistoryOpen(true);
    setCollectScore(material.score ?? 8);
    setCollectComment(material.comment ?? '');
    setTagSelection(material.tags.filter((tag) => tag.tagType !== 'SYSTEM'));
  }, [material?.id]);

  const coverTone = useCoverTone(material?.coverUrl);
  const imageFileKey = material ? materialCoverKey(material) : undefined;
  const imageUrlQuery = useQuery({
    queryKey: ['file-url', imageFileKey],
    queryFn: () => workspaceApi.resolveFile(imageFileKey!),
    enabled: Boolean(imageFileKey),
  });
  const displayCoverUrl = imageUrlQuery.data?.fileUrl || material?.coverUrl;
  const displayCoverTone = useCoverTone(displayCoverUrl);
  const animeStyleActive = useAnimeStyleActive();
  const detailWallpaperUrl = animeStyleActive ? animeWallpaperForSeed(material?.id ?? 0, 3) : undefined;
  const detailHeroCoverUrl = animeStyleActive && isDefaultMaterialCover(displayCoverUrl) ? undefined : displayCoverUrl;

  const updateMutation = useMutation({
    mutationFn: async () => {
      if (!material) throw new Error('未选择资料');
      const updated = await workspaceApi.updateMaterial(material.id, form);
      await workspaceApi.updateMaterialTags(material.id, tagSelection);
      if (form.score != null && form.comment) {
        await workspaceApi.collect(material.id, { score: Number(form.score), comment: form.comment });
      }
      return updated;
    },
    onSuccess: () => {
      setEditing(false);
      onSuccess('资料已保存');
      void queryClient.invalidateQueries();
      onChanged();
    },
    onError: (error) => {
      const text = errorMessage(error);
      setMessage(text);
      showToast('error', `保存失败：${text}`);
    },
  });

  const actionSuccessText: Record<'archive' | 'restore' | 'restoreCollected' | 'invalidate', string> = {
    archive: '资料已归档',
    restore: '资料已恢复到收件箱',
    restoreCollected: '资料已恢复为已收录',
    invalidate: '资料已标记失效',
  };

  const actionMutation = useMutation({
    mutationFn: async (action: 'archive' | 'restore' | 'restoreCollected' | 'invalidate') => {
      if (!material) throw new Error('未选择资料');
      if (action === 'archive') return workspaceApi.archive(material.id);
      if (action === 'restore') return workspaceApi.restore(material.id);
      if (action === 'restoreCollected') return workspaceApi.restoreCollected(material.id);
      return workspaceApi.invalidate(material.id, '手动标记失效');
    },
    onSuccess: (_result, action) => {
      onSuccess(actionSuccessText[action]);
      void queryClient.invalidateQueries();
      onChanged();
    },
    onError: (error) => {
      const text = errorMessage(error);
      setMessage(text);
      showToast('error', `操作失败：${text}`);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      if (!material) throw new Error('未选择资料');
      return workspaceApi.deleteMaterial(material.id);
    },
    onSuccess: () => {
      if (!material) return;
      const deletedId = material.id;
      setDeleteConfirmOpen(false);
      onSuccess('资料已永久删除');
      queryClient.removeQueries({ queryKey: queryKeys.material(deletedId) });
      queryClient.setQueriesData({ queryKey: ['inbox'] }, (data: { pages: PageResponse<Material>[]; pageParams: unknown[] } | undefined) =>
        removeMaterialFromInfiniteData(data, deletedId));
      queryClient.setQueriesData({ queryKey: ['materials'] }, (data: { pages: PageResponse<Material>[]; pageParams: unknown[] } | undefined) =>
        removeMaterialFromInfiniteData(data, deletedId));
      queryClient.setQueriesData({ queryKey: ['search'] }, (data: { pages: PageResponse<Material>[]; pageParams: unknown[] } | undefined) =>
        removeMaterialFromInfiniteData(data, deletedId));
      void queryClient.invalidateQueries();
      onDeleted(deletedId);
    },
    onError: (error) => {
      const text = errorMessage(error);
      setMessage(text);
      showToast('error', `删除失败：${text}`);
    },
  });
  const collectMutation = useMutation({
    mutationFn: async () => {
      if (!material) throw new Error('未选择资料');
      if (!collectComment.trim()) throw new Error('请补全评语');
      const missingRequiredGroups = requiredTagGroupsMissing();
      if (missingRequiredGroups.length > 0) {
        throw new Error(`请补全必选标签：${missingRequiredGroups.map((group) => group.name).join('、')}`);
      }
      await workspaceApi.updateMaterialTags(material.id, tagSelection);
      return workspaceApi.collect(material.id, {
        score: collectScore,
        comment: collectComment.trim(),
      });
    },
    onSuccess: () => {
      setCollectOpen(false);
    setDeleteConfirmOpen(false);
      onSuccess('资料已收录');
      void queryClient.invalidateQueries();
      onChanged();
    },
    onError: (error) => {
      const text = errorMessage(error);
      setMessage(text);
      showToast('error', `收录失败：${text}`);
    },
  });

  const historyEntries = material ? buildMaterialHistory(material) : [];

  if (!material) {
    return (
      <section
        className="detail detail-empty"
        style={detailWallpaperUrl ? { '--detail-wallpaper': `url("${detailWallpaperUrl}")` } as React.CSSProperties : undefined}
      >
        <div className="empty-state">请选择一条资料</div>
      </section>
    );
  }

  const updateField = (field: keyof UpdateMaterialPayload, value: string | number) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const toggleTag = (group: TagGroup, tag: TagValue) => {
    setTagSelection((current) => {
      const key = String(group.id);
      const selected = current.some((entry) => entry.tagGroupKey === key && entry.tagValue === tag.value);
      let next = group.exclusive ? current.filter((entry) => entry.tagGroupKey !== key) : [...current];

      if (selected) {
        next = current.filter((entry) => !(entry.tagGroupKey === key && entry.tagValue === tag.value));
      } else {
        next.push({ tagGroupKey: key, tagValue: tag.value, tagType: 'USER' });
      }

      return next;
    });
  };

  const selectedTagValues = (group: TagGroup) =>
    tagSelection
      .filter((tag) => tag.tagGroupKey === String(group.id))
      .map((tag) => tag.tagValue);

  const requiredTagGroupsMissing = () =>
    tagGroups.filter((group) => group.required && selectedTagValues(group).length === 0);

  const selectedTags = editing ? tagSelection : material.tags;

  const handleCollect = () => {
    setMessage('');
    setCollectScore(Number(form.score ?? material?.score ?? 8));
    setCollectComment(String(form.comment ?? material?.comment ?? ''));
    setCollectOpen(true);
  };

  return (
    <>
    {toast && (
      <div className={`toast ${toast.tone}`} role="status">
        {toast.tone === 'success' ? <Check size={18} /> : <X size={18} />}
        <span>{toast.text}</span>
      </div>
    )}
    <section
      className="detail"
      style={detailWallpaperUrl ? { '--detail-wallpaper': `url("${detailWallpaperUrl}")` } as React.CSSProperties : undefined}
    >
      <div
        className={`detail-hero tone-${displayCoverTone} ${detailHeroCoverUrl ? '' : 'no-cover'}`}
        style={detailHeroCoverUrl ? { '--cover-url': `url("${detailHeroCoverUrl}")` } as React.CSSProperties : undefined}
      >
        <div className="detail-toolbar">
          <StatusChip status={material.status} />
          <div className="filter-row">
            {editing ? (
              <>
                <button className="btn compact primary" disabled={updateMutation.isPending} onClick={() => updateMutation.mutate()}>
                  <Check size={15} /> 保存
                </button>
                <button className="btn compact ghost" onClick={() => setEditing(false)}>取消</button>
              </>
            ) : (
              <button className="btn compact ghost" onClick={() => setEditing(true)}>
                <Edit3 size={15} /> 编辑
              </button>
            )}
          </div>
        </div>

        <div className="detail-title">
          <div className="hero-title-box">
            {editing ? (
              <input className="input" value={form.title ?? ''} onChange={(event) => updateField('title', event.target.value)} />
            ) : (
              <h2>{material.title}</h2>
            )}
          </div>
          <div className="hero-desc-box" style={{ marginTop: 10 }}>
            {editing ? (
              <textarea
                className="textarea"
                value={form.description ?? ''}
                onChange={(event) => updateField('description', event.target.value)}
              />
            ) : (
              <p>{material.description}</p>
            )}
          </div>
        </div>
      </div>

        <div className="detail-body">
        {message && <div className="chip" style={{ color: 'var(--rose)' }}>{message}</div>}

        <div className="info-grid">
          <InfoCard label="资料类型">
            {editing ? (
              <select className="select" value={form.materialType} onChange={(event) => updateField('materialType', event.target.value)}>
                {materialTypes.map((type) => <option key={type} value={type}>{materialTypeLabels[type]}</option>)}
              </select>
            ) : materialTypeLabels[material.materialType]}
          </InfoCard>
          <InfoCard label="来源">
            {editing ? (
              <input className="input" value={form.source ?? ''} onChange={(event) => updateField('source', event.target.value)} />
            ) : material.source || '-'}
          </InfoCard>
          <InfoCard label="链接">
            {editing ? (
              <input className="input" value={form.sourceUrl ?? ''} onChange={(event) => updateField('sourceUrl', event.target.value)} />
            ) : material.sourceUrl ? <a href={material.sourceUrl} target="_blank" rel="noreferrer">{clampText(material.sourceUrl, 28)}</a> : '-'}
          </InfoCard>
          <InfoCard label="评分">
            {editing ? (
              <input className="input" type="number" min={0} max={10} step={0.1} value={form.score ?? ''} onChange={(event) => updateField('score', Number(event.target.value))} />
            ) : <span className={`score-text ${scoreTone(material.score)}`}>{material.score?.toFixed(1) ?? '-'}</span>}
          </InfoCard>
        </div>

        <div className="section">
          <h3>原始内容</h3>
          {material.materialType === 'image' && displayCoverUrl && (
            <button className="image-preview-trigger" type="button" onClick={() => setImagePreviewOpen(true)}>
              <img className="detail-original-image" src={displayCoverUrl} alt={material.title} />
            </button>
          )}
          {editing ? (
            <textarea className="textarea" value={form.rawContent ?? ''} onChange={(event) => updateField('rawContent', event.target.value)} />
          ) : (
            <p className="read-block">{material.rawContent}</p>
          )}
        </div>

        <div className="section">
          <div className="section-title-row compact">
            <h3>评语</h3>
            {editing && (
              <div className="markdown-toggle" aria-label="评语编辑模式">
                <button type="button" className={!commentPreview ? 'active' : ''} onClick={() => setCommentPreview(false)}>输入</button>
                <button type="button" className={commentPreview ? 'active' : ''} onClick={() => setCommentPreview(true)}>预览</button>
              </div>
            )}
          </div>
          {editing ? (
            commentPreview ? (
              <MarkdownView value={form.comment} />
            ) : (
              <textarea
                className="textarea markdown-editor"
                value={form.comment ?? ''}
                onChange={(event) => updateField('comment', event.target.value)}
                placeholder="支持 Markdown：**重点**、- 列表、> 引用、`代码`、[链接](https://...)"
              />
            )
          ) : (
            <MarkdownView value={material.comment} />
          )}
        </div>

        <div className="section">
          <h3>整理信息</h3>
          <div className="tag-group-list">
            {tagGroups.map((group) => {
              const activeValues = selectedTags
                .filter((tag) => tag.tagGroupKey === String(group.id))
                .map((tag) => tag.tagValue);
              if (!editing && activeValues.length === 0) return null;
              return (
                <div className="tag-group-box detail-tag-group-box" key={group.id}>
                  <strong className="detail-tag-group-name">{group.name}</strong>
                  <div className="tag-picker">
                    {editing
                      ? group.values.map((tag) => (
                          <button
                            key={tag.id}
                            className={`tag-option ${activeValues.includes(tag.value) ? 'selected' : ''}`}
                            style={tagStyle(group)}
                            onClick={() => toggleTag(group, tag)}
                          >
                            <span className="tag-hash">#</span>{tag.value}
                          </button>
                        ))
                      : activeValues.map((value) => (
                          <span className="tag-chip" style={tagStyle(group)} key={value}>
                            <span className="tag-hash">#</span>{value}
                          </span>
                        ))}
                  </div>
                  <span className="detail-tag-group-mode">{group.exclusive ? '单选' : '多选'}</span>
                </div>
              );
            })}
          </div>
        </div>

        {!editing && (
          <div className="change-history-section">
            <button
              type="button"
              className="change-history-toggle"
              onClick={() => setHistoryOpen((current) => !current)}
              aria-expanded={historyOpen}
            >
              状态变更历史
              <span>{historyOpen ? '收起' : `${historyEntries.length} 条`}</span>
            </button>
            {historyOpen && (
              <div className="status-timeline">
                {historyEntries.map((entry) => (
                  <div className="status-timeline-item" key={entry.key}>
                    <span className={`status-timeline-icon status-${entry.status}`}>
                      <StatusTimelineIcon status={entry.status} />
                    </span>
                    <strong>{entry.title}</strong>
                    <time>{shortDate(entry.occurredAt)}</time>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {!editing && (
          <div className="filter-row wrap">
            {(material.status === 'INBOX' || material.status === 'PENDING_REVIEW') && (
              <button className="btn compact primary" onClick={handleCollect}>
                <Check size={15} /> 收录
              </button>
            )}
            {material.status === 'COLLECTED' && (
              <button className="btn compact" onClick={() => actionMutation.mutate('archive')}>
                <Archive size={15} /> 归档
              </button>
            )}
            {material.status === 'ARCHIVED' && (
              <button className="btn compact" onClick={() => actionMutation.mutate('restoreCollected')}>
                <RotateCcw size={15} /> 恢复收录
              </button>
            )}
            {material.status === 'INVALID' ? (
              <>
                <button className="btn compact" onClick={() => actionMutation.mutate('restore')}>
                  <RotateCcw size={15} /> 恢复收件箱
              
                </button>
                <button className="btn compact danger" onClick={() => setDeleteConfirmOpen(true)}>
                  <Trash2 size={15} /> 永久删除
                </button>
              </>
            ) : (
              <button className="btn compact danger" onClick={() => actionMutation.mutate('invalidate')}>
                <Trash2 size={15} /> 标记失效
              </button>
            )}
          </div>
        )}
      </div>
    </section>
    {imagePreviewOpen && material.materialType === 'image' && displayCoverUrl && (
      <div className="modal-backdrop image-preview-backdrop" onClick={() => setImagePreviewOpen(false)}>
        <div className="image-preview-modal" role="dialog" aria-modal="true" aria-label="图片预览" onClick={(event) => event.stopPropagation()}>
          <button type="button" className="image-preview-close" onClick={() => setImagePreviewOpen(false)} aria-label="关闭预览">
            <X size={18} />
          </button>
          <img className="image-preview-full" src={displayCoverUrl} alt={material.title} />
        </div>
      </div>
    )}
    {deleteConfirmOpen && (
      <div className="modal-backdrop">
        <div className="modal collect-modal" role="dialog" aria-modal="true" aria-labelledby="deleteMaterialTitle">
          <div className="settings-head" style={{ paddingBottom: 0, borderBottom: 0 }}>
            <div>
              <h2 id="deleteMaterialTitle">永久删除资料</h2>
              <p className="subtitle">该操作会从客户端列表和服务端数据库中彻底删除资料，删除后无法恢复。</p>
            </div>
            <button type="button" className="btn compact ghost" onClick={() => setDeleteConfirmOpen(false)}>
              <X size={16} />
            </button>
          </div>
          <p className="read-block">{material.title}</p>
          <div className="modal-actions">
            <button type="button" className="btn ghost" onClick={() => setDeleteConfirmOpen(false)}>取消</button>
            <button type="button" className="btn danger" disabled={deleteMutation.isPending} onClick={() => deleteMutation.mutate()}>
              {deleteMutation.isPending ? '删除中...' : '确认永久删除'}
            </button>
          </div>
        </div>
      </div>
    )}    {collectOpen && (
      <div className="modal-backdrop">
        <div className="modal collect-modal" role="dialog" aria-modal="true" aria-labelledby="collectTitle">
          <div className="settings-head" style={{ paddingBottom: 0, borderBottom: 0 }}>
            <div>
              <h2 id="collectTitle">收录资料</h2>
              <p className="subtitle">补全评分和评语后，资料会进入资料库。</p>
            </div>
            <button type="button" className="btn compact ghost" onClick={() => setCollectOpen(false)}>
              <X size={16} />
            </button>
          </div>

          <div className="form-grid">
            <label className="form-row">
              <RequiredLabel required>评分</RequiredLabel>
              <div className="score-slider-row">
                <input
                  type="range"
                  min={0}
                  max={10}
                  step={0.1}
                  value={collectScore}
                  onChange={(event) => setCollectScore(Number(event.target.value))}
                />
                <strong className={`score-text ${scoreTone(collectScore)}`}>{collectScore.toFixed(1)}</strong>
              </div>
            </label>
            <div className="form-row">
              <div className="section-title-row compact">
                <RequiredLabel required>评语</RequiredLabel>
                <div className="markdown-toggle" aria-label="收录评语编辑模式">
                  <button type="button" className={!collectCommentPreview ? 'active' : ''} onClick={() => setCollectCommentPreview(false)}>输入</button>
                  <button type="button" className={collectCommentPreview ? 'active' : ''} onClick={() => setCollectCommentPreview(true)}>预览</button>
                </div>
              </div>
              {collectCommentPreview ? (
                <MarkdownView value={collectComment} emptyText="暂无预览内容" />
              ) : (
                <textarea
                  className="textarea markdown-editor"
                  value={collectComment}
                  onChange={(event) => setCollectComment(event.target.value)}
                  placeholder="支持 Markdown：**重点**、- 列表、> 引用、`代码`、[链接](https://...)"
                />
              )}
            </div>
          </div>

          <div className="section">
            <h3>标签</h3>
            <div className="tag-group-list">
              {tagGroups.map((group) => {
                const activeValues = selectedTagValues(group);
                return (
                  <div className="tag-group-box" key={group.id}>
                    <div className="tag-group-head">
                      <RequiredLabel required={group.required}>{group.name}</RequiredLabel>
                      <span>{group.exclusive ? '单选' : '多选'}</span>
                    </div>
                    <div className="tag-picker">
                      {group.values.map((tag) => (
                        <button
                          key={tag.id}
                          type="button"
                          className={`tag-option ${activeValues.includes(tag.value) ? 'selected' : ''}`}
                          style={tagStyle(group)}
                          onClick={() => toggleTag(group, tag)}
                        >
                          <span className="tag-hash">#</span>{tag.value}
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="modal-actions">
            <button type="button" className="btn ghost" onClick={() => setCollectOpen(false)}>取消</button>
            <button
              type="button"
              className="btn primary"
              disabled={collectMutation.isPending || !collectComment.trim()}
              onClick={() => collectMutation.mutate()}
            >
              确认收录
            </button>
          </div>
        </div>
      </div>
    )}
    </>
  );
}

function InfoCard({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="info-card">
      <span>{label}</span>
      <strong>{children}</strong>
    </div>
  );
}

function CaptureModal({
  topics,
  activeTopicId,
  onClose,
  onSuccess,
  onCreated,
}: {
  topics: Topic[];
  activeTopicId?: number;
  onClose: () => void;
  onSuccess: NotifySuccess;
  onCreated: (material: Material) => void;
}) {
  const [type, setType] = useState<MaterialType>('article');
  const [payload, setPayload] = useState<SubmitMaterialPayload>({
    topicId: activeTopicId ?? topics[0]?.id ?? 0,
    materialType: 'article',
    sourceUrl: '',
    rawContent: '',
    title: '',
    description: '',
    source: '',
    coverUrl: '',
  });
  const [message, setMessage] = useState('');
  const [imageUploading, setImageUploading] = useState(false);
  const [imageFileName, setImageFileName] = useState('');
  const linkRequired = type === 'article' || type === 'media';
  const contentRequired = type === 'excerpt' || type === 'input';
  const imageRequired = type === 'image';

  useEffect(() => {
    setPayload((current) => ({ ...current, topicId: activeTopicId ?? topics[0]?.id ?? current.topicId }));
  }, [activeTopicId, topics]);

  const mutation = useMutation({
    mutationFn: workspaceApi.submitMaterial,
    onSuccess: (material) => {
      onSuccess('资料采集成功');
      onCreated(material);
    },
    onError: (error) => setMessage(errorMessage(error)),
  });

  const setField = (field: keyof SubmitMaterialPayload, value: string | number) => {
    setPayload((current) => ({ ...current, [field]: value }));
  };

  const switchType = (next: MaterialType) => {
    setType(next);
    setPayload((current) => ({ ...current, materialType: next }));
  };

  const uploadImageFile = async (file: File, source = '本地图片') => {
    if (!file.type.startsWith('image/')) {
      setMessage('请上传图片格式的文件');
      return;
    }
    const fileName = file.name || `pasted-image-${Date.now()}.png`;
    setType('image');
    setImageUploading(true);
    setImageFileName(fileName);
    setMessage('');
    setPayload((current) => ({
      ...current,
      materialType: 'image',
      fileKey: undefined,
      thumbnailKey: undefined,
    }));
    const reader = new FileReader();
    reader.onload = () => {
      setPayload((current) => ({
        ...current,
        materialType: 'image',
        coverUrl: String(reader.result),
        rawContent: current.rawContent || fileName,
        title: current.title || fileName,
        source: current.source || source,
      }));
    };
    reader.readAsDataURL(file);
    try {
      const { fileKey } = await workspaceApi.uploadFile(file);
      setPayload((current) => ({
        ...current,
        fileKey,
        thumbnailKey: fileKey,
      }));
    } catch (error) {
      setMessage(errorMessage(error));
    } finally {
      setImageUploading(false);
    }
  };

  const handleImageUpload = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    void uploadImageFile(file);
  };

  const pastedImageFile = (clipboardData: DataTransfer) => {
    const imageItem = Array.from(clipboardData.items).find((item) => item.kind === 'file' && item.type.startsWith('image/'));
    const file = imageItem?.getAsFile();
    if (!file) return undefined;
    const extension = file.type.split('/')[1]?.replace('jpeg', 'jpg') || 'png';
    return file.name
      ? file
      : new File([file], `pasted-image-${Date.now()}.${extension}`, { type: file.type });
  };

  const handlePasteImage = (clipboardData: DataTransfer, preventDefault: () => void) => {
    const file = pastedImageFile(clipboardData);
    if (!file) return false;
    preventDefault();
    void uploadImageFile(file, '剪贴板图片');
    return true;
  };

  const handlePaste = (event: ReactClipboardEvent<HTMLFormElement>) => {
    event.stopPropagation();
    handlePasteImage(event.clipboardData, () => event.preventDefault());
  };

  useEffect(() => {
    const listener = (event: ClipboardEvent) => {
      if (event.defaultPrevented || !event.clipboardData) return;
      handlePasteImage(event.clipboardData, () => event.preventDefault());
    };
    window.addEventListener('paste', listener);
    return () => window.removeEventListener('paste', listener);
  });

  const submit = (event: FormEvent) => {
    event.preventDefault();
    setMessage('');
    if (!payload.topicId) {
      setMessage('请先选择收集主题');
      return;
    }
    if ((type === 'article' || type === 'media') && !payload.sourceUrl) {
      setMessage('文章和音视频需要填写链接');
      return;
    }
    if ((type === 'excerpt' || type === 'input') && !payload.rawContent) {
      setMessage('摘录和输入需要填写内容');
      return;
    }
    if (type === 'image' && imageUploading) {
      setMessage('图片上传中，请稍后提交');
      return;
    }
    if (type === 'image' && !payload.fileKey) {
      setMessage('图片资料需要先上传或粘贴图片');
      return;
    }
    mutation.mutate({ ...payload, materialType: type });
  };

  return (
    <div className="modal-backdrop">
      <form className="modal capture-panel" onSubmit={submit} onPaste={handlePaste}>
        <div className="settings-head" style={{ paddingBottom: 0, borderBottom: 0 }}>
          <h2>快速采集</h2>
          <button className="btn compact ghost" type="button" onClick={onClose}><X size={16} /></button>
        </div>

        <div className="capture-tabs">
          {materialTypes.map((item) => (
            <button
              type="button"
              key={item}
              className={`capture-tab ${type === item ? 'active' : ''}`}
              onClick={() => switchType(item)}
            >
              {materialTypeLabels[item]}
            </button>
          ))}
        </div>

        <div className="form-grid">
          <label className="form-row">
            <RequiredLabel required>收集主题</RequiredLabel>
            <select className="select" value={payload.topicId} onChange={(event) => setField('topicId', Number(event.target.value))}>
              {topics.map((topic) => <option key={topic.id} value={topic.id}>{topic.name}</option>)}
            </select>
          </label>

          {(type === 'article' || type === 'media' || type === 'social') && (
            <label className="form-row">
              <RequiredLabel required={linkRequired}>{type === 'social' ? '来源链接，可选' : '来源链接'}</RequiredLabel>
              <input className="input" value={payload.sourceUrl ?? ''} onChange={(event) => setField('sourceUrl', event.target.value)} placeholder="https://..." />
            </label>
          )}

          {type === 'image' && (
            <div className="form-row">
              <RequiredLabel required={imageRequired}>图片文件</RequiredLabel>
              <div className={`capture-image-uploader ${payload.coverUrl ? 'has-image' : ''}`}>
                {payload.coverUrl ? (
                  <img className="capture-image-preview" src={payload.coverUrl} alt="图片预览" />
                ) : (
                  <div className="capture-image-placeholder">
                    <span>图片</span>
                  </div>
                )}
                <div className="capture-image-copy">
                  <strong>{imageFileName || '选择图片或粘贴截图'}</strong>
                  <span>手机可从图库选择，电脑也支持 Ctrl+V 粘贴剪贴板图片。</span>
                  <label className="btn compact ghost capture-file-action">
                    从图库选择
                    <input type="file" accept="image/*" onChange={handleImageUpload} />
                  </label>
                </div>
              </div>
              {imageUploading && <span className="muted">图片上传中...</span>}
            </div>
          )}

          <label className="form-row">
            <RequiredLabel>标题，可选</RequiredLabel>
            <input className="input" value={payload.title ?? ''} onChange={(event) => setField('title', event.target.value)} />
          </label>

          <label className="form-row">
            <RequiredLabel required={contentRequired}>{type === 'article' || type === 'media' || type === 'image' ? '描述，可选' : '内容'}</RequiredLabel>
            <textarea className="textarea" value={payload.rawContent ?? ''} onChange={(event) => setField('rawContent', event.target.value)} placeholder="粘贴片段，或直接记录一个想法" />
          </label>

          <label className="form-row">
            <RequiredLabel>来源平台，可选</RequiredLabel>
            <input className="input" value={payload.source ?? ''} onChange={(event) => setField('source', event.target.value)} />
          </label>
        </div>

        {message && <span className="muted" style={{ color: 'var(--rose)' }}>{message}</span>}

        <div className="modal-actions">
          <button type="button" className="btn ghost" onClick={onClose}>取消</button>
          <button type="submit" className="btn primary" disabled={mutation.isPending || imageUploading}>提交资料</button>
        </div>
      </form>
    </div>
  );
}

type SettingsModal =
  | { type: 'topic'; mode: 'create' }
  | { type: 'topic'; mode: 'edit'; topic: Topic }
  | { type: 'topic'; mode: 'delete'; topic: Topic }
  | { type: 'group'; mode: 'create' }
  | { type: 'group'; mode: 'edit' | 'delete'; group: TagGroup }
  | { type: 'tag'; mode: 'create'; group: TagGroup }
  | { type: 'tag'; mode: 'edit' | 'delete'; group: TagGroup; tag: TagValue };

function TopicSettingsPage({
  topics,
  selectedTopicId,
  onSelectTopic,
  onChanged,
  onSuccess,
}: {
  topics: Topic[];
  selectedTopicId?: number;
  onSelectTopic: (topicId: number) => void;
  onChanged: () => void;
  onSuccess: NotifySuccess;
}) {
  const queryClient = useQueryClient();
  const selectedTopic = topics.find((topic) => topic.id === selectedTopicId) ?? topics[0];
  const [modal, setModal] = useState<SettingsModal>();
  const [message, setMessage] = useState('');

  const groupsQuery = useQuery({
    queryKey: queryKeys.tagGroups(selectedTopic?.id),
    queryFn: () => workspaceApi.listTagGroups(selectedTopic!.id),
    enabled: Boolean(selectedTopic?.id),
  });
  const groups = groupsQuery.data ?? [];

  const mutation = useMutation({
    mutationFn: async (submit: SettingsSubmit) => {
      if (!modal) return;
      if (modal.type === 'topic' && modal.mode === 'create') {
        return workspaceApi.createTopic({ name: submit.name, description: submit.description });
      }
      if (modal.type === 'topic' && modal.mode === 'edit') {
        return workspaceApi.updateTopic(modal.topic.id, { name: submit.name, description: submit.description });
      }
      if (modal.type === 'topic' && modal.mode === 'delete') {
        return workspaceApi.deleteTopic(modal.topic.id);
      }
      if (modal.type === 'group' && modal.mode === 'create') {
        return workspaceApi.createTagGroup(selectedTopic!.id, {
          name: submit.name,
          color: submit.color,
          exclusive: submit.exclusive,
          required: submit.required,
          sortOrder: groups.length + 1,
        });
      }
      if (modal.type === 'group' && modal.mode === 'edit') {
        return workspaceApi.updateTagGroup(selectedTopic!.id, modal.group.id, {
          name: submit.name,
          color: submit.color,
          exclusive: submit.exclusive,
          required: submit.required,
        });
      }
      if (modal.type === 'group' && modal.mode === 'delete') {
        return workspaceApi.deleteTagGroup(selectedTopic!.id, modal.group.id);
      }
      if (modal.type === 'tag' && modal.mode === 'create') {
        return workspaceApi.addTagValue(modal.group.id, submit.name);
      }
      if (modal.type === 'tag' && modal.mode === 'edit') {
        return workspaceApi.updateTagValue(modal.group.id, modal.tag.id, submit.name);
      }
      if (modal.type === 'tag' && modal.mode === 'delete') {
        return workspaceApi.deleteTagValue(modal.group.id, modal.tag.id);
      }
    },
    onSuccess: (result) => {
      if (modal) {
        onSuccess(getSettingsSuccessText(modal));
      }
      if (
        modal?.type === 'topic' &&
        modal.mode === 'create' &&
        result &&
        typeof result === 'object' &&
        'id' in result
      ) {
        onSelectTopic((result as Topic).id);
      }
      setModal(undefined);
      setMessage('');
      void queryClient.invalidateQueries();
      onChanged();
    },
    onError: (error) => setMessage(errorMessage(error)),
  });

  if (!selectedTopic) {
    return (
      <section className="workspace">
        <div className="settings-page">
          <div className="settings-head">
            <div>
              <h2>主题设置</h2>
              <p className="subtitle">当前还没有主题，请先新建一个主题后再配置标签组和标签。</p>
            </div>
            <button className="btn compact primary" onClick={() => setModal({ type: 'topic', mode: 'create' })}>新建主题</button>
          </div>
          <div className="empty-state">暂无主题</div>
        </div>

        {modal && (
          <SettingsModalView
            modal={modal}
            message={message}
            pending={mutation.isPending}
            onClose={() => {
              setModal(undefined);
              setMessage('');
            }}
            onSubmit={(submit) => mutation.mutate(submit)}
          />
        )}
      </section>
    );
  }

  return (
    <section className="workspace">
      <div className="settings-page">
        <div className="settings-topic-select-row">
          <div className="settings-topic-strip">
            {topics.map((topic) => (
              <button
                className={`settings-topic-card ${topic.id === selectedTopic.id ? 'active' : ''}`}
                key={topic.id}
                onClick={() => onSelectTopic(topic.id)}
              >
                <strong>{topic.name}</strong>
                <span>{topic.materialCount} 条资料</span>
              </button>
            ))}
          </div>
          <div className="settings-topic-actions">
            <button className="btn compact" onClick={() => setModal({ type: 'topic', mode: 'create' })}>新建主题</button>
            <button className="btn compact" onClick={() => setModal({ type: 'topic', mode: 'edit', topic: selectedTopic })}>编辑主题</button>
            <button className="btn compact danger" onClick={() => setModal({ type: 'topic', mode: 'delete', topic: selectedTopic })}>删除主题</button>
          </div>
        </div>

        <div className="settings-head">
          <div>
            <h2>{selectedTopic.name}</h2>
            <p className="subtitle">{selectedTopic.description}</p>
          </div>
          <button className="btn compact primary" onClick={() => setModal({ type: 'group', mode: 'create' })}>新增标签组</button>
        </div>

        <div className="settings-group-list">
          {groups.map((group) => (
            <article className="settings-group-card" style={{ '--group-color': group.color } as React.CSSProperties} key={group.id}>
              <div className="settings-group-head">
                <div className="settings-group-title">
                  <span className="group-swatch" />
                  <div>
                    <div className="settings-group-name-row">
                      <strong>{group.name}</strong>
                      <span className="muted" style={{ fontSize: 12 }}>{group.exclusive ? '单选' : '多选'}</span>
                    </div>
                    <span className="muted" style={{ fontSize: 12 }}>{group.values.length} 个标签</span>
                  </div>
                </div>
                <div className="settings-group-actions">
                  <button className="btn compact ghost" onClick={() => setModal({ type: 'group', mode: 'edit', group })}>编辑</button>
                  <button className="btn compact danger" onClick={() => setModal({ type: 'group', mode: 'delete', group })}>删除</button>
                </div>
              </div>

              <div className="settings-tags">
                {group.values.map((tag) => (
                  <span className="settings-tag-item" style={tagStyle(group)} key={tag.id}>
                    <button className="settings-tag-name" onClick={() => setModal({ type: 'tag', mode: 'edit', group, tag })}>
                      <span className="tag-hash">#</span>{tag.value}
                    </button>
                    <button className="settings-tag-remove" aria-label={`删除标签 ${tag.value}`} onClick={() => setModal({ type: 'tag', mode: 'delete', group, tag })}>×</button>
                  </span>
                ))}
                <button className="btn compact ghost" onClick={() => setModal({ type: 'tag', mode: 'create', group })}>+ 标签</button>
              </div>
            </article>
          ))}
        </div>
      </div>

      {modal && (
        <SettingsModalView
          modal={modal}
          message={message}
          pending={mutation.isPending}
          onClose={() => {
            setModal(undefined);
            setMessage('');
          }}
          onSubmit={(submit) => mutation.mutate(submit)}
        />
      )}
    </section>
  );
}

type SettingsSubmit = {
  name: string;
  description: string;
  color: string;
  exclusive: boolean;
  required: boolean;
};

function SettingsModalView({
  modal,
  message,
  pending,
  onClose,
  onSubmit,
}: {
  modal: SettingsModal;
  message: string;
  pending: boolean;
  onClose: () => void;
  onSubmit: (submit: SettingsSubmit) => void;
}) {
  const initial = getSettingsInitial(modal);
  const [form, setForm] = useState<SettingsSubmit>(initial);
  const isDelete = modal.mode === 'delete';
  const title = getSettingsTitle(modal);

  const submit = (event: FormEvent) => {
    event.preventDefault();
    onSubmit(form);
  };

  const update = (field: keyof SettingsSubmit) => (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const target = event.target;
    const value = target instanceof HTMLInputElement && target.type === 'checkbox' ? target.checked : target.value;
    setForm((current) => ({ ...current, [field]: value }));
  };

  return (
    <div className="modal-backdrop">
      <form className="modal" onSubmit={submit}>
        <div className="settings-head" style={{ paddingBottom: 0, borderBottom: 0 }}>
          <h2>{title}</h2>
          <button type="button" className="btn compact ghost" onClick={onClose}><X size={16} /></button>
        </div>

        {isDelete ? (
          <p className="read-block">确认删除后将调用后端约束检查；如果已有资料引用，系统会拒绝删除并提示原因。</p>
        ) : (
          <div className="form-grid">
            <label className="form-row">
              <span className="field-label">{modal.type === 'tag' ? '标签名称' : '名称'}</span>
              <input className="input" value={form.name} onChange={update('name')} required />
            </label>
            {modal.type === 'topic' && (
              <label className="form-row">
                <span className="field-label">描述</span>
                <textarea className="textarea" value={form.description} onChange={update('description')} />
              </label>
            )}
            {modal.type === 'group' && (
              <>
                <label className="form-row">
                  <span className="field-label">标签组颜色</span>
                  <div className="color-control">
                    <input type="color" value={form.color} onChange={update('color')} />
                    <strong>{form.color}</strong>
                  </div>
                </label>
                <div className="form-inline">
                  <label className="filter-row">
                    <input type="checkbox" checked={form.exclusive} onChange={update('exclusive')} /> 单选组
                  </label>
                  <label className="filter-row">
                    <input type="checkbox" checked={form.required} onChange={update('required')} /> 必填
                  </label>
                </div>
              </>
            )}
            {modal.type === 'tag' && <p className="muted">标签颜色继承所在标签组颜色，不单独设置。</p>}
          </div>
        )}

        {message && <span className="muted" style={{ color: 'var(--rose)' }}>{message}</span>}

        <div className="modal-actions">
          <button type="button" className="btn ghost" onClick={onClose}>取消</button>
          <button type="submit" className={`btn ${isDelete ? 'danger' : 'primary'}`} disabled={pending}>
            {isDelete ? '确认删除' : '保存'}
          </button>
        </div>
      </form>
    </div>
  );
}

function getSettingsInitial(modal: SettingsModal): SettingsSubmit {
  if (modal.type === 'topic' && modal.mode !== 'create') {
    return {
      name: modal.topic.name,
      description: modal.topic.description,
      color: readStoredThemeColor(),
      exclusive: false,
      required: false,
    };
  }
  if (modal.type === 'group' && modal.mode !== 'create') {
    return {
      name: modal.group.name,
      description: '',
      color: modal.group.color,
      exclusive: modal.group.exclusive,
      required: modal.group.required,
    };
  }
  if (modal.type === 'tag' && modal.mode !== 'create') {
    return {
      name: modal.tag.value,
      description: '',
      color: modal.group.color,
      exclusive: false,
      required: false,
    };
  }
  return {
    name: '',
    description: '',
    color: readStoredThemeColor(),
    exclusive: false,
    required: false,
  };
}

function getSettingsTitle(modal: SettingsModal) {
  if (modal.type === 'topic') {
    if (modal.mode === 'create') return '新建主题';
    if (modal.mode === 'edit') return '编辑主题';
    return '删除主题';
  }
  if (modal.type === 'group') {
    if (modal.mode === 'create') return '新增标签组';
    if (modal.mode === 'edit') return '编辑标签组';
    return '删除标签组';
  }
  if (modal.mode === 'create') return '添加标签';
  if (modal.mode === 'edit') return '编辑标签';
  return '删除标签';
}

function getSettingsSuccessText(modal: SettingsModal) {
  if (modal.type === 'topic') {
    if (modal.mode === 'create') return '主题已新建';
    if (modal.mode === 'edit') return '主题已保存';
    return '主题已删除';
  }
  if (modal.type === 'group') {
    if (modal.mode === 'create') return '标签组已新增';
    if (modal.mode === 'edit') return '标签组已保存';
    return '标签组已删除';
  }
  if (modal.mode === 'create') return '标签已添加';
  if (modal.mode === 'edit') return '标签已保存';
  return '标签已删除';
}

function StatsPlaceholder() {
  return (
    <section className="workspace">
      <div className="settings-page">
        <div className="settings-head">
          <div>
            <h2>统计</h2>
            <p className="subtitle">统计接口已在后端规划中，当前先保留全局功能入口。</p>
          </div>
        </div>
        <div className="empty-state">后续接入统计接口后展示主题分布、状态分布、周新增和平均评分。</div>
      </div>
    </section>
  );
}

function AssistantPlaceholder() {
  return (
    <section className="workspace">
      <div className="settings-page">
        <div className="settings-head">
          <div>
            <h2>灵感助手</h2>
            <p className="subtitle">AI 对话功能开发中。</p>
          </div>
        </div>
        <div className="empty-state">开发中</div>
      </div>
    </section>
  );
}

