import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import type { User, AppSettings } from '../types/models';
import { api } from '../api/client';

interface AuthContextType {
  user: User | null;
  token: string | null;
  loading: boolean;
  settings: AppSettings | null;
  refreshSettings: () => Promise<void>;
  favoritedPostIds: Set<string>;
  favoritedArtistIds: Set<string>;
  likedPostIds: Set<string>;
  excludedTagIds: Set<string>;
  login: (data: { username: string; password: string }) => Promise<void>;
  register: (data: { username: string; email?: string; password: string; display_name?: string }) => Promise<void>;
  logout: () => void;
  toggleFavoritePost: (postId: string) => Promise<boolean>;
  toggleFavoriteArtist: (artistId: string) => Promise<boolean>;
  toggleLikePost: (postId: string) => Promise<boolean>;
  isFavoritePost: (postId: string) => boolean;
  isFavoriteArtist: (artistId: string) => boolean;
  isLikedPost: (postId: string) => boolean;
  saveExcludedTags: (tagIds: string[]) => Promise<void>;
  updateUserAvatar: (updatedUser: User) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem('ekokan_token'));
  const [loading, setLoading] = useState(true);
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [favoritedPostIds, setFavoritedPostIds] = useState<Set<string>>(new Set());
  const [favoritedArtistIds, setFavoritedArtistIds] = useState<Set<string>>(new Set());
  const [likedPostIds, setLikedPostIds] = useState<Set<string>>(new Set());
  const [excludedTagIds, setExcludedTagIds] = useState<Set<string>>(new Set());

  const refreshSettings = useCallback(async () => {
    try {
      const res = await api.getSettings();
      setSettings(res);
    } catch (e) {
      console.error('Failed loading settings', e);
    }
  }, []);

  const hydrateUserState = useCallback((res: {
    user: User;
    favorited_post_ids?: string[];
    favorited_artist_ids?: string[];
    liked_post_ids?: string[];
    excluded_tag_ids?: string[];
  }) => {
    setUser(res.user);
    setFavoritedPostIds(new Set(res.favorited_post_ids || []));
    setFavoritedArtistIds(new Set(res.favorited_artist_ids || []));
    setLikedPostIds(new Set(res.liked_post_ids || []));
    setExcludedTagIds(new Set(res.excluded_tag_ids || []));
  }, []);

  useEffect(() => {
    refreshSettings();
    const savedToken = localStorage.getItem('ekokan_token');
    if (!savedToken) {
      setLoading(false);
      return;
    }
    api.getMe()
      .then((res) => {
        hydrateUserState(res);
      })
      .catch((e: unknown) => {
        const err = e as { status?: number; message?: string };
        const msg = String(err?.message || e).toLowerCase();
        const isAuthError =
          err?.status === 401 ||
          err?.status === 403 ||
          msg.includes('unauthorized') ||
          msg.includes('token') ||
          msg.includes('forbidden');

        if (isAuthError) {
          localStorage.removeItem('ekokan_token');
          setToken(null);
          setUser(null);
        } else {
          console.warn('Network error or offline during session validation; preserving credentials.', e);
        }
      })
      .finally(() => setLoading(false));
  }, [refreshSettings, hydrateUserState]);

  const login = useCallback(async (data: { username: string; password: string }) => {
    const res = await api.login(data);
    localStorage.setItem('ekokan_token', res.token);
    setToken(res.token);
    hydrateUserState(res);
  }, [hydrateUserState]);

  const register = useCallback(async (data: { username: string; email?: string; password: string; display_name?: string }) => {
    const res = await api.register(data);
    localStorage.setItem('ekokan_token', res.token);
    setToken(res.token);
    hydrateUserState(res);
  }, [hydrateUserState]);

  const logout = useCallback(() => {
    localStorage.removeItem('ekokan_token');
    setToken(null);
    setUser(null);
    setFavoritedPostIds(new Set());
    setFavoritedArtistIds(new Set());
    setLikedPostIds(new Set());
    setExcludedTagIds(new Set());
  }, []);

  const toggleFavoritePost = useCallback(async (postId: string): Promise<boolean> => {
    if (!user) throw new Error('Please login to bookmark posts');
    const res = await api.togglePostFavorite(postId);
    setFavoritedPostIds((prev) => {
      const next = new Set(prev);
      if (res.is_favorited) next.add(postId);
      else next.delete(postId);
      return next;
    });
    return res.is_favorited;
  }, [user]);

  const toggleFavoriteArtist = useCallback(async (artistId: string): Promise<boolean> => {
    if (!user) throw new Error('Please login to favorite creators');
    const res = await api.toggleArtistFavorite(artistId);
    setFavoritedArtistIds((prev) => {
      const next = new Set(prev);
      if (res.is_favorited) next.add(artistId);
      else next.delete(artistId);
      return next;
    });
    return res.is_favorited;
  }, [user]);

  const toggleLikePost = useCallback(async (postId: string): Promise<boolean> => {
    if (!user) throw new Error('Please login to like posts');
    const res = await api.togglePostLike(postId);
    setLikedPostIds((prev) => {
      const next = new Set(prev);
      if (res.is_liked) next.add(postId);
      else next.delete(postId);
      return next;
    });
    return res.is_liked;
  }, [user]);

  const isFavoritePost = useCallback((postId: string) => favoritedPostIds.has(postId), [favoritedPostIds]);
  const isFavoriteArtist = useCallback((artistId: string) => favoritedArtistIds.has(artistId), [favoritedArtistIds]);
  const isLikedPost = useCallback((postId: string) => likedPostIds.has(postId), [likedPostIds]);

  const saveExcludedTags = useCallback(async (tagIds: string[]) => {
    if (!user) throw new Error('Please login to set persistent tag filters');
    const res = await api.setExcludedTags(tagIds);
    setExcludedTagIds(new Set(res.excluded_tag_ids || []));
  }, [user]);

  const updateUserAvatar = useCallback((updatedUser: User) => {
    setUser(updatedUser);
  }, []);

  const value = useMemo(
    () => ({
      user,
      token,
      loading,
      settings,
      refreshSettings,
      favoritedPostIds,
      favoritedArtistIds,
      likedPostIds,
      excludedTagIds,
      login,
      register,
      logout,
      toggleFavoritePost,
      toggleFavoriteArtist,
      toggleLikePost,
      isFavoritePost,
      isFavoriteArtist,
      isLikedPost,
      saveExcludedTags,
      updateUserAvatar,
    }),
    [
      user,
      token,
      loading,
      settings,
      refreshSettings,
      favoritedPostIds,
      favoritedArtistIds,
      likedPostIds,
      excludedTagIds,
      login,
      register,
      logout,
      toggleFavoritePost,
      toggleFavoriteArtist,
      toggleLikePost,
      isFavoritePost,
      isFavoriteArtist,
      isLikedPost,
      saveExcludedTags,
      updateUserAvatar,
    ]
  );

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
