const API_BASE = import.meta.env.VITE_API_URL || '';

export class ApiError extends Error {
  status?: number;
  constructor(message: string, status?: number) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const token = localStorage.getItem('ekokan_token');
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...((options?.headers as Record<string, string>) || {}),
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const method = (options?.method || 'GET').toString().toUpperCase();
  const maxRetries = method === 'GET' ? 2 : 0;
  
  let lastError: unknown;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const res = await fetch(`${API_BASE}${path}`, {
        ...options,
        headers,
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({ error: res.statusText }));
        throw new ApiError(body.error || res.statusText, res.status);
      }
      if (res.status === 204) return undefined as T;
      return await res.json();
    } catch (err: unknown) {
      lastError = err;
      // Do not retry HTTP server error statuses or deliberate request aborts
      if (err instanceof ApiError || (err instanceof Error && err.name === 'AbortError') || attempt === maxRetries) {
        throw err;
      }
      // Transient browser TCP connection drop (e.g., waking idle tab) — backoff and try again on clean socket
      await new Promise(resolve => setTimeout(resolve, 350 * Math.pow(2, attempt)));
    }
  }
  throw lastError;
}

async function uploadFile<T>(path: string, file: globalThis.File, extraFields?: Record<string, string>): Promise<T> {
  const token = localStorage.getItem('ekokan_token');
  const headers: Record<string, string> = {};
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  const form = new FormData();
  form.append('file', file);
  if (extraFields) {
    for (const [k, v] of Object.entries(extraFields)) {
      form.append(k, v);
    }
  }
  const res = await fetch(`${API_BASE}${path}`, {
    method: 'POST',
    headers,
    body: form,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: res.statusText }));
    throw new ApiError(body.error || res.statusText, res.status);
  }
  return res.json();
}

import type { Artist, Post, Tag, Comment, PaginatedResult, AdjacentPosts, PostMedia, PostAttachment, User, AppSettings, ApiToken } from '../types/models';

