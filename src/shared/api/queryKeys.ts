import type { MaterialListParams } from '../../modules/workspace/types';

export const queryKeys = {
  topics: ['topics'] as const,
  tagGroups: (topicId?: number) => ['tagGroups', topicId] as const,
  inbox: (params: MaterialListParams) => ['inbox', params] as const,
  materials: (params: MaterialListParams) => ['materials', params] as const,
  material: (id?: number) => ['material', id] as const,
  search: (params: MaterialListParams) => ['search', params] as const,
};

