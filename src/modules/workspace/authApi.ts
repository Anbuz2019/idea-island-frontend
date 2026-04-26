import { api, shouldUseMockApi } from '../../shared/api/client';

export type LoginResponse = {
  userId: number;
  nickname?: string;
  token: string;
};

export type RegisterResponse = {
  userId: number;
  token: string;
};

export type UserProfile = {
  id: number;
  username?: string;
  email?: string;
  phone?: string;
  nickname?: string;
  avatarKey?: string;
  status?: number;
  createdAt?: string;
  updatedAt?: string;
};

export type UserStats = {
  topicCount: number;
  materialCount: number;
  statusCounts: Record<string, number>;
};

export const authApi = {
  async login(payload: { email: string; password: string }): Promise<LoginResponse> {
    if (shouldUseMockApi()) {
      return { userId: 1, nickname: 'Alex', token: 'mock-token' };
    }
    return api.post<LoginResponse>('/api/v1/auth/login', payload);
  },

  async register(payload: { email: string; password: string; nickname?: string }): Promise<RegisterResponse> {
    if (shouldUseMockApi()) {
      return { userId: 1, token: 'mock-token' };
    }
    return api.post<RegisterResponse>('/api/v1/auth/register', payload);
  },

  async logout(): Promise<unknown> {
    if (shouldUseMockApi()) return undefined;
    return api.post('/api/v1/auth/logout');
  },

  me(): Promise<UserProfile> {
    return api.get<UserProfile>('/api/v1/users/me');
  },

  updateMe(payload: { nickname?: string; avatarKey?: string }): Promise<UserProfile> {
    return api.put<UserProfile>('/api/v1/users/me', payload);
  },

  stats(): Promise<UserStats> {
    return api.get<UserStats>('/api/v1/users/me/stats');
  },
};
