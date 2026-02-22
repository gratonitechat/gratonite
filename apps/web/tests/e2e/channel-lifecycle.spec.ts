import { expect, test } from '@playwright/test';
import { authenticateWithToken, createGuildWithChannels, registerUser } from './helpers';

const VIEW_CHANNEL_BIT = (1n << 10n).toString();

test('private channel visibility is enforced for invited members', async ({ request }) => {
  const owner = await registerUser(request, 'owner');
  const guest = await registerUser(request, 'guest');
  const scope = await createGuildWithChannels(request, owner.token, {
    textChannels: ['private-room', 'public-room'],
  });

  const privateChannel = scope.textChannels.find((channel) => channel.name === 'private-room');
  const publicChannel = scope.textChannels.find((channel) => channel.name === 'public-room');
  expect(privateChannel).toBeTruthy();
  expect(publicChannel).toBeTruthy();
  expect(scope.generalChannelId).toBeTruthy();

  const rolesRes = await request.get(`http://127.0.0.1:4000/api/v1/guilds/${scope.guildId}/roles`, {
    headers: { Authorization: `Bearer ${owner.token}` },
  });
  expect(rolesRes.ok()).toBeTruthy();
  const roles = (await rolesRes.json()) as Array<{ id: string; name: string }>;
  const everyoneRole = roles.find((role) => role.name === '@everyone');
  expect(everyoneRole).toBeTruthy();

  const lockRes = await request.put(
    `http://127.0.0.1:4000/api/v1/channels/${privateChannel!.id}/permissions/${everyoneRole!.id}`,
    {
      headers: { Authorization: `Bearer ${owner.token}` },
      data: {
        type: 'role',
        allow: '0',
        deny: VIEW_CHANNEL_BIT,
      },
    },
  );
  expect(lockRes.ok()).toBeTruthy();

  const inviteRes = await request.post(`http://127.0.0.1:4000/api/v1/invites/guilds/${scope.guildId}/invites`, {
    headers: { Authorization: `Bearer ${owner.token}` },
    data: { channelId: scope.generalChannelId },
  });
  expect(inviteRes.ok()).toBeTruthy();
  const invite = (await inviteRes.json()) as { code: string };

  const acceptRes = await request.post(`http://127.0.0.1:4000/api/v1/invites/${invite.code}`, {
    headers: { Authorization: `Bearer ${guest.token}` },
  });
  expect(acceptRes.ok()).toBeTruthy();

  const channelsRes = await request.get(`http://127.0.0.1:4000/api/v1/guilds/${scope.guildId}/channels`, {
    headers: { Authorization: `Bearer ${guest.token}` },
  });
  expect(channelsRes.ok()).toBeTruthy();
  const visibleChannels = (await channelsRes.json()) as Array<{ id: string; name: string | null }>;
  const visibleIds = new Set(visibleChannels.map((channel) => channel.id));

  expect(visibleIds.has(publicChannel!.id)).toBeTruthy();
  expect(visibleIds.has(privateChannel!.id)).toBeFalsy();
});

test('deleting a channel via sidebar context menu confirms and routes to a safe fallback', async ({ page, request }) => {
  const owner = await registerUser(request, 'chdel');
  const scope = await createGuildWithChannels(request, owner.token, {
    textChannels: ['alpha-room', 'beta-room'],
  });
  const alphaChannel = scope.textChannels.find((channel) => channel.name === 'alpha-room');
  expect(alphaChannel).toBeTruthy();

  await authenticateWithToken(page, owner.token);
  await page.goto(`/guild/${scope.guildId}/channel/${alphaChannel!.id}`);

  const alphaItem = page.locator('.channel-item', { hasText: 'alpha-room' }).first();
  await expect(alphaItem).toBeVisible();
  await alphaItem.click({ button: 'right' });

  await page.getByRole('menuitem', { name: 'Delete Channel' }).click();

  const modal = page.locator('.modal-content');
  await expect(modal).toBeVisible();
  await modal.getByLabel('Type the channel name to confirm').fill('alpha-room');
  await modal.getByRole('button', { name: 'Delete Channel' }).click();

  await expect(page).toHaveURL(new RegExp(`/guild/${scope.guildId}/channel/`));
  await expect(page).not.toHaveURL(new RegExp(alphaChannel!.id));
  await expect(page.locator('.channel-item', { hasText: 'alpha-room' })).toHaveCount(0);
});

test('voice channels present silent-room entry UX cues', async ({ page, request }) => {
  const owner = await registerUser(request, 'voiceui');
  const scope = await createGuildWithChannels(request, owner.token, {
    voiceChannels: ['focus-room'],
  });
  const voiceChannel = scope.voiceChannels.find((channel) => channel.name === 'focus-room');
  expect(voiceChannel).toBeTruthy();

  await authenticateWithToken(page, owner.token);
  await page.goto(`/guild/${scope.guildId}/channel/${voiceChannel!.id}`);

  const joinButton = page.getByRole('button', { name: 'Join Room Silently' });
  const leaveButton = page.getByRole('button', { name: 'Leave Call' });
  await expect(joinButton.or(leaveButton)).toBeVisible();
  await expect(page.locator('.voice-channel-subtle-status')).toContainText(/Connected silently|Joining room|Not connected/);
  await expect(page.locator('.dm-call-incoming')).toHaveCount(0);
});

