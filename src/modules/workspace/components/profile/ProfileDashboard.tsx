import { useMutation, useQuery } from '@tanstack/react-query';
import { ChevronDown, ChevronRight, LogOut, User } from 'lucide-react';
import { useEffect, useState, type CSSProperties } from 'react';
import {
  DEFAULT_THEME_COLOR,
  readStoredAppearanceMode,
  readStoredThemeColor,
  saveAppearanceMode,
  saveThemeColor,
  type AppearanceMode,
} from '../../../../shared/theme/themeColor';
import { authApi } from '../../authApi';
import { changelogEntries } from '../../data/changelog';
import type { TopicSidebarCount } from '../../hooks/useMascotSummary';
import type { InterfaceStyle, Topic } from '../../types';
import { readInterfaceStyle, saveInterfaceStyle } from '../../utils/workspacePrefs';

const themePresets = [
  { name: '岛屿绿', color: DEFAULT_THEME_COLOR },
  { name: '海蓝', color: '#2563eb' },
  { name: '青蓝', color: '#0891b2' },
  { name: '紫罗兰', color: '#7c3aed' },
  { name: '玫红', color: '#be123c' },
];

function errorMessage(error: unknown) {
  if (error && typeof error === 'object' && 'message' in error) {
    return String((error as { message: string }).message);
  }
  return '操作失败，请稍后重试';
}

function MetricCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="metric-card">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

