import { useCallback, useEffect, useMemo, useState, type CSSProperties } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import type { AvatarDecoration, ProfileEffect, Nameplate } from '@gratonite/types';
import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useAuthStore } from '@/stores/auth.store';
import { useUiStore } from '@/stores/ui.store';
import { useGuildsStore } from '@/stores/guilds.store';
import { useChannelsStore } from '@/stores/channels.store';
import { useMessagesStore } from '@/stores/messages.store';
import { useMembersStore } from '@/stores/members.store';
import { useUnreadStore } from '@/stores/unread.store';
import { api, setAccessToken, type CommunityShopItem, type CurrencyLedgerEntry, type CurrencyWallet } from '@/lib/api';
import { getErrorMessage } from '@/lib/utils';
import {
  clearThemeManifestPreference,
  readThemeManifestPreference,
  setThemeManifestPreference,
  setUiV2TokensPreference,
  shouldEnableUiV2Tokens,
} from '@/theme/initTheme';
import { applyThemeV2, resolveThemeV2 } from '@/theme/resolveTheme';
import { DEFAULT_THEME_V2 } from '@/theme/tokens-v2';
import { useGuilds } from '@/hooks/useGuilds';
import { DisplayNameText } from '@/components/ui/DisplayNameText';
import { AvatarSprite } from '@/components/ui/AvatarSprite';
import {
  createSurpriseStyle,
  DEFAULT_DISPLAY_NAME_PREFS,
  DISPLAY_NAME_EFFECTS,
  DISPLAY_NAME_FONTS,
  type DisplayNameStyle,
  readDisplayNameStylePrefs,
  saveDisplayNameStylePrefs,
  subscribeDisplayNameStyleChanges,
} from '@/lib/displayNameStyles';
import {
  computeExpiryFromPreset,
  DEFAULT_PROFILE_ENHANCEMENTS,
  readProfileEnhancementsPrefs,
  saveProfileEnhancementsPrefs,
  subscribeProfileEnhancementChanges,
  type StatusExpiryPreset,
} from '@/lib/profileEnhancements';
import {
  saveAvatarDecorationsCatalog,
  saveNameplatesCatalog,
  saveProfileEffectsCatalog,
} from '@/lib/profileCosmetics';
import {
  CLOTHES_COLORS,
  HAIR_COLORS,
  SKIN_TONES,
  DEFAULT_AVATAR_STUDIO_PREFS,
  STARTER_WEARABLES,
  equipStarterWearable,
  readAvatarStudioPrefs,
  saveAvatarStudioPrefs,
  subscribeAvatarStudioChanges,
  type AvatarStudioPrefs,
} from '@/lib/avatarStudio';
import {
  DEFAULT_NOTIFICATION_SOUND_PREFS,
  readNotificationSoundPrefs,
  subscribeNotificationSoundPrefs,
  updateNotificationSoundPrefs,
  type NotificationSoundPrefs,
} from '@/lib/notificationSoundPrefs';
import { playSound, stopSound, type SoundName } from '@/lib/audio';
import {
  DEFAULT_SOUNDBOARD_PREFS,
  readSoundboardPrefs,
  subscribeSoundboardPrefs,
  updateSoundboardPrefs,
  type SoundboardPrefs,
} from '@/lib/soundboardPrefs';

type SettingsSection = 'account' | 'profiles' | 'appearance' | 'notifications' | 'accessibility' | 'logout';

const THEME_TOKEN_CONTROLS: Array<{ key: string; label: string; type: 'color' | 'text' }> = [
  { key: 'semantic/action/accent', label: 'Primary Accent', type: 'color' },
  { key: 'semantic/action/accent-2', label: 'Secondary Accent', type: 'color' },
  { key: 'semantic/surface/base', label: 'Base Surface', type: 'color' },
  { key: 'semantic/text/primary', label: 'Primary Text', type: 'color' },
  { key: 'semantic/gradient/accent', label: 'Accent Gradient', type: 'text' },
];

const DAYS = [
  { label: 'Sun', bit: 0 },
  { label: 'Mon', bit: 1 },
  { label: 'Tue', bit: 2 },
  { label: 'Wed', bit: 3 },
  { label: 'Thu', bit: 4 },
  { label: 'Fri', bit: 5 },
  { label: 'Sat', bit: 6 },
];

