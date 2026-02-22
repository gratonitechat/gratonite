import { useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { GuildIcon } from '@/components/ui/GuildIcon';
import { api } from '@/lib/api';
import { useUiStore } from '@/stores/ui.store';
import { useGuildsStore } from '@/stores/guilds.store';
import { getErrorMessage } from '@/lib/utils';
import { PermissionFlags } from '@gratonite/types';

type SettingsTab = 'overview' | 'emoji' | 'channels' | 'roles';

const VIEW_CHANNEL_FLAG = PermissionFlags.VIEW_CHANNEL;

function hasFlag(value: string, flag: bigint) {
  return (BigInt(value) & flag) === flag;
}

function addFlag(value: string, flag: bigint) {
  return (BigInt(value) | flag).toString();
}

function removeFlag(value: string, flag: bigint) {
  return (BigInt(value) & ~flag).toString();
}

export function ServerSettingsModal() {
  const activeModal = useUiStore((s) => s.activeModal);
  const modalData = useUiStore((s) => s.modalData);
  const closeModal = useUiStore((s) => s.closeModal);
  const openModal = useUiStore((s) => s.openModal);
  const guilds = useGuildsStore((s) => s.guilds);
  const updateGuildStore = useGuildsStore((s) => s.updateGuild);
  const queryClient = useQueryClient();

  const guildId = (modalData?.['guildId'] as string | undefined) ?? undefined;
  const guild = guildId ? guilds.get(guildId) : undefined;
  const guildName = guild?.name ?? 'Portal';

  const [tab, setTab] = useState<SettingsTab>('emoji');
  const [error, setError] = useState('');
  const [deletingEmojiId, setDeletingEmojiId] = useState<string | null>(null);
  const [selectedChannelId, setSelectedChannelId] = useState('');
  const [selectedRoleId, setSelectedRoleId] = useState('');
  const [selectedUserId, setSelectedUserId] = useState('');
  const [savingPermissions, setSavingPermissions] = useState(false);
  const [uploadingGuildIcon, setUploadingGuildIcon] = useState(false);
  const [uploadingGuildBanner, setUploadingGuildBanner] = useState(false);
  const [newRoleName, setNewRoleName] = useState('');
  const [creatingRole, setCreatingRole] = useState(false);
  const [selectedMemberForRoles, setSelectedMemberForRoles] = useState('');
  const [assignRoleId, setAssignRoleId] = useState('');
  const [savingRoleMembership, setSavingRoleMembership] = useState(false);

  const { data: emojis = [], isLoading } = useQuery({
    queryKey: ['guild-emojis', guildId],
    queryFn: () => api.guilds.getEmojis(guildId!),
    enabled: activeModal === 'server-settings' && Boolean(guildId),
  });

  const emojiStats = useMemo(() => {
    const animated = emojis.filter((emoji) => emoji.animated).length;
    const staticCount = emojis.length - animated;
    return { staticCount, animated };
  }, [emojis]);

  const { data: channels = [] } = useQuery({
    queryKey: ['guild-channels', guildId],
    queryFn: () => api.channels.getGuildChannels(guildId!),
    enabled: activeModal === 'server-settings' && Boolean(guildId),
  });

  const { data: roles = [] } = useQuery({
    queryKey: ['guild-roles', guildId],
    queryFn: () => api.guilds.getRoles(guildId!),
    enabled: activeModal === 'server-settings' && Boolean(guildId),
  });

  const { data: members = [] } = useQuery({
    queryKey: ['members', guildId],
    queryFn: () => api.guilds.getMembers(guildId!, 200),
    enabled: activeModal === 'server-settings' && Boolean(guildId),
  });

  const { data: selectedMemberRoles = [] } = useQuery({
    queryKey: ['member-roles', guildId, selectedMemberForRoles],
    queryFn: () => api.guilds.getMemberRoles(guildId!, selectedMemberForRoles),
    enabled: activeModal === 'server-settings' && Boolean(guildId) && Boolean(selectedMemberForRoles),
  });

  const { data: channelOverrides = [] } = useQuery({
    queryKey: ['channel-permissions', selectedChannelId],
    queryFn: () => api.channels.getPermissionOverrides(selectedChannelId),
    enabled: activeModal === 'server-settings' && Boolean(selectedChannelId),
  });

  const everyoneRole = useMemo(
    () => roles.find((role) => role.name === '@everyone'),
    [roles],
  );

  const everyoneOverride = useMemo(
    () =>
      channelOverrides.find(
        (override) =>
          override.targetType === 'role' && override.targetId === everyoneRole?.id,
      ),
    [channelOverrides, everyoneRole],
  );

  const isPrivateChannel = Boolean(
    everyoneOverride && hasFlag(everyoneOverride.deny, VIEW_CHANNEL_FLAG),
  );

  const channelGrantEntries = useMemo(
    () =>
      channelOverrides.filter(
        (override) =>
          hasFlag(override.allow, VIEW_CHANNEL_FLAG) ||
          hasFlag(override.deny, VIEW_CHANNEL_FLAG),
      ),
    [channelOverrides],
  );

  const configurableChannels = useMemo(
    () => channels.filter((channel) => channel.type !== 'GUILD_CATEGORY'),
    [channels],
  );

  async function refreshPermissions() {
    if (!selectedChannelId || !guildId) return;
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['channel-permissions', selectedChannelId] }),
      queryClient.invalidateQueries({ queryKey: ['guild-channels', guildId] }),
    ]);
  }

  async function handlePrivateToggle(nextPrivate: boolean) {
    if (!selectedChannelId || !everyoneRole) return;
    setError('');
    setSavingPermissions(true);
    try {
      const current = everyoneOverride ?? null;
      if (nextPrivate) {
        const nextAllow = current ? removeFlag(current.allow, VIEW_CHANNEL_FLAG) : '0';
        const nextDeny = current ? addFlag(current.deny, VIEW_CHANNEL_FLAG) : VIEW_CHANNEL_FLAG.toString();
        await api.channels.setPermissionOverride(selectedChannelId, everyoneRole.id, {
          targetType: 'role',
          allow: nextAllow,
          deny: nextDeny,
        });
      } else if (current) {
        const nextAllow = addFlag(current.allow, VIEW_CHANNEL_FLAG);
        const nextDeny = removeFlag(current.deny, VIEW_CHANNEL_FLAG);
        if (BigInt(nextAllow) === 0n && BigInt(nextDeny) === 0n) {
          await api.channels.deletePermissionOverride(selectedChannelId, everyoneRole.id);
        } else {
          await api.channels.setPermissionOverride(selectedChannelId, everyoneRole.id, {
            targetType: 'role',
            allow: nextAllow,
            deny: nextDeny,
          });
        }
      }
      await refreshPermissions();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSavingPermissions(false);
    }
  }

  async function grantAccess(targetType: 'role' | 'user', targetId: string) {
    if (!selectedChannelId || !targetId) return;
    setError('');
    setSavingPermissions(true);
    try {
      await api.channels.setPermissionOverride(selectedChannelId, targetId, {
        targetType,
        allow: VIEW_CHANNEL_FLAG.toString(),
        deny: '0',
      });
      await refreshPermissions();
      if (targetType === 'role') setSelectedRoleId('');
      if (targetType === 'user') setSelectedUserId('');
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSavingPermissions(false);
    }
  }

  async function removeOverride(targetId: string) {
    if (!selectedChannelId) return;
    setError('');
    setSavingPermissions(true);
    try {
      await api.channels.deletePermissionOverride(selectedChannelId, targetId);
      await refreshPermissions();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSavingPermissions(false);
    }
  }

  async function handleDeleteEmoji(emojiId: string) {
    if (!guildId) return;
    setError('');
    setDeletingEmojiId(emojiId);
    try {
      await api.guilds.deleteEmoji(guildId, emojiId);
      await queryClient.invalidateQueries({ queryKey: ['guild-emojis', guildId] });
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setDeletingEmojiId(null);
    }
  }

  async function handleCreateRole() {
    if (!guildId) return;
    const name = newRoleName.trim();
    if (!name) return;
    setError('');
    setCreatingRole(true);
    try {
      await api.guilds.createRole(guildId, { name, mentionable: true });
      setNewRoleName('');
      await queryClient.invalidateQueries({ queryKey: ['guild-roles', guildId] });
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setCreatingRole(false);
    }
  }

  async function handleToggleRoleMentionable(roleId: string, nextMentionable: boolean) {
    if (!guildId) return;
    setError('');
    try {
      await api.guilds.updateRole(guildId, roleId, { mentionable: nextMentionable });
      await queryClient.invalidateQueries({ queryKey: ['guild-roles', guildId] });
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }

  async function handleDeleteRole(roleId: string) {
    if (!guildId) return;
    setError('');
    try {
      await api.guilds.deleteRole(guildId, roleId);
      await queryClient.invalidateQueries({ queryKey: ['guild-roles', guildId] });
      if (assignRoleId === roleId) setAssignRoleId('');
      if (selectedMemberForRoles) {
        await queryClient.invalidateQueries({ queryKey: ['member-roles', guildId, selectedMemberForRoles] });
      }
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }

  async function handleAssignRoleToMember() {
    if (!guildId || !selectedMemberForRoles || !assignRoleId) return;
    setError('');
    setSavingRoleMembership(true);
    try {
      await api.guilds.assignMemberRole(guildId, selectedMemberForRoles, assignRoleId);
      await queryClient.invalidateQueries({ queryKey: ['member-roles', guildId, selectedMemberForRoles] });
      setAssignRoleId('');
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSavingRoleMembership(false);
    }
  }

  async function handleRemoveRoleFromMember(roleId: string) {
    if (!guildId || !selectedMemberForRoles) return;
    setError('');
    setSavingRoleMembership(true);
    try {
      await api.guilds.removeMemberRole(guildId, selectedMemberForRoles, roleId);
      await queryClient.invalidateQueries({ queryKey: ['member-roles', guildId, selectedMemberForRoles] });
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSavingRoleMembership(false);
    }
  }

  function handleClose() {
    setError('');
    setSelectedChannelId('');
    setSelectedRoleId('');
    setSelectedUserId('');
    setSavingPermissions(false);
    setUploadingGuildIcon(false);
    setUploadingGuildBanner(false);
    setNewRoleName('');
    setCreatingRole(false);
    setSelectedMemberForRoles('');
    setAssignRoleId('');
    setSavingRoleMembership(false);
    closeModal();
  }

  async function handleGuildIconUpload(file: File | null) {
    if (!file || !guildId) return;
    setError('');
    setUploadingGuildIcon(true);
    try {
      const result = await api.guilds.uploadIcon(guildId, file);
      updateGuildStore(guildId, {
        iconHash: result.iconHash,
        iconAnimated: result.iconAnimated,
      });
      await queryClient.invalidateQueries({ queryKey: ['guilds', '@me'] });
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setUploadingGuildIcon(false);
    }
  }

  async function handleGuildIconRemove() {
    if (!guildId) return;
    setError('');
    setUploadingGuildIcon(true);
    try {
      await api.guilds.deleteIcon(guildId);
      updateGuildStore(guildId, { iconHash: null, iconAnimated: false });
      await queryClient.invalidateQueries({ queryKey: ['guilds', '@me'] });
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setUploadingGuildIcon(false);
    }
  }

  async function handleGuildBannerUpload(file: File | null) {
    if (!file || !guildId) return;
    setError('');
    setUploadingGuildBanner(true);
    try {
      const result = await api.guilds.uploadBanner(guildId, file);
      updateGuildStore(guildId, {
        bannerHash: result.bannerHash,
        bannerAnimated: result.bannerAnimated,
      });
      await queryClient.invalidateQueries({ queryKey: ['guilds', '@me'] });
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setUploadingGuildBanner(false);
    }
  }

  async function handleGuildBannerRemove() {
    if (!guildId) return;
    setError('');
    setUploadingGuildBanner(true);
    try {
      await api.guilds.deleteBanner(guildId);
      updateGuildStore(guildId, { bannerHash: null, bannerAnimated: false });
      await queryClient.invalidateQueries({ queryKey: ['guilds', '@me'] });
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setUploadingGuildBanner(false);
    }
  }

  return (
    <Modal id="server-settings" title={`${guildName} Portal Settings`} onClose={handleClose} size="lg">
      <div className="server-settings-layout">
        <aside className="server-settings-tabs">
          <button
            type="button"
            className={`server-settings-tab ${tab === 'overview' ? 'server-settings-tab-active' : ''}`}
            onClick={() => setTab('overview')}
          >
            Overview
          </button>
          <button
            type="button"
            className={`server-settings-tab ${tab === 'emoji' ? 'server-settings-tab-active' : ''}`}
            onClick={() => setTab('emoji')}
          >
            Emoji
          </button>
          <button
            type="button"
            className={`server-settings-tab ${tab === 'channels' ? 'server-settings-tab-active' : ''}`}
            onClick={() => setTab('channels')}
          >
            Channels
          </button>
          <button
            type="button"
            className={`server-settings-tab ${tab === 'roles' ? 'server-settings-tab-active' : ''}`}
            onClick={() => setTab('roles')}
          >
            Roles
          </button>
        </aside>

        <section className="server-settings-content">
          {error && <div className="modal-error">{error}</div>}

          {tab === 'overview' && (
            <div className="server-settings-panel">
              <h3 className="server-settings-title">Overview</h3>
              <p className="server-settings-muted">
                Configure this portal profile and media settings.
              </p>
              <div className="profile-media-grid">
                <div className="profile-media-card">
                  <div className="profile-media-preview">
                    <GuildIcon
                      name={guild?.name ?? guildName}
                      iconHash={guild?.iconHash ?? null}
                      guildId={guildId}
                      size={56}
                    />
                    <div>
                      <div className="profile-media-title">Portal Icon</div>
                      <div className="profile-media-subtitle">Shown in portal rail and gallery.</div>
                    </div>
                  </div>
                  <div className="profile-media-actions">
                    <label className="btn btn-ghost btn-sm">
                      {uploadingGuildIcon ? 'Uploading...' : 'Upload'}
                      <input
                        type="file"
                        accept="image/*"
                        className="file-input"
                        onChange={(event) => handleGuildIconUpload(event.target.files?.[0] ?? null)}
                        disabled={uploadingGuildIcon}
                      />
                    </label>
                    <button
                      type="button"
                      className="btn btn-danger btn-sm"
                      onClick={handleGuildIconRemove}
                      disabled={uploadingGuildIcon || !guild?.iconHash}
                    >
                      Remove
                    </button>
                  </div>
                </div>

                <div className="profile-media-card">
                  <div
                    className="profile-banner-preview"
                    style={guild?.bannerHash ? { backgroundImage: `url(/api/v1/files/${guild.bannerHash})` } : undefined}
                  >
                    {!guild?.bannerHash && <span className="profile-banner-placeholder">No banner set</span>}
                  </div>
                  <div className="profile-media-actions">
                    <label className="btn btn-ghost btn-sm">
                      {uploadingGuildBanner ? 'Uploading...' : 'Upload Banner'}
                      <input
                        type="file"
                        accept="image/*"
                        className="file-input"
                        onChange={(event) => handleGuildBannerUpload(event.target.files?.[0] ?? null)}
                        disabled={uploadingGuildBanner}
                      />
                    </label>
                    <button
                      type="button"
                      className="btn btn-danger btn-sm"
                      onClick={handleGuildBannerRemove}
                      disabled={uploadingGuildBanner || !guild?.bannerHash}
                    >
                      Remove
                    </button>
                  </div>
                </div>
              </div>
              <div className="server-settings-actions">
                <Button
                  onClick={() => openModal('edit-server-profile', { guildId })}
                  disabled={!guildId}
                >
                  Open Portal Profile
                </Button>
              </div>
            </div>
          )}

          {tab === 'emoji' && (
            <div className="server-settings-panel">
              <div className="server-settings-header-row">
                <div>
                  <h3 className="server-settings-title">Emoji</h3>
                  <p className="server-settings-muted">
                    Upload and manage custom portal emojis.
                  </p>
                </div>
                <Button
                  onClick={() => openModal('emoji-studio', { guildId })}
                  disabled={!guildId}
                >
                  Upload Emoji
                </Button>
              </div>

              <div className="emoji-slot-summary">
                <div className="emoji-slot-card">
                  <span className="emoji-slot-label">Static</span>
                  <span className="emoji-slot-value">{emojiStats.staticCount}/50</span>
                </div>
                <div className="emoji-slot-card">
                  <span className="emoji-slot-label">Animated</span>
                  <span className="emoji-slot-value">{emojiStats.animated}/50</span>
                </div>
              </div>

              {isLoading && <div className="server-settings-muted">Loading emojis...</div>}
              {!isLoading && emojis.length === 0 && (
                <div className="server-settings-muted">No custom emojis yet.</div>
              )}

              {!isLoading && emojis.length > 0 && (
                <div className="emoji-admin-grid">
                  {emojis.map((emoji) => (
                    <div key={emoji.id} className="emoji-admin-item">
                      <img src={emoji.url} alt={emoji.name} className="emoji-admin-preview" />
                      <div className="emoji-admin-meta">
                        <span className="emoji-admin-name">:{emoji.name}:</span>
                        {emoji.animated && <span className="emoji-admin-badge">GIF</span>}
                      </div>
                      <button
                        type="button"
                        className="emoji-admin-delete"
                        onClick={() => handleDeleteEmoji(emoji.id)}
                        disabled={deletingEmojiId === emoji.id}
                      >
                        {deletingEmojiId === emoji.id ? 'Removing...' : 'Remove'}
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {tab === 'channels' && (
            <div className="server-settings-panel">
              <h3 className="server-settings-title">Channel Permissions</h3>
              <p className="server-settings-muted">
                Configure private access and visibility overrides for each channel.
              </p>

              <div className="input-group">
                <label className="input-label">Channel</label>
                <div className="input-wrapper">
                  <select
                    className="input-field"
                    value={selectedChannelId}
                    onChange={(event) => setSelectedChannelId(event.target.value)}
                  >
                    <option value="">Select a channel</option>
                    {configurableChannels.map((channel) => (
                      <option key={channel.id} value={channel.id}>
                        {channel.type === 'GUILD_VOICE' ? '🔊' : '#'} {channel.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {selectedChannelId && (
                <>
                  <label className="channel-private-toggle">
                    <input
                      type="checkbox"
                      checked={isPrivateChannel}
                      onChange={(event) => handlePrivateToggle(event.target.checked)}
                      disabled={!everyoneRole || savingPermissions}
                    />
                    <span>Private channel (deny @everyone view)</span>
                  </label>

                  <div className="channel-permission-grid">
                    <div className="channel-permission-card">
                      <div className="channel-permission-title">Grant Role Access</div>
                      <div className="channel-permission-row">
                        <select
                          className="input-field"
                          value={selectedRoleId}
                          onChange={(event) => setSelectedRoleId(event.target.value)}
                          disabled={savingPermissions}
                        >
                          <option value="">Select role</option>
                          {roles.map((role) => (
                            <option key={role.id} value={role.id}>
                              {role.name}
                            </option>
                          ))}
                        </select>
                        <Button
                          type="button"
                          disabled={!selectedRoleId || savingPermissions}
                          onClick={() => grantAccess('role', selectedRoleId)}
                        >
                          Grant
                        </Button>
                      </div>
                    </div>

                    <div className="channel-permission-card">
                      <div className="channel-permission-title">Grant Member Access</div>
                      <div className="channel-permission-row">
                        <select
                          className="input-field"
                          value={selectedUserId}
                          onChange={(event) => setSelectedUserId(event.target.value)}
                          disabled={savingPermissions}
                        >
                          <option value="">Select member</option>
                          {members.map((member) => (
                            <option key={member.userId} value={member.userId}>
                              {(member as any).user?.displayName ?? member.nickname ?? member.userId}
                            </option>
                          ))}
                        </select>
                        <Button
                          type="button"
                          disabled={!selectedUserId || savingPermissions}
                          onClick={() => grantAccess('user', selectedUserId)}
                        >
                          Grant
                        </Button>
                      </div>
                    </div>
                  </div>

                  <div className="channel-permission-list">
                    {channelGrantEntries.length === 0 && (
                      <div className="server-settings-muted">No visibility overrides set for this channel.</div>
                    )}
                    {channelGrantEntries.map((override) => {
                      const isAllow = hasFlag(override.allow, VIEW_CHANNEL_FLAG);
                      const label =
                        override.targetType === 'role'
                          ? roles.find((role) => role.id === override.targetId)?.name ?? override.targetId
                          : (members.find((member) => member.userId === override.targetId) as any)?.user
                              ?.displayName ??
                            members.find((member) => member.userId === override.targetId)?.nickname ??
                            override.targetId;
                      return (
                        <div key={override.id} className="channel-permission-item">
                          <span className="channel-permission-target">
                            {override.targetType === 'role' ? '@' : ''}{label}
                          </span>
                          <span className={`channel-permission-badge ${isAllow ? 'is-allow' : 'is-deny'}`}>
                            {isAllow ? 'Can View' : 'Hidden'}
                          </span>
                          <button
                            type="button"
                            className="channel-permission-remove"
                            onClick={() => removeOverride(override.targetId)}
                            disabled={savingPermissions}
                          >
                            Remove
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </>
              )}
            </div>
          )}

          {tab === 'roles' && (
            <div className="server-settings-panel">
              <h3 className="server-settings-title">Roles & Groups</h3>
              <p className="server-settings-muted">
                Roles power @group mentions. Create a role, make it mentionable, then assign members.
              </p>

              <div className="channel-permission-card" style={{ marginBottom: 12 }}>
                <div className="channel-permission-title">Create Role</div>
                <div className="channel-permission-row">
                  <input
                    className="input-field"
                    value={newRoleName}
                    onChange={(event) => setNewRoleName(event.target.value)}
                    placeholder="Ex: raid-team"
                    disabled={creatingRole}
                  />
                  <Button type="button" onClick={handleCreateRole} disabled={!newRoleName.trim() || creatingRole}>
                    {creatingRole ? 'Creating...' : 'Create'}
                  </Button>
                </div>
              </div>

              <div className="channel-permission-card" style={{ marginBottom: 12 }}>
                <div className="channel-permission-title">Assign Members to Roles</div>
                <div className="channel-permission-row" style={{ marginBottom: 8 }}>
                  <select
                    className="input-field"
                    value={selectedMemberForRoles}
                    onChange={(event) => setSelectedMemberForRoles(event.target.value)}
                    disabled={savingRoleMembership}
                  >
                    <option value="">Select member</option>
                    {members.map((member) => (
                      <option key={member.userId} value={member.userId}>
                        {(member as any).user?.displayName ?? member.nickname ?? member.userId}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="channel-permission-row">
                  <select
                    className="input-field"
                    value={assignRoleId}
                    onChange={(event) => setAssignRoleId(event.target.value)}
                    disabled={!selectedMemberForRoles || savingRoleMembership}
                  >
                    <option value="">Select role</option>
                    {roles
                      .filter((role) => role.name !== '@everyone')
                      .map((role) => (
                        <option key={role.id} value={role.id}>
                          {role.name}
                        </option>
                      ))}
                  </select>
                  <Button
                    type="button"
                    onClick={handleAssignRoleToMember}
                    disabled={!selectedMemberForRoles || !assignRoleId || savingRoleMembership}
                  >
                    Assign
                  </Button>
                </div>

                {selectedMemberForRoles && (
                  <div className="channel-permission-list" style={{ marginTop: 10 }}>
                    {selectedMemberRoles.filter((role) => role.name !== '@everyone').length === 0 && (
                      <div className="server-settings-muted">This member has no custom roles yet.</div>
                    )}
                    {selectedMemberRoles
                      .filter((role) => role.name !== '@everyone')
                      .map((role) => (
                        <div key={role.id} className="channel-permission-item">
                          <span className="channel-permission-target">@{role.name}</span>
                          <button
                            type="button"
                            className="channel-permission-remove"
                            onClick={() => handleRemoveRoleFromMember(role.id)}
                            disabled={savingRoleMembership}
                          >
                            Remove
                          </button>
                        </div>
                      ))}
                  </div>
                )}
              </div>

              <div className="channel-permission-list">
                {roles.length === 0 && <div className="server-settings-muted">No roles found.</div>}
                {roles.map((role) => (
                  <div key={role.id} className="channel-permission-item">
                    <span className="channel-permission-target">@{role.name}</span>
                    <label className="channel-private-toggle" style={{ margin: 0, gap: 8 }}>
                      <input
                        type="checkbox"
                        checked={Boolean(role.mentionable)}
                        onChange={(event) => handleToggleRoleMentionable(role.id, event.target.checked)}
                        disabled={role.name === '@everyone'}
                      />
                      <span>Mentionable</span>
                    </label>
                    {role.name !== '@everyone' && (
                      <button
                        type="button"
                        className="channel-permission-remove"
                        onClick={() => handleDeleteRole(role.id)}
                      >
                        Delete
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>
      </div>
    </Modal>
  );
}
