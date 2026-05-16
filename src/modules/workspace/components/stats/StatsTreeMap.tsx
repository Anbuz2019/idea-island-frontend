import { BarChart3, Tags } from 'lucide-react';
import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import Tree, {
  type CustomNodeElementProps,
  type TreeLinkDatum,
} from 'react-d3-tree';
import type { StatsTreeInlineTag, StatsTreeKind, StatsTreeNode, StatsTreeTagFilterTarget } from './statsTreeData';

const statsTreeNodeSizes: Record<StatsTreeKind, { width: number; height: number }> = {
  root: { width: 158, height: 76 },
  topic: { width: 218, height: 64 },
  group: { width: 176, height: 48 },
  tag: { width: 154, height: 38 },
};

const statsTreeGroupInlineBaseWidth = statsTreeNodeSizes.group.width;

function statsTreeNodeStyle(color?: string): CSSProperties | undefined {
  if (!color) return undefined;
  return {
    '--tree-node-color': color,
    '--tree-node-bg': `color-mix(in srgb, ${color} 9%, var(--surface) 91%)`,
    '--tree-node-hover-bg': `color-mix(in srgb, ${color} 14%, var(--surface) 86%)`,
    '--tree-node-border': `color-mix(in srgb, ${color} 34%, var(--line) 66%)`,
  } as CSSProperties;
}

function statsTreePathClass(link: TreeLinkDatum) {
  const kind = String(link.target.data.attributes?.kind ?? 'default');
  return `stats-d3-tree-link stats-d3-tree-link-${kind}`;
}

function inlineGroupWidth(tags: StatsTreeInlineTag[]) {
  if (!tags.length) return statsTreeGroupInlineBaseWidth;
  const tagsWidth = tags.reduce((total, tag) => {
    const labelWidth = Math.max(72, tag.value.length * 15 + 34);
    const countWidth = String(tag.count).length * 9 + 18;
    return total + labelWidth + countWidth;
  }, 0);
  const gapsWidth = Math.max(0, tags.length - 1) * 7;
  return statsTreeGroupInlineBaseWidth + 18 + tagsWidth + gapsWidth;
}

function collectGroupNodeKeys(node: StatsTreeNode): string[] {
  const nodeKey = node.attributes.kind === 'group' ? node.attributes.nodeKey : undefined;
  return [
    ...(nodeKey ? [nodeKey] : []),
    ...((node.children ?? []).flatMap((child) => collectGroupNodeKeys(child))),
  ];
}

function renderStatsTreeNode(
  { nodeDatum, toggleNode }: CustomNodeElementProps,
  expandedInlineGroups: Set<string>,
  onToggleInlineGroup: (nodeKey: string) => void,
  onOpenTagFilter?: (target: StatsTreeTagFilterTarget) => void,
) {
  const kind = String(nodeDatum.attributes?.kind ?? 'tag') as StatsTreeKind;
  const count = Number(nodeDatum.attributes?.count ?? 0);
  const color = typeof nodeDatum.attributes?.color === 'string' ? nodeDatum.attributes.color : undefined;
  const typedNode = nodeDatum as unknown as StatsTreeNode;
  const inlineTags = typedNode.inlineTags ?? [];
  const nodeKey = typeof nodeDatum.attributes?.nodeKey === 'string' ? nodeDatum.attributes.nodeKey : '';
  const inlineExpanded = kind === 'group' && Boolean(nodeKey) && expandedInlineGroups.has(nodeKey);
  const size = {
    ...(statsTreeNodeSizes[kind] ?? statsTreeNodeSizes.tag),
    width: kind === 'group' && inlineExpanded ? inlineGroupWidth(inlineTags) : (statsTreeNodeSizes[kind] ?? statsTreeNodeSizes.tag).width,
  };
  const collapsed = Boolean(nodeDatum.__rd3t.collapsed);
  const hasChildren = Boolean(nodeDatum.children?.length);
  const canToggleInline = kind === 'group' && Boolean(nodeKey) && inlineTags.length > 0;
  const canToggle = hasChildren || canToggleInline;
  const openGroupFilter = () => {
    const firstTag = inlineTags[0];
    if (!firstTag) return;
    onOpenTagFilter?.({
      topicId: firstTag.topicId,
      groupId: firstTag.groupId,
      groupKey: firstTag.groupKey,
      values: inlineTags.map((tag) => tag.value),
    });
  };
  return (
    <g>
      <foreignObject
        x={kind === 'group' && inlineExpanded ? -statsTreeGroupInlineBaseWidth / 2 : -size.width / 2}
        y={-size.height / 2}
        width={size.width}
        height={size.height}
      >
        <div className={`stats-d3-node-wrap ${kind === 'group' && inlineExpanded ? 'has-inline-tags' : ''}`}>
          <button
            type="button"
            className={`stats-d3-node stats-d3-node-${kind} ${count === 0 ? 'is-empty' : ''}`}
            style={statsTreeNodeStyle(color)}
            onClick={(event) => {
              event.stopPropagation();
              if (event.detail > 1) return;
              if (canToggleInline) {
                onToggleInlineGroup(nodeKey);
                return;
              }
              if (hasChildren) toggleNode();
            }}
            onDoubleClick={(event) => {
              if (!canToggleInline) return;
              event.preventDefault();
              event.stopPropagation();
              openGroupFilter();
            }}
          >
            <span className="stats-d3-node-title">
              {kind === 'root' && <BarChart3 size={18} />}
              {kind === 'topic' && <Tags size={15} />}
              <strong>{nodeDatum.name}</strong>
            </span>
            <span className="stats-d3-node-meta">
              <em>{count}</em>
              {canToggle && <i>{canToggleInline ? (inlineExpanded ? '-' : '+') : (collapsed ? '+' : '-')}</i>}
            </span>
          </button>
          {kind === 'group' && inlineExpanded && inlineTags.length > 0 && (
            <div className="stats-d3-inline-tags" style={statsTreeNodeStyle(color)}>
              {inlineTags.map((tag) => (
                <button
                  type="button"
                  className={`stats-d3-inline-tag ${tag.count === 0 ? 'is-empty' : ''}`}
                  key={tag.id}
                  title="双击进入对应资料库筛选"
                  onClick={(event) => {
                    event.stopPropagation();
                  }}
                  onDoubleClick={(event) => {
                    event.preventDefault();
                    event.stopPropagation();
                    onOpenTagFilter?.({
                      topicId: tag.topicId,
                      groupId: tag.groupId,
                      groupKey: tag.groupKey,
                      values: [tag.value],
                    });
                  }}
                >
                  <strong># {tag.value}</strong>
                  <em>{tag.count}</em>
                </button>
              ))}
            </div>
          )}
        </div>
      </foreignObject>
    </g>
  );
}

