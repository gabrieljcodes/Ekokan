export interface File {
  id: string;
  sha256: string;
  file_path: string;
  original_name: string;
  mime_type: string;
  file_size: number;
  width?: number;
  height?: number;
  duration_ms?: number;
  blurhash?: string;
  storage_backend: string;
  ref_count: number;
  created_at: string;
  url?: string;
}

export interface Artist {
  id: string;
  user_id?: string;
  name: string;
  slug: string;
  bio: string;
  avatar_file_id?: string;
  banner_file_id?: string;
  links: Record<string, string>;
  post_count: number;
  created_at: string;
  updated_at: string;
  avatar_url?: string;
  banner_url?: string;
  favorite_count?: number;
  is_favorited?: boolean;
}

export interface User {
  id: string;
  username: string;
  email?: string;
  display_name?: string;
  role: string;
  is_active: boolean;
  created_at: string;
}

export interface PostMedia {
  id: string;
  post_id: string;
  file_id: string;
  sort_order: number;
  caption: string;
  created_at: string;
  file?: File;
}

export interface PostAttachment {
  id: string;
  post_id: string;
  file_id: string;
  display_name?: string;
  created_at: string;
  file?: File;
}

export interface Tag {
  id: string;
  name: string;
  slug: string;
  category: string;
  post_count: number;
  created_at: string;
}

export interface Post {
  id: string;
  user_id?: string;
  artist_id: string;
  title: string;
  slug: string;
  content: string;
  source_url?: string;
  published_at: string;
  imported_at?: string;
  media_count: number;
  attachment_count: number;
  comment_count: number;
  like_count: number;
  created_at: string;
  updated_at: string;
  artist?: Artist;
  media?: PostMedia[];
  attachments?: PostAttachment[];
  tags?: Tag[];
  favorite_count?: number;
  is_favorited?: boolean;
  is_liked?: boolean;
}

export interface Comment {
  id: string;
  post_id: string;
  user_id?: string;
  parent_id?: string;
  author_name: string;
  content: string;
  is_edited: boolean;
  created_at: string;
  updated_at: string;
  author_role?: string;
  is_member?: boolean;
  replies?: Comment[];
}

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  per_page: number;
  total_pages: number;
}

export interface AdjacentPosts {
  previous?: Post;
  next?: Post;
}

export interface AppSettings {
  allow_user_artist_creation: boolean;
  allow_user_post_creation: boolean;
}

