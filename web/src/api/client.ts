const API_BASE = import.meta.env.VITE_API_URL || '';

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
    ...options,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(body.error || res.statusText);
  }
  if (res.status === 204) return undefined as T;
  return res.json();
}

async function uploadFile<T>(path: string, file: globalThis.File, extraFields?: Record<string, string>): Promise<T> {
  const form = new FormData();
  form.append('file', file);
  if (extraFields) {
    for (const [k, v] of Object.entries(extraFields)) {
      form.append(k, v);
    }
  }
  const res = await fetch(`${API_BASE}${path}`, {
    method: 'POST',
    body: form,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(body.error || res.statusText);
  }
  return res.json();
}

import type { Artist, Post, Tag, Comment, PaginatedResult, AdjacentPosts, PostMedia, PostAttachment } from '../types/models';

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

  // Posts
  listArtistPosts: (slug: string, page = 1, perPage = 25) =>
    request<PaginatedResult<Post>>(`/api/artists/${slug}/posts?page=${page}&per_page=${perPage}`),

  getPost: (id: string) =>
    request<Post>(`/api/posts/${id}`),

  getAdjacentPosts: (id: string) =>
    request<AdjacentPosts>(`/api/posts/${id}/adjacent`),

  getRecentPosts: (page = 1, perPage = 25) =>
    request<PaginatedResult<Post>>(`/api/posts/recent?page=${page}&per_page=${perPage}`),

  createPost: (data: { artist_id: string; title: string; slug: string; content?: string; tag_ids?: string[] }) =>
    request<Post>('/api/posts', { method: 'POST', body: JSON.stringify(data) }),

  updatePost: (id: string, data: Record<string, unknown>) =>
    request<Post>(`/api/posts/${id}`, { method: 'PUT', body: JSON.stringify(data) }),

  deletePost: (id: string) =>
    request<void>(`/api/posts/${id}`, { method: 'DELETE' }),

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
};
