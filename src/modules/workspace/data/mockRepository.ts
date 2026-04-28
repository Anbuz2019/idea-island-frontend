import type {
  Material,
  MaterialListParams,
  MaterialStatus,
  PageResponse,
  SubmitMaterialPayload,
  TagGroup,
  Topic,
  UpdateMaterialPayload,
} from '../types';

type MockState = {
  topics: Topic[];
  tagGroups: TagGroup[];
  materials: Material[];
  nextIds: {
    topic: number;
    group: number;
    tag: number;
    material: number;
  };
};

const storageKey = 'idea-island-frontend-mock-state-v1';

const now = new Date('2026-04-26T01:00:00+08:00').toISOString();

const seedState: MockState = {
  topics: [
    {
      id: 1,
      name: '产品增长',
      description: '用于沉淀增长、转化和用户研究资料。',
      status: 0,
      materialCount: 34,
    },
    {
      id: 2,
      name: '后端工程',
      description: '收集 Java、架构和工程实践资料。',
      status: 0,
      materialCount: 28,
    },
    {
      id: 3,
      name: '投资研究',
      description: '保存行业、公司和策略研究材料。',
      status: 0,
      materialCount: 21,
    },
    {
      id: 4,
      name: 'AI 工具',
      description: '跟踪工具、工作流和产品观察。',
      status: 0,
      materialCount: 13,
    },
  ],
  tagGroups: [
    {
      id: 101,
      topicId: 1,
      name: '增长主题',
      color: '#1d7f72',
      exclusive: false,
      required: false,
      sortOrder: 1,
      values: [
        { id: 1001, value: '定价', sortOrder: 1 },
        { id: 1002, value: '转化', sortOrder: 2 },
        { id: 1003, value: '留存', sortOrder: 3 },
        { id: 1004, value: '冷启动', sortOrder: 4 },
        { id: 1005, value: '带我去', sortOrder: 5 },
      ],
    },
    {
      id: 102,
      topicId: 1,
      name: '工作阶段',
      color: '#2f6df6',
      exclusive: true,
      required: false,
      sortOrder: 2,
      values: [
        { id: 1006, value: '待整理', sortOrder: 1 },
        { id: 1007, value: '需求分析', sortOrder: 2 },
        { id: 1008, value: '方案设计', sortOrder: 3 },
        { id: 1009, value: '代码开发', sortOrder: 4 },
        { id: 1010, value: '测试优化', sortOrder: 5 },
      ],
    },
    {
      id: 103,
      topicId: 1,
      name: '研究方式',
      color: '#c46513',
      exclusive: false,
      required: false,
      sortOrder: 3,
      values: [
        { id: 1011, value: '用户访谈', sortOrder: 1 },
        { id: 1012, value: '数据分析', sortOrder: 2 },
        { id: 1013, value: '技术选型', sortOrder: 3 },
      ],
    },
    {
      id: 201,
      topicId: 2,
      name: '工程阶段',
      color: '#0f766e',
      exclusive: true,
      required: false,
      sortOrder: 1,
      values: [
        { id: 2001, value: '架构设计', sortOrder: 1 },
        { id: 2002, value: '性能优化', sortOrder: 2 },
        { id: 2003, value: '可观测性', sortOrder: 3 },
      ],
    },
    {
      id: 301,
      topicId: 3,
      name: '研究方向',
      color: '#7c3aed',
      exclusive: false,
      required: false,
      sortOrder: 1,
      values: [
        { id: 3001, value: '行业', sortOrder: 1 },
        { id: 3002, value: '公司', sortOrder: 2 },
      ],
    },
  ],
  materials: [
    {
      id: 501,
      topicId: 1,
      materialType: 'excerpt',
      status: 'COLLECTED',
      unread: true,
      title: '留存分析：把行为路径拆成可观察事件',
      description: '已收录资料，可作为后续做统计面板时的参考。',
      rawContent:
        '不要直接问用户为什么流失，要先把关键行为路径拆成可观察事件，再根据事件缺口定位产品摩擦。',
      source: '读书摘录',
      sourceUrl: 'https://example.com/retention-path',
      score: 8.7,
      comment: '这段适合放进产品增长主题，后续可以和转化漏斗资料一起回看。',
      coverUrl: 'https://images.unsplash.com/photo-1455390582262-044cdead277a?auto=format&fit=crop&w=1200&q=80',
      createdAt: '2026-04-24T20:30:00+08:00',
      updatedAt: now,
      tags: [
        { tagGroupKey: '101', tagValue: '留存', tagType: 'USER' },
        { tagGroupKey: '102', tagValue: '方案设计', tagType: 'USER' },
        { tagGroupKey: '103', tagValue: '数据分析', tagType: 'USER' },
      ],
      meta: {
        sourcePlatform: '读书摘录',
        wordCount: 186,
      },
    },
    {
      id: 502,
      topicId: 1,
      materialType: 'social',
      status: 'PENDING_REVIEW',
      unread: false,
      title: '评论区里关于冷启动的一个反例',
      description: '社交内容，适合后续补充作者、平台和讨论上下文。',
      rawContent: '评论区有人提到，冷启动阶段不要过早追求模板化增长，而要先验证最小承诺是否成立。',
      source: '即刻',
      sourceUrl: 'https://example.com/social-growth',
      score: 8,
      comment: '',
      coverUrl: 'https://images.unsplash.com/photo-1497366754035-f200968a6e72?auto=format&fit=crop&w=900&q=80',
      createdAt: '2026-04-24T18:10:00+08:00',
      updatedAt: now,
      tags: [
        { tagGroupKey: '101', tagValue: '冷启动', tagType: 'USER' },
        { tagGroupKey: '103', tagValue: '用户访谈', tagType: 'USER' },
      ],
      meta: {
        sourcePlatform: '即刻',
      },
    },
    {
      id: 503,
      topicId: 1,
      materialType: 'article',
      status: 'INBOX',
      unread: true,
      title: '定价页不要只展示套餐，要让用户理解升级动机',
      description: '这段内容适合放进产品增长主题，后续可以和转化漏斗资料一起回看。',
      rawContent:
        '用户比较套餐时并不只是在看价格，而是在判断自己现在处于哪个阶段、继续使用产品能解决什么问题。定价页应该把功能差异翻译成场景差异。',
      source: '公众号文章',
      sourceUrl: 'https://example.com/pricing-page',
      score: 8,
      comment: '',
      coverUrl: 'https://images.unsplash.com/photo-1499750310107-5fef28a66643?auto=format&fit=crop&w=900&q=80',
      createdAt: '2026-04-25T09:20:00+08:00',
      updatedAt: now,
      tags: [
        { tagGroupKey: '101', tagValue: '定价', tagType: 'USER' },
        { tagGroupKey: '101', tagValue: '转化', tagType: 'USER' },
        { tagGroupKey: '102', tagValue: '需求分析', tagType: 'USER' },
      ],
      meta: {
        sourcePlatform: '公众号文章',
        author: '产品笔记',
        wordCount: 1420,
      },
    },
    {
      id: 504,
      topicId: 1,
      materialType: 'input',
      status: 'ARCHIVED',
      unread: false,
      title: '旧版埋点方案复盘',
      description: '已经沉淀完的历史资料，默认不作为优先处理对象。',
      rawContent: '旧版埋点只覆盖页面访问，缺少关键转化动作，导致漏斗数据无法解释用户阻塞点。',
      source: '手动输入',
      sourceUrl: '',
      score: 7.6,
      comment: '保留作为反例，后续新方案不再沿用页面级口径。',
      coverUrl: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&w=900&q=80',
      createdAt: '2026-04-19T15:00:00+08:00',
      updatedAt: now,
      tags: [
        { tagGroupKey: '101', tagValue: '转化', tagType: 'USER' },
        { tagGroupKey: '103', tagValue: '数据分析', tagType: 'USER' },
      ],
      meta: {
        wordCount: 640,
      },
    },
  ],
  nextIds: {
    topic: 10,
    group: 400,
    tag: 4000,
    material: 900,
  },
};