export function ProfileDashboard({
  topics,
  topicCounts,
  onLogout,
  onSuccess,
}: {
  topics: Topic[];
  topicCounts: Record<number, TopicSidebarCount>;
  onLogout: () => void;
  onSuccess: (text: string) => void;
}) {
  const [isVip, setIsVip] = useState(() => localStorage.getItem('idea-island-vip') === 'true');
  const [profileForm, setProfileForm] = useState({ nickname: '', note: '' });
  const [profileMessage, setProfileMessage] = useState('');
  const [changelogOpen, setChangelogOpen] = useState(false);
  const [themeColor, setThemeColor] = useState(readStoredThemeColor);
  const [appearanceMode, setAppearanceMode] = useState<AppearanceMode>(readStoredAppearanceMode);
  const [interfaceStyle, setInterfaceStyle] = useState<InterfaceStyle>(readInterfaceStyle);

  const changeThemeColor = (value: string, notify = false) => {
    const nextColor = saveThemeColor(value);
    setThemeColor(nextColor);
    if (notify) onSuccess('主题色已更新');
  };

  const changeAppearanceMode = (value: AppearanceMode) => {
    setAppearanceMode(saveAppearanceMode(value));
    onSuccess(value === 'dark' ? '已切换暗夜模式' : '已切换白天模式');
  };

  const changeInterfaceStyle = (value: InterfaceStyle) => {
    setInterfaceStyle(saveInterfaceStyle(value));
    onSuccess(value === 'anime' ? '已切换二次元风格' : value === 'glass' ? '已切换通透风格' : '已切换标准风格');
  };

  const profileQuery = useQuery({
    queryKey: ['user-profile'],
    queryFn: authApi.me,
  });
  const userStatsQuery = useQuery({
    queryKey: ['user-stats'],
    queryFn: authApi.stats,
  });
  const saveProfileMutation = useMutation({
    mutationFn: () => authApi.updateMe({ nickname: profileForm.nickname }),
    onSuccess: (profile) => {
      setProfileForm((current) => ({
        ...current,
        nickname: profile.nickname || profile.username || '',
      }));
      setProfileMessage('已保存');
      onSuccess('个人资料已保存');
    },
    onError: (error) => setProfileMessage(errorMessage(error)),
  });

  useEffect(() => {
    const profile = profileQuery.data;
    if (!profile) return;
    setProfileForm({
      nickname: profile.nickname || profile.username || '',
      note: localStorage.getItem('idea-island-profile-note') || '',
    });
  }, [profileQuery.data]);

  const totals = topics.reduce(
    (summary, topic) => {
      const count = topicCounts[topic.id] ?? {
        inbox: 0,
        library: topic.materialCount,
        total: topic.materialCount,
        unreadInbox: 0,
        unreadLibrary: 0,
      };
      return {
        inbox: summary.inbox + count.inbox,
        library: summary.library + count.library,
        total: summary.total + count.total,
      };
    },
    { inbox: 0, library: 0, total: 0 },
  );
  const collectedRatio = totals.total ? Math.round((totals.library / totals.total) * 100) : 0;
  const vipLimit = isVip ? 100 : 20;
  const usedRatio = Math.min(100, Math.round((totals.total / vipLimit) * 100));
  const primaryTopic = topics
    .map((topic) => ({ topic, count: topicCounts[topic.id]?.total ?? topic.materialCount }))
    .sort((a, b) => b.count - a.count)[0]?.topic;
  const profile = profileQuery.data;
  const displayName = profileForm.nickname || profile?.nickname || profile?.username || '未命名用户';
  const displayAccount = profile?.email || profile?.phone || profile?.username || '-';
  const realTopicCount = userStatsQuery.data?.topicCount ?? topics.length;
  const realMaterialCount = userStatsQuery.data?.materialCount ?? totals.total;

  return (
    <section className="workspace">
      <div className="profile-page">
        <section className="profile-hero">
          <div className="profile-identity">
            <div className="profile-avatar large">
              <User size={30} />
            </div>
            <div>
              <div className="profile-name-row">
                <h2>{displayName}</h2>
                <span className={`vip-badge ${isVip ? 'active' : ''}`}>{isVip ? 'VIP' : '普通用户'}</span>
              </div>
              <p>{displayAccount}</p>
              <p className="profile-note">{profileForm.note || '尚未填写个人说明'}</p>
            </div>
          </div>
          <button className="btn danger compact" onClick={onLogout}>
            <LogOut size={15} /> 退出登录
          </button>
        </section>

        <section className="profile-metrics">
          <MetricCard label="主题" value={realTopicCount} />
          <MetricCard label="资料" value={realMaterialCount} />
          <MetricCard label="待处理" value={totals.inbox} />
          <MetricCard label="已沉淀" value={totals.library} />
          <MetricCard label="沉淀比例" value={`${collectedRatio}%`} />
        </section>

        <div className="profile-main-grid">
          <section className="profile-card profile-form-card">
            <div className="section-title-row">
              <h3>个人资料</h3>
              <button
                className="btn compact ghost"
                disabled={saveProfileMutation.isPending}
                onClick={() => {
                  localStorage.setItem('idea-island-profile-note', profileForm.note);
                  saveProfileMutation.mutate();
                }}
              >
                保存
              </button>
            </div>
            <div className="form-grid">
              <label className="form-row">
                <span className="field-label">昵称</span>
                <input
                  className="input"
                  value={profileForm.nickname}
                  onChange={(event) => setProfileForm((current) => ({ ...current, nickname: event.target.value }))}
                />
              </label>
              <label className="form-row">
                <span className="field-label">邮箱</span>
                <input className="input" value={profile?.email || ''} disabled />
              </label>
              <label className="form-row">
                <span className="field-label">一句话说明</span>
                <input
                  className="input"
                  value={profileForm.note}
                  onChange={(event) => setProfileForm((current) => ({ ...current, note: event.target.value }))}
                  placeholder="用于自己识别这个账号的备注"
                />
              </label>
              {profile?.phone && (
                <label className="form-row">
                  <span className="field-label">手机</span>
                  <input className="input" value={profile.phone} disabled />
                </label>
              )}
              {profileMessage && (
                <span className="muted" style={{ color: profileMessage === '已保存' ? 'var(--theme)' : 'var(--rose)' }}>
                  {profileMessage}
                </span>
              )}
            </div>
          </section>

          <section className={`profile-card vip-panel ${isVip ? 'active' : ''}`}>
            <div className="section-title-row">
              <div>
                <h3>会员能力</h3>
                <p className="subtitle">{isVip ? '已开通 VIP，容量与高级能力已解锁。' : '普通用户，可升级解锁更高容量。'}</p>
              </div>
              <span className={`vip-badge ${isVip ? 'active' : ''}`}>{isVip ? 'VIP' : '普通'}</span>
            </div>
            <div className="capacity-row">
              <span>资料容量</span>
              <strong>{totals.total} / {vipLimit}</strong>
            </div>
            <div className="capacity-bar">
              <span style={{ width: `${usedRatio}%` }} />
            </div>
            <div className="vip-feature-list clean">
              <span>更多主题</span>
              <span>更大容量</span>
              <span>高级统计</span>
              <span>优先体验新能力</span>
            </div>
            <button
              className={isVip ? 'btn compact ghost' : 'btn compact primary'}
              onClick={() => {
                const next = !isVip;
                localStorage.setItem('idea-island-vip', String(next));
                setIsVip(next);
                onSuccess(next ? 'VIP 已开通' : '已切换为普通用户');
              }}
            >
              {isVip ? '切换为普通用户预览' : '升级 VIP'}
            </button>
          </section>

          <section className="profile-card theme-panel">
            <div className="section-title-row">
              <div>
                <h3>界面主题</h3>
                <p className="subtitle">切换主题色和暗夜模式，夜间浏览会降低背景亮度和眩光。</p>
              </div>
              <button className="btn compact ghost" onClick={() => changeThemeColor(DEFAULT_THEME_COLOR, true)}>
                恢复默认
              </button>
            </div>
            <div className="appearance-toggle" aria-label="明暗模式">
              <button type="button" className={appearanceMode === 'light' ? 'active' : ''} onClick={() => changeAppearanceMode('light')}>
                白天
              </button>
              <button type="button" className={appearanceMode === 'dark' ? 'active' : ''} onClick={() => changeAppearanceMode('dark')}>
                暗夜护眼
              </button>
            </div>
            <div className="appearance-toggle style-toggle" aria-label="界面风格">
              <button type="button" className={interfaceStyle === 'classic' ? 'active' : ''} onClick={() => changeInterfaceStyle('classic')}>标准</button>
              <button type="button" className={interfaceStyle === 'glass' ? 'active' : ''} onClick={() => changeInterfaceStyle('glass')}>通透</button>
              <button type="button" className={interfaceStyle === 'anime' ? 'active' : ''} onClick={() => changeInterfaceStyle('anime')}>二次元</button>
            </div>
            <div className="theme-control-grid">
              <label className="form-row">
                <span className="field-label">主题色</span>
                <div className="color-control">
                  <input
                    type="color"
                    value={themeColor}
                    onChange={(event) => changeThemeColor(event.target.value)}
                    onBlur={() => onSuccess('主题色已更新')}
                  />
                  <strong>{themeColor}</strong>
                </div>
              </label>
              <div className="theme-swatches" aria-label="常用主题色">
                {themePresets.map((preset) => (
                  <button
                    key={preset.color}
                    type="button"
                    className={themeColor === preset.color ? 'active' : ''}
                    style={{ '--swatch-color': preset.color } as CSSProperties}
                    onClick={() => changeThemeColor(preset.color, true)}
                    title={preset.name}
                    aria-label={`切换为${preset.name}`}
                  />
                ))}
              </div>
            </div>
          </section>
        </div>

        <section className="profile-card">
          <div className="section-title-row">
            <h3>主题沉淀</h3>
            <span className="subtitle">当前重点：{primaryTopic?.name ?? '-'}</span>
          </div>
          <div className="topic-stat-list modern">
            {topics.map((topic) => {
              const count = topicCounts[topic.id] ?? {
                inbox: 0,
                library: topic.materialCount,
                total: topic.materialCount,
              };
              const progress = count.total ? Math.round((count.library / count.total) * 100) : 0;
              return (
                <div className="topic-stat-row" key={topic.id}>
                  <div>
                    <strong>{topic.name}</strong>
                    <div className="topic-progress"><span style={{ width: `${progress}%` }} /></div>
                  </div>
                  <span>收件箱 {count.inbox}</span>
                  <span>资料库 {count.library}</span>
                  <span>总计 {count.total}</span>
                </div>
              );
            })}
          </div>
        </section>

        <section className={`profile-card changelog-card ${changelogOpen ? 'open' : ''}`}>
          <button
            type="button"
            className="changelog-summary"
            onClick={() => setChangelogOpen((current) => !current)}
            aria-expanded={changelogOpen}
          >
            <div>
              <h3>更新日志</h3>
              <p className="subtitle">记录当前前端版本的主要变化。</p>
            </div>
            <span className="changelog-summary-action">
              {changelogOpen ? '收起' : '展开'}
              {changelogOpen ? <ChevronRight size={15} /> : <ChevronDown size={15} />}
            </span>
          </button>
          {changelogOpen && (
            <div className="changelog-list">
              {changelogEntries.map((entry) => (
                <article className="changelog-entry" key={entry.version}>
                  <div className="changelog-version">
                    <span>{entry.version}</span>
                    <strong>{entry.title}</strong>
                    <em>{entry.date}</em>
                  </div>
                  <ul>
                    {entry.items.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
    </section>
  );
}
