import { lazy, Suspense, useEffect } from 'react';
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/stores/auth.store';
import { api, getAccessToken, setAccessToken } from '@/lib/api';
import { mark, measure } from '@/lib/perf';
import { useGuildsStore } from '@/stores/guilds.store';
import { useChannelsStore } from '@/stores/channels.store';
import { useMessagesStore } from '@/stores/messages.store';
import { onDeepLink, onNavigate } from '@/lib/desktop';
import { useUnreadBadge } from '@/hooks/useUnreadBadge';

import { RequireAuth } from '@/components/guards/RequireAuth';
import { RequireGuest } from '@/components/guards/RequireGuest';

// Loading
import { LoadingScreen } from '@/components/ui/LoadingScreen';

const AuthLayout = lazy(() => import('@/layouts/AuthLayout').then((m) => ({ default: m.AuthLayout })));
const AppLayout = lazy(() => import('@/layouts/AppLayout').then((m) => ({ default: m.AppLayout })));
const LoginPage = lazy(() => import('@/pages/auth/LoginPage').then((m) => ({ default: m.LoginPage })));
const RegisterPage = lazy(() => import('@/pages/auth/RegisterPage').then((m) => ({ default: m.RegisterPage })));
const HomePage = lazy(() => import('@/pages/HomePage').then((m) => ({ default: m.HomePage })));
const GuildPage = lazy(() => import('@/pages/GuildPage').then((m) => ({ default: m.GuildPage })));
const ChannelPage = lazy(() => import('@/pages/ChannelPage').then((m) => ({ default: m.ChannelPage })));
const InvitePage = lazy(() => import('@/pages/InvitePage').then((m) => ({ default: m.InvitePage })));
const SettingsPage = lazy(() => import('@/pages/SettingsPage').then((m) => ({ default: m.SettingsPage })));
const LandingPage = lazy(() => import('@/pages/LandingPage').then((m) => ({ default: m.LandingPage })));
const BlogPage = lazy(() => import('@/pages/BlogPage').then((m) => ({ default: m.BlogPage })));
const BugInboxPage = lazy(() => import('@/pages/BugInboxPage').then((m) => ({ default: m.BugInboxPage })));

export function App() {
  const { isLoading, isAuthenticated, login, logout, setLoading } = useAuthStore();
  const navigate = useNavigate();
  useUnreadBadge();

  // Silent token refresh on app mount
  useEffect(() => {
    let cancelled = false;

    async function tryRefresh() {
      try {
        const existingToken = getAccessToken();
        if (existingToken) {
          const me = await api.users.getMe();
          if (cancelled) return;
          login({
            id: me.id,
            username: me.username,
            email: me.email,
            displayName: me.profile.displayName,
            avatarHash: me.profile.avatarHash,
            avatarDecorationId: me.profile.avatarDecorationId ?? null,
            profileEffectId: me.profile.profileEffectId ?? null,
            nameplateId: me.profile.nameplateId ?? null,
            tier: me.profile.tier,
          });
          return;
        }

        const token = await api.auth.refresh();
        if (cancelled) return;

        if (token) {
          setAccessToken(token);
          const me = await api.users.getMe();
          if (cancelled) return;
          login({
            id: me.id,
            username: me.username,
            email: me.email,
            displayName: me.profile.displayName,
            avatarHash: me.profile.avatarHash,
            avatarDecorationId: me.profile.avatarDecorationId ?? null,
            profileEffectId: me.profile.profileEffectId ?? null,
            nameplateId: me.profile.nameplateId ?? null,
            tier: me.profile.tier,
          });
          return;
        }

        setLoading(false);
      } catch {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    tryRefresh();
    return () => {
      cancelled = true;
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Listen for desktop notification click-to-navigate events
  useEffect(() => {
    return onNavigate((route: string) => {
      navigate(route);
    });
  }, [navigate]);

  useEffect(() => {
    return onDeepLink((url) => {
      if (!url.startsWith('gratonite://')) return;
      const path = url.replace('gratonite://', '').replace(/^\//, '');
      const [route, ...rest] = path.split('/');
      if (route === 'invite' && rest[0]) {
        navigate(`/invite/${rest[0]}`);
      } else if (route === 'dm' && rest[0]) {
        navigate(`/dm/${rest[0]}`);
      } else if (route === 'guild' && rest[0] && rest[1] === 'channel' && rest[2]) {
        navigate(`/guild/${rest[0]}/channel/${rest[2]}`);
      }
    });
  }, [navigate]);

  useEffect(() => {
    if (isLoading) return;
    mark('app_ready');
    measure('app_ready', 'app_start', 'app_ready');
  }, [isLoading]);

  if (isLoading) {
    return <LoadingScreen />;
  }

  return (
    <Suspense fallback={<LoadingScreen />}>
      <Routes>
        <Route path="/" element={isAuthenticated ? <Navigate to="/app" replace /> : <LandingPage />} />
        <Route path="/blog" element={<BlogPage />} />

        {/* Auth routes (guest only) */}
        <Route
          element={
            <RequireGuest>
              <AuthLayout />
            </RequireGuest>
          }
        >
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
        </Route>

        {/* Invite page (works for both guest and auth) */}
        <Route path="/invite/:code" element={<InvitePage />} />

        {/* Authenticated routes */}
        <Route
          element={
            <RequireAuth>
              <AppLayout />
            </RequireAuth>
          }
        >
          <Route path="/app" element={<HomePage />} />
          <Route path="/guild/:guildId" element={<GuildPage />}>
            <Route path="channel/:channelId" element={<ChannelPage />} />
          </Route>
          <Route path="/dm/:channelId" element={<ChannelPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="/ops/bugs" element={<BugInboxPage />} />
        </Route>
      </Routes>
    </Suspense>
  );
}
