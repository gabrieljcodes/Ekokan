import { useEffect, useState } from 'react';
import { useParams, Link, useSearchParams } from 'react-router-dom';
import { api } from '../api/client';
import type { Artist, Post, PaginatedResult, Tag } from '../types/models';
import PostCard from '../components/PostCard';
import Pagination from '../components/Pagination';
import { useAuth } from '../context/AuthContext';
import { toast } from '../components/Toast';
import ArtistProfileHeader from '../components/ArtistProfileHeader';
import TagFilterPanel from '../components/TagFilterPanel';
import MassTagPanel from '../components/MassTagPanel';
import { IconSearch, IconFilter, IconTag, IconPlus, IconUpload } from '../components/Icons';

export default function ArtistPage() {
  const { slug } = useParams<{ slug: string }>();
  const [artist, setArtist] = useState<Artist | null>(null);
  const { user, isFavoriteArtist, toggleFavoriteArtist, excludedTagIds } = useAuth();
  const favorited = artist ? !!(isFavoriteArtist(artist.id) || artist.is_favorited) : false;
  const [posts, setPosts] = useState<PaginatedResult<Post> | null>(null);
  const [searchParams, setSearchParams] = useSearchParams();
  const pageParam = parseInt(searchParams.get('page') || '1', 10);
  const page = isNaN(pageParam) || pageParam < 1 ? 1 : pageParam;
  const setPage = (newPage: number) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      if (newPage > 1) {
        next.set('page', newPage.toString());
      } else {
        next.delete('page');
      }
      return next;
    });
  };
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  // Mass Tagging State
  const [isMassTagging, setIsMassTagging] = useState(false);
  const [selectedPostIds, setSelectedPostIds] = useState<Set<string>>(new Set());
  const [availableTags, setAvailableTags] = useState<Tag[]>([]);
  const [selectedTagIds, setSelectedTagIds] = useState<Set<string>>(new Set());
  const [tagSearch, setTagSearch] = useState('');
  const [taggingStatus, setTaggingStatus] = useState<string | null>(null);
  const [taggingLoading, setTaggingLoading] = useState(false);

  // Non-persistent Tag Filtering State
  const [isFiltering, setIsFiltering] = useState(false);
  const [filterIncludeTagIds, setFilterIncludeTagIds] = useState<Set<string>>(new Set());
  const [filterExcludeTagIds, setFilterExcludeTagIds] = useState<Set<string>>(new Set());
  const [filterTagSearch, setFilterTagSearch] = useState('');

  useEffect(() => {
    if (!slug) return;
    setLoading(true);
    api.getArtist(slug)
      .then(setArtist)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [slug]);

  useEffect(() => {
    if (!slug) return;
    const combinedExcluded = Array.from(new Set([...Array.from(excludedTagIds || []), ...Array.from(filterExcludeTagIds)]));
    api.listArtistPosts(slug, page, 25, search, Array.from(filterIncludeTagIds), combinedExcluded)
      .then(setPosts)
      .catch(console.error);
  }, [slug, page, search, filterIncludeTagIds, filterExcludeTagIds, excludedTagIds]);

  useEffect(() => {
    if ((isMassTagging || isFiltering) && availableTags.length === 0) {
      api.listTags().then(setAvailableTags).catch(console.error);
    }
  }, [isMassTagging, isFiltering, availableTags.length]);

  const handleTogglePostSelect = (id: string) => {
    setSelectedPostIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleSelectCurrentPage = () => {
    if (!posts?.data) return;
    setSelectedPostIds((prev) => {
      const next = new Set(prev);
      posts.data.forEach((p) => next.add(p.id));
      return next;
    });
  };

  const handleDeselectCurrentPage = () => {
    if (!posts?.data) return;
    setSelectedPostIds((prev) => {
      const next = new Set(prev);
      posts.data.forEach((p) => next.delete(p.id));
      return next;
    });
  };

  const handleToggleTagSelect = (tagId: string) => {
    setSelectedTagIds((prev) => {
      const next = new Set(prev);
      if (next.has(tagId)) next.delete(tagId);
      else next.add(tagId);
      return next;
    });
  };

  const handleFilterToggle = (tagId: string) => {
    const isInc = filterIncludeTagIds.has(tagId);
    const isExc = filterExcludeTagIds.has(tagId);
    const newInc = new Set(filterIncludeTagIds);
    const newExc = new Set(filterExcludeTagIds);
    if (isInc) {
      newInc.delete(tagId);
      newExc.add(tagId);
    } else if (isExc) {
      newExc.delete(tagId);
    } else {
      newInc.add(tagId);
    }
    setFilterIncludeTagIds(newInc);
    setFilterExcludeTagIds(newExc);
    setPage(1);
  };

  const handleFilterReset = () => {
    setFilterIncludeTagIds(new Set());
    setFilterExcludeTagIds(new Set());
    setPage(1);
  };

  const executeMassTag = async (action: 'add' | 'remove') => {
    if (selectedPostIds.size === 0) {
      toast('Please select at least one post to modify.', 'error');
      return;
    }
    if (selectedTagIds.size === 0) {
      toast('Please select at least one tag from the library.', 'error');
      return;
    }
    if (!user) {
      toast('You must be logged in to modify tags.', 'error');
      return;
    }
    setTaggingLoading(true);
    setTaggingStatus(null);
    try {
      await api.massTagPosts(Array.from(selectedPostIds), Array.from(selectedTagIds), action);
      const msg = `Successfully ${action === 'add' ? 'applied' : 'removed'} tags on ${selectedPostIds.size} post(s)!`;
      setTaggingStatus(msg);
      if (slug) {
        const combinedExcluded = Array.from(new Set([...Array.from(excludedTagIds || []), ...Array.from(filterExcludeTagIds)]));
        const res = await api.listArtistPosts(slug, page, 25, search, Array.from(filterIncludeTagIds), combinedExcluded);
        setPosts(res);
      }
      setTimeout(() => setTaggingStatus(null), 5000);
    } catch (err: any) {
      toast('Error during mass tagging: ' + (err.message || err), 'error');
    } finally {
      setTaggingLoading(false);
    }
  };

  const handleToggleFavorite = async () => {
    if (!user) {
      toast('Please login to favorite creators', 'info');
      return;
    }
    if (!artist) return;
    try {
      await toggleFavoriteArtist(artist.id);
    } catch (e) {
      console.error(e);
    }
  };

  if (loading) {
    return <div className="loading">Loading artist…</div>;
  }

  if (!artist) {
    return (
      <div className="app-container">
        <div className="empty-state">Artist not found</div>
        <Link to="/" className="artist-back-link">
          ← Back to artists
        </Link>
      </div>
    );
  }

  return (
    <div>
      <ArtistProfileHeader
        artist={artist}
        favorited={favorited}
        onToggleFavorite={handleToggleFavorite}
      />

      <div className="app-container">
        {/* Search and Action Bar */}
        <div className="artist-action-bar" role="toolbar" aria-label="Artist page actions">
          <div className="search-bar artist-action-bar__search">
            <span className="search-bar__icon" aria-hidden="true"><IconSearch size={14} /></span>
            <input
              type="text"
              className="search-bar__input"
              placeholder="Search artist's posts…"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              aria-label="Search posts"
            />
          </div>
          <div className="artist-action-bar__buttons">
            <button
              type="button"
              onClick={() => {
                setIsFiltering(!isFiltering);
                if (!isFiltering) setIsMassTagging(false);
              }}
              className="btn-secondary btn-secondary--toggle"
              aria-pressed={isFiltering}
            >
              <IconFilter size={14} />
              Filter by Tags {(filterIncludeTagIds.size + filterExcludeTagIds.size) > 0 ? `(${filterIncludeTagIds.size + filterExcludeTagIds.size})` : ''}
            </button>
            <button
              type="button"
              onClick={() => {
                setIsMassTagging(!isMassTagging);
                if (!isMassTagging) setIsFiltering(false);
                setTaggingStatus(null);
              }}
              className="btn-secondary btn-secondary--toggle"
              aria-pressed={isMassTagging}
            >
              <IconTag size={14} />
              Mass Tag Mode {selectedPostIds.size > 0 ? `(${selectedPostIds.size})` : ''}
            </button>
            <Link to={`/posts/new?artist=${artist.slug}`} className="btn-primary">
              <IconPlus size={14} /> Upload Post for {artist.name}
            </Link>
          </div>
        </div>

        {/* Non-persistent Tag Filtering Controls */}
        {isFiltering && (
          <TagFilterPanel
            tags={availableTags}
            includeTagIds={filterIncludeTagIds}
            excludeTagIds={filterExcludeTagIds}
            persistentExcludeTagIds={excludedTagIds}
            search={filterTagSearch}
            onSearchChange={setFilterTagSearch}
            onToggle={handleFilterToggle}
            onReset={handleFilterReset}
            activeFilterCount={filterIncludeTagIds.size + filterExcludeTagIds.size}
          />
        )}

        {/* Mass Tagging Controls */}
        {isMassTagging && (
          <MassTagPanel
            tags={availableTags}
            selectedTagIds={selectedTagIds}
            selectedPostCount={selectedPostIds.size}
            currentPagePostCount={posts?.data?.length || 0}
            search={tagSearch}
            taggingStatus={taggingStatus}
            taggingLoading={taggingLoading}
            onSearchChange={setTagSearch}
            onToggleTag={handleToggleTagSelect}
            onSelectPage={handleSelectCurrentPage}
            onDeselectPage={handleDeselectCurrentPage}
            onClearSelection={() => setSelectedPostIds(new Set())}
            onApplyTags={() => executeMassTag('add')}
            onRemoveTags={() => executeMassTag('remove')}
          />
        )}

        {/* Posts Grid */}
        {posts && posts.data && posts.data.length > 0 ? (
          <>
            <h2 className="visually-hidden">Posts</h2>
            <div className="post-grid">
              {posts.data.map((post) => (
                <PostCard
                  key={post.id}
                  post={post}
                  artistSlug={artist.slug}
                  selectable={isMassTagging}
                  selected={selectedPostIds.has(post.id)}
                  onToggleSelect={handleTogglePostSelect}
                />
              ))}
            </div>
            {posts && (
              <Pagination
                page={posts.page}
                totalPages={posts.total_pages}
                onPageChange={setPage}
              />
            )}
          </>
        ) : (
          <div className="empty-state">
            {search ? 'No posts match your search' : (
              <div className="empty-state__cta">
                <p className="empty-state__text">
                  No art works archived under {artist.name} yet!
                </p>
                <Link to={`/posts/new?artist=${artist.slug}`} className="btn-primary">
                  <IconUpload size={14} /> Upload First Post
                </Link>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
