import { api, shouldUseMockApi } from '../../shared/api/client';
import { DEFAULT_THEME_COLOR } from '../../shared/theme/themeColor';
import { mockRepository } from './data/mockRepository';
import type {
  Material,
  MaterialListParams,
  MaterialStatus,
  MaterialType,
  PageResponse,
  SubmitMaterialPayload,
  TagGroup,
  Topic,
  UpdateMaterialPayload,
} from './types';

type ApiMaterialDetail = {
  material: {
    id: number;
    topicId: number;
    materialType: string;
    status: string;
    title?: string;
    description?: string;
    rawContent?: string;
    sourceUrl?: string;
    fileKey?: string;
    comment?: string;
    score?: number;
    unread?: boolean;
    inboxAt?: string;
    inboxReadAt?: string;
    collectedAt?: string;
    collectedReadAt?: string;
    archivedAt?: string;
    invalidAt?: string;
    createdAt?: string;
    updatedAt?: string;
  };
  meta?: {
    author?: string;
    sourcePlatform?: string;
    publishTime?: string;
    wordCount?: number;
    durationSeconds?: number;
    thumbnailKey?: string;
  };
  tags?: Array<{
    tagType?: 'USER' | 'SYSTEM';
    tagGroupKey: string;
    tagValue: string;
  }>;
};

type ApiPage<T> = {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
};

type ApiTagGroupDetail = {
  group: ApiTagGroupResponse;
  values?: Array<{
    id?: number;
    value: string;
    sortOrder: number;
  }>;
};

type ApiTagGroupResponse = {
  id?: number | null;
  topicId: number;
  tagType?: string;
  tagGroupKey?: string;
  name: string;
  color?: string | null;
  exclusive: boolean;
  required: boolean;
  sortOrder: number;
};

const fallbackCover =
  'https://images.unsplash.com/photo-1455390582262-044cdead277a?auto=format&fit=crop&w=1200&q=80';

function paramsWithTagFilters(params: MaterialListParams) {
  const { tagFilters, ...rest } = params;
  const normalizedTagFilters = Object.fromEntries(
    Object.entries(tagFilters ?? {}).filter(([, values]) => values.length > 0),
  );
  const normalizedTagFilterList = Object.entries(normalizedTagFilters).map(([tagGroupKey, tagValues]) => ({
    tagGroupKey,
    tagValues,
  }));
  const hasTagFilters = normalizedTagFilterList.length > 0;

  return {
    ...rest,
    keyword: params.keyword?.trim() || undefined,
    tagFilters: hasTagFilters ? JSON.stringify(normalizedTagFilterList) : undefined,
  };
}

function mapMaterialDetail(detail: ApiMaterialDetail | null | undefined): Material {
  if (!detail?.material) {
    throw new Error('资料详情为空');
  }
  const material = detail.material;
  const meta = detail.meta ?? {};
  return {
    id: material.id,
    topicId: material.topicId,
    materialType: (material.materialType || 'input') as MaterialType,
    status: (material.status || 'INBOX') as MaterialStatus,
    unread: Boolean(material.unread),
    title: material.title || '未命名资料',
    description: material.description || '',
    rawContent: material.rawContent || '',
    sourceUrl: material.sourceUrl || '',
    source: meta.sourcePlatform || '',
    fileKey: material.fileKey || '',
    score: material.score,
    comment: material.comment || '',
    coverUrl: fallbackCover,
    createdAt: material.createdAt || new Date().toISOString(),
    updatedAt: material.updatedAt || material.createdAt || new Date().toISOString(),
    inboxAt: material.inboxAt,
    collectedAt: material.collectedAt,
    archivedAt: material.archivedAt,
    invalidAt: material.invalidAt,
    tags: (detail.tags ?? []).map((tag) => ({
      ...tag,
      tagType: tag.tagType?.toUpperCase() as 'USER' | 'SYSTEM' | undefined,
    })),
    meta: {
      author: meta.author,
      sourcePlatform: meta.sourcePlatform,
      publishedAt: meta.publishTime,
      wordCount: meta.wordCount,
      durationSeconds: meta.durationSeconds,
      thumbnailKey: meta.thumbnailKey,
      thumbnailUrl: undefined,
    },
  };
}

function mapMaterialPage(page: ApiPage<ApiMaterialDetail>): PageResponse<Material> {
  return {
    items: page.items.filter((item) => item?.material).map(mapMaterialDetail),
    total: page.total,
    page: page.page,
    pageSize: page.pageSize,
  };
}

