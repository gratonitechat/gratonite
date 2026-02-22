import { expect, test } from '@playwright/test';
import { authenticateWithToken, createGuildAndTextChannel, createGuildWithChannels, openDmChannel, registerUser } from './helpers';

const API_BASE = `${(process.env['PW_API_ORIGIN'] ?? 'http://127.0.0.1:4000').replace(/\/+$/, '')}/api/v1`;

test('sends a message in guild channel and persists after refresh', async ({ page, request }) => {
  const user = await registerUser(request, 'msguser');
  const scope = await createGuildAndTextChannel(request, user.token);

  await authenticateWithToken(page, user.token);
  await page.goto(`/guild/${scope.guildId}/channel/${scope.channelId}`);

  const composer = page.locator('.message-composer-input');
  await expect(composer).toBeVisible();

  const text = `web-e2e message ${Date.now()}`;
  await composer.fill(text);
  await composer.press('Enter');

  const sentMessage = page.locator('.message-content', { hasText: text }).last();
  await expect(sentMessage).toBeVisible();

  await page.reload();
  await expect(page.locator('.message-content', { hasText: text }).last()).toBeVisible();
});

test('sends a message in guild channel via send button', async ({ page, request }) => {
  const user = await registerUser(request, 'msgbtn');
  const scope = await createGuildAndTextChannel(request, user.token);

  await authenticateWithToken(page, user.token);
  await page.goto(`/guild/${scope.guildId}/channel/${scope.channelId}`);

  const composer = page.locator('.message-composer-input');
  await expect(composer).toBeVisible();

  const text = `web-e2e button send ${Date.now()}`;
  await composer.fill(text);
  await page.getByRole('button', { name: 'Send message' }).click();

  await expect(page.locator('.message-content', { hasText: text }).last()).toBeVisible();
});

test('edits and deletes an existing message via context actions', async ({ page, request }) => {
  const user = await registerUser(request, 'edituser');
  const scope = await createGuildAndTextChannel(request, user.token);

  await authenticateWithToken(page, user.token);
  await page.goto(`/guild/${scope.guildId}/channel/${scope.channelId}`);

  const composer = page.locator('.message-composer-input');
  await expect(composer).toBeVisible();

  const original = `web-e2e original ${Date.now()}`;
  await composer.fill(original);
  await composer.press('Enter');

  const originalMessage = page.locator('.message-content', { hasText: original }).last();
  await expect(originalMessage).toBeVisible();

  const originalMessageItem = originalMessage.locator('xpath=ancestor::div[contains(@class,"message-item")]').first();
  await originalMessageItem.hover();
  await originalMessageItem.locator('.message-action-btn[title="Edit"]').click();

  const editInput = page.locator('.message-edit-input').last();
  const edited = `${original} edited`;
  await editInput.fill(edited);
  await editInput.press('Enter');

  const editedMessage = page.locator('.message-content', { hasText: edited }).last();
  await expect(editedMessage).toBeVisible();

  const editedMessageItem = editedMessage.locator('xpath=ancestor::div[contains(@class,"message-item")]').first();
  await editedMessageItem.hover();
  await editedMessageItem.locator('.message-action-btn[title="Delete"]').click();

  const modal = page.locator('.modal-content');
  await expect(modal).toBeVisible();
  await modal.getByRole('button', { name: 'Delete' }).click();

  await expect(page.locator('.message-content', { hasText: edited })).toHaveCount(0);
});

test('uploads an attachment and sends it in a message', async ({ page, request }) => {
  const user = await registerUser(request, 'attachuser');
  const scope = await createGuildAndTextChannel(request, user.token);

  await authenticateWithToken(page, user.token);
  await page.goto(`/guild/${scope.guildId}/channel/${scope.channelId}`);

  const uploader = page.locator('input[type="file"]');
  await expect(uploader).toBeAttached();

  const filename = `e2e-attachment-${Date.now()}.txt`;
  await uploader.setInputFiles({
    name: filename,
    mimeType: 'text/plain',
    buffer: Buffer.from('attachment smoke test'),
  });

  await expect(page.locator('.attachment-preview-item-compact')).toHaveCount(1);
  await page.locator('.message-composer-input').press('Enter');

  await expect(page.locator('.attachment-file-name', { hasText: filename }).last()).toBeVisible();
});