function createDemoMaterials(startId: number, count: number): Material[] {
  const statuses: MaterialStatus[] = ['INBOX', 'PENDING_REVIEW', 'COLLECTED', 'ARCHIVED'];
  const types: Material['materialType'][] = ['article', 'social', 'media', 'excerpt', 'input'];
  const titles = [
    '增长实验复盘：先验证承诺再扩大入口',
    '用户访谈里反复出现的转化阻塞点',
    '内容分发页面的信息层级整理',
    '新手引导不应该解释所有功能',
    '试用期用户为什么没有走到激活',
    '一个定价页面的按钮文案对照',
    '留存看板需要补充行为事件',
    '社群冷启动的边界条件记录',
    '评价体系如何避免只看点击率',
    '产品增长资料整理的字段草案',
  ];
  const tagPool = [
    { tagGroupKey: '101', tagValue: '定价' },
    { tagGroupKey: '101', tagValue: '转化' },
    { tagGroupKey: '101', tagValue: '留存' },
    { tagGroupKey: '101', tagValue: '冷启动' },
    { tagGroupKey: '102', tagValue: '需求分析' },
    { tagGroupKey: '102', tagValue: '方案设计' },
    { tagGroupKey: '103', tagValue: '用户访谈' },
    { tagGroupKey: '103', tagValue: '数据分析' },
  ];

  return Array.from({ length: count }, (_, index) => {
    const status = statuses[index % statuses.length];
    const createdAt = new Date(Date.now() - (index + 1) * 3_600_000).toISOString();
    const score = status === 'COLLECTED' || status === 'ARCHIVED' ? 7.2 + ((index % 8) * 0.3) : undefined;
    const exclusiveTag = tagPool[4 + (index % 2)];
    const freeTags = [tagPool[index % 4], tagPool[6 + (index % 2)]];

    return {
      id: startId + index,
      topicId: 1,
      materialType: types[index % types.length],
      status,
      unread: status === 'INBOX' || status === 'COLLECTED',
      title: titles[index % titles.length],
      description: '用于验证独立滚动和分页加载的示例资料，向下滚动列表会继续获取下一页。',
      rawContent:
        '这是一条用于工作台分页加载的示例资料。真实接入后，列表会按照后端 page 与 pageSize 持续加载。',
      source: index % 2 === 0 ? '公众号文章' : '读书摘录',
      sourceUrl: `https://example.com/material/${startId + index}`,
      score,
      comment: score ? '已完成评价，可进入资料库回看。' : '',
      coverUrl:
        index % 2 === 0
          ? 'https://images.unsplash.com/photo-1499750310107-5fef28a66643?auto=format&fit=crop&w=900&q=80'
          : 'https://images.unsplash.com/photo-1455390582262-044cdead277a?auto=format&fit=crop&w=900&q=80',
      createdAt,
      updatedAt: createdAt,
      tags: [...freeTags, exclusiveTag].map((tag) => ({ ...tag, tagType: 'USER' as const })),
      meta: {
        sourcePlatform: index % 2 === 0 ? '公众号文章' : '读书摘录',
        wordCount: 900 + index * 37,
      },
    };
  });
}

