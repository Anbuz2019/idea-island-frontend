import type { InterfaceStyle, MaterialSortBy } from '../types';
import type { MaterialStatus, MaterialType, ViewKey } from '../types';

const workspacePrefsStorageKey = 'idea-island-workspace-prefs';

export type WorkspaceFilterPrefs = {
  keyword?: string;
  sortBy?: Exclude<MaterialSortBy, 'status'>;
  statusFilter?: MaterialStatus[];
  typeFilter?: MaterialType[];
  tagFilters?: Record<string, string[]>;
  unreadOnly?: boolean;
};

export type WorkspacePrefs = {
  schemaVersion?: number;
  activeView?: ViewKey;
  activeTopicId?: number;
  selectedMaterialId?: number;
  topicNavCollapsed?: boolean;
  interfaceStyle?: InterfaceStyle;
  filterPanelCollapsed?: Record<string, boolean>;
  filters?: Record<string, WorkspaceFilterPrefs>;
};

export function readWorkspacePrefs(): WorkspacePrefs {
  try {
    const raw = localStorage.getItem(workspacePrefsStorageKey);
    return raw ? JSON.parse(raw) as WorkspacePrefs : {};
  } catch {
    return {};
  }
}

export function saveWorkspacePrefs(update: (current: WorkspacePrefs) => WorkspacePrefs) {
  try {
    localStorage.setItem(workspacePrefsStorageKey, JSON.stringify({ ...update(readWorkspacePrefs()), schemaVersion: 2 }));
  } catch {
    // Ignore storage failures; the workspace should remain usable.
  }
}

export function workspaceFilterKey(view: ViewKey, topicId?: number) {
  if (view === 'search') return `${view}:inline:${topicId ?? 'all'}`;
  return `${view}:${topicId ?? 'all'}`;
}

export function readInterfaceStyle(): InterfaceStyle {
  const saved = readWorkspacePrefs().interfaceStyle;
  return saved === 'glass' || saved === 'classic' || saved === 'anime' ? saved : 'classic';
}

export function applyInterfaceStyle(value: InterfaceStyle) {
  if (typeof document !== 'undefined') {
    document.documentElement.dataset.style = value;
  }
  return value;
}

export function saveInterfaceStyle(value: InterfaceStyle) {
  const next = applyInterfaceStyle(value);
  saveWorkspacePrefs((current) => ({ ...current, interfaceStyle: next }));
  return next;
}
