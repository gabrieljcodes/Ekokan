import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../api/client';
import type { User, AppSettings } from '../types/models';
import { useNavigate } from 'react-router-dom';
import { toast } from '../components/Toast';
import {
  IconShield,
  IconSliders,
  IconUsers,
  IconUser,
  IconRefresh,
  IconBolt,
  IconCheck,
  IconX,
} from '../components/Icons';

export default function AdminSettingsPage() {
  const { user, settings, refreshSettings } = useAuth();
  const navigate = useNavigate();

  const [users, setUsers] = useState<User[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [savingSettings, setSavingSettings] = useState(false);
  const [confirmRoleChange, setConfirmRoleChange] = useState<{ username: string; newRole: string } | null>(null);

  const [localSettings, setLocalSettings] = useState<AppSettings>({
    allow_user_artist_creation: true,
    allow_user_post_creation: true,
  });

  useEffect(() => {
    if (user && user.role !== 'admin' && user.role !== 'administrator') {
      navigate('/');
    }
  }, [user, navigate]);

  useEffect(() => {
    if (settings) {
      setLocalSettings(settings);
    }
  }, [settings]);

  const fetchUsers = async () => {
    setLoadingUsers(true);
    try {
      const res = await api.listUsers();
      setUsers(res.data);
    } catch (err: any) {
      toast(err.message || 'Error loading users list', 'error');
    } finally {
      setLoadingUsers(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleToggleSetting = async (key: keyof AppSettings) => {
    setSavingSettings(true);

    const updated = {
      ...localSettings,
      [key]: !localSettings[key],
    };
    setLocalSettings(updated);

    try {
      const saved = await api.updateSettings(updated);
      setLocalSettings(saved);
      await refreshSettings();
      toast('System permissions updated successfully!', 'success');
    } catch (err: any) {
      toast(err.message || 'Failed to update settings', 'error');
    } finally {
      setSavingSettings(false);
    }
  };

  const executeRoleChange = async (targetUser: User, newRole: string) => {
    setConfirmRoleChange(null);
    try {
      await api.setUserRole(targetUser.username, newRole);
      setUsers((prev) =>
        prev.map((u) => (u.username === targetUser.username ? { ...u, role: newRole } : u)),
      );
      toast(`User ${targetUser.username} role updated to ${newRole.toUpperCase()}`, 'success');
    } catch (err: any) {
      toast(err.message || 'Failed to alter user role', 'error');
    }
  };

  return (
    <div className="admin-container">
      <main className="admin-card">
        <h1 className="admin-header__title">
          <IconShield size={26} /> Admin Controls & Permissions
        </h1>
        <p className="admin-header__subtitle">
          Configure system creation permissions for standard users and manage administrative access across Ekokan.
        </p>

        {/* Section 1: Creation Permissions */}
        <section className="admin-section">
          <h2 className="admin-section__title">
            <IconSliders size={20} /> Global Creation Permissions
          </h2>
          <div className="admin-settings-list">
            <div className="admin-setting-item">
              <div className="admin-setting-item__text" id="setting-artist-desc">
                <strong className="admin-setting-item__label">
                  Allow Common Users to Create Artist Profiles
                </strong>
                <span className="admin-setting-item__desc">
                  If disabled, only administrators can add new artists via UI or importers.
                </span>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={localSettings.allow_user_artist_creation}
                aria-labelledby="setting-artist-desc"
                onClick={() => handleToggleSetting('allow_user_artist_creation')}
                disabled={savingSettings}
                className={`admin-toggle-btn ${
                  localSettings.allow_user_artist_creation
                    ? 'admin-toggle-btn--enabled'
                    : 'admin-toggle-btn--disabled'
                }`}
              >
                {localSettings.allow_user_artist_creation ? (
                  <>
                    <IconCheck size={16} /> ENABLED
                  </>
                ) : (
                  <>
                    <IconX size={16} /> DISABLED
                  </>
                )}
              </button>
            </div>

            <div className="admin-setting-item">
              <div className="admin-setting-item__text" id="setting-post-desc">
                <strong className="admin-setting-item__label">
                  Allow Common Users to Create Posts & Upload Media
                </strong>
                <span className="admin-setting-item__desc">
                  If disabled, ordinary registered users will be restricted to viewing and favoriting only.
                </span>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={localSettings.allow_user_post_creation}
                aria-labelledby="setting-post-desc"
                onClick={() => handleToggleSetting('allow_user_post_creation')}
                disabled={savingSettings}
                className={`admin-toggle-btn ${
                  localSettings.allow_user_post_creation
                    ? 'admin-toggle-btn--enabled'
                    : 'admin-toggle-btn--disabled'
                }`}
              >
                {localSettings.allow_user_post_creation ? (
                  <>
                    <IconCheck size={16} /> ENABLED
                  </>
                ) : (
                  <>
                    <IconX size={16} /> DISABLED
                  </>
                )}
              </button>
            </div>
          </div>
        </section>

        {/* Section 2: Users List */}
        <section className="admin-section">
          <div className="admin-section__header">
            <h2 className="admin-section__title">
              <IconUsers size={20} /> Registered Users & Role Management
            </h2>
            <button
              type="button"
              onClick={fetchUsers}
              className="btn-secondary"
              disabled={loadingUsers}
              aria-label="Refresh registered users list"
            >
              <IconRefresh size={14} className={loadingUsers ? 'admin-icon--spinning' : ''} /> Refresh List
            </button>
          </div>

          <div className="admin-table-container">
            <table className="admin-table">
              <thead>
                <tr>
                  <th scope="col">Username</th>
                  <th scope="col">Display Name</th>
                  <th scope="col">Current Role</th>
                  <th scope="col">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loadingUsers && users.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="admin-table__empty">
                      Loading registered users...
                    </td>
                  </tr>
                ) : users.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="admin-table__empty">
                      No users found in archive database.
                    </td>
                  </tr>
                ) : (
                  users.map((u) => {
                    const isAdm = u.role === 'admin' || u.role === 'administrator';
                    const isSelf = u.id === user?.id;
                    const isConfirming = confirmRoleChange?.username === u.username;

                    return (
                      <tr key={u.id}>
                        <td>
                          <strong>{u.username}</strong>
                        </td>
                        <td>{u.display_name || '—'}</td>
                        <td>
                          <span
                            className={`admin-table__user-role ${
                              isAdm
                                ? 'admin-table__user-role--admin'
                                : 'admin-table__user-role--user'
                            }`}
                          >
                            {isAdm ? (
                              <>
                                <IconBolt size={14} /> ADMIN
                              </>
                            ) : (
                              <>
                                <IconUser size={14} /> USER
                              </>
                            )}
                          </span>
                        </td>
                        <td>
                          {isSelf ? (
                            <span className="admin-table__self-tag">
                              (You)
                            </span>
                          ) : isConfirming ? (
                            <div className="admin-confirm-box" role="alert" aria-live="polite">
                              <span className="admin-confirm-text">
                                Confirm {confirmRoleChange.newRole.toUpperCase()}?
                              </span>
                              <button
                                type="button"
                                onClick={() => executeRoleChange(u, confirmRoleChange.newRole)}
                                className="btn-primary"
                              >
                                Yes
                              </button>
                              <button
                                type="button"
                                onClick={() => setConfirmRoleChange(null)}
                                className="btn-secondary"
                              >
                                Cancel
                              </button>
                            </div>
                          ) : isAdm ? (
                            <button
                              type="button"
                              onClick={() => setConfirmRoleChange({ username: u.username, newRole: 'user' })}
                              className="admin-action-btn admin-action-btn--demote"
                            >
                              Demote to User
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => setConfirmRoleChange({ username: u.username, newRole: 'admin' })}
                              className="admin-action-btn admin-action-btn--promote"
                            >
                              Promote to Admin
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </section>
      </main>
    </div>
  );
}