test('uploads attachment with non-loopback URL shape', async ({ page, request }) => {
  const user = await registerUser(request, 'imguser');
  const scope = await createGuildAndTextChannel(request, user.token);

  await authenticateWithToken(page, user.token);
  await page.goto(`/guild/${scope.guildId}/channel/${scope.channelId}`);

  const uploader = page.locator('input[type="file"]');
  await expect(uploader).toBeAttached();

  const filename = `e2e-attachment-${Date.now()}.txt`;
  await uploader.setInputFiles({
    name: filename,
    mimeType: 'text/plain',
    buffer: Buffer.from('attachment url safety smoke test'),
  });

  await expect(page.locator('.attachment-preview-item-compact')).toHaveCount(1);
  await page.locator('.message-composer-input').press('Enter');

  await expect(page.locator('.attachment-file-name', { hasText: filename }).last()).toBeVisible();
  const attachmentLink = page.locator('.attachment-file').last();
  await expect(attachmentLink).toBeVisible();
  const href = await attachmentLink.getAttribute('href');
  expect(href).not.toContain('localhost');
  expect(href).not.toContain('127.0.0.1');
  expect(href).toContain('/api/v1/files/');
});

test('keeps attachment URL shape safe on mobile viewport in DM', async ({ page, request }) => {
  const sender = await registerUser(request, 'mobattachsender');
  const recipient = await registerUser(request, 'mobattachrecv');
  const dmId = await openDmChannel(request, sender.token, recipient.userId);

  await page.setViewportSize({ width: 390, height: 844 });
  await authenticateWithToken(page, sender.token);
  await page.goto(`/dm/${dmId}`);

  const uploader = page.locator('input[type="file"]');
  await expect(uploader).toBeAttached();

  const filename = `mobile-attachment-${Date.now()}.txt`;
  await uploader.setInputFiles({
    name: filename,
    mimeType: 'text/plain',
    buffer: Buffer.from('mobile attachment url safety smoke'),
  });

  await page.getByRole('button', { name: 'Send message' }).click();
  await expect(page.locator('.attachment-file-name', { hasText: filename }).last()).toBeVisible();
  const attachmentLink = page.locator('.attachment-file').last();
  await expect(attachmentLink).toBeVisible();
  const href = await attachmentLink.getAttribute('href');
  expect(href).not.toContain('localhost');
  expect(href).not.toContain('127.0.0.1');
  expect(href).toContain('/api/v1/files/');
});

test('sends a message in DM and persists after refresh', async ({ page, request }) => {
  const sender = await registerUser(request, 'dmsender');
  const recipient = await registerUser(request, 'dmrecv');
  const dmId = await openDmChannel(request, sender.token, recipient.userId);

  await authenticateWithToken(page, sender.token);
  await page.goto(`/dm/${dmId}`);

  const composer = page.locator('.message-composer-input');
  await expect(composer).toBeVisible();

  const text = `dm-e2e message ${Date.now()}`;
  await composer.fill(text);
  await composer.press('Enter');

  const sentMessage = page.locator('.message-content', { hasText: text }).last();
  await expect(sentMessage).toBeVisible();

  await page.reload();
  await expect(page.locator('.message-content', { hasText: text }).last()).toBeVisible();
});

