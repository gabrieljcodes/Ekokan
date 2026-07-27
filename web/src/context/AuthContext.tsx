import React, { createContext, useContext, useState, useEffect } from 'react';
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
  login: (data: { username: string; password: string }) => Promise<void>;
  register: (data: { username: string; email?: string; password: string; display_name?: string }) => Promise<void>;
  logout: () => void;
  toggleFavoritePost: (postId: string) => Promise<boolean>;
  toggleFavoriteArtist: (artistId: string) => Promise<boolean>;
  toggleLikePost: (postId: string) => Promise<boolean>;
  isFavoritePost: (postId: string) => boolean;
  isFavoriteArtist: (artistId: string) => boolean;
  isLikedPost: (postId: string) => boolean;
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

  const refreshSettings = async () => {
    try {
      const res = await api.getSettings();
      setSettings(res);
    } catch (e) {
      console.error('Failed loading settings', e);
    }
  };

  useEffect(() => {
    refreshSettings();
    const savedToken = localStorage.getItem('ekokan_token');
    if (!savedToken) {
      setLoading(false);
      return;
    }
    api.getMe()
      .then((res) => {
        setUser(res.user);
        setFavoritedPostIds(new Set(res.favorited_post_ids || []));
        setFavoritedArtistIds(new Set(res.favorited_artist_ids || []));
        setLikedPostIds(new Set(res.liked_post_ids || []));
      })
      .catch(() => {
        localStorage.removeItem('ekokan_token');
        setToken(null);
        setUser(null);
      })
      .finally(() => setLoading(false));
  }, []);

  const login = async (data: { username: string; password: string }) => {
    const res = await api.login(data);
    localStorage.setItem('ekokan_token', res.token);
    setToken(res.token);
    setUser(res.user);
    setFavoritedPostIds(new Set(res.favorited_post_ids || []));
    setFavoritedArtistIds(new Set(res.favorited_artist_ids || []));
    setLikedPostIds(new Set(res.liked_post_ids || []));
  };

  const register = async (data: { username: string; email?: string; password: string; display_name?: string }) => {
    const res = await api.register(data);
    localStorage.setItem('ekokan_token', res.token);
    setToken(res.token);
    setUser(res.user);
    setFavoritedPostIds(new Set(res.favorited_post_ids || []));
    setFavoritedArtistIds(new Set(res.favorited_artist_ids || []));
    setLikedPostIds(new Set(res.liked_post_ids || []));
  };

  const logout = () => {
    localStorage.removeItem('ekokan_token');
    setToken(null);
    setUser(null);
    setFavoritedPostIds(new Set());
    setFavoritedArtistIds(new Set());
    setLikedPostIds(new Set());
  };

  const toggleFavoritePost = async (postId: string): Promise<boolean> => {
    if (!user) throw new Error('Please login to bookmark posts');
    const res = await api.togglePostFavorite(postId);
    setFavoritedPostIds((prev) => {
      const next = new Set(prev);
      if (res.is_favorited) next.add(postId);
      else next.delete(postId);
      return next;
    });
    return res.is_favorited;
  };

  const toggleFavoriteArtist = async (artistId: string): Promise<boolean> => {
    if (!user) throw new Error('Please login to favorite creators');
    const res = await api.toggleArtistFavorite(artistId);
    setFavoritedArtistIds((prev) => {
      const next = new Set(prev);
      if (res.is_favorited) next.add(artistId);
      else next.delete(artistId);
      return next;
    });
    return res.is_favorited;
  };

  const toggleLikePost = async (postId: string): Promise<boolean> => {
    if (!user) throw new Error('Please login to like posts');
    const res = await api.togglePostLike(postId);
    setLikedPostIds((prev) => {
      const next = new Set(prev);
      if (res.is_liked) next.add(postId);
      else next.delete(postId);
      return next;
    });
    return res.is_liked;
  };

  const isFavoritePost = (postId: string) => favoritedPostIds.has(postId);
  const isFavoriteArtist = (artistId: string) => favoritedArtistIds.has(artistId);
  const isLikedPost = (postId: string) => likedPostIds.has(postId);

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        settings,
        refreshSettings,
        favoritedPostIds,
        favoritedArtistIds,
        likedPostIds,
        login,
        register,
        logout,
        toggleFavoritePost,
        toggleFavoriteArtist,
        toggleLikePost,
        isFavoritePost,
        isFavoriteArtist,
        isLikedPost,
      }}
    >
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