export const api = {
  // Artists
  listArtists: (page = 1, perPage = 25, search = '') =>
    request<PaginatedResult<Artist>>(`/api/artists?page=${page}&per_page=${perPage}&search=${encodeURIComponent(search)}`),

  getArtist: (slug: string) =>
    request<Artist>(`/api/artists/${slug}`),

  createArtist: (data: { name: string; slug: string; bio?: string; links?: Record<string, string> }) =>
    request<Artist>('/api/artists', { method: 'POST', body: JSON.stringify(data) }),

  updateArtist: (id: string, data: Record<string, unknown>) =>
    request<Artist>(`/api/artists/${id}`, { method: 'PUT', body: JSON.stringify(data) }),

  uploadAvatar: (id: string, file: globalThis.File) =>
    uploadFile<Artist>(`/api/artists/${id}/avatar`, file),

  uploadBanner: (id: string, file: globalThis.File) =>
    uploadFile<Artist>(`/api/artists/${id}/banner`, file),

  deleteArtist: (id: string) =>
    request<void>(`/api/artists/${id}`, { method: 'DELETE' }),

  listArtistPosts: (slug: string, page = 1, perPage = 25, search = '', includeTags: string[] = [], excludeTags: string[] = []) => {
    const inc = includeTags.length > 0 ? `&include_tags=${encodeURIComponent(includeTags.join(','))}` : '';
    const exc = excludeTags.length > 0 ? `&exclude_tags=${encodeURIComponent(excludeTags.join(','))}` : '';
    return request<PaginatedResult<Post>>(`/api/artists/${slug}/posts?page=${page}&per_page=${perPage}&search=${encodeURIComponent(search)}${inc}${exc}`);
  },

  getPost: (id: string) =>
    request<Post>(`/api/posts/${id}`),

  getAdjacentPosts: (id: string) =>
    request<AdjacentPosts>(`/api/posts/${id}/adjacent`),

  getRecentPosts: (page = 1, perPage = 25, includeTags: string[] = [], excludeTags: string[] = []) => {
    const inc = includeTags.length > 0 ? `&include_tags=${encodeURIComponent(includeTags.join(','))}` : '';
    const exc = excludeTags.length > 0 ? `&exclude_tags=${encodeURIComponent(excludeTags.join(','))}` : '';
    return request<PaginatedResult<Post>>(`/api/posts/recent?page=${page}&per_page=${perPage}${inc}${exc}`);
  },

  createPost: (data: { artist_id: string; title: string; slug: string; content?: string; tag_ids?: string[]; published_at?: string }) =>
    request<Post>('/api/posts', { method: 'POST', body: JSON.stringify(data) }),

  updatePost: (id: string, data: Record<string, unknown>) =>
    request<Post>(`/api/posts/${id}`, { method: 'PUT', body: JSON.stringify(data) }),

  deletePost: (id: string) =>
    request<void>(`/api/posts/${id}`, { method: 'DELETE' }),

  massTagPosts: (postIds: string[], tagIds: string[], action: 'add' | 'remove' = 'add') =>
    request<{ status: string }>('/api/posts/mass-tag', {
      method: 'POST',
      body: JSON.stringify({ post_ids: postIds, tag_ids: tagIds, action }),
    }),

  massDeletePosts: (postIds: string[]) =>
    request<{ status: string; deleted: number }>('/api/posts/mass-delete', {
      method: 'POST',
      body: JSON.stringify({ post_ids: postIds }),
    }),

  // Media
  uploadMedia: (postId: string, file: globalThis.File, caption = '') =>
    uploadFile<PostMedia>(`/api/posts/${postId}/media`, file, { caption }),

  removeMedia: (postId: string, mediaId: string) =>
    request<void>(`/api/posts/${postId}/media/${mediaId}`, { method: 'DELETE' }),

  // Attachments
  uploadAttachment: (postId: string, file: globalThis.File, displayName = '') =>
    uploadFile<PostAttachment>(`/api/posts/${postId}/attachments`, file, { display_name: displayName }),

  removeAttachment: (postId: string, attId: string) =>
    request<void>(`/api/posts/${postId}/attachments/${attId}`, { method: 'DELETE' }),

  // Comments
  listComments: (postId: string) =>
    request<Comment[]>(`/api/posts/${postId}/comments`),

  createComment: (postId: string, data: { author_name?: string; content: string; parent_id?: string }) =>
    request<Comment>(`/api/posts/${postId}/comments`, { method: 'POST', body: JSON.stringify(data) }),

  // Tags
  listTags: (category = '') =>
    request<Tag[]>(`/api/tags?category=${encodeURIComponent(category)}`),

  createTag: (data: { name: string; category?: string }) =>
    request<Tag>('/api/tags', { method: 'POST', body: JSON.stringify(data) }),

  deleteTag: (id: string) =>
    request<void>(`/api/tags/${id}`, { method: 'DELETE' }),

  // Auth
  register: (data: { username: string; email?: string; password: string; display_name?: string }) =>
    request<{ token: string; user: User; favorited_post_ids: string[]; favorited_artist_ids: string[]; liked_post_ids?: string[]; excluded_tag_ids?: string[] }>('/api/auth/register', { method: 'POST', body: JSON.stringify(data) }),

  login: (data: { username: string; password: string }) =>
    request<{ token: string; user: User; favorited_post_ids: string[]; favorited_artist_ids: string[]; liked_post_ids?: string[]; excluded_tag_ids?: string[] }>('/api/auth/login', { method: 'POST', body: JSON.stringify(data) }),

  getMe: () =>
    request<{ user: User; favorited_post_ids: string[]; favorited_artist_ids: string[]; liked_post_ids?: string[]; excluded_tag_ids?: string[] }>('/api/auth/me'),

  uploadUserAvatar: (file: globalThis.File) =>
    uploadFile<User>('/api/users/me/avatar', file),

  setExcludedTags: (tagIds: string[]) =>
    request<{ success: boolean; excluded_tag_ids: string[] }>('/api/users/me/excluded-tags', { method: 'POST', body: JSON.stringify({ tag_ids: tagIds }) }),

  // Favorites & Likes
  togglePostFavorite: (postId: string) =>
    request<{ is_favorited: boolean }>(`/api/posts/${postId}/favorite`, { method: 'POST' }),

  togglePostLike: (postId: string) =>
    request<{ is_liked: boolean }>(`/api/posts/${postId}/like`, { method: 'POST' }),

  toggleArtistFavorite: (artistId: string) =>
    request<{ is_favorited: boolean }>(`/api/artists/${artistId}/favorite`, { method: 'POST' }),

  listMyFavorites: () =>
    request<{ artists: Artist[]; posts: Post[] }>('/api/users/me/favorites'),

  // Admin Settings & User Management
  getSettings: () =>
    request<AppSettings>('/api/settings'),

  updateSettings: (data: AppSettings) =>
    request<AppSettings>('/api/admin/settings', { method: 'PUT', body: JSON.stringify(data) }),

  listUsers: () =>
    request<{ data: User[] }>('/api/admin/users'),

  setUserRole: (username: string, role: string) =>
    request<{ message: string }>(`/api/admin/users/${encodeURIComponent(username)}/role`, { method: 'PUT', body: JSON.stringify({ role }) }),

  // API Tokens
  listApiTokens: () =>
    request<{ tokens: ApiToken[] }>('/api/users/me/api-tokens'),

  createApiToken: (name: string) =>
    request<ApiToken>('/api/users/me/api-tokens', { method: 'POST', body: JSON.stringify({ name }) }),

  deleteApiToken: (id: string) =>
    request<{ message: string }>(`/api/users/me/api-tokens/${id}`, { method: 'DELETE' }),
};

