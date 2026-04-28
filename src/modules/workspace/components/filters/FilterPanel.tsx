import { ChevronDown, ChevronRight } from 'lucide-react';
import { useEffect, useState } from 'react';
import { materialTypeLabels } from '../../../../shared/utils/format';
import type { MaterialSortBy, MaterialType, TagGroup } from '../../types';
import { tagStyle } from '../../utils/materialView';
import { readWorkspacePrefs, saveWorkspacePrefs } from '../../utils/workspacePrefs';

const materialTypes: MaterialType[] = ['article', 'social', 'media', 'image', 'excerpt', 'input'];

export function FilterPanel({
  prefsKey,
  keyword,
  setKeyword,
  sortBy,
  setSortBy,
  typeFilter,
  toggleType,
  tagGroups,
  tagFilters,
  selectedTagsCount,
  tagMenuOpen,
  setTagMenuOpen,
  toggleTag,
  showTopicHint,
  defaultCollapsed = true,
}: {
  prefsKey: string;
  defaultCollapsed?: boolean;
  keyword: string;
  setKeyword: (value: string) => void;
  sortBy: Exclude<MaterialSortBy, 'status'>;
  setSortBy: (value: Exclude<MaterialSortBy, 'status'>) => void;
  typeFilter: MaterialType[];
  toggleType: (type: MaterialType) => void;
  tagGroups: TagGroup[];
  tagFilters: Record<string, string[]>;
  selectedTagsCount: number;
  tagMenuOpen: boolean;
  setTagMenuOpen: (value: boolean) => void;
  toggleTag: (group: TagGroup, value: string) => void;
  showTopicHint?: boolean;
}) {
  const [collapsed, setCollapsed] = useState(() => readWorkspacePrefs().filterPanelCollapsed?.[prefsKey] ?? defaultCollapsed);

  useEffect(() => {
    setCollapsed(readWorkspacePrefs().filterPanelCollapsed?.[prefsKey] ?? defaultCollapsed);
  }, [defaultCollapsed, prefsKey]);

  const summaryParts = [
    keyword.trim() ? '关键词' : '',
    typeFilter.length ? `${typeFilter.length} 个类型` : '',
    selectedTagsCount ? `${selectedTagsCount} 个标签` : '',
  ].filter(Boolean);

  const toggleCollapsed = () => {
    setCollapsed((current) => {
      const next = !current;
      saveWorkspacePrefs((prefs) => ({
        ...prefs,
        filterPanelCollapsed: {
          ...(prefs.filterPanelCollapsed ?? {}),
          [prefsKey]: next,
        },
      }));
      return next;
    });
  };

  return (
    <div className="filter-panel">
      <div className="filter-panel-head">
        <div className="filter-panel-title">
          <strong>筛选条件</strong>
          <span>{summaryParts.length ? summaryParts.join(' · ') : '未设置筛选条件'}</span>
        </div>
        <button type="button" className="btn compact ghost filter-toggle" onClick={toggleCollapsed}>
          {collapsed ? '展开' : '收起'}
          {collapsed ? <ChevronDown size={15} /> : <ChevronRight size={15} />}
        </button>
      </div>

      {!collapsed && (
        <>
          <div className="filter-row">
            <input
              className="input"
              value={keyword}
              onChange={(event) => setKeyword(event.target.value)}
              placeholder="搜索标题、描述、原始内容、评语、来源、链接或标签"
            />
            <select className="select" style={{ maxWidth: 170 }} value={sortBy} onChange={(event) => setSortBy(event.target.value as Exclude<MaterialSortBy, 'status'>)}>
              <option value="statusAt">最近加入</option>
              <option value="updatedAt">最近更新</option>
              <option value="createdAt">最近创建</option>
              <option value="score">评分优先</option>
            </select>
          </div>

          {showTopicHint && <div className="muted" style={{ fontSize: 12 }}>按主题检索，标签条件按当前左侧主题的标签组选择。</div>}

          <div className="filter-row wrap">
            <span className="muted" style={{ fontSize: 12 }}>资料类型</span>
            {materialTypes.map((type) => (
              <button
                key={type}
                className={`chip ${typeFilter.includes(type) ? 'active' : ''}`}
                onClick={() => toggleType(type)}
              >
                {materialTypeLabels[type]}
              </button>
            ))}
          </div>

          <div className="filter-row wrap">
            {selectedTagsCount === 0 ? (
              <span className="muted" style={{ fontSize: 12 }}>未选择标签条件</span>
            ) : (
              tagGroups.flatMap((group) =>
                (tagFilters[String(group.id)] ?? []).map((value) => (
                  <span key={`${group.id}-${value}`} className="tag-chip" style={tagStyle(group)}>
                    <span className="tag-hash">#</span>{value}
                  </span>
                )),
              )
            )}
            <button className="btn compact ghost" onClick={() => setTagMenuOpen(!tagMenuOpen)}>添加标签条件</button>
          </div>

          {tagMenuOpen && (
            <div className="tag-group-list">
              {tagGroups.map((group) => (
                <div className="tag-group-box" key={group.id}>
                  <div className="tag-group-head">
                    <strong>{group.name}</strong>
                    <span>{group.exclusive ? '单选组' : '多选组'}</span>
                  </div>
                  <div className="tag-picker">
                    {group.values.map((tag) => {
                      const selected = (tagFilters[String(group.id)] ?? []).includes(tag.value);
                      return (
                        <button
                          key={tag.id}
                          className={`tag-option ${selected ? 'selected' : ''}`}
                          style={tagStyle(group)}
                          onClick={() => toggleTag(group, tag.value)}
                        >
                          <span className="tag-hash">#</span>{tag.value}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
