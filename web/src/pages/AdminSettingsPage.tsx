import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../api/client';
import type { User, AppSettings } from '../types/models';
import { useNavigate } from 'react-router-dom';

export default function AdminSettingsPage() {
  const { user, settings, refreshSettings } = useAuth();
  const navigate = useNavigate();

  const [users, setUsers] = useState<User[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [savingSettings, setSavingSettings] = useState(false);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

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
      setErrorMsg(err.message || 'Error loading users list');
    } finally {
      setLoadingUsers(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleToggleSetting = async (key: keyof AppSettings) => {
    setSavingSettings(true);
    setStatusMsg(null);
    setErrorMsg(null);

    const updated = {
      ...localSettings,
      [key]: !localSettings[key],
    };
    setLocalSettings(updated);

    try {
      const saved = await api.updateSettings(updated);
      setLocalSettings(saved);
      await refreshSettings();
      setStatusMsg('✅ System permissions updated successfully!');
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to update settings');
    } finally {
      setSavingSettings(false);
    }
  };

  const handleRoleChange = async (targetUser: User, newRole: string) => {
    if (!window.confirm(`Are you sure you want to change role of "${targetUser.username}" to ${newRole.toUpperCase()}?`)) {
      return;
    }
    setStatusMsg(null);
    setErrorMsg(null);
    try {
      await api.setUserRole(targetUser.username, newRole);
      setUsers(prev => prev.map(u => u.username === targetUser.username ? { ...u, role: newRole } : u));
      setStatusMsg(`✅ User ${targetUser.username} role updated to ${newRole}!`);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to alter user role');
    }
  };

  return (
    <div className="container" style={{ maxWidth: '900px', margin: '32px auto' }}>
      <div style={{ background: 'var(--card-bg)', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '32px', boxShadow: '0 4px 20px rgba(0,0,0,0.15)' }}>
        <h1 style={{ fontSize: '1.8rem', fontWeight: '800', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '10px', color: '#646cff' }}>
          🛡️ Admin Controls & Permissions
        </h1>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '24px' }}>
          Configure system creation permissions for standard users and manage administrative access across Ekokan.
        </p>

        {statusMsg && (
          <div style={{ background: 'rgba(76, 175, 80, 0.15)', border: '1px solid #4caf50', color: '#4caf50', padding: '12px 16px', borderRadius: '8px', marginBottom: '20px', fontWeight: '600' }}>
            {statusMsg}
          </div>
        )}
        {errorMsg && (
          <div style={{ background: 'rgba(244, 67, 54, 0.15)', border: '1px solid #f44336', color: '#f44336', padding: '12px 16px', borderRadius: '8px', marginBottom: '20px', fontWeight: '600' }}>
            ❌ {errorMsg}
          </div>
        )}

        {/* Section 1: Creation Permissions */}
        <div style={{ marginBottom: '40px', borderBottom: '1px solid var(--border-color)', paddingBottom: '32px' }}>
          <h2 style={{ fontSize: '1.3rem', fontWeight: '700', marginBottom: '16px' }}>
            🛠️ Global Creation Permissions
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-primary)', padding: '16px 20px', borderRadius: '10px', border: '1px solid var(--border-color)' }}>
              <div>
                <strong style={{ display: 'block', fontSize: '1.05rem', marginBottom: '4px' }}>Allow Common Users to Create Artist Profiles</strong>
                <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                  If disabled, only administrators can add new artists via UI or importers.
                </span>
              </div>
              <button
                type="button"
                onClick={() => handleToggleSetting('allow_user_artist_creation')}
                disabled={savingSettings}
                style={{
                  padding: '8px 20px',
                  borderRadius: '20px',
                  border: 'none',
                  fontWeight: '700',
                  cursor: 'pointer',
                  backgroundColor: localSettings.allow_user_artist_creation ? '#4caf50' : '#f44336',
                  color: '#fff',
                  minWidth: '110px',
                  transition: 'all 0.2s',
                }}
              >
                {localSettings.allow_user_artist_creation ? 'ENABLED' : 'DISABLED'}
              </button>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-primary)', padding: '16px 20px', borderRadius: '10px', border: '1px solid var(--border-color)' }}>
              <div>
                <strong style={{ display: 'block', fontSize: '1.05rem', marginBottom: '4px' }}>Allow Common Users to Create Posts & Upload Media</strong>
                <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                  If disabled, ordinary registered users will be restricted to viewing and favoriting only.
                </span>
              </div>
              <button
                type="button"
                onClick={() => handleToggleSetting('allow_user_post_creation')}
                disabled={savingSettings}
                style={{
                  padding: '8px 20px',
                  borderRadius: '20px',
                  border: 'none',
                  fontWeight: '700',
                  cursor: 'pointer',
                  backgroundColor: localSettings.allow_user_post_creation ? '#4caf50' : '#f44336',
                  color: '#fff',
                  minWidth: '110px',
                  transition: 'all 0.2s',
                }}
              >
                {localSettings.allow_user_post_creation ? 'ENABLED' : 'DISABLED'}
              </button>
            </div>

          </div>
        </div>

        {/* Section 2: Users List */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h2 style={{ fontSize: '1.3rem', fontWeight: '700' }}>
              👥 Registered Users & Role Management
            </h2>
            <button
              type="button"
              onClick={fetchUsers}
              className="app-header__btn app-header__btn--secondary"
              disabled={loadingUsers}
              style={{ padding: '6px 12px', fontSize: '0.85rem' }}
            >
              🔄 Refresh List
            </button>
          </div>
          
          <div style={{ overflowX: 'auto', borderRadius: '10px', border: '1px solid var(--border-color)' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', background: 'var(--bg-primary)' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-color)', background: 'rgba(255,255,255,0.03)' }}>
                  <th style={{ padding: '12px 16px', fontWeight: '700' }}>Username</th>
                  <th style={{ padding: '12px 16px', fontWeight: '700' }}>Display Name</th>
                  <th style={{ padding: '12px 16px', fontWeight: '700' }}>Current Role</th>
                  <th style={{ padding: '12px 16px', fontWeight: '700', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.length === 0 && !loadingUsers ? (
                  <tr>
                    <td colSpan={4} style={{ padding: '24px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                      No users found.
                    </td>
                  </tr>
                ) : (
                  users.map(u => {
                    const isAdm = u.role === 'admin' || u.role === 'administrator';
                    const isSelf = u.id === user?.id;
                    return (
                      <tr key={u.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                        <td style={{ padding: '12px 16px', fontWeight: '600' }}>{u.username}</td>
                        <td style={{ padding: '12px 16px', color: 'var(--text-secondary)' }}>{u.display_name || '—'}</td>
                        <td style={{ padding: '12px 16px' }}>
                          <span style={{
                            display: 'inline-block',
                            padding: '4px 10px',
                            borderRadius: '12px',
                            fontSize: '0.8rem',
                            fontWeight: '700',
                            backgroundColor: isAdm ? 'rgba(100, 108, 255, 0.2)' : 'rgba(255,255,255,0.08)',
                            color: isAdm ? '#646cff' : 'inherit',
                            border: isAdm ? '1px solid #646cff' : '1px solid var(--border-color)'
                          }}>
                            {isAdm ? '⚡ ADMIN' : '👤 USER'}
                          </span>
                        </td>
                        <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                          {isSelf ? (
                            <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontStyle: 'italic' }}>
                              (You)
                            </span>
                          ) : isAdm ? (
                            <button
                              onClick={() => handleRoleChange(u, 'user')}
                              className="app-header__btn"
                              style={{ border: '1px solid #f44336', color: '#f44336', padding: '4px 10px', fontSize: '0.8rem', cursor: 'pointer', background: 'transparent', borderRadius: '6px' }}
                            >
                              Demote to User
                            </button>
                          ) : (
                            <button
                              onClick={() => handleRoleChange(u, 'admin')}
                              className="app-header__btn"
                              style={{ border: '1px solid #4caf50', color: '#4caf50', padding: '4px 10px', fontSize: '0.8rem', cursor: 'pointer', background: 'transparent', borderRadius: '6px' }}
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

        </div>

      </div>
    </div>
  );
}
