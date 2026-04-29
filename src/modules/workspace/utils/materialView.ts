import type { CSSProperties } from 'react';
import { DEFAULT_MATERIAL_COVER_URL } from '../api';
import type { Material, MaterialTag, PageResponse, TagGroup } from '../types';

export function isDefaultMaterialCover(url?: string) {
  return url === DEFAULT_MATERIAL_COVER_URL;
}

export function statusEnteredAt(material: Material) {
  if (material.status === 'INBOX') return material.inboxAt || material.createdAt;
  if (material.status === 'PENDING_REVIEW') return material.updatedAt || material.createdAt;
  if (material.status === 'COLLECTED') return material.collectedAt || material.updatedAt || material.createdAt;
  if (material.status === 'ARCHIVED') return material.archivedAt || material.updatedAt || material.createdAt;
  if (material.status === 'INVALID') return material.invalidAt || material.updatedAt || material.createdAt;
  return material.updatedAt || material.createdAt;
}

export function isMaterialUnread(material: Material) {
  return Boolean(material.unread);
}

function rgba(hex: string, alpha: number) {
  const normalized = hex.replace('#', '');
  const value = normalized.length === 3
    ? normalized.split('').map((part) => part + part).join('')
    : normalized;
  const numeric = Number.parseInt(value, 16);
  const r = (numeric >> 16) & 255;
  const g = (numeric >> 8) & 255;
  const b = numeric & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export function tagStyle(group?: TagGroup) {
  if (!group?.color) {
    return {
      '--tag-fg': 'var(--theme)',
      '--tag-bg': 'rgba(var(--theme-rgb), 0.045)',
      '--tag-border': 'rgba(var(--theme-rgb), 0.15)',
    } as CSSProperties;
  }
  const color = group.color;
  return {
    '--tag-fg': color,
    '--tag-bg': rgba(color, 0.045),
    '--tag-border': rgba(color, 0.15),
  } as CSSProperties;
}

export function groupForTag(tag: MaterialTag, groups: TagGroup[]) {
  return groups.find((group) => String(group.id) === tag.tagGroupKey);
}

export function materialTagsForGroups(material: Material, groups: TagGroup[]) {
  return material.tags.filter((tag) => groups.some((group) => String(group.id) === tag.tagGroupKey));
}

export function materialCoverKey(material: Material) {
  return material.materialType === 'image'
    ? material.fileKey || material.meta.thumbnailKey
    : material.meta.thumbnailKey;
}

export function flattenPages<T>(data?: { pages: PageResponse<T>[] }) {
  return data?.pages.flatMap((page) => page.items) ?? [];
}

export function removeMaterialFromInfiniteData(
  data: { pages: PageResponse<Material>[]; pageParams: unknown[] } | undefined,
  id: number,
) {
  if (!data) return data;
  let removed = 0;
  const pages = data.pages.map((page) => {
    const items = page.items.filter((item) => item.id !== id);
    const pageRemoved = page.items.length - items.length;
    removed += pageRemoved;
    return pageRemoved
      ? { ...page, items, total: Math.max(page.total - pageRemoved, 0) }
      : page;
  });
  return removed ? { ...data, pages } : data;
}

export function replaceMaterialInInfiniteData(
  data: { pages: PageResponse<Material>[]; pageParams: unknown[] } | undefined,
  material: Material,
) {
  if (!data) return data;
  let replaced = false;
  const pages = data.pages.map((page) => {
    let pageReplaced = false;
    const items = page.items.map((item) => {
      if (item.id !== material.id) return item;
      replaced = true;
      pageReplaced = true;
      return material;
    });
    return pageReplaced ? { ...page, items } : page;
  });
  return replaced ? { ...data, pages } : data;
}
