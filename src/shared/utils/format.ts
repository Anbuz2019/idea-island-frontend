import dayjs from 'dayjs';
import type { MaterialStatus, MaterialType } from '../../modules/workspace/types';

export const materialTypeLabels: Record<MaterialType, string> = {
  article: '文章',
  social: '社交',
  media: '音视频',
  image: '图片',
  excerpt: '摘录',
  input: '输入',
};

export const statusLabels: Record<MaterialStatus, string> = {
  INBOX: '收件箱',
  PENDING_REVIEW: '待评价',
  COLLECTED: '已收录',
  ARCHIVED: '已归档',
  INVALID: '已失效',
};

export function shortDate(value: string) {
  const date = dayjs(value);
  if (!date.isValid()) return '-';

  const today = dayjs().startOf('day');
  const targetDay = date.startOf('day');
  const dayDiff = today.diff(targetDay, 'day');

  if (dayDiff <= 0) return `今天 ${date.format('HH:mm')}`;
  if (dayDiff === 1) return `昨天 ${date.format('HH:mm')}`;
  if (dayDiff >= 365) return `${Math.floor(dayDiff / 365)}年前`;
  if (dayDiff >= 30) return `${Math.floor(dayDiff / 30)}个月前`;
  return `${dayDiff}天前`;
}

export function scoreTone(score?: number) {
  if (score == null) return 'muted';
  if (score < 2) return 'muted';
  if (score < 4) return 'green';
  if (score < 6) return 'blue';
  if (score < 8) return 'amber';
  return 'red';
}

export function clampText(value: string, length = 88) {
  if (value.length <= length) return value;
  return `${value.slice(0, length)}...`;
}