function ensureDemoVolume(state: MockState) {
  const productMaterials = state.materials.filter((material) => material.topicId === 1);
  if (productMaterials.length >= 28) return state;

  const existingIds = new Set(state.materials.map((material) => material.id));
  const generated = createDemoMaterials(700, 28)
    .filter((material) => !existingIds.has(material.id))
    .slice(0, 28 - productMaterials.length);

  state.materials = [...state.materials, ...generated];
  state.nextIds.material = Math.max(state.nextIds.material, 900, ...state.materials.map((material) => material.id + 1));
  return state;
}

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function readState(): MockState {
  const saved = localStorage.getItem(storageKey);
  if (!saved) {
    const state = ensureDemoVolume(clone(seedState));
    localStorage.setItem(storageKey, JSON.stringify(state));
    return clone(state);
  }

  try {
    const state = ensureDemoVolume(JSON.parse(saved) as MockState);
    writeState(state);
    return state;
  } catch {
    const state = ensureDemoVolume(clone(seedState));
    localStorage.setItem(storageKey, JSON.stringify(state));
    return clone(state);
  }
}

function writeState(state: MockState) {
  state.topics = state.topics.map((topic) => ({
    ...topic,
    materialCount: state.materials.filter((material) => material.topicId === topic.id).length,
  }));
  localStorage.setItem(storageKey, JSON.stringify(state));
}