export function SettingsPage() {
  useGuilds();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const updateUser = useAuthStore((s) => s.updateUser);
  const logout = useAuthStore((s) => s.logout);
  const openModal = useUiStore((s) => s.openModal);

  const [section, setSection] = useState<SettingsSection>('account');
  const [profile, setProfile] = useState<{ displayName: string; avatarHash: string | null; bannerHash: string | null } | null>(null);
  const [fontScale, setFontScale] = useState(1);
  const [messageDisplay, setMessageDisplay] = useState('cozy');
  const [dndEnabled, setDndEnabled] = useState(false);
  const [dndStart, setDndStart] = useState('22:00');
  const [dndEnd, setDndEnd] = useState('08:00');
  const [dndTimezone, setDndTimezone] = useState('UTC');
  const [dndDays, setDndDays] = useState(0b1111111);
  const [savingDnd, setSavingDnd] = useState(false);
  const [dndError, setDndError] = useState('');
  const [uiV2TokensEnabled, setUiV2TokensEnabled] = useState(() => shouldEnableUiV2Tokens());
  const [themeName, setThemeName] = useState(() => readThemeManifestPreference()?.name ?? DEFAULT_THEME_V2.name);
  const [themeOverrides, setThemeOverrides] = useState<Record<string, string>>(
    () => readThemeManifestPreference()?.overrides ?? {},
  );
  const [themeImportValue, setThemeImportValue] = useState('');
  const [themeError, setThemeError] = useState('');
  const [styleVersion, setStyleVersion] = useState(0);
  const [styleEditorOpen, setStyleEditorOpen] = useState(false);
  const [previewTheme, setPreviewTheme] = useState<'dark' | 'light'>('dark');
  const [styleScope, setStyleScope] = useState<'global' | string>('global');
  const [profileEnhancementsVersion, setProfileEnhancementsVersion] = useState(0);
  const [avatarDecorations, setAvatarDecorations] = useState<AvatarDecoration[]>([]);
  const [profileEffects, setProfileEffects] = useState<ProfileEffect[]>([]);
  const [nameplates, setNameplates] = useState<Nameplate[]>([]);
  const [shopLoading, setShopLoading] = useState(false);
  const [shopError, setShopError] = useState('');
  const [equipping, setEquipping] = useState<'avatar' | 'effect' | 'nameplate' | null>(null);
  const [communityItems, setCommunityItems] = useState<CommunityShopItem[]>([]);
  const [communityLoading, setCommunityLoading] = useState(false);
  const [communityError, setCommunityError] = useState('');
  const [communityCreateLoading, setCommunityCreateLoading] = useState(false);
  const [communityDraftName, setCommunityDraftName] = useState('');
  const [communityDraftType, setCommunityDraftType] = useState<CommunityShopItem['itemType']>('display_name_style_pack');
  const [avatarStudioPrefs, setAvatarStudioPrefs] = useState<AvatarStudioPrefs>(DEFAULT_AVATAR_STUDIO_PREFS);
  const [wallet, setWallet] = useState<CurrencyWallet | null>(null);
  const [ledger, setLedger] = useState<CurrencyLedgerEntry[]>([]);
  const [economyLoading, setEconomyLoading] = useState(false);
  const [economyError, setEconomyError] = useState('');
  const [claimingSource, setClaimingSource] = useState<'chat_message' | 'server_engagement' | 'daily_checkin' | null>(null);
  const [spending, setSpending] = useState(false);
  const [statusInput, setStatusInput] = useState('');
  const [statusExpiryPreset, setStatusExpiryPreset] = useState<StatusExpiryPreset>('4h');
  const [soundPrefs, setSoundPrefs] = useState<NotificationSoundPrefs>(DEFAULT_NOTIFICATION_SOUND_PREFS);
  const [soundboardPrefs, setSoundboardPrefs] = useState<SoundboardPrefs>(DEFAULT_SOUNDBOARD_PREFS);
  const guilds = useGuildsStore((s) => s.guilds);
  const guildOrder = useGuildsStore((s) => s.guildOrder);

  const stylePrefs = useMemo(
    () => (user ? readDisplayNameStylePrefs(user.id) : DEFAULT_DISPLAY_NAME_PREFS),
    [user, styleVersion],
  );

  useEffect(() => subscribeDisplayNameStyleChanges(() => setStyleVersion((v) => v + 1)), []);
  useEffect(() => subscribeProfileEnhancementChanges(() => setProfileEnhancementsVersion((v) => v + 1)), []);
  useEffect(
    () =>
      subscribeAvatarStudioChanges((changedUserId) => {
        if (!user || changedUserId !== user.id) return;
        setAvatarStudioPrefs(readAvatarStudioPrefs(user.id));
      }),
    [user],
  );

  const activeStyle: DisplayNameStyle = useMemo(() => {
    if (styleScope === 'global') return stylePrefs.global;
    return stylePrefs.perServer[styleScope] ?? stylePrefs.global;
  }, [stylePrefs, styleScope]);

  const profileEnhancements = useMemo(
    () => (user ? readProfileEnhancementsPrefs(user.id) : DEFAULT_PROFILE_ENHANCEMENTS),
    [user, profileEnhancementsVersion],
  );

  useEffect(() => {
    setStatusInput(profileEnhancements.statusText);
  }, [profileEnhancements.statusText]);

  useEffect(() => {
    setSoundPrefs(readNotificationSoundPrefs());
    return subscribeNotificationSoundPrefs(setSoundPrefs);
  }, []);
  useEffect(() => {
    setSoundboardPrefs(readSoundboardPrefs());
    return subscribeSoundboardPrefs(setSoundboardPrefs);
  }, []);

  const bannerStyle = useMemo(() => {
    if (!profile?.bannerHash) return undefined;
    return { backgroundImage: `url(/api/v1/files/${profile.bannerHash})` };
  }, [profile?.bannerHash]);
  const equippedAvatarDecoration = useMemo(
    () => avatarDecorations.find((item) => item.id === user?.avatarDecorationId) ?? null,
    [avatarDecorations, user?.avatarDecorationId],
  );
  const equippedProfileEffect = useMemo(
    () => profileEffects.find((item) => item.id === user?.profileEffectId) ?? null,
    [profileEffects, user?.profileEffectId],
  );
  const starterWearablesBySlot = useMemo(() => {
    const slots = {
      hat: STARTER_WEARABLES.filter((item) => item.slot === 'hat'),
      top: STARTER_WEARABLES.filter((item) => item.slot === 'top'),
      bottom: STARTER_WEARABLES.filter((item) => item.slot === 'bottom'),
      shoes: STARTER_WEARABLES.filter((item) => item.slot === 'shoes'),
      accessory: STARTER_WEARABLES.filter((item) => item.slot === 'accessory'),
    };
    return slots;
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function loadEconomy() {
      setEconomyLoading(true);
      setEconomyError('');
      try {
        const [walletData, ledgerEntries] = await Promise.all([
          api.economy.getWallet(),
          api.economy.getLedger(8),
        ]);
        if (cancelled) return;
        setWallet(walletData);
        setLedger(ledgerEntries);
      } catch (err) {
        if (!cancelled) setEconomyError(getErrorMessage(err));
      } finally {
        if (!cancelled) setEconomyLoading(false);
      }
    }

    loadEconomy();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!user) return;
    setAvatarStudioPrefs(readAvatarStudioPrefs(user.id));
  }, [user]);

  useEffect(() => {
    api.users.getMe()
      .then((me) => {
        setProfile({
          displayName: me.profile.displayName,
          avatarHash: me.profile.avatarHash,
          bannerHash: me.profile.bannerHash,
        });
        updateUser({
          avatarDecorationId: me.profile.avatarDecorationId ?? null,
          profileEffectId: me.profile.profileEffectId ?? null,
          nameplateId: me.profile.nameplateId ?? null,
        });
      })
      .catch(() => undefined);
  }, [updateUser]);

  useEffect(() => {
    let cancelled = false;
    async function loadShopCatalogs() {
      setShopLoading(true);
      setShopError('');
      try {
        const [decorations, effects, nameplateCatalog] = await Promise.all([
          api.profiles.getAvatarDecorations(),
          api.profiles.getProfileEffects(),
          api.profiles.getNameplates(),
        ]);
        if (cancelled) return;
        setAvatarDecorations(decorations);
        setProfileEffects(effects);
        setNameplates(nameplateCatalog);
        saveAvatarDecorationsCatalog(decorations);
        saveProfileEffectsCatalog(effects);
        saveNameplatesCatalog(nameplateCatalog);
      } catch (err) {
        if (!cancelled) {
          setShopError(getErrorMessage(err));
        }
      } finally {
        if (!cancelled) {
          setShopLoading(false);
        }
      }
    }

    loadShopCatalogs();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function loadCommunityItems() {
      setCommunityLoading(true);
      setCommunityError('');
      try {
        const myItems = await api.communityShop.getMyItems();
        if (cancelled) return;
        setCommunityItems(myItems.created ?? []);
      } catch (err) {
        if (!cancelled) {
          setCommunityError(getErrorMessage(err));
        }
      } finally {
        if (!cancelled) {
          setCommunityLoading(false);
        }
      }
    }

    loadCommunityItems();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    api.users.getDndSchedule()
      .then((schedule) => {
        setDndEnabled(schedule.enabled);
        setDndStart(schedule.startTime ?? '22:00');
        setDndEnd(schedule.endTime ?? '08:00');
        setDndTimezone(schedule.timezone ?? 'UTC');
        setDndDays(schedule.daysOfWeek ?? 0b1111111);
      })
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      api.users.updateSettings({ fontScale, messageDisplay, theme: 'dark' }).catch(() => undefined);
    }, 300);
    return () => clearTimeout(timer);
  }, [fontScale, messageDisplay]);

  const toggleDay = useCallback((bit: number) => {
    setDndDays((prev) => prev ^ (1 << bit));
  }, []);

  const updateSoundPrefs = useCallback((updater: (current: NotificationSoundPrefs) => NotificationSoundPrefs) => {
    setSoundPrefs(updateNotificationSoundPrefs(updater));
  }, []);

  const previewSound = useCallback((name: SoundName) => {
    playSound(name);
    if (name === 'ringtone' || name === 'outgoing-ring') {
      window.setTimeout(() => stopSound(name), 1200);
    }
  }, []);

  const handleClose = useCallback(() => {
    navigate(-1);
  }, [navigate]);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') handleClose();
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleClose]);

  async function handleSaveDnd() {
    setSavingDnd(true);
    setDndError('');
    try {
      await api.users.updateDndSchedule({
        enabled: dndEnabled,
        startTime: dndStart,
        endTime: dndEnd,
        timezone: dndTimezone,
        daysOfWeek: dndDays,
      });
    } catch (err) {
      setDndError(getErrorMessage(err));
    } finally {
      setSavingDnd(false);
    }
  }

  async function handleLogout() {
    try {
      await api.auth.logout();
    } catch {
      // Best-effort
    }
    setAccessToken(null);
    logout();
    useGuildsStore.getState().clear();
    useChannelsStore.getState().clear();
    useMessagesStore.getState().clear();
    useMembersStore.getState().clear();
    useUnreadStore.getState().clear();
    queryClient.clear();
    navigate('/login', { replace: true });
  }

  function handleToggleUiV2Tokens(nextEnabled: boolean) {
    setUiV2TokensPreference(nextEnabled);
    setUiV2TokensEnabled(nextEnabled);
    window.location.reload();
  }

  function applyThemeManifest(overrides: Record<string, string>, name = themeName) {
    const manifest = {
      version: DEFAULT_THEME_V2.version,
      name,
      overrides,
    };
    const { theme } = resolveThemeV2(manifest);
    setThemeManifestPreference(manifest);
    applyThemeV2(theme);
  }

  function handleThemeOverrideChange(tokenKey: string, value: string) {
    const nextOverrides = {
      ...themeOverrides,
      [tokenKey]: value,
    };
    setThemeOverrides(nextOverrides);
    setThemeError('');
    if (uiV2TokensEnabled) {
      applyThemeManifest(nextOverrides);
    }
  }

  function handleResetTheme() {
    setThemeName(DEFAULT_THEME_V2.name);
    setThemeOverrides({});
    setThemeImportValue('');
    setThemeError('');
    clearThemeManifestPreference();
    if (uiV2TokensEnabled) {
      applyThemeV2(DEFAULT_THEME_V2);
    }
  }

  async function handleExportTheme() {
    const payload = {
      version: DEFAULT_THEME_V2.version,
      name: themeName.trim() || DEFAULT_THEME_V2.name,
      overrides: themeOverrides,
    };
    const serialized = JSON.stringify(payload, null, 2);
    await navigator.clipboard.writeText(serialized);
    setThemeImportValue(serialized);
  }

  function handleImportTheme() {
    setThemeError('');
    try {
      const parsed = JSON.parse(themeImportValue) as {
        version?: string;
        name?: string;
        overrides?: Record<string, string>;
      };
      const nextName = (parsed.name ?? DEFAULT_THEME_V2.name).trim() || DEFAULT_THEME_V2.name;
      const nextOverrides = parsed.overrides ?? {};
      setThemeName(nextName);
      setThemeOverrides(nextOverrides);
      if (uiV2TokensEnabled) {
        applyThemeManifest(nextOverrides, nextName);
      } else {
        setThemeManifestPreference({
          version: parsed.version ?? DEFAULT_THEME_V2.version,
          name: nextName,
          overrides: nextOverrides,
        });
      }
    } catch (err) {
      setThemeError(getErrorMessage(err));
    }
  }

  function updateStyle(next: DisplayNameStyle) {
    if (!user) return;
    const nextPrefs = {
      ...stylePrefs,
      ...(styleScope === 'global'
        ? { global: next }
        : { perServer: { ...stylePrefs.perServer, [styleScope]: next } }),
    };
    saveDisplayNameStylePrefs(user.id, nextPrefs);
  }

  function handleSurpriseMe() {
    updateStyle(createSurpriseStyle());
  }

  function toggleDisplayNameStyles(enabled: boolean) {
    if (!user) return;
    saveDisplayNameStylePrefs(user.id, {
      ...stylePrefs,
      stylesEnabled: enabled,
    });
  }

  function setServerTag(guildId: string | null) {
    if (!user) return;
    saveProfileEnhancementsPrefs(user.id, {
      ...profileEnhancements,
      serverTagGuildId: guildId,
    });
  }

  function handleSaveStatus() {
    if (!user) return;
    saveProfileEnhancementsPrefs(user.id, {
      ...profileEnhancements,
      statusText: statusInput.trim().slice(0, 100),
      statusExpiresAt: computeExpiryFromPreset(statusExpiryPreset),
    });
  }

  function updateWidgets(raw: string) {
    if (!user) return;
    const widgets = raw
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean)
      .slice(0, 8);
    saveProfileEnhancementsPrefs(user.id, {
      ...profileEnhancements,
      widgets,
    });
  }

  async function handleEquipAvatarDecoration(decorationId: string | null) {
    setEquipping('avatar');
    setShopError('');
    try {
      await api.profiles.updateCustomization({ avatarDecorationId: decorationId });
      updateUser({ avatarDecorationId: decorationId });
    } catch (err) {
      setShopError(getErrorMessage(err));
    } finally {
      setEquipping(null);
    }
  }

  async function handleEquipProfileEffect(effectId: string | null) {
    setEquipping('effect');
    setShopError('');
    try {
      await api.profiles.updateCustomization({ profileEffectId: effectId });
      updateUser({ profileEffectId: effectId });
    } catch (err) {
      setShopError(getErrorMessage(err));
    } finally {
      setEquipping(null);
    }
  }

  async function handleEquipNameplate(nameplateId: string | null) {
    setEquipping('nameplate');
    setShopError('');
    try {
      await api.profiles.updateCustomization({ nameplateId });
      updateUser({ nameplateId });
    } catch (err) {
      setShopError(getErrorMessage(err));
    } finally {
      setEquipping(null);
    }
  }

  async function handleCreateCommunityDraft() {
    if (!communityDraftName.trim()) return;
    setCommunityCreateLoading(true);
    setCommunityError('');
    try {
      const created = await api.communityShop.createItem({
        itemType: communityDraftType,
        name: communityDraftName.trim(),
        payload: {},
        tags: ['community'],
      });
      setCommunityItems((current) => [created, ...current]);
      setCommunityDraftName('');
    } catch (err) {
      setCommunityError(getErrorMessage(err));
    } finally {
      setCommunityCreateLoading(false);
    }
  }

  async function handleSubmitCommunityItem(itemId: string) {
    setCommunityError('');
    try {
      const updated = await api.communityShop.submitForReview(itemId);
      setCommunityItems((current) => current.map((item) => (item.id === itemId ? updated : item)));
    } catch (err) {
      setCommunityError(getErrorMessage(err));
    }
  }

  function updateAvatarStudio(next: AvatarStudioPrefs) {
    if (!user) return;
    setAvatarStudioPrefs(next);
    saveAvatarStudioPrefs(user.id, next);
  }

  function resetAvatarStudio() {
    updateAvatarStudio(DEFAULT_AVATAR_STUDIO_PREFS);
  }

  function randomizeAvatarStudio() {
    const pick = <T,>(items: readonly T[]) => items[Math.floor(Math.random() * items.length)]!;
    updateAvatarStudio({
      ...avatarStudioPrefs,
      enabled: true,
      sprite: {
        ...avatarStudioPrefs.sprite,
        skinTone: pick(SKIN_TONES),
        hairColor: pick(HAIR_COLORS),
        hairStyle: pick(['short', 'long', 'spike'] as const),
        faceStyle: pick(['smile', 'neutral', 'wink'] as const),
        topColor: pick(CLOTHES_COLORS),
        bottomColor: pick(['#263659', '#1f4d3c', '#422b58', '#4e2f1d'] as const),
        shoesColor: pick(['#10161f', '#e9ecf1', '#ad6f3b', '#3f4758'] as const),
        hatStyle: pick(['none', 'beanie', 'crown'] as const),
        accessoryStyle: pick(['none', 'glasses', 'star'] as const),
      },
    });
  }

  async function handleClaimReward(source: 'chat_message' | 'server_engagement' | 'daily_checkin') {
    setClaimingSource(source);
    setEconomyError('');
    try {
      const contextKey = source === 'daily_checkin' ? new Date().toISOString().slice(0, 10) : `${source}:${Date.now()}`;
      const result = await api.economy.claimReward({ source, contextKey });
      setWallet(result.wallet);
      if (result.ledgerEntry) {
        setLedger((current) => [result.ledgerEntry as CurrencyLedgerEntry, ...current].slice(0, 8));
      }
    } catch (err) {
      setEconomyError(getErrorMessage(err));
    } finally {
      setClaimingSource(null);
    }
  }

  async function handleSpendCurrency() {
    setSpending(true);
    setEconomyError('');
    try {
      const result = await api.economy.spend({
        source: 'shop_purchase',
        amount: 25,
        description: 'Starter wearable purchase',
        contextKey: `spend:starter:${Date.now()}`,
      });
      setWallet(result.wallet);
      if (result.ledgerEntry) {
        setLedger((current) => [result.ledgerEntry as CurrencyLedgerEntry, ...current].slice(0, 8));
      }
    } catch (err) {
      setEconomyError(getErrorMessage(err));
    } finally {
      setSpending(false);
    }
  }

  if (!user) return null;
  const isBugInboxAdmin = user.username === 'ferdinand' || user.username === 'coodaye';

  return (
    <div className="settings-page">
      <aside className="settings-sidebar">
        <div className="settings-sidebar-title">User Settings</div>
        <nav className="settings-nav">
          <button
            className={`settings-nav-item ${section === 'account' ? 'settings-nav-item-active' : ''}`}
            onClick={() => setSection('account')}
          >
            My Account
          </button>
          <button
            className={`settings-nav-item ${section === 'profiles' ? 'settings-nav-item-active' : ''}`}
            onClick={() => setSection('profiles')}
          >
            Profiles
          </button>
          <button
            className={`settings-nav-item ${section === 'appearance' ? 'settings-nav-item-active' : ''}`}
            onClick={() => setSection('appearance')}
          >
            Appearance
          </button>
          <button
            className={`settings-nav-item ${section === 'notifications' ? 'settings-nav-item-active' : ''}`}
            onClick={() => setSection('notifications')}
          >
            Notifications
          </button>
          <button
            className={`settings-nav-item ${section === 'accessibility' ? 'settings-nav-item-active' : ''}`}
            onClick={() => setSection('accessibility')}
          >
            Accessibility
          </button>
          <button
            className={`settings-nav-item ${section === 'logout' ? 'settings-nav-item-active' : ''}`}
            onClick={() => setSection('logout')}
          >
            Log Out
          </button>
        </nav>
      </aside>
      <div className="settings-content">
        <button className="settings-close" onClick={handleClose} aria-label="Close">
          &times;
        </button>

        {section === 'account' && (
          <section className="settings-section">
            <h2 className="settings-section-title">My Account</h2>
            <div className="settings-profile-card">
              <div className="settings-profile-banner" style={bannerStyle} />
              {equippedProfileEffect && (
                <img
                  src={`/api/v1/files/${equippedProfileEffect.assetHash}`}
                  alt=""
                  className="settings-profile-effect"
                  aria-hidden="true"
                />
              )}
              <div className="settings-profile-body">
                <Avatar
                  name={profile?.displayName ?? user.displayName}
                  hash={profile?.avatarHash ?? user.avatarHash}
                  decorationHash={equippedAvatarDecoration?.assetHash ?? null}
                  userId={user.id}
                  size={64}
                  className="settings-profile-avatar"
                />
                <div className="settings-profile-info">
                  <div className="settings-profile-name">{profile?.displayName ?? user.displayName}</div>
                  <div className="settings-profile-username">@{user.username}</div>
                </div>
                <Button variant="ghost" onClick={() => openModal('edit-profile')}>Edit Profile</Button>
              </div>
            </div>

            <div className="settings-field-grid">
              <div className="settings-field">
                <div className="settings-field-label">Email</div>
                <div className="settings-field-value">{user.email}</div>
              </div>
              <div className="settings-field">
                <div className="settings-field-label">Display Name</div>
                <div className="settings-field-value">{profile?.displayName ?? user.displayName}</div>
              </div>
              <div className="settings-field">
                <div className="settings-field-label">User ID</div>
                <div className="settings-field-value">{user.id}</div>
              </div>
            </div>

            {isBugInboxAdmin && (
              <div className="settings-card">
                <div className="settings-field">
                  <div className="settings-field-label">Ops Tools</div>
                  <div className="settings-field-value">Internal triage tools for beta testing and bug review.</div>
                </div>
                <div className="settings-field-control settings-field-row">
                  <Link to="/ops/bugs">
                    <Button>Open Bug Inbox</Button>
                  </Link>
                </div>
              </div>
            )}
          </section>
        )}

        {section === 'profiles' && (
          <section className="settings-section">
            <h2 className="settings-section-title">Profiles</h2>
            <div className="settings-card">
              <div className="settings-field">
                <div className="settings-field-label">Display Name Styles</div>
                <div className="settings-field-value">Customize font, effect, and colors.</div>
              </div>
              <div className={`dns-preview ${previewTheme === 'light' ? 'dns-preview-light' : ''}`}>
                <div className="dns-preview-label">Preview</div>
                <div className="dns-preview-name">
                  <DisplayNameText
                    text={profile?.displayName ?? user.displayName}
                    userId={user.id}
                    guildId={styleScope === 'global' ? null : styleScope}
                    context="profile"
                  />
                </div>
              </div>
              <div className="settings-field-control settings-field-row">
                <Button variant="ghost" onClick={() => setPreviewTheme((p) => (p === 'dark' ? 'light' : 'dark'))}>
                  {previewTheme === 'dark' ? 'Light Mode Preview' : 'Dark Mode Preview'}
                </Button>
                <Button variant="ghost" onClick={handleSurpriseMe}>Surprise Me</Button>
                <Button onClick={() => setStyleEditorOpen((v) => !v)}>
                  {styleEditorOpen ? 'Close Style Menu' : 'Change Style'}
                </Button>
              </div>

              {styleEditorOpen && (
                <div className="dns-editor">
                  <div className="settings-field">
                    <div className="settings-field-label">Style Scope</div>
                    <div className="settings-field-control">
                      <select
                        className="settings-select"
                        value={styleScope}
                        onChange={(e) => setStyleScope(e.target.value)}
                      >
                        <option value="global">Global</option>
                        {guildOrder.map((id) => {
                          const guild = guilds.get(id);
                          if (!guild) return null;
                          return (
                            <option key={id} value={id}>
                              Per-Portal: {guild.name}
                            </option>
                          );
                        })}
                      </select>
                    </div>
                  </div>
                  <div className="settings-field">
                    <div className="settings-field-label">Font</div>
                    <div className="settings-field-control">
                      <select
                        className="settings-select"
                        value={activeStyle.font}
                        onChange={(e) => updateStyle({ ...activeStyle, font: e.target.value as DisplayNameStyle['font'] })}
                      >
                        {DISPLAY_NAME_FONTS.map((font) => (
                          <option key={font.id} value={font.id}>
                            {font.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div className="settings-field">
                    <div className="settings-field-label">Effect</div>
                    <div className="settings-field-control">
                      <select
                        className="settings-select"
                        value={activeStyle.effect}
                        onChange={(e) => updateStyle({ ...activeStyle, effect: e.target.value as DisplayNameStyle['effect'] })}
                      >
                        {DISPLAY_NAME_EFFECTS.map((effect) => (
                          <option key={effect.id} value={effect.id}>
                            {effect.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div className="settings-field-grid dns-colors">
                    <div className="settings-field">
                      <div className="settings-field-label">Primary Color</div>
                      <div className="settings-field-control">
                        <input
                          type="color"
                          className="dns-color-input"
                          value={activeStyle.colorA}
                          onChange={(e) => updateStyle({ ...activeStyle, colorA: e.target.value })}
                        />
                      </div>
                    </div>
                    <div className="settings-field">
                      <div className="settings-field-label">Secondary Color</div>
                      <div className="settings-field-control">
                        <input
                          type="color"
                          className="dns-color-input"
                          value={activeStyle.colorB}
                          onChange={(e) => updateStyle({ ...activeStyle, colorB: e.target.value })}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <div className="dns-editor">
                <div className="settings-field">
                  <div className="settings-field-label">Portal Tag</div>
                  <div className="settings-field-control">
                    <select
                      className="settings-select"
                      value={profileEnhancements.serverTagGuildId ?? ''}
                      onChange={(e) => setServerTag(e.target.value || null)}
                    >
                      <option value="">None</option>
                      {guildOrder.map((id) => {
                        const guild = guilds.get(id);
                        if (!guild) return null;
                        return (
                          <option key={id} value={id}>
                            {guild.name}
                          </option>
                        );
                      })}
                    </select>
                  </div>
                </div>

                <div className="settings-field">
                  <div className="settings-field-label">Status Message</div>
                  <div className="settings-field-control settings-field-row">
                    <Input
                      type="text"
                      value={statusInput}
                      onChange={(e) => setStatusInput(e.target.value.slice(0, 100))}
                      placeholder="What’s on your mind?"
                    />
                    <select
                      className="settings-select"
                      value={statusExpiryPreset}
                      onChange={(e) => setStatusExpiryPreset(e.target.value as StatusExpiryPreset)}
                    >
                      <option value="1h">1 hour</option>
                      <option value="4h">4 hours</option>
                      <option value="today">Today</option>
                      <option value="never">Never</option>
                    </select>
                    <Button onClick={handleSaveStatus}>Save</Button>
                  </div>
                </div>

                <div className="settings-field">
                  <div className="settings-field-label">Profile Widgets</div>
                  <div className="settings-field-control">
                    <Input
                      type="text"
                      value={profileEnhancements.widgets.join(', ')}
                      onChange={(e) => updateWidgets(e.target.value)}
                      placeholder="Example: Backlog - Hollow Knight, Persona 3 Reload"
                    />
                  </div>
                </div>
              </div>

              <div className="settings-shop-card">
                <div className="settings-field">
                  <div className="settings-field-label">Shop Cosmetics</div>
                  <div className="settings-field-value">
                    Preview and equip Avatar Decorations, Profile Effects, and Nameplates.
                  </div>
                </div>
                {shopError && <div className="settings-error">{shopError}</div>}

                <div className="shop-section">
                  <div className="shop-section-header">Avatar Decorations</div>
                  {shopLoading ? (
                    <div className="settings-muted">Loading decorations…</div>
                  ) : (
                    <div className="shop-grid">
                      {avatarDecorations.map((decoration) => {
                        const equipped = user.avatarDecorationId === decoration.id;
                        return (
                          <article key={decoration.id} className={`shop-item ${equipped ? 'shop-item-equipped' : ''}`}>
                            <div className="shop-item-preview">
                              <Avatar
                                name={profile?.displayName ?? user.displayName}
                                hash={profile?.avatarHash ?? user.avatarHash}
                                decorationHash={decoration.assetHash}
                                userId={user.id}
                                size={56}
                              />
                            </div>
                            <div className="shop-item-name">{decoration.name}</div>
                            {decoration.description && (
                              <div className="shop-item-description">{decoration.description}</div>
                            )}
                            <Button
                              variant={equipped ? 'ghost' : 'primary'}
                              loading={equipping === 'avatar'}
                              onClick={() => handleEquipAvatarDecoration(equipped ? null : decoration.id)}
                            >
                              {equipped ? 'Remove' : 'Equip'}
                            </Button>
                          </article>
                        );
                      })}
                    </div>
                  )}
                </div>

                <div className="shop-section">
                  <div className="shop-section-header">Profile Effects</div>
                  {shopLoading ? (
                    <div className="settings-muted">Loading effects…</div>
                  ) : (
                    <div className="shop-grid">
                      {profileEffects.map((effect) => {
                        const equipped = user.profileEffectId === effect.id;
                        return (
                          <article key={effect.id} className={`shop-item ${equipped ? 'shop-item-equipped' : ''}`}>
                            <div className="shop-effect-preview">
                              <div className="shop-effect-card">
                                <div className="shop-effect-title">
                                  <DisplayNameText
                                    text={profile?.displayName ?? user.displayName}
                                    userId={user.id}
                                    context="profile"
                                  />
                                </div>
                                <img src={`/api/v1/files/${effect.assetHash}`} alt="" aria-hidden="true" />
                              </div>
                            </div>
                            <div className="shop-item-name">{effect.name}</div>
                            {effect.description && (
                              <div className="shop-item-description">{effect.description}</div>
                            )}
                            <Button
                              variant={equipped ? 'ghost' : 'primary'}
                              loading={equipping === 'effect'}
                              onClick={() => handleEquipProfileEffect(equipped ? null : effect.id)}
                            >
                              {equipped ? 'Remove' : 'Equip'}
                            </Button>
                          </article>
                        );
                      })}
                    </div>
                  )}
                </div>

                <div className="shop-section">
                  <div className="shop-section-header">Nameplates</div>
                  {shopLoading ? (
                    <div className="settings-muted">Loading nameplates…</div>
                  ) : (
                  <div className="shop-grid">
                    {nameplates.map((nameplate) => {
                      const equipped = user.nameplateId === nameplate.id;
                      return (
                        <article key={nameplate.id} className={`shop-item ${equipped ? 'shop-item-equipped' : ''}`}>
                          <div className="shop-nameplate-preview">
                            <span
                              className="display-name-nameplate nameplate-from-asset"
                              style={{ '--nameplate-image': `url(/api/v1/files/${nameplate.assetHash})` } as CSSProperties}
                            >
                              {profile?.displayName ?? user.displayName}
                            </span>
                          </div>
                          <div className="shop-item-name">{nameplate.name}</div>
                          <div className="shop-item-description">{nameplate.description ?? ''}</div>
                          <Button
                            variant={equipped ? 'ghost' : 'primary'}
                            loading={equipping === 'nameplate'}
                            onClick={() => handleEquipNameplate(equipped ? null : nameplate.id)}
                          >
                            {equipped ? 'Remove' : 'Equip'}
                          </Button>
                        </article>
                      );
                    })}
                  </div>
                  )}
                </div>

                <div className="shop-section">
                  <div className="shop-section-header">Community Creator Drafts</div>
                  <div className="settings-field-control settings-field-row">
                    <select
                      className="settings-select"
                      value={communityDraftType}
                      onChange={(event) => setCommunityDraftType(event.target.value as CommunityShopItem['itemType'])}
                    >
                      <option value="display_name_style_pack">Display Name Style Pack</option>
                      <option value="profile_widget_pack">Profile Widget Pack</option>
                      <option value="server_tag_badge">Portal Tag Badge</option>
                      <option value="avatar_decoration">Avatar Decoration</option>
                      <option value="profile_effect">Profile Effect</option>
                      <option value="nameplate">Nameplate</option>
                    </select>
                    <Input
                      type="text"
                      value={communityDraftName}
                      onChange={(event) => setCommunityDraftName(event.target.value)}
                      placeholder="New community item name"
                    />
                    <Button loading={communityCreateLoading} disabled={!communityDraftName.trim()} onClick={handleCreateCommunityDraft}>
                      Create Draft
                    </Button>
                  </div>
                  {communityError && <div className="settings-error">{communityError}</div>}
                  {communityLoading ? (
                    <div className="settings-muted">Loading creator drafts…</div>
                  ) : (
                    <div className="shop-grid">
                      {communityItems.slice(0, 8).map((item) => (
                        <article key={item.id} className="shop-item">
                          <div className="shop-item-name">{item.name}</div>
                          <div className="shop-item-description">
                            {item.itemType.replaceAll('_', ' ')} · {item.status.replaceAll('_', ' ')}
                          </div>
                          <Button
                            variant="ghost"
                            disabled={item.status === 'pending_review' || item.status === 'published'}
                            onClick={() => handleSubmitCommunityItem(item.id)}
                          >
                            {item.status === 'pending_review' ? 'In Review' : item.status === 'published' ? 'Published' : 'Submit Review'}
                          </Button>
                        </article>
                      ))}
                    </div>
                  )}
                </div>

                <div className="shop-section">
                  <div className="shop-section-header">2D Avatar Studio (Foundation)</div>
                  <div className="settings-field-control settings-field-row">
                    <label className="settings-toggle">
                      <input
                        type="checkbox"
                        checked={avatarStudioPrefs.enabled}
                        onChange={(event) =>
                          updateAvatarStudio({
                            ...avatarStudioPrefs,
                            enabled: event.target.checked,
                          })
                        }
                      />
                      <span className="settings-toggle-indicator" />
                    </label>
                    <span className="settings-range-value">
                      {avatarStudioPrefs.enabled ? 'Sprite enabled on your profile surfaces' : 'Sprite disabled (fallback avatar only)'}
                    </span>
                  </div>
                  <div className="settings-field-control settings-field-row">
                    <AvatarSprite config={avatarStudioPrefs.sprite} size={72} className="settings-avatar-sprite" />
                    <Button variant="ghost" onClick={randomizeAvatarStudio}>Randomize</Button>
                    <Button variant="ghost" onClick={resetAvatarStudio}>Reset</Button>
                    <select
                      className="settings-select"
                      value={avatarStudioPrefs.sprite.hairStyle}
                      onChange={(event) =>
                        updateAvatarStudio({
                          ...avatarStudioPrefs,
                          sprite: { ...avatarStudioPrefs.sprite, hairStyle: event.target.value as AvatarStudioPrefs['sprite']['hairStyle'] },
                        })
                      }
                    >
                      <option value="short">Hair: Short</option>
                      <option value="long">Hair: Long</option>
                      <option value="spike">Hair: Spike</option>
                    </select>
                    <select
                      className="settings-select"
                      value={avatarStudioPrefs.sprite.faceStyle}
                      onChange={(event) =>
                        updateAvatarStudio({
                          ...avatarStudioPrefs,
                          sprite: { ...avatarStudioPrefs.sprite, faceStyle: event.target.value as AvatarStudioPrefs['sprite']['faceStyle'] },
                        })
                      }
                    >
                      <option value="smile">Face: Smile</option>
                      <option value="neutral">Face: Neutral</option>
                      <option value="wink">Face: Wink</option>
                    </select>
                    <select
                      className="settings-select"
                      value={avatarStudioPrefs.sprite.hatStyle}
                      onChange={(event) =>
                        updateAvatarStudio({
                          ...avatarStudioPrefs,
                          sprite: { ...avatarStudioPrefs.sprite, hatStyle: event.target.value as AvatarStudioPrefs['sprite']['hatStyle'] },
                        })
                      }
                    >
                      <option value="none">Hat: None</option>
                      <option value="beanie">Hat: Beanie</option>
                      <option value="crown">Hat: Crown</option>
                    </select>
                    <select
                      className="settings-select"
                      value={avatarStudioPrefs.sprite.accessoryStyle}
                      onChange={(event) =>
                        updateAvatarStudio({
                          ...avatarStudioPrefs,
                          sprite: { ...avatarStudioPrefs.sprite, accessoryStyle: event.target.value as AvatarStudioPrefs['sprite']['accessoryStyle'] },
                        })
                      }
                    >
                      <option value="none">Accessory: None</option>
                      <option value="glasses">Accessory: Glasses</option>
                      <option value="star">Accessory: Star</option>
                    </select>
                  </div>
                  <div className="settings-field-control settings-field-row settings-color-swatches">
                    <span className="settings-muted">Skin</span>
                    {SKIN_TONES.map((tone) => (
                      <button
                        key={tone}
                        type="button"
                        className={`settings-swatch ${avatarStudioPrefs.sprite.skinTone === tone ? 'settings-swatch-active' : ''}`}
                        style={{ background: tone }}
                        onClick={() =>
                          updateAvatarStudio({
                            ...avatarStudioPrefs,
                            sprite: { ...avatarStudioPrefs.sprite, skinTone: tone },
                          })
                        }
                        aria-label={`Set skin tone ${tone}`}
                      />
                    ))}
                    <span className="settings-muted">Hair</span>
                    {HAIR_COLORS.map((tone) => (
                      <button
                        key={tone}
                        type="button"
                        className={`settings-swatch ${avatarStudioPrefs.sprite.hairColor === tone ? 'settings-swatch-active' : ''}`}
                        style={{ background: tone }}
                        onClick={() =>
                          updateAvatarStudio({
                            ...avatarStudioPrefs,
                            sprite: { ...avatarStudioPrefs.sprite, hairColor: tone },
                          })
                        }
                        aria-label={`Set hair color ${tone}`}
                      />
                    ))}
                    <span className="settings-muted">Top</span>
                    {CLOTHES_COLORS.map((tone) => (
                      <button
                        key={tone}
                        type="button"
                        className={`settings-swatch ${avatarStudioPrefs.sprite.topColor === tone ? 'settings-swatch-active' : ''}`}
                        style={{ background: tone }}
                        onClick={() =>
                          updateAvatarStudio({
                            ...avatarStudioPrefs,
                            sprite: { ...avatarStudioPrefs.sprite, topColor: tone },
                          })
                        }
                        aria-label={`Set top color ${tone}`}
                      />
                    ))}
                    <span className="settings-muted">Bottom</span>
                    {['#263659', '#1f4d3c', '#422b58', '#4e2f1d'].map((tone) => (
                      <button
                        key={tone}
                        type="button"
                        className={`settings-swatch ${avatarStudioPrefs.sprite.bottomColor === tone ? 'settings-swatch-active' : ''}`}
                        style={{ background: tone }}
                        onClick={() =>
                          updateAvatarStudio({
                            ...avatarStudioPrefs,
                            sprite: { ...avatarStudioPrefs.sprite, bottomColor: tone },
                          })
                        }
                        aria-label={`Set bottom color ${tone}`}
                      />
                    ))}
                    <span className="settings-muted">Shoes</span>
                    {['#10161f', '#e9ecf1', '#ad6f3b', '#3f4758'].map((tone) => (
                      <button
                        key={tone}
                        type="button"
                        className={`settings-swatch ${avatarStudioPrefs.sprite.shoesColor === tone ? 'settings-swatch-active' : ''}`}
                        style={{ background: tone }}
                        onClick={() =>
                          updateAvatarStudio({
                            ...avatarStudioPrefs,
                            sprite: { ...avatarStudioPrefs.sprite, shoesColor: tone },
                          })
                        }
                        aria-label={`Set shoes color ${tone}`}
                      />
                    ))}
                  </div>
                  <div className="settings-field">
                    <div className="settings-field-label">Starter Wearables Catalog</div>
                    <div className="settings-field-value">
                      Equip starter hats, tops, bottoms, shoes, and accessories with immediate sprite updates.
                    </div>
                  </div>
                  {(['hat', 'top', 'bottom', 'shoes', 'accessory'] as const).map((slot) => (
                    <div key={slot} className="settings-field">
                      <div className="settings-field-label">{slot.charAt(0).toUpperCase() + slot.slice(1)}</div>
                      <div className="settings-wardrobe-grid">
                        {starterWearablesBySlot[slot].map((item) => {
                          const equipped = avatarStudioPrefs.equipped[slot] === item.id;
                          const previewConfig = {
                            ...avatarStudioPrefs.sprite,
                            ...item.patch,
                          };
                          return (
                            <button
                              key={item.id}
                              type="button"
                              className={`settings-wardrobe-card ${equipped ? 'settings-wardrobe-card-equipped' : ''}`}
                              onClick={() => updateAvatarStudio(equipStarterWearable(avatarStudioPrefs, item))}
                            >
                              <AvatarSprite config={previewConfig} size={56} className="settings-wardrobe-sprite" />
                              <span className="settings-wardrobe-name">{item.label}</span>
                              <span className="settings-wardrobe-state">{equipped ? 'Equipped' : 'Equip'}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="shop-section">
                  <div className="shop-section-header">Soft Currency Wallet (Scaffold)</div>
                  <div className="settings-field-control settings-field-row">
                    <div className="settings-field-value">
                      Balance: <strong>{wallet?.balance ?? 0}</strong>
                    </div>
                    <div className="settings-field-value">Earned: {wallet?.lifetimeEarned ?? 0}</div>
                    <div className="settings-field-value">Spent: {wallet?.lifetimeSpent ?? 0}</div>
                  </div>
                  <div className="settings-field-control settings-field-row">
                    <Button loading={claimingSource === 'chat_message'} onClick={() => handleClaimReward('chat_message')}>
                      Claim Chat Activity
                    </Button>
                    <Button loading={claimingSource === 'server_engagement'} onClick={() => handleClaimReward('server_engagement')}>
                      Claim Portal Engagement
                    </Button>
                    <Button loading={claimingSource === 'daily_checkin'} onClick={() => handleClaimReward('daily_checkin')}>
                      Claim Daily Check-In
                    </Button>
                    <Button variant="ghost" loading={spending} onClick={handleSpendCurrency}>
                      Spend 25 (Shop)
                    </Button>
                  </div>
                  {economyLoading && <div className="settings-muted">Loading wallet…</div>}
                  {economyError && <div className="settings-error">{economyError}</div>}
                  <div className="settings-economy-ledger">
                    {ledger.length === 0 ? (
                      <div className="settings-muted">No ledger activity yet.</div>
                    ) : (
                      ledger.map((entry) => (
                        <div key={entry.id} className="settings-economy-entry">
                          <span>+{entry.amount}</span>
                          <span>{entry.source.replaceAll('_', ' ')}</span>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </div>
          </section>
        )}

        {section === 'appearance' && (
          <section className="settings-section">
            <h2 className="settings-section-title">Appearance</h2>
            <div className="settings-card">
              <div className="settings-field">
                <div className="settings-field-label">Theme</div>
                <div className="settings-field-value">Dark (default)</div>
              </div>
              <div className="settings-field">
                <div className="settings-field-label">Message Density</div>
                <div className="settings-field-control">
                  <select
                    className="settings-select"
                    value={messageDisplay}
                    onChange={(event) => setMessageDisplay(event.target.value)}
                  >
                    <option value="cozy">Cozy</option>
                    <option value="compact">Compact</option>
                  </select>
                </div>
              </div>
              <div className="settings-field">
                <div className="settings-field-label">Font Scale</div>
                <div className="settings-field-control">
                  <input
                    className="settings-range"
                    type="range"
                    min="0.8"
                    max="1.4"
                    step="0.05"
                    value={fontScale}
                    onChange={(event) => setFontScale(Number(event.target.value))}
                  />
                  <span className="settings-range-value">{fontScale.toFixed(2)}x</span>
                </div>
              </div>
              <div className="settings-field">
                <div className="settings-field-label">Modern UI Preview</div>
                <div className="settings-field-control">
                  <label className="settings-toggle">
                    <input
                      type="checkbox"
                      checked={uiV2TokensEnabled}
                      onChange={(event) => handleToggleUiV2Tokens(event.target.checked)}
                    />
                    <span className="settings-toggle-indicator" />
                  </label>
                  <span className="settings-range-value">{uiV2TokensEnabled ? 'On' : 'Off'}</span>
                </div>
              </div>
              <div className="settings-theme-editor">
                <div className="settings-theme-header">
                  <h3 className="settings-theme-title">Theme Studio (v1)</h3>
                  <p className="settings-muted">
                    Customize core theme tokens and share by exporting/importing JSON.
                  </p>
                </div>
                <div className="settings-field">
                  <div className="settings-field-label">Theme Name</div>
                  <div className="settings-field-control">
                    <Input
                      type="text"
                      value={themeName}
                      onChange={(event) => setThemeName(event.target.value)}
                      placeholder="My Theme"
                    />
                  </div>
                </div>
                <div className="settings-theme-grid">
                  {THEME_TOKEN_CONTROLS.map((token) => {
                    const value = themeOverrides[token.key] ?? DEFAULT_THEME_V2.tokens[token.key] ?? '';
                    return (
                      <label key={token.key} className="settings-theme-field">
                        <span className="settings-theme-label">{token.label}</span>
                        {token.type === 'color' ? (
                          <input
                            type="color"
                            value={value}
                            onChange={(event) => handleThemeOverrideChange(token.key, event.target.value)}
                          />
                        ) : (
                          <Input
                            type="text"
                            value={value}
                            onChange={(event) => handleThemeOverrideChange(token.key, event.target.value)}
                          />
                        )}
                      </label>
                    );
                  })}
                </div>
                <div className="settings-theme-actions">
                  <Button type="button" onClick={() => applyThemeManifest(themeOverrides)}>
                    Apply
                  </Button>
                  <Button type="button" variant="ghost" onClick={handleExportTheme}>
                    Export
                  </Button>
                  <Button type="button" variant="ghost" onClick={handleImportTheme}>
                    Import
                  </Button>
                  <Button type="button" variant="ghost" onClick={handleResetTheme}>
                    Reset
                  </Button>
                </div>
                <textarea
                  className="settings-theme-json"
                  value={themeImportValue}
                  onChange={(event) => setThemeImportValue(event.target.value)}
                  placeholder='Paste a theme JSON payload here, then click "Import".'
                  rows={6}
                />
                {themeError && <div className="settings-error">{themeError}</div>}
              </div>
            </div>
          </section>
        )}

        {section === 'notifications' && (
          <section className="settings-section">
            <h2 className="settings-section-title">Notifications</h2>
            <div className="settings-card">
              <h3 className="settings-subsection-title">Sound Alerts</h3>
              <div className="settings-field">
                <div className="settings-field-label">Enable sounds</div>
                <div className="settings-field-control">
                  <label className="settings-toggle">
                    <input
                      type="checkbox"
                      checked={soundPrefs.enabled}
                      onChange={(event) => updateSoundPrefs((current) => ({ ...current, enabled: event.target.checked }))}
                    />
                    <span className="settings-toggle-indicator" />
                  </label>
                  <span className="settings-range-value">{soundPrefs.enabled ? 'On' : 'Off'}</span>
                </div>
              </div>
              <div className="settings-field">
                <div className="settings-field-label">Volume</div>
                <div className="settings-field-control settings-field-row">
                  <input
                    className="settings-range"
                    type="range"
                    min={0}
                    max={100}
                    step={1}
                    value={soundPrefs.volume}
                    onChange={(event) => updateSoundPrefs((current) => ({ ...current, volume: Number(event.target.value) }))}
                  />
                  <span className="settings-range-value">{soundPrefs.volume}%</span>
                </div>
              </div>
              {([
                ['message', 'Channel Messages', 'message'],
                ['dm', 'Direct Messages', 'dm'],
                ['mention', 'Mentions', 'mention'],
                ['ringtone', 'Incoming Call Ringtone', 'ringtone'],
                ['outgoing-ring', 'Outgoing Call Ring', 'outgoing-ring'],
                ['call-connect', 'Call Connect', 'call-connect'],
                ['call-end', 'Call End', 'call-end'],
              ] as Array<[SoundName, string, SoundName]>).map(([key, label, previewName]) => (
                <div className="settings-field" key={key}>
                  <div className="settings-field-label">{label}</div>
                  <div className="settings-field-control settings-field-row settings-field-row-wrap">
                    <label className="settings-toggle">
                      <input
                        type="checkbox"
                        checked={soundPrefs.sounds[key]}
                        onChange={(event) =>
                          updateSoundPrefs((current) => ({
                            ...current,
                            sounds: { ...current.sounds, [key]: event.target.checked },
                          }))
                        }
                      />
                      <span className="settings-toggle-indicator" />
                    </label>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={() => previewSound(previewName)}
                    >
                      Preview
                    </Button>
                  </div>
                </div>
              ))}
              <p className="settings-muted">
                Sound alerts apply in the web app. Per-device settings are stored locally in your browser.
              </p>
            </div>
            <div className="settings-card">
              <h3 className="settings-subsection-title">Voice Soundboard</h3>
              <div className="settings-field">
                <div className="settings-field-label">Hear soundboard clips</div>
                <div className="settings-field-control">
                  <label className="settings-toggle">
                    <input
                      type="checkbox"
                      checked={soundboardPrefs.enabled}
                      onChange={(event) => updateSoundboardPrefs((current) => ({ ...current, enabled: event.target.checked }))}
                    />
                    <span className="settings-toggle-indicator" />
                  </label>
                  <span className="settings-range-value">{soundboardPrefs.enabled ? 'On' : 'Off'}</span>
                </div>
              </div>
              <div className="settings-field">
                <div className="settings-field-label">Soundboard volume</div>
                <div className="settings-field-control settings-field-row">
                  <input
                    className="settings-range"
                    type="range"
                    min={0}
                    max={100}
                    step={1}
                    value={soundboardPrefs.volume}
                    onChange={(event) => updateSoundboardPrefs((current) => ({ ...current, volume: Number(event.target.value) }))}
                  />
                  <span className="settings-range-value">{soundboardPrefs.volume}%</span>
                </div>
              </div>
              <div className="settings-field">
                <div className="settings-field-label">Entrance sounds</div>
                <div className="settings-field-control">
                  <label className="settings-toggle">
                    <input
                      type="checkbox"
                      checked={soundboardPrefs.entranceEnabled}
                      onChange={(event) => updateSoundboardPrefs((current) => ({ ...current, entranceEnabled: event.target.checked }))}
                    />
                    <span className="settings-toggle-indicator" />
                  </label>
                  <span className="settings-range-value">{soundboardPrefs.entranceEnabled ? 'Enabled' : 'Disabled'}</span>
                </div>
              </div>
              <p className="settings-muted">
                Choose entrance sounds from the Soundboard panel while connected to a server voice channel.
              </p>
            </div>
            <div className="settings-card">
              <h3 className="settings-subsection-title">Do Not Disturb Schedule</h3>
              {dndError && <div className="settings-error">{dndError}</div>}
              <div className="settings-field">
                <div className="settings-field-label">Do Not Disturb</div>
                <div className="settings-field-control">
                  <label className="settings-toggle">
                    <input
                      type="checkbox"
                      checked={dndEnabled}
                      onChange={(event) => setDndEnabled(event.target.checked)}
                    />
                    <span className="settings-toggle-indicator" />
                  </label>
                </div>
              </div>
              <div className="settings-field">
                <div className="settings-field-label">Schedule</div>
                <div className="settings-field-control settings-field-row">
                  <Input
                    type="time"
                    value={dndStart}
                    onChange={(event) => setDndStart(event.target.value)}
                  />
                  <span className="settings-field-separator">to</span>
                  <Input
                    type="time"
                    value={dndEnd}
                    onChange={(event) => setDndEnd(event.target.value)}
                  />
                </div>
              </div>
              <div className="settings-field">
                <div className="settings-field-label">Timezone</div>
                <div className="settings-field-control">
                  <Input
                    type="text"
                    value={dndTimezone}
                    onChange={(event) => setDndTimezone(event.target.value)}
                    placeholder="UTC"
                  />
                </div>
              </div>
              <div className="settings-field">
                <div className="settings-field-label">Days</div>
                <div className="settings-field-control settings-days">
                  {DAYS.map((day) => (
                    <button
                      key={day.label}
                      className={`settings-day ${dndDays & (1 << day.bit) ? 'settings-day-active' : ''}`}
                      onClick={() => toggleDay(day.bit)}
                      type="button"
                    >
                      {day.label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="settings-footer">
                <Button onClick={handleSaveDnd} loading={savingDnd}>Save Schedule</Button>
              </div>
            </div>
          </section>
        )}

        {section === 'accessibility' && (
          <section className="settings-section">
            <h2 className="settings-section-title">Accessibility</h2>
            <div className="settings-card">
              <div className="settings-field">
                <div className="settings-field-label">Display Name Styles</div>
                <div className="settings-field-control">
                  <label className="settings-toggle">
                    <input
                      type="checkbox"
                      checked={stylePrefs.stylesEnabled}
                      onChange={(event) => toggleDisplayNameStyles(event.target.checked)}
                    />
                    <span className="settings-toggle-indicator" />
                  </label>
                  <span className="settings-range-value">{stylePrefs.stylesEnabled ? 'Enabled' : 'Disabled'}</span>
                </div>
              </div>
            </div>
          </section>
        )}

        {section === 'logout' && (
          <section className="settings-section">
            <h2 className="settings-section-title">Log Out</h2>
            <div className="settings-card">
              <p className="settings-muted">You will be signed out of this device.</p>
              <Button variant="danger" onClick={handleLogout}>Log Out</Button>
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
