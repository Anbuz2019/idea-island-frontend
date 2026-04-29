import type { MaterialType } from './types';

export const DEFAULT_MATERIAL_COVER_URLS = {
  article: '/default-covers/article.svg',
  social: '/default-covers/social.svg',
  media: '/default-covers/media.svg',
  image: '/default-covers/image.svg',
  excerpt: '/default-covers/excerpt.svg',
  input: '/default-covers/input.svg',
} satisfies Record<MaterialType, string>;

export const DEFAULT_MATERIAL_COVER_URL = DEFAULT_MATERIAL_COVER_URLS.article;

export function defaultMaterialCoverUrl(materialType?: MaterialType | string) {
  return DEFAULT_MATERIAL_COVER_URLS[(materialType || 'input') as MaterialType] ?? DEFAULT_MATERIAL_COVER_URLS.input;
}