export function StatsTreeMap({
  data,
  topicCount,
  onOpenTagFilter,
}: {
  data: StatsTreeNode;
  topicCount: number;
  onOpenTagFilter?: (target: StatsTreeTagFilterTarget) => void;
}) {
  const minHeight = Math.max(520, topicCount * 76 + 150);
  const canvasRef = useRef<HTMLDivElement | null>(null);
  const [canvasHeight, setCanvasHeight] = useState(minHeight);
  const [expandedInlineGroups, setExpandedInlineGroups] = useState<Set<string>>(() => new Set());
  const [treeInitialDepth, setTreeInitialDepth] = useState(1);
  const [treeVersion, setTreeVersion] = useState(0);
  const groupNodeKeys = useMemo(() => collectGroupNodeKeys(data), [data]);
  const toggleInlineGroup = (nodeKey: string) => {
    setExpandedInlineGroups((current) => {
      const next = new Set(current);
      if (next.has(nodeKey)) {
        next.delete(nodeKey);
      } else {
        next.add(nodeKey);
      }
      return next;
    });
  };
  const expandAll = () => {
    setExpandedInlineGroups(new Set(groupNodeKeys));
    setTreeInitialDepth(99);
    setTreeVersion((current) => current + 1);
  };
  const collapseAll = () => {
    setExpandedInlineGroups(new Set());
    setTreeInitialDepth(1);
    setTreeVersion((current) => current + 1);
  };

  useEffect(() => {
    const element = canvasRef.current;
    if (!element) return undefined;
    const updateHeight = () => {
      setCanvasHeight(Math.max(minHeight, Math.floor(element.clientHeight)));
    };
    updateHeight();
    const observer = new ResizeObserver(updateHeight);
    observer.observe(element);
    return () => observer.disconnect();
  }, [minHeight]);

  return (
    <div className="stats-d3-tree-shell">
      <div className="stats-d3-tree-toolbar">
        <span>滚轮缩放，拖拽移动，点击节点展开或收起。</span>
        <div className="stats-d3-tree-actions">
          <button type="button" className="btn compact ghost" onClick={expandAll}>全部展开</button>
          <button type="button" className="btn compact ghost" onClick={collapseAll}>全部收起</button>
        </div>
      </div>
      <div ref={canvasRef} className="stats-d3-tree-canvas" style={{ minHeight }}>
        <Tree
          key={`${treeInitialDepth}-${treeVersion}`}
          data={data}
          orientation="horizontal"
          translate={{ x: 112, y: canvasHeight / 2 }}
          nodeSize={{ x: 340, y: 76 }}
          depthFactor={340}
          separation={{ siblings: 0.96, nonSiblings: 1.12 }}
          pathFunc="step"
          pathClassFunc={statsTreePathClass}
          renderCustomNodeElement={(props) => renderStatsTreeNode(props, expandedInlineGroups, toggleInlineGroup, onOpenTagFilter)}
          collapsible
          initialDepth={treeInitialDepth}
          zoomable
          draggable
          zoom={0.96}
          scaleExtent={{ min: 0.76, max: 1.35 }}
          centeringTransitionDuration={220}
          hasInteractiveNodes
        />
      </div>
    </div>
  );
}
