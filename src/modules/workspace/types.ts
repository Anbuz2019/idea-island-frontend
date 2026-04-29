export type MaterialType = 'article' | 'social' | 'media' | 'image' | 'excerpt' | 'input';

export type MaterialStatus = 'INBOX' | 'PENDING_REVIEW' | 'COLLECTED' | 'ARCHIVED' | 'INVALID';

export type ViewKey = 'inbox' | 'library' | 'invalid' | 'search' | 'topicSettings' | 'stats' | 'assistant' | 'profile';

export type InterfaceStyle = 'classic' | 'glass' | 'anime';

export type MaterialSortBy = 'createdAt' | 'updatedAt' | 'score' | 'status' | 'statusAt';

export type Topic = {
  id: number;
  name: string;
  description: string;
  status: 0 | 1;
  materialCount: number;
};

export type TagValue = {
  id: number;
  value: string;
  sortOrder: number;
};

export type TagGroup = {
  id: number;
  topicId: number;
  tagType?: 'USER' | 'SYSTEM';
  tagGroupKey?: string;
  name: string;
  color: string;
  exclusive: boolean;
  required: boolean;
  sortOrder: number;
  values: TagValue[];
};

export type MaterialTag = {
  tagGroupKey: string;
  tagValue: string;
  tagType?: 'USER' | 'SYSTEM';
};

export type MaterialMeta = {
  author?: string;
  sourcePlatform?: string;
  publishedAt?: string;
  wordCount?: number;
  durationSeconds?: number;
  thumbnailKey?: string;
  thumbnailUrl?: string;
};

export type MaterialStatusHistory = {
  status: string;
  label: string;
  occurredAt: string;
};

export type Material = {
  id: number;
  topicId: number;
  materialType: MaterialType;
  status: MaterialStatus;
  unread?: boolean;
  title: string;
  description: string;
  rawContent: string;
  sourceUrl?: string;
  source?: string;
  fileKey?: string;
  score?: number;
  comment?: string;
  coverUrl?: string;
  createdAt: string;
  updatedAt: string;
  inboxAt?: string;
  collectedAt?: string;
  archivedAt?: string;
  invalidAt?: string;
  statusHistory?: MaterialStatusHistory[];
  tags: MaterialTag[];
  meta: MaterialMeta;
};

export type MaterialListParams = {
  topicId?: number;
  keyword?: string;
  status?: MaterialStatus[];
  materialType?: MaterialType[];
  scoreMin?: number;
  scoreMax?: number;
  tagFilters?: Record<string, string[]>;
  sortBy?: MaterialSortBy;
  sortDirection?: 'asc' | 'desc';
  unreadOnly?: boolean;
  page?: number;
  pageSize?: number;
};

export type PageResponse<T> = {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
};

export type SubmitMaterialPayload = {
  topicId: number;
  materialType: MaterialType;
  title?: string;
  description?: string;
  rawContent?: string;
  sourceUrl?: string;
  source?: string;
  author?: string;
  sourcePlatform?: string;
  publishTime?: string;
  durationSeconds?: number;
  fileKey?: string;
  thumbnailKey?: string;
  coverUrl?: string;
  tags?: MaterialTag[];
};

export type UpdateMaterialPayload = Partial<
  Pick<Material, 'title' | 'description' | 'rawContent' | 'sourceUrl' | 'source' | 'score' | 'comment' | 'materialType'>
>;

export type UpdateMaterialMetaPayload = {
  author?: string;
  sourcePlatform?: string;
  publishTime?: string;
  wordCount?: number;
  durationSeconds?: number;
  thumbnailKey?: string;
  extraJson?: string;
};

export type TagSelection = Record<string, string[]>;