test('server gallery media controls persist fit and animation preferences', async ({ page, request }) => {
  const owner = await registerUser(request, 'gallery');
  await createGuildWithChannels(request, owner.token, {
    textChannels: ['lobby'],
  });

  await page.addInitScript(() => {
    localStorage.setItem('ui_v2_tokens', '1');
    localStorage.setItem('gratonite_server_gallery_media_fit_v1', 'contain');
    localStorage.setItem('gratonite_server_gallery_animated_v1', 'off');
  });
  await authenticateWithToken(page, owner.token);
  await page.goto('/');

  const gallery = page.locator('.server-gallery');
  await expect(gallery).toBeVisible();
  await expect(gallery).toHaveAttribute('data-media-fit', 'contain');
  await expect(gallery).toHaveAttribute('data-animated-banners', 'off');

  await page.getByRole('button', { name: 'Fill cards' }).click();
  await expect(gallery).toHaveAttribute('data-media-fit', 'cover');

  await page.getByRole('button', { name: 'Animated banners off' }).click();
  await expect(gallery).toHaveAttribute('data-animated-banners', 'on');
});

test('portal gallery search and favorites persist across refresh', async ({ page, request }) => {
  const owner = await registerUser(request, 'galleryfav');
  const alphaRes = await request.post('http://127.0.0.1:4000/api/v1/guilds', {
    headers: { Authorization: `Bearer ${owner.token}` },
    data: { name: 'Alpha Portal QA' },
  });
  expect(alphaRes.ok()).toBeTruthy();
  const alpha = (await alphaRes.json()) as { id: string };

  const betaRes = await request.post('http://127.0.0.1:4000/api/v1/guilds', {
    headers: { Authorization: `Bearer ${owner.token}` },
    data: { name: 'Beta Portal QA' },
  });
  expect(betaRes.ok()).toBeTruthy();
  const beta = (await betaRes.json()) as { id: string };

  await page.addInitScript(() => {
    localStorage.setItem('ui_v2_tokens', '1');
  });
  await authenticateWithToken(page, owner.token);
  await page.goto('/');

  const cards = page.locator('.server-gallery-card');
  await expect(cards).toHaveCount(2);

  await page.locator(`.server-gallery-card[href=\"/guild/${alpha.id}\"] .server-gallery-favorite`).click();
  await expect(page.locator(`.server-gallery-card[href=\"/guild/${alpha.id}\"] .server-gallery-favorite`)).toHaveAttribute('aria-pressed', 'true');

  await page.getByLabel('Find a portal').fill('Beta Portal QA');
  await expect(page.locator(`.server-gallery-card[href=\"/guild/${beta.id}\"]`)).toBeVisible();
  await expect(page.locator(`.server-gallery-card[href=\"/guild/${alpha.id}\"]`)).toHaveCount(0);

  await page.reload();
  await expect(page.locator(`.server-gallery-card[href=\"/guild/${alpha.id}\"] .server-gallery-favorite`)).toHaveAttribute('aria-pressed', 'true');
});

test('voice control harness exposes camera and screenshare state contracts', async ({ page, request }) => {
  const owner = await registerUser(request, 'voiceharness');
  const scope = await createGuildWithChannels(request, owner.token, {
    voiceChannels: ['contract-room'],
  });
  const voiceChannel = scope.voiceChannels.find((channel) => channel.name === 'contract-room');
  expect(voiceChannel).toBeTruthy();

  await authenticateWithToken(page, owner.token);
  await page.goto(`/guild/${scope.guildId}/channel/${voiceChannel!.id}`);
  await expect(page.locator('.voice-channel-view')).toBeVisible();

  const harnessAvailable = await page.evaluate(() => Boolean(window.__gratoniteHarness));
  expect(harnessAvailable).toBeTruthy();

  await page.evaluate((channelId) => {
    const roomMock = {
      on: () => undefined,
      off: () => undefined,
    };
    window.__gratoniteHarness?.setCallState({
      status: 'connected',
      mode: 'guild',
      channelId,
      room: roomMock,
      muted: false,
      videoEnabled: false,
      screenShareEnabled: false,
      localVideoTrack: null,
      localScreenTrack: null,
      error: null,
    });
  }, voiceChannel!.id);
  await expect(page.locator('.voice-control-dock')).toBeVisible();

  const cameraButton = page.getByRole('button', { name: 'Camera' });
  await expect(cameraButton).toHaveAttribute('aria-pressed', 'false');

  await page.evaluate(() => {
    window.__gratoniteHarness?.setCallState({
      videoEnabled: true,
    });
  });
  await expect(page.getByRole('button', { name: 'Stop Video' })).toHaveAttribute('aria-pressed', 'true');

  await page.evaluate(() => {
    window.__gratoniteHarness?.setCallState({
      screenShareEnabled: true,
      localScreenTrack: null,
    });
  });
  await expect(page.locator('.voice-video-tile-pending')).toBeVisible();
  await expect(page.locator('.voice-video-tile-pending .voice-video-label')).toContainText('Screen share is starting');
});