function mapTagGroup(detailOrGroup: ApiTagGroupDetail | ApiTagGroupResponse): TagGroup {
  const detail = 'group' in detailOrGroup ? detailOrGroup : { group: detailOrGroup, values: [] };
  if (!detail.group?.id) {
    throw new Error('系统标签组不可编辑');
  }
  return {
    id: detail.group.id,
    topicId: detail.group.topicId,
    tagType: detail.group.tagType?.toUpperCase() as 'USER' | 'SYSTEM' | undefined,
    tagGroupKey: detail.group.tagGroupKey,
    name: detail.group.name,
    color: detail.group.color || DEFAULT_THEME_COLOR,
    exclusive: detail.group.exclusive,
    required: detail.group.required,
    sortOrder: detail.group.sortOrder,
    values: (detail.values ?? []).filter((value) => value.id).map((value) => ({
      id: value.id!,
      value: value.value,
      sortOrder: value.sortOrder,
    })),
  };
}

function isUserTagGroup(detail: ApiTagGroupDetail) {
  return detail.group?.id != null && detail.group.tagType?.toUpperCase() !== 'SYSTEM';
}

export const workspaceApi = {
  listTopics(): Promise<Topic[]> {
    if (shouldUseMockApi()) return mockRepository.listTopics();
    return api.get<Topic[]>('/api/v1/topics');
  },

  createTopic(payload: Pick<Topic, 'name' | 'description'>): Promise<Topic> {
    if (shouldUseMockApi()) return mockRepository.createTopic(payload);
    return api.post<Topic>('/api/v1/topics', payload);
  },

  updateTopic(id: number, payload: Partial<Pick<Topic, 'name' | 'description'>>): Promise<Topic> {
    if (shouldUseMockApi()) return mockRepository.updateTopic(id, payload);
    return api.put<Topic>(`/api/v1/topics/${id}`, payload);
  },

  deleteTopic(id: number): Promise<unknown> {
    if (shouldUseMockApi()) return mockRepository.deleteTopic(id);
    return api.delete(`/api/v1/topics/${id}`);
  },

  listTagGroups(topicId: number): Promise<TagGroup[]> {
    if (shouldUseMockApi()) return mockRepository.listTagGroups(topicId);
    return api
      .get<ApiTagGroupDetail[]>(`/api/v1/topics/${topicId}/tag-groups`)
      .then((groups) => groups.filter(isUserTagGroup).map(mapTagGroup));
  },

  createTagGroup(topicId: number, payload: Omit<TagGroup, 'id' | 'topicId' | 'values'>): Promise<TagGroup> {
    if (shouldUseMockApi()) return mockRepository.createTagGroup(topicId, payload);
    const createPayload = {
      name: payload.name,
      exclusive: payload.exclusive,
      required: payload.required,
      sortOrder: payload.sortOrder,
    };
    return api
      .post<ApiTagGroupResponse>(`/api/v1/topics/${topicId}/tag-groups`, createPayload)
      .then((group) => {
        if (!payload.color) return mapTagGroup(group);
        if (!group.id) throw new Error('标签组创建失败');
        return api
          .put<ApiTagGroupResponse>(`/api/v1/topics/${topicId}/tag-groups/${group.id}`, { color: payload.color })
          .then(mapTagGroup);
      });
  },

  updateTagGroup(topicId: number, groupId: number, payload: Partial<TagGroup>): Promise<TagGroup> {
    if (shouldUseMockApi()) return mockRepository.updateTagGroup(topicId, groupId, payload);
    return api
      .put<ApiTagGroupResponse>(`/api/v1/topics/${topicId}/tag-groups/${groupId}`, payload)
      .then(mapTagGroup);
  },

  deleteTagGroup(topicId: number, groupId: number): Promise<unknown> {
    if (shouldUseMockApi()) return mockRepository.deleteTagGroup(topicId, groupId);
    return api.delete(`/api/v1/topics/${topicId}/tag-groups/${groupId}`);
  },

  addTagValue(groupId: number, value: string): Promise<TagGroup> {
    if (shouldUseMockApi()) return mockRepository.addTagValue(groupId, value);
    return api.post<TagGroup>(`/api/v1/tag-groups/${groupId}/values`, { value });
  },

  updateTagValue(groupId: number, valueId: number, value: string): Promise<TagGroup> {
    if (shouldUseMockApi()) return mockRepository.updateTagValue(groupId, valueId, value);
    return api.put<TagGroup>(`/api/v1/tag-groups/${groupId}/values/${valueId}`, { value });
  },

  deleteTagValue(groupId: number, valueId: number): Promise<unknown> {
    if (shouldUseMockApi()) return mockRepository.deleteTagValue(groupId, valueId);
    return api.delete(`/api/v1/tag-groups/${groupId}/values/${valueId}`);
  },

  listInbox(params: MaterialListParams): Promise<PageResponse<Material>> {
    if (shouldUseMockApi()) return mockRepository.listInbox(params);
    return api
      .get<ApiPage<ApiMaterialDetail>>('/api/v1/materials', { params: paramsWithTagFilters(params) })
      .then(mapMaterialPage);
  },

  listMaterials(params: MaterialListParams): Promise<PageResponse<Material>> {
    if (shouldUseMockApi()) return mockRepository.listMaterials(params);
    return api
      .get<ApiPage<ApiMaterialDetail>>('/api/v1/materials', { params: paramsWithTagFilters(params) })
      .then(mapMaterialPage);
  },

  searchMaterials(params: MaterialListParams): Promise<PageResponse<Material>> {
    if (shouldUseMockApi()) return mockRepository.searchMaterials(params);
    return api
      .get<ApiPage<ApiMaterialDetail>>('/api/v1/search', { params: paramsWithTagFilters(params) })
      .then(mapMaterialPage);
  },

  getMaterial(id: number): Promise<Material> {
    if (shouldUseMockApi()) return mockRepository.getMaterial(id);
    return api.get<ApiMaterialDetail>(`/api/v1/materials/${id}`).then(mapMaterialDetail);
  },

  submitMaterial(payload: SubmitMaterialPayload): Promise<Material> {
    if (shouldUseMockApi()) return mockRepository.submitMaterial(payload);
    const { coverUrl: _coverUrl, source, ...request } = payload;
    return api
      .post<number>('/api/v1/materials', {
        ...request,
        sourcePlatform: payload.sourcePlatform ?? source,
        thumbnailKey: payload.thumbnailKey ?? payload.fileKey,
      })
      .then((id) => workspaceApi.getMaterial(id));
  },

  async uploadFile(file: File): Promise<{ fileKey: string }> {
    if (shouldUseMockApi()) {
      return { fileKey: `mock/${Date.now()}-${file.name}` };
    }
    const formData = new FormData();
    formData.append('file', file);
    return api.post<{ fileKey: string }>('/api/v1/files/upload', formData);
  },

  resolveFile(fileKey: string): Promise<{ fileKey: string; fileUrl: string }> {
    if (shouldUseMockApi()) return Promise.resolve({ fileKey, fileUrl: fileKey });
    return api.get<{ fileKey: string; fileUrl: string }>('/api/v1/files/resolve', { params: { fileKey } });
  },

  updateMaterial(id: number, payload: UpdateMaterialPayload): Promise<Material> {
    if (shouldUseMockApi()) return mockRepository.updateMaterial(id, payload);
    return api.patch<ApiMaterialDetail>(`/api/v1/materials/${id}`, payload).then(mapMaterialDetail);
  },

  updateMaterialTags(id: number, tags: Material['tags']): Promise<void> {
    if (shouldUseMockApi()) {
      return mockRepository.updateMaterialTags(id, tags).then(() => undefined);
    }
    return api.put(`/api/v1/materials/${id}/tags`, { tags }).then(() => undefined);
  },

  markRead(id: number): Promise<void> {
    if (shouldUseMockApi()) {
      return mockRepository.getMaterial(id).then((material) => {
        if (material.status === 'INBOX') {
          return mockRepository.transitionMaterial(id, 'PENDING_REVIEW').then(() => undefined);
        }
        if (material.status === 'COLLECTED') {
          return mockRepository.transitionMaterial(id, 'COLLECTED', { unread: false }).then(() => undefined);
        }
        return undefined;
      });
    }
    return api.post(`/api/v1/materials/${id}/mark-read`).then(() => undefined);
  },

  collect(id: number, payload: { score: number; comment: string }): Promise<void> {
    if (shouldUseMockApi()) {
      void mockRepository.transitionMaterial(id, 'COLLECTED', payload);
      return Promise.resolve();
    }
    return api.post(`/api/v1/materials/${id}/collect`, payload).then(() => undefined);
  },

  archive(id: number): Promise<void> {
    if (shouldUseMockApi()) {
      void mockRepository.transitionMaterial(id, 'ARCHIVED');
      return Promise.resolve();
    }
    return api.post(`/api/v1/materials/${id}/archive`).then(() => undefined);
  },

  invalidate(id: number, invalidReason: string): Promise<void> {
    if (shouldUseMockApi()) {
      void mockRepository.transitionMaterial(id, 'INVALID', { comment: invalidReason });
      return Promise.resolve();
    }
    return api
      .post(`/api/v1/materials/${id}/invalidate`, { invalidReason })
      .then(() => undefined);
  },

  restore(id: number): Promise<void> {
    if (shouldUseMockApi()) {
      void mockRepository.transitionMaterial(id, 'INBOX');
      return Promise.resolve();
    }
    return api.post(`/api/v1/materials/${id}/restore`).then(() => undefined);
  },

  restoreCollected(id: number): Promise<void> {
    if (shouldUseMockApi()) {
      void mockRepository.transitionMaterial(id, 'COLLECTED');
      return Promise.resolve();
    }
    return api.post(`/api/v1/materials/${id}/restore-collected`).then(() => undefined);
  },
};