function delay<T>(value: T, ms = 160): Promise<T> {
  return new Promise((resolve) => window.setTimeout(() => resolve(clone(value)), ms));
}

function normalizeKeyword(value?: string) {
  return value?.trim().toLowerCase();
}

function matchesTags(material: Material, tagFilters?: Record<string, string[]>) {
  if (!tagFilters || Object.keys(tagFilters).length === 0) return true;

  return Object.entries(tagFilters).every(([groupKey, selectedValues]) => {
    if (selectedValues.length === 0) return true;
    return material.tags.some(
      (tag) => tag.tagGroupKey === groupKey && selectedValues.includes(tag.tagValue),
    );
  });
}

function filterMaterials(materials: Material[], params: MaterialListParams) {
  const keyword = normalizeKeyword(params.keyword);

  return materials
    .filter((material) => (params.topicId ? material.topicId === params.topicId : true))
    .filter((material) =>
      params.status?.length ? params.status.includes(material.status) : true,
    )
    .filter((material) =>
      params.materialType?.length ? params.materialType.includes(material.materialType) : true,
    )
    .filter((material) => (params.scoreMin != null ? (material.score ?? 0) >= params.scoreMin : true))
    .filter((material) => (params.scoreMax != null ? (material.score ?? 0) <= params.scoreMax : true))
    .filter((material) => matchesTags(material, params.tagFilters))
    .filter((material) => (params.unreadOnly ? Boolean(material.unread) : true))
    .filter((material) => {
      if (!keyword) return true;
      const haystack = [
        material.title,
        material.description,
        material.rawContent,
        material.comment,
        material.source,
        material.sourceUrl,
        ...material.tags.map((tag) => tag.tagValue),
      ]
        .join(' ')
        .toLowerCase();
      return haystack.includes(keyword);
    })
    .sort((a, b) => {
      const direction = params.sortDirection === 'asc' ? 1 : -1;
      if (params.sortBy === 'score') return ((a.score ?? 0) - (b.score ?? 0)) * direction;
      if (params.sortBy === 'status') return a.status.localeCompare(b.status) * direction;
      if (params.sortBy === 'statusAt') {
        return (new Date(statusEnteredAt(a)).getTime() - new Date(statusEnteredAt(b)).getTime()) * direction;
      }
      if (params.sortBy === 'updatedAt') {
        return (new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime()) * direction;
      }
      return (new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()) * direction;
    });
}

function statusEnteredAt(material: Material) {
  if (material.status === 'INBOX') return material.inboxAt || material.createdAt;
  if (material.status === 'PENDING_REVIEW') return material.updatedAt || material.createdAt;
  if (material.status === 'COLLECTED') return material.collectedAt || material.updatedAt || material.createdAt;
  if (material.status === 'ARCHIVED') return material.archivedAt || material.updatedAt || material.createdAt;
  if (material.status === 'INVALID') return material.invalidAt || material.updatedAt || material.createdAt;
  return material.updatedAt || material.createdAt;
}

