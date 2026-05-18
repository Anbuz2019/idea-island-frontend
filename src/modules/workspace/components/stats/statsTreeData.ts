import type { TagGroup, Topic } from '../../types';
import type { TopicSidebarCount } from '../../hooks/useMascotSummary';

export type StatsTreeKind = 'root' | 'topic' | 'group' | 'tag';

export type StatsTreeInlineTag = {
  id: number;
  topicId: number;
  groupId: number;
  groupKey: string;
  value: string;
  count: number;
};

export type StatsTreeTagFilterTarget = Pick<StatsTreeInlineTag, 'topicId' | 'groupId' | 'groupKey'> & {
  values: string[];
};

export type StatsTreeNode = {
  name: string;
  attributes: {
    kind: StatsTreeKind;
    count: number;
    topicId?: number;
    childCount?: number;
    color?: string;
    nodeKey?: string;
  };
  children?: StatsTreeNode[];
  inlineTags?: StatsTreeInlineTag[];
};

export function buildStatsTreeData({
  topics,
  topicCounts,
  topicTagGroups,
  tagCountMap,
  total,
}: {
  topics: Topic[];
  topicCounts: Record<number, TopicSidebarCount>;
  topicTagGroups: Record<number, TagGroup[]>;
  tagCountMap: Record<string, number>;
  total: number;
}): StatsTreeNode {
  return {
    name: '资料沉淀',
    attributes: { kind: 'root', count: total, nodeKey: 'root', childCount: topics.length },
    children: topics.map((topic) => {
      const groups = topicTagGroups[topic.id] ?? [];
      return {
        name: topic.name,
        attributes: {
          kind: 'topic',
          count: topicCounts[topic.id]?.library ?? 0,
          topicId: topic.id,
          nodeKey: `topic:${topic.id}`,
          childCount: groups.length,
        },
        children: groups.map((group) => {
          const groupKey = group.tagGroupKey ?? String(group.id);
          const groupCount = group.values.reduce(
            (sum, tag) => sum + (tagCountMap[`${topic.id}:${group.id}:${tag.value}`] ?? 0),
            0,
          );
          return {
            name: group.name,
            attributes: {
              kind: 'group',
              count: groupCount,
              color: group.color,
              nodeKey: `topic:${topic.id}:group:${group.id}`,
            },
            inlineTags: group.values.map((tag) => ({
              id: tag.id,
              topicId: topic.id,
              groupId: group.id,
              groupKey,
              value: tag.value,
              count: tagCountMap[`${topic.id}:${group.id}:${tag.value}`] ?? 0,
            })),
          };
        }),
      };
    }),
  };
}