test('delivers DM messages in realtime across two active clients', async ({ browser, request }) => {
  const sender = await registerUser(request, 'dmrtsender');
  const recipient = await registerUser(request, 'dmrtrecv');
  const dmId = await openDmChannel(request, sender.token, recipient.userId);

  const senderContext = await browser.newContext();
  const recipientContext = await browser.newContext();
  const senderPage = await senderContext.newPage();
  const recipientPage = await recipientContext.newPage();

  await authenticateWithToken(senderPage, sender.token);
  await authenticateWithToken(recipientPage, recipient.token);

  await Promise.all([
    senderPage.goto(`/dm/${dmId}`),
    recipientPage.goto(`/dm/${dmId}`),
  ]);

  const text = `dm-realtime ${Date.now()}`;
  await senderPage.locator('.message-composer-input').fill(text);
  await senderPage.getByRole('button', { name: 'Send message' }).click();

  await expect(recipientPage.locator('.message-content', { hasText: text }).last()).toBeVisible();

  await senderContext.close();
  await recipientContext.close();
});

test('delivers DM attachment messages in realtime across two active clients', async ({ browser, request }) => {
  const sender = await registerUser(request, 'dmattsender');
  const recipient = await registerUser(request, 'dmattrecv');
  const dmId = await openDmChannel(request, sender.token, recipient.userId);

  const senderContext = await browser.newContext();
  const recipientContext = await browser.newContext();
  const senderPage = await senderContext.newPage();
  const recipientPage = await recipientContext.newPage();

  await authenticateWithToken(senderPage, sender.token);
  await authenticateWithToken(recipientPage, recipient.token);

  await Promise.all([
    senderPage.goto(`/dm/${dmId}`),
    recipientPage.goto(`/dm/${dmId}`),
  ]);

  const uploader = senderPage.locator('input[type="file"]');
  await expect(uploader).toBeAttached();

  const filename = `dm-realtime-attachment-${Date.now()}.txt`;
  await uploader.setInputFiles({
    name: filename,
    mimeType: 'text/plain',
    buffer: Buffer.from('dm realtime attachment test'),
  });
  await senderPage.getByRole('button', { name: 'Send message' }).click();

  await expect(recipientPage.locator('.attachment-file-name', { hasText: filename }).last()).toBeVisible();

  await senderContext.close();
  await recipientContext.close();
});

test('delivers guild attachment messages in realtime across two active clients', async ({ browser, request }) => {
  const owner = await registerUser(request, 'guildattsender');
  const member = await registerUser(request, 'guildattmember');
  const scope = await createGuildWithChannels(request, owner.token, {
    textChannels: ['attachment-room'],
  });
  const targetChannel = scope.textChannels.find((channel) => channel.name === 'attachment-room');
  expect(scope.generalChannelId).toBeTruthy();
  expect(targetChannel).toBeTruthy();

  const inviteRes = await request.post(`${API_BASE}/invites/guilds/${scope.guildId}/invites`, {
    headers: { Authorization: `Bearer ${owner.token}` },
    data: { channelId: scope.generalChannelId },
  });
  expect(inviteRes.ok()).toBeTruthy();
  const invite = (await inviteRes.json()) as { code: string };

  const acceptRes = await request.post(`${API_BASE}/invites/${invite.code}`, {
    headers: { Authorization: `Bearer ${member.token}` },
  });
  expect(acceptRes.ok()).toBeTruthy();

  const ownerContext = await browser.newContext();
  const memberContext = await browser.newContext();
  const ownerPage = await ownerContext.newPage();
  const memberPage = await memberContext.newPage();

  await authenticateWithToken(ownerPage, owner.token);
  await authenticateWithToken(memberPage, member.token);

  await Promise.all([
    ownerPage.goto(`/guild/${scope.guildId}/channel/${targetChannel!.id}`),
    memberPage.goto(`/guild/${scope.guildId}/channel/${targetChannel!.id}`),
  ]);

  const uploader = ownerPage.locator('input[type="file"]');
  await expect(uploader).toBeAttached();

  const filename = `guild-realtime-attachment-${Date.now()}.txt`;
  await uploader.setInputFiles({
    name: filename,
    mimeType: 'text/plain',
    buffer: Buffer.from('guild realtime attachment test'),
  });
  await ownerPage.getByRole('button', { name: 'Send message' }).click();

  await expect(memberPage.locator('.attachment-file-name', { hasText: filename }).last()).toBeVisible();

  await ownerContext.close();
  await memberContext.close();
});

