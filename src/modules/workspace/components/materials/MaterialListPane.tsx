import { useQuery } from '@tanstack/react-query';
import { Archive, Edit3, Inbox, X } from 'lucide-react';
import { useLayoutEffect, useRef, useState, type CSSProperties, type UIEvent } from 'react';
import { clampText, materialTypeLabels, scoreTone, shortDate, statusLabels } from '../../../../shared/utils/format';
import { workspaceApi } from '../../api';
import { commentPreviewText } from '../MarkdownView';
import type { Material, MaterialStatus, MaterialTag, TagGroup } from '../../types';
import {
  groupForTag,
  isDefaultMaterialCover,
  isMaterialUnread,
  materialCoverKey,
  materialTagsForGroups,
  statusEnteredAt,
  tagStyle,
} from '../../utils/materialView';

export type StatusFilterOption = {
  value: string;
  label: string;
  statuses: MaterialStatus[];
};

export function MaterialListPane({
  title,
  items,
  tagGroups,
  selectedId,
  statusOptions,
  statusFilter,
  setStatusFilter,
  unreadOnly,
  unreadCount,
  totalCount,
  onUnreadOnlyChange,
  loading,
  fetchingNext,
  hasNext,
  onSelect,
  onScroll,
  animeStyleActive,
  animeFallbackCover,
}: {
  title: string;
  items: Material[];
  tagGroups: TagGroup[];
  selectedId?: number;
  statusOptions: StatusFilterOption[];
  statusFilter: MaterialStatus[];
  setStatusFilter: (value: MaterialStatus[]) => void;
  unreadOnly: boolean;
  unreadCount: number;
  totalCount: number;
  onUnreadOnlyChange: (value: boolean) => void;
  loading: boolean;
  fetchingNext: boolean;
  hasNext: boolean;
  onSelect: (material: Material) => void;
  onScroll: (event: UIEvent<HTMLDivElement>) => void;
  animeStyleActive: boolean;
  animeFallbackCover: (material: Material) => string;
}) {
  return (
    <section className="list-pane">
      {statusOptions.length > 1 && (
        <StatusSwitchBar
          options={statusOptions}
          value={statusFilter}
          onChange={setStatusFilter}
        />
      )}
      <div className="list-toolbar">
        <h2>{title}</h2>
        <div className="list-toolbar-actions">
          <button
            type="button"
            className={`unread-filter ${unreadOnly ? 'active' : ''}`}
            onClick={() => onUnreadOnlyChange(!unreadOnly)}
            title={unreadOnly ? '切换为全部资料' : '只查看未读资料'}
          >
            {unreadOnly ? `未读 ${unreadCount} 条` : `全部 ${totalCount} 条`}
          </button>
        </div>
      </div>
      <div className="list-scroll" onScroll={onScroll}>
        {loading ? (
          <div className="load-state">加载中...</div>
        ) : items.length === 0 ? (
          <div className="empty-state">暂无资料</div>
        ) : (
          <div className="material-list">
            {items.map((item) => (
              <MaterialCard
                key={item.id}
                material={item}
                tagGroups={tagGroups}
                active={item.id === selectedId}
                unread={isMaterialUnread(item)}
                animeStyleActive={animeStyleActive}
                animeFallbackCover={animeFallbackCover(item)}
                onClick={() => onSelect(item)}
              />
            ))}
            <div className="load-state">
              {fetchingNext ? '正在加载下一页...' : hasNext ? '继续下滑加载更多' : `已加载全部 ${unreadOnly ? items.length : totalCount} 条`}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

function StatusSwitchBar({
  options,
  value,
  onChange,
}: {
  options: StatusFilterOption[];
  value: MaterialStatus[];
  onChange: (value: MaterialStatus[]) => void;
}) {
  const activeOption = options.find((option) =>
    option.statuses.length === value.length && option.statuses.every((status) => value.includes(status)),
  );
  const activeKey = activeOption?.value ?? 'ALL';
  const switchItems = [{ value: 'ALL' as const, label: '全部' }, ...options];

  return (
    <div className="status-switch" aria-label="状态筛选">
      {switchItems.map((option) => {
        const active = option.value === activeKey || (option.value === 'ALL' && value.length === 0);
        return (
          <button
            key={option.value}
            type="button"
            className={active ? 'active' : ''}
            onClick={() => onChange(option.value === 'ALL' ? [] : ('statuses' in option ? option.statuses : []))}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

function MaterialCard({
  material,
  tagGroups,
  active,
  unread,
  animeStyleActive,
  animeFallbackCover,
  onClick,
}: {
  material: Material;
  tagGroups: TagGroup[];
  active: boolean;
  unread: boolean;
  animeStyleActive: boolean;
  animeFallbackCover: string;
  onClick: () => void;
}) {
  const coverKey = materialCoverKey(material);
  const coverQuery = useQuery({
    queryKey: ['file-url', coverKey],
    queryFn: () => workspaceApi.resolveFile(coverKey!),
    enabled: Boolean(coverKey),
    staleTime: 5 * 60 * 1000,
  });
  const resolvedCoverUrl = material.meta.thumbnailUrl || coverQuery.data?.fileUrl || material.coverUrl;
  const hasOriginalCover = Boolean(
    material.meta.thumbnailUrl || coverKey || (material.coverUrl && !isDefaultMaterialCover(material.coverUrl)),
  );
  const thumbnailUrl = animeStyleActive && !hasOriginalCover
    ? animeFallbackCover
    : resolvedCoverUrl;
  const author = material.meta.author?.trim();
  const scoreBlockRef = useRef<HTMLDivElement>(null);
  const scoreTextRef = useRef<HTMLSpanElement>(null);
  const commentRef = useRef<HTMLParagraphElement>(null);
  const [commentLines, setCommentLines] = useState(0);

  useLayoutEffect(() => {
    if (!material.comment) {
      setCommentLines(0);
      return;
    }

    const measure = () => {
      const block = scoreBlockRef.current;
      const score = scoreTextRef.current;
      const comment = commentRef.current;
      if (!block || !score || !comment) return;

      const blockStyle = window.getComputedStyle(block);
      const commentStyle = window.getComputedStyle(comment);
      const gap = Number.parseFloat(blockStyle.rowGap || blockStyle.gap || '0') || 0;
      const lineHeight = Number.parseFloat(commentStyle.lineHeight) || 18;
      const availableHeight = block.clientHeight - score.offsetHeight - gap;
      const nextLines = Math.floor(availableHeight / lineHeight);
      setCommentLines(nextLines >= 1 ? nextLines : 0);
    };

    measure();
    const observer = new ResizeObserver(measure);
    if (scoreBlockRef.current) observer.observe(scoreBlockRef.current);
    if (scoreTextRef.current) observer.observe(scoreTextRef.current);
    return () => observer.disconnect();
  }, [material.comment, material.score, material.status]);

  return (
    <button className={`material-card ${active ? 'active' : ''} ${unread ? 'unread' : ''}`} onClick={onClick}>
      <img className="material-thumb" alt="" src={thumbnailUrl} />
      <div className="material-content">
        <div className="material-main">
          <div className="material-meta-line">
            {unread && <span className="unread-dot" aria-label="未读" />}
            <span>{materialTypeLabels[material.materialType]}</span>
            <span>{material.source || material.meta.sourcePlatform || '未知来源'}</span>
            <StatusChip status={material.status} />
            {unread && <span className="unread-label">未读</span>}
          </div>
          <h3 className="material-title">{author ? `【${author}】${material.title}` : material.title}</h3>
          <p className="material-desc">{clampText(material.description || material.rawContent, 72)}</p>
          <div className="material-footer">
            <div className="tag-row">
              {materialTagsForGroups(material, tagGroups).map((tag) => (
                <TagChip key={`${tag.tagGroupKey}-${tag.tagValue}`} tag={tag} group={groupForTag(tag, tagGroups)} />
              ))}
            </div>
          </div>
        </div>
        <aside className="material-side">
          {(material.status === 'COLLECTED' || material.status === 'ARCHIVED' || material.score != null) && (
            <div className="material-score-block" ref={scoreBlockRef}>
              <span className={`score-text ${scoreTone(material.score)}`} ref={scoreTextRef}>{material.score?.toFixed(1) ?? '-'}</span>
              {material.comment && (
                <p
                  ref={commentRef}
                  className={`material-comment ${commentLines < 1 ? 'hidden' : ''}`}
                  style={{ '--material-comment-lines': commentLines } as CSSProperties}
                >
                  {commentPreviewText(material.comment)}
                </p>
              )}
            </div>
          )}
          <span className="material-updated">{shortDate(statusEnteredAt(material))} 加入</span>
        </aside>
      </div>
    </button>
  );
}

function StatusChip({ status }: { status: MaterialStatus }) {
  return (
    <span className="status-chip">
      <StatusIcon status={status} />
      {statusLabels[status]}
    </span>
  );
}

function StatusIcon({ status }: { status: MaterialStatus }) {
  if (status === 'COLLECTED') {
    return (
      <svg className="status-icon-collected material-status-collected" width="17" height="17" viewBox="0 0 24 24" aria-hidden="true">
        <circle cx="12" cy="12" r="9.5" />
        <path d="M7 12.1 10.3 15.3 17 8.7" />
      </svg>
    );
  }
  if (status === 'ARCHIVED') return <Archive size={12} />;
  if (status === 'INVALID') return <X size={12} />;
  if (status === 'PENDING_REVIEW') return <Edit3 size={12} />;
  return <Inbox size={12} />;
}

function TagChip({ tag, group }: { tag: MaterialTag; group?: TagGroup }) {
  return (
    <span className="tag-chip" style={tagStyle(group)}>
      <span className="tag-hash">#</span>{tag.tagValue}
    </span>
  );
}
