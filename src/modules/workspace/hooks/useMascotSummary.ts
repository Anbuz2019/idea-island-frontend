import { useMemo } from 'react';
import type { Material, Topic } from '../types';

export type TopicSidebarCount = {
  inbox: number;
  library: number;
  total: number;
  unreadInbox: number;
  unreadLibrary: number;
};

export function useMascotSummary({
  activeTopic,
  topics,
  topicCounts,
  selectedMaterial,
}: {
  activeTopic?: Topic;
  topics: Topic[];
  topicCounts: Record<number, TopicSidebarCount>;
  selectedMaterial?: Material;
}) {
  const activeCounts = activeTopic ? topicCounts[activeTopic.id] : undefined;
  const workspaceSummary = useMemo(() => {
    const total = topics.reduce(
      (summary, topic) => {
        const count = topicCounts[topic.id] ?? {
          inbox: 0,
          library: 0,
          total: topic.materialCount,
          unreadInbox: 0,
          unreadLibrary: 0,
        };
        return {
          inbox: summary.inbox + count.inbox,
          library: summary.library + count.library,
          total: summary.total + count.total,
          unreadInbox: summary.unreadInbox + count.unreadInbox,
          unreadLibrary: summary.unreadLibrary + count.unreadLibrary,
        };
      },
      { inbox: 0, library: 0, total: 0, unreadInbox: 0, unreadLibrary: 0 },
    );
    return {
      topicName: activeTopic?.name,
      topicCount: topics.length,
      activeInbox: activeCounts?.inbox ?? 0,
      activeLibrary: activeCounts?.library ?? 0,
      activeUnread: (activeCounts?.unreadInbox ?? 0) + (activeCounts?.unreadLibrary ?? 0),
      totalMaterials: total.total,
      totalInbox: total.inbox,
      totalLibrary: total.library,
      totalUnread: total.unreadInbox + total.unreadLibrary,
    };
  }, [activeCounts, activeTopic?.name, topicCounts, topics]);

  const materialSummary = selectedMaterial ? {
    id: selectedMaterial.id,
    title: selectedMaterial.title,
    status: selectedMaterial.status,
    score: selectedMaterial.score,
    tagCount: selectedMaterial.tags.filter((tag) => tag.tagType !== 'SYSTEM').length,
    hasComment: Boolean(selectedMaterial.comment?.trim()),
    hasDescription: Boolean(selectedMaterial.description?.trim()),
  } : undefined;

  return { workspaceSummary, materialSummary };
}