function page<T>(items: T[], params: MaterialListParams): PageResponse<T> {
  const pageNumber = params.page ?? 1;
  const pageSize = params.pageSize ?? 20;
  const start = (pageNumber - 1) * pageSize;
  return {
    items: items.slice(start, start + pageSize),
    total: items.length,
    page: pageNumber,
    pageSize,
  };
}

export const mockRepository = {
  async listTopics() {
    return delay(readState().topics);
  },

  async createTopic(payload: Pick<Topic, 'name' | 'description'>) {
    const state = readState();
    const topic: Topic = {
      id: state.nextIds.topic++,
      name: payload.name,
      description: payload.description,
      status: 0,
      materialCount: 0,
    };
    state.topics.push(topic);
    writeState(state);
    return delay(topic);
  },

  async updateTopic(id: number, payload: Partial<Pick<Topic, 'name' | 'description'>>) {
    const state = readState();
    state.topics = state.topics.map((topic) => (topic.id === id ? { ...topic, ...payload } : topic));
    writeState(state);
    return delay(state.topics.find((topic) => topic.id === id)!);
  },

  async deleteTopic(id: number) {
    const state = readState();
    if (state.materials.some((material) => material.topicId === id)) {
      throw { code: 1005, message: '主题下仍有资料，无法删除' };
    }
    state.topics = state.topics.filter((topic) => topic.id !== id);
    state.tagGroups = state.tagGroups.filter((group) => group.topicId !== id);
    writeState(state);
    return delay({});
  },

  async listTagGroups(topicId: number) {
    return delay(
      readState()
        .tagGroups.filter((group) => group.topicId === topicId)
        .sort((a, b) => a.sortOrder - b.sortOrder),
    );
  },

  async createTagGroup(topicId: number, payload: Omit<TagGroup, 'id' | 'topicId' | 'values'>) {
    const state = readState();
    const group: TagGroup = {
      ...payload,
      id: state.nextIds.group++,
      topicId,
      values: [],
    };
    state.tagGroups.push(group);
    writeState(state);
    return delay(group);
  },

  async updateTagGroup(topicId: number, groupId: number, payload: Partial<TagGroup>) {
    const state = readState();
    state.tagGroups = state.tagGroups.map((group) =>
      group.topicId === topicId && group.id === groupId ? { ...group, ...payload } : group,
    );
    writeState(state);
    return delay(state.tagGroups.find((group) => group.id === groupId)!);
  },

  async deleteTagGroup(topicId: number, groupId: number) {
    const state = readState();
    const key = String(groupId);
    if (state.materials.some((material) => material.tags.some((tag) => tag.tagGroupKey === key))) {
      throw { code: 1005, message: '已有资料使用该标签组，无法删除' };
    }
    state.tagGroups = state.tagGroups.filter((group) => !(group.topicId === topicId && group.id === groupId));
    writeState(state);
    return delay({});
  },

  async addTagValue(groupId: number, value: string) {
    const state = readState();
    state.tagGroups = state.tagGroups.map((group) => {
      if (group.id !== groupId) return group;
      return {
        ...group,
        values: [
          ...group.values,
          { id: state.nextIds.tag++, value, sortOrder: group.values.length + 1 },
        ],
      };
    });
    writeState(state);
    return delay(state.tagGroups.find((group) => group.id === groupId)!);
  },

  async updateTagValue(groupId: number, valueId: number, value: string) {
    const state = readState();
    const group = state.tagGroups.find((entry) => entry.id === groupId);
    const oldValue = group?.values.find((entry) => entry.id === valueId)?.value;

    state.tagGroups = state.tagGroups.map((entry) =>
      entry.id === groupId
        ? {
            ...entry,
            values: entry.values.map((tag) => (tag.id === valueId ? { ...tag, value } : tag)),
          }
        : entry,
    );

    if (oldValue) {
      state.materials = state.materials.map((material) => ({
        ...material,
        tags: material.tags.map((tag) =>
          tag.tagGroupKey === String(groupId) && tag.tagValue === oldValue
            ? { ...tag, tagValue: value }
            : tag,
        ),
      }));
    }

    writeState(state);
    return delay(state.tagGroups.find((entry) => entry.id === groupId)!);
  },

  async deleteTagValue(groupId: number, valueId: number) {
    const state = readState();
    const group = state.tagGroups.find((entry) => entry.id === groupId);
    const value = group?.values.find((entry) => entry.id === valueId)?.value;
    if (value && state.materials.some((material) => material.tags.some((tag) => tag.tagGroupKey === String(groupId) && tag.tagValue === value))) {
      throw { code: 1005, message: '已有资料使用该标签，无法删除' };
    }
    state.tagGroups = state.tagGroups.map((entry) =>
      entry.id === groupId
        ? { ...entry, values: entry.values.filter((tag) => tag.id !== valueId) }
        : entry,
    );
    writeState(state);
    return delay({});
  },

  async listInbox(params: MaterialListParams) {
    const items = filterMaterials(readState().materials, {
      ...params,
      status: params.status?.length ? params.status : ['INBOX', 'PENDING_REVIEW'],
    });
    return delay(page(items, params));
  },

  async listMaterials(params: MaterialListParams) {
    const items = filterMaterials(readState().materials, params);
    return delay(page(items, params));
  },

  async searchMaterials(params: MaterialListParams) {
    const items = filterMaterials(readState().materials, params);
    return delay(page(items, params));
  },

  async getMaterial(id: number) {
    const material = readState().materials.find((entry) => entry.id === id);
    if (!material) throw { code: 404, message: '资料不存在' };
    return delay(material);
  },

  async submitMaterial(payload: SubmitMaterialPayload) {
    const state = readState();
    const createdAt = new Date().toISOString();
    const material: Material = {
      id: state.nextIds.material++,
      topicId: payload.topicId,
      materialType: payload.materialType,
      status: 'INBOX',
      unread: true,
      title: payload.title || payload.sourceUrl || '未命名资料',
      description: payload.description || '新采集资料，等待后续整理。',
      rawContent: payload.rawContent || payload.description || payload.sourceUrl || '',
      source: payload.source || '',
      sourceUrl: payload.sourceUrl || '',
      score: undefined,
      comment: '',
      coverUrl:
        payload.coverUrl ||
        'https://images.unsplash.com/photo-1455390582262-044cdead277a?auto=format&fit=crop&w=1200&q=80',
      createdAt,
      updatedAt: createdAt,
      tags: [],
      meta: {},
    };
    state.materials.unshift(material);
    writeState(state);
    return delay(material);
  },

  async updateMaterial(id: number, payload: UpdateMaterialPayload) {
    const state = readState();
    state.materials = state.materials.map((material) =>
      material.id === id ? { ...material, ...payload, updatedAt: new Date().toISOString() } : material,
    );
    writeState(state);
    return delay(state.materials.find((material) => material.id === id)!);
  },

  async updateMaterialTags(id: number, tags: Material['tags']) {
    const state = readState();
    state.materials = state.materials.map((material) =>
      material.id === id ? { ...material, tags, updatedAt: new Date().toISOString() } : material,
    );
    writeState(state);
    return delay(state.materials.find((material) => material.id === id)!);
  },

  async transitionMaterial(
    id: number,
    status: MaterialStatus,
    payload?: Pick<Material, 'score' | 'comment'> & { unread?: boolean },
  ) {
    const state = readState();
    state.materials = state.materials.map((material) =>
      material.id === id
        ? {
            ...material,
            status,
            unread: payload?.unread ?? (status === 'INBOX' || status === 'COLLECTED'),
            score: payload?.score ?? material.score,
            comment: payload?.comment ?? material.comment,
            updatedAt: new Date().toISOString(),
          }
        : material,
    );
    writeState(state);
    return delay(state.materials.find((material) => material.id === id)!);
  },
};