test('shows DM typing indicator using display name across active clients', async ({ browser, request }) => {
  const sender = await registerUser(request, 'dmtypesender');
  const recipient = await registerUser(request, 'dmtyperecv');
  const dmId = await openDmChannel(request, sender.token, recipient.userId);

  const senderContext = await browser.newContext();
  const recipientContext = await browser.newContext();
  const senderPage = await senderContext.newPage();
  const recipientPage = await recipientContext.newPage();

  await authenticateWithToken(senderPage, sender.token);
  await authenticateWithToken(recipientPage, recipient.token);

  await Promise.all([
    senderPage.goto(`/dm/${dmId}`),
    recipientPage.goto(`/dm/${dmId}`),
  ]);

  const senderComposer = senderPage.locator('.message-composer-input');
  await expect(senderComposer).toBeVisible();
  await senderComposer.fill(`typing-${Date.now()}`);

  const typingText = recipientPage.locator('.typing-text');
  await expect(typingText).toContainText('is typing');
  await expect(typingText).not.toContainText(sender.userId);

  await senderContext.close();
  await recipientContext.close();
});

test('submits DM message when composer receives iOS-style newline input', async ({ page, request }) => {
  const sender = await registerUser(request, 'dmiossend');
  const recipient = await registerUser(request, 'dmiosrecv');
  const dmId = await openDmChannel(request, sender.token, recipient.userId);

  await authenticateWithToken(page, sender.token);
  await page.goto(`/dm/${dmId}`);

  const composer = page.locator('.message-composer-input');
  await expect(composer).toBeVisible();

  const text = `dm-ios-newline ${Date.now()}`;
  await composer.fill(`${text}\n`);

  await expect(page.locator('.message-content', { hasText: text }).last()).toBeVisible();
});

test('submits guild message when composer receives iOS-style newline input', async ({ page, request }) => {
  const user = await registerUser(request, 'guildiossend');
  const scope = await createGuildAndTextChannel(request, user.token);

  await authenticateWithToken(page, user.token);
  await page.goto(`/guild/${scope.guildId}/channel/${scope.channelId}`);

  const composer = page.locator('.message-composer-input');
  await expect(composer).toBeVisible();

  const text = `guild-ios-newline ${Date.now()}`;
  await composer.fill(`${text}\n`);

  await expect(page.locator('.message-content', { hasText: text }).last()).toBeVisible();
});

test('allows attachments-only send via send button', async ({ page, request }) => {
  const user = await registerUser(request, 'attachonly');
  const scope = await createGuildAndTextChannel(request, user.token);

  await authenticateWithToken(page, user.token);
  await page.goto(`/guild/${scope.guildId}/channel/${scope.channelId}`);

  const sendButton = page.getByRole('button', { name: 'Send message' });
  await expect(sendButton).toBeDisabled();

  const uploader = page.locator('input[type="file"]');
  await expect(uploader).toBeAttached();

  const filename = `attachment-only-${Date.now()}.txt`;
  await uploader.setInputFiles({
    name: filename,
    mimeType: 'text/plain',
    buffer: Buffer.from('attachment only send'),
  });

  await expect(sendButton).toBeEnabled();
  await sendButton.click();
  await expect(page.locator('.attachment-file-name', { hasText: filename }).last()).toBeVisible();
});

