import { useState, useRef, useEffect } from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import ToastContainer from './Toast';
import { IconStar, IconBolt, IconUser, IconChevronDown, IconPlus, IconExternalLink, IconEkokanLogo } from './Icons';

export default function Layout() {
  const { user, settings, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const isAdmin = user?.role === 'admin' || user?.role === 'administrator';
  const canCreateArtist = isAdmin || (settings?.allow_user_artist_creation !== false);
  const canCreatePost = isAdmin || (settings?.allow_user_post_creation !== false);
  const showCreateActions = canCreateArtist || canCreatePost;

  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setDropdownOpen(false);
  }, [location.pathname, location.search]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setDropdownOpen(false);
      }
    };
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  return (
    <>
      <header className="app-header">
        <Link to="/" className="app-header__logo" aria-label="Ekokan Art Gallery Home">
          <span className="app-header__logo-icon">
            <IconEkokanLogo size={28} />
          </span>
          <span className="app-header__logo-text">Ekokan</span>
        </Link>
        <nav className="app-header__nav" aria-label="Main navigation">
          <Link to="/" className="app-header__link">Artists</Link>
          <Link to="/tags" className="app-header__link">Tags</Link>
          {user && (
            <Link to="/favorites" className="app-header__link app-header__link--favorites">
              <IconStar size={14} /> Favorites
            </Link>
          )}
          {isAdmin && (
            <Link to="/admin/settings" className="app-header__link app-header__link--admin">
              <IconBolt size={14} /> Admin Settings
            </Link>
          )}

          <div className="app-header__user-group">
            {user ? (
              <div ref={dropdownRef} className="user-dropdown-container">
                <button
                  type="button"
                  className="user-menu-btn"
                  onClick={() => setDropdownOpen(!dropdownOpen)}
                  aria-expanded={dropdownOpen}
                  aria-haspopup="true"
                >
                  {user.avatar_url && (
                    <img
                      src={user.avatar_url}
                      alt=""
                      className="user-menu__avatar"
                    />
                  )}
                  <span className="user-menu__name">
                    {!user.avatar_url && (isAdmin ? <IconBolt size={14} /> : <IconUser size={14} />)}
                    {user.display_name || user.username}
                  </span>
                  <IconChevronDown size={14} className="user-menu__chevron" />
                </button>

                {dropdownOpen && (
                  <div className="user-dropdown__menu" role="menu">
                    <Link
                      to={`/user/${encodeURIComponent(user.username)}`}
                      className="user-dropdown__item user-dropdown__item--profile"
                      role="menuitem"
                      onClick={() => setDropdownOpen(false)}
                    >
                      My Public Profile
                    </Link>
                    <div className="user-dropdown__divider" role="separator" />
                    <Link
                      to="/profile?tab=profile"
                      className="user-dropdown__item"
                      role="menuitem"
                      onClick={() => setDropdownOpen(false)}
                    >
                      Profile & Avatar
                    </Link>
                    <Link
                      to="/profile?tab=tags"
                      className="user-dropdown__item"
                      role="menuitem"
                      onClick={() => setDropdownOpen(false)}
                    >
                      Tag Filters (Excluded)
                    </Link>
                    <Link
                      to="/profile?tab=tokens"
                      className="user-dropdown__item"
                      role="menuitem"
                      onClick={() => setDropdownOpen(false)}
                    >
                      API Tokens & Keys
                    </Link>

                    <div className="user-dropdown__divider" role="separator" />

                    <button
                      type="button"
                      onClick={handleLogout}
                      className="user-dropdown__item user-dropdown__item--danger"
                      role="menuitem"
                    >
                      Logout
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <>
                <Link to="/login" className="app-header__btn app-header__btn--secondary">
                  Login
                </Link>
                <Link to="/register" className="app-header__btn app-header__btn--primary app-header__btn--register">
                  Register
                </Link>
              </>
            )}
          </div>

          {showCreateActions && (
            <>
              <div className="app-header__divider" role="presentation" />
              <div className="app-header__action-group">
                {canCreateArtist && (
                  <Link to="/artists/new" className="app-header__btn app-header__btn--secondary">
                    <IconPlus size={14} /> New Artist
                  </Link>
                )}
                {canCreatePost && (
                  <Link to="/posts/new" className="app-header__btn app-header__btn--primary">
                    <IconPlus size={14} /> New Post
                  </Link>
                )}
              </div>
            </>
          )}
        </nav>
      </header>
      <main className="app-container">
        <Outlet />
      </main>
      <footer className="app-footer">
        <span>Ekokan &mdash; Art Gallery</span>
        <a href="/docs" target="_blank" rel="noopener noreferrer" className="app-footer__link">
          Interactive API Documentation (Scalar / OpenAPI 3.0) <IconExternalLink size={14} />
        </a>
      </footer>
      <ToastContainer />
    </>
  );
}