test('shows send failure state when message create request fails', async ({ page, request }) => {
  const user = await registerUser(request, 'msgfail');
  const scope = await createGuildAndTextChannel(request, user.token);

  await authenticateWithToken(page, user.token);
  await page.goto(`/guild/${scope.guildId}/channel/${scope.channelId}`);

  await page.route('**/api/v1/channels/*/messages', async (route) => {
    await route.fulfill({
      status: 500,
      contentType: 'application/json',
      body: JSON.stringify({ code: 'INTERNAL_ERROR', message: 'forced failure' }),
    });
  });

  const composer = page.locator('.message-composer-input');
  const text = `forced-send-fail ${Date.now()}`;
  await composer.fill(text);
  await page.getByRole('button', { name: 'Send message' }).click();

  await expect(page.locator('.home-error')).toBeVisible();
  await page.unroute('**/api/v1/channels/*/messages');
});

test('allows retry after attachment upload failure', async ({ page, request }) => {
  const user = await registerUser(request, 'attretry');
  const scope = await createGuildAndTextChannel(request, user.token);

  await authenticateWithToken(page, user.token);
  await page.goto(`/guild/${scope.guildId}/channel/${scope.channelId}`);

  let failUploadOnce = true;
  await page.route('**/api/v1/files/upload', async (route) => {
    if (failUploadOnce) {
      failUploadOnce = false;
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ code: 'INTERNAL_ERROR', message: 'forced upload failure' }),
      });
      return;
    }
    await route.continue();
  });

  const uploader = page.locator('input[type="file"]');
  const text = `attachment-retry ${Date.now()}`;
  const filename = `attachment-retry-${Date.now()}.txt`;

  await uploader.setInputFiles({
    name: filename,
    mimeType: 'text/plain',
    buffer: Buffer.from('retry failure then success'),
  });
  await page.locator('.message-composer-input').fill(text);
  await page.getByRole('button', { name: 'Send message' }).click();
  await expect(page.locator('.home-error')).toBeVisible();

  await uploader.setInputFiles({
    name: filename,
    mimeType: 'text/plain',
    buffer: Buffer.from('retry success'),
  });
  await page.locator('.message-composer-input').fill(`${text}-retry`);
  await page.getByRole('button', { name: 'Send message' }).click();

  await expect(page.locator('.attachment-file-name', { hasText: filename }).last()).toBeVisible();
  await page.unroute('**/api/v1/files/upload');
});

test('marks unread on off-channel message and clears after opening target channel', async ({ page, request }) => {
  const owner = await registerUser(request, 'unreadowner');
  const member = await registerUser(request, 'unreadmember');
  const scope = await createGuildWithChannels(request, owner.token, {
    textChannels: ['alpha-room', 'beta-room'],
  });
  const alpha = scope.textChannels.find((channel) => channel.name === 'alpha-room');
  const beta = scope.textChannels.find((channel) => channel.name === 'beta-room');
  expect(scope.generalChannelId).toBeTruthy();
  expect(alpha).toBeTruthy();
  expect(beta).toBeTruthy();

  const inviteRes = await request.post(`${API_BASE}/invites/guilds/${scope.guildId}/invites`, {
    headers: { Authorization: `Bearer ${owner.token}` },
    data: { channelId: scope.generalChannelId },
  });
  expect(inviteRes.ok()).toBeTruthy();
  const invite = (await inviteRes.json()) as { code: string };

  const acceptRes = await request.post(`${API_BASE}/invites/${invite.code}`, {
    headers: { Authorization: `Bearer ${member.token}` },
  });
  expect(acceptRes.ok()).toBeTruthy();

  await authenticateWithToken(page, member.token);
  await page.goto(`/guild/${scope.guildId}/channel/${alpha!.id}`);

  const sendRes = await request.post(`${API_BASE}/channels/${beta!.id}/messages`, {
    headers: { Authorization: `Bearer ${owner.token}` },
    data: {
      content: `off-channel-unread ${Date.now()}`,
      nonce: `nonce-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    },
  });
  expect(sendRes.ok()).toBeTruthy();

  const betaItem = page.locator('.channel-item', { hasText: 'beta-room' }).first();
  await expect(betaItem.locator('.channel-unread-dot')).toBeVisible();

  await betaItem.click();
  await expect(page).toHaveURL(new RegExp(beta!.id));
  await expect(betaItem.locator('.channel-unread-dot')).toHaveCount(0);
});

test('retains all messages under rapid concurrent sends from two members', async ({ browser, request }) => {
  const owner = await registerUser(request, 'concurrentowner');
  const member = await registerUser(request, 'concurrentmember');
  const scope = await createGuildAndTextChannel(request, owner.token);

  const inviteRes = await request.post(`${API_BASE}/invites/guilds/${scope.guildId}/invites`, {
    headers: { Authorization: `Bearer ${owner.token}` },
    data: { channelId: scope.channelId },
  });
  expect(inviteRes.ok()).toBeTruthy();
  const invite = (await inviteRes.json()) as { code: string };

  const acceptRes = await request.post(`${API_BASE}/invites/${invite.code}`, {
    headers: { Authorization: `Bearer ${member.token}` },
  });
  expect(acceptRes.ok()).toBeTruthy();

  const ownerContext = await browser.newContext();
  const memberContext = await browser.newContext();
  const ownerPage = await ownerContext.newPage();
  const memberPage = await memberContext.newPage();

  await authenticateWithToken(ownerPage, owner.token);
  await authenticateWithToken(memberPage, member.token);

  await Promise.all([
    ownerPage.goto(`/guild/${scope.guildId}/channel/${scope.channelId}`),
    memberPage.goto(`/guild/${scope.guildId}/channel/${scope.channelId}`),
  ]);

  const ownerText = `owner-concurrent-${Date.now()}`;
  const memberText = `member-concurrent-${Date.now()}`;

  await Promise.all([
    (async () => {
      await ownerPage.locator('.message-composer-input').fill(ownerText);
      await ownerPage.getByRole('button', { name: 'Send message' }).click();
    })(),
    (async () => {
      await memberPage.locator('.message-composer-input').fill(memberText);
      await memberPage.getByRole('button', { name: 'Send message' }).click();
    })(),
  ]);

  await expect(ownerPage.locator('.message-content', { hasText: ownerText }).last()).toBeVisible();
  await expect(ownerPage.locator('.message-content', { hasText: memberText }).last()).toBeVisible();
  await expect(memberPage.locator('.message-content', { hasText: ownerText }).last()).toBeVisible();
  await expect(memberPage.locator('.message-content', { hasText: memberText }).last()).toBeVisible();

  await ownerContext.close();
  await memberContext.close();
});

test('reorders DM list in realtime when another DM receives a new message', async ({ page, request }) => {
  const owner = await registerUser(request, 'dmorderowner');
  const alpha = await registerUser(request, 'dmorderalpha');
  const bravo = await registerUser(request, 'dmorderbravo');

  const alphaDmId = await openDmChannel(request, owner.token, alpha.userId);
  const bravoDmId = await openDmChannel(request, owner.token, bravo.userId);

  await authenticateWithToken(page, owner.token);
  await page.goto('/');

  const dmItems = page.locator('.channel-sidebar-list .channel-item');
  await expect(dmItems.first()).toBeVisible();

  const sendToBravoRes = await request.post(`${API_BASE}/channels/${bravoDmId}/messages`, {
    headers: { Authorization: `Bearer ${bravo.token}` },
    data: {
      content: `dm-order-bravo ${Date.now()}`,
      nonce: `nonce-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    },
  });
  expect(sendToBravoRes.ok()).toBeTruthy();
  await expect(dmItems.first().locator('.channel-name')).toContainText(bravo.username);

  const sendToAlphaRes = await request.post(`${API_BASE}/channels/${alphaDmId}/messages`, {
    headers: { Authorization: `Bearer ${alpha.token}` },
    data: {
      content: `dm-order-alpha ${Date.now()}`,
      nonce: `nonce-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    },
  });
  expect(sendToAlphaRes.ok()).toBeTruthy();
  await expect(dmItems.first().locator('.channel-name')).toContainText(alpha.username);
});

test('switches own message avatar between sprite and fallback avatar when avatar studio setting changes', async ({ page, request }) => {
  const user = await registerUser(request, 'avatarsprite');
  const scope = await createGuildAndTextChannel(request, user.token);

  await page.addInitScript((payload: { token: string; userId: string }) => {
    localStorage.setItem('gratonite_access_token', payload.token);
    localStorage.setItem(
      `gratonite_avatar_studio_v1:${payload.userId}`,
      JSON.stringify({
        enabled: true,
        sprite: {
          skinTone: '#f6d3b9',
          hairColor: '#1f1f1f',
          hairStyle: 'short',
          faceStyle: 'smile',
          topColor: '#4c6fff',
          bottomColor: '#263659',
          shoesColor: '#10161f',
          hatStyle: 'none',
          accessoryStyle: 'none',
        },
        equipped: {
          hat: null,
          top: null,
          bottom: null,
          shoes: null,
          accessory: null,
        },
      }),
    );
  }, { token: user.token, userId: user.userId });

  await page.goto(`/guild/${scope.guildId}/channel/${scope.channelId}`);

  const composer = page.locator('.message-composer-input');
  const text = `avatar-mode-toggle ${Date.now()}`;
  await composer.fill(text);
  await composer.press('Enter');

  await expect(page.locator('.message-content', { hasText: text }).last()).toBeVisible();
  await expect(page.locator('.message-avatar-sprite').first()).toBeVisible();

  await page.evaluate((userId) => {
    window.localStorage.setItem(
      `gratonite_avatar_studio_v1:${userId}`,
      JSON.stringify({
        enabled: false,
        sprite: {
          skinTone: '#f6d3b9',
          hairColor: '#1f1f1f',
          hairStyle: 'short',
          faceStyle: 'smile',
          topColor: '#4c6fff',
          bottomColor: '#263659',
          shoesColor: '#10161f',
          hatStyle: 'none',
          accessoryStyle: 'none',
        },
        equipped: {
          hat: null,
          top: null,
          bottom: null,
          shoes: null,
          accessory: null,
        },
      }),
    );
    window.dispatchEvent(new CustomEvent('gratonite:avatar-studio:changed', { detail: { userId } }));
  }, user.userId);

  await expect(page.locator('.message-avatar-sprite')).toHaveCount(0);
  await expect(page.locator('.message-avatar').first()).toBeVisible();
});

test('clears pending attachments from composer before sending', async ({ page, request }) => {
  const user = await registerUser(request, 'attachclear');
  const scope = await createGuildAndTextChannel(request, user.token);

  await authenticateWithToken(page, user.token);
  await page.goto(`/guild/${scope.guildId}/channel/${scope.channelId}`);

  const uploader = page.locator('input[type="file"]');
  const sendButton = page.getByRole('button', { name: 'Send message' });
  await expect(sendButton).toBeDisabled();

  await uploader.setInputFiles([
    {
      name: `clear-a-${Date.now()}.txt`,
      mimeType: 'text/plain',
      buffer: Buffer.from('clear attachments a'),
    },
    {
      name: `clear-b-${Date.now()}.txt`,
      mimeType: 'text/plain',
      buffer: Buffer.from('clear attachments b'),
    },
  ]);

  await expect(page.locator('.attachment-preview-item-compact')).toHaveCount(2);
  await expect(sendButton).toBeEnabled();
  await page.getByRole('button', { name: 'Clear all attachments' }).click();
  await expect(page.locator('.attachment-preview-item-compact')).toHaveCount(0);
  await expect(sendButton).toBeDisabled();
});
