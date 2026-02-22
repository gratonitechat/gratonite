import type { APIRequestContext, Page } from '@playwright/test';
import { expect } from '@playwright/test';

const API_BASE = `${(process.env['PW_API_ORIGIN'] ?? 'http://127.0.0.1:4000').replace(/\/+$/, '')}/api/v1`;

type RegisterResult = {
  accessToken: string;
  user: { id: string; username: string };
};

type GuildResult = {
  id: string;
};

type ChannelResult = {
  id: string;
  name?: string | null;
  type?: string;
};

type DmChannelResult = {
  id: string;
};

function unique(prefix: string) {
  return `${prefix}${Date.now()}${Math.floor(Math.random() * 1000)}`;
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function parseRetryAfterMs(response: { json: () => Promise<unknown> }): Promise<number> {
  try {
    const body = (await response.json()) as { retryAfter?: number };
    if (typeof body.retryAfter === 'number' && body.retryAfter > 0) {
      return Math.min(body.retryAfter, 5000);
    }
  } catch {
    // ignore parse failures and fallback to static wait
  }
  return 1200;
}

export async function registerUser(request: APIRequestContext, prefix: string) {
  const password = 'TestPass123!';

  for (let attempt = 1; attempt <= 4; attempt += 1) {
    const username = unique(prefix);
    const email = `${username}@test.local`;

    const res = await request.post(`${API_BASE}/auth/register`, {
      data: {
        username,
        email,
        password,
        displayName: username,
        dateOfBirth: '2000-01-01',
      },
    });

    if (res.ok()) {
      const body = (await res.json()) as RegisterResult;
      return {
        username,
        password,
        token: body.accessToken,
        userId: body.user.id,
      };
    }

    if (res.status() === 429 && attempt < 4) {
      const waitMs = await parseRetryAfterMs(res);
      await sleep(waitMs);
      continue;
    }

    const body = await res.text();
    throw new Error(`registerUser failed: status=${res.status()} body=${body}`);
  }

  throw new Error('registerUser failed after maximum retry attempts');
}

export async function createGuildAndTextChannel(request: APIRequestContext, token: string) {
  const guildRes = await request.post(`${API_BASE}/guilds`, {
    headers: { Authorization: `Bearer ${token}` },
    data: { name: `E2E Guild ${Date.now()}` },
  });
  expect(guildRes.ok()).toBeTruthy();
  const guild = (await guildRes.json()) as GuildResult;

  const channelRes = await request.post(`${API_BASE}/guilds/${guild.id}/channels`, {
    headers: { Authorization: `Bearer ${token}` },
    data: { name: 'qa-room', type: 'GUILD_TEXT' },
  });
  expect(channelRes.ok()).toBeTruthy();
  const channel = (await channelRes.json()) as ChannelResult;

  return {
    guildId: guild.id,
    channelId: channel.id,
  };
}

export async function createGuildWithChannels(
  request: APIRequestContext,
  token: string,
  options: {
    textChannels?: string[];
    voiceChannels?: string[];
  } = {},
) {
  const guildRes = await request.post(`${API_BASE}/guilds`, {
    headers: { Authorization: `Bearer ${token}` },
    data: { name: `E2E Guild ${Date.now()}` },
  });
  expect(guildRes.ok()).toBeTruthy();
  const guild = (await guildRes.json()) as GuildResult;

  const channelsRes = await request.get(`${API_BASE}/guilds/${guild.id}/channels`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  expect(channelsRes.ok()).toBeTruthy();
  const existing = (await channelsRes.json()) as ChannelResult[];
  const generalChannelId =
    existing.find((channel) => channel.name === 'general')?.id ?? existing[0]?.id ?? null;

  const createdTextChannels: ChannelResult[] = [];
  const createdVoiceChannels: ChannelResult[] = [];

  for (const name of options.textChannels ?? []) {
    const channelRes = await request.post(`${API_BASE}/guilds/${guild.id}/channels`, {
      headers: { Authorization: `Bearer ${token}` },
      data: { name, type: 'GUILD_TEXT' },
    });
    expect(channelRes.ok()).toBeTruthy();
    createdTextChannels.push((await channelRes.json()) as ChannelResult);
  }

  for (const name of options.voiceChannels ?? []) {
    const channelRes = await request.post(`${API_BASE}/guilds/${guild.id}/channels`, {
      headers: { Authorization: `Bearer ${token}` },
      data: { name, type: 'GUILD_VOICE' },
    });
    expect(channelRes.ok()).toBeTruthy();
    createdVoiceChannels.push((await channelRes.json()) as ChannelResult);
  }

  return {
    guildId: guild.id,
    generalChannelId,
    textChannels: createdTextChannels,
    voiceChannels: createdVoiceChannels,
  };
}

export async function authenticateWithToken(page: Page, token: string) {
  await page.addInitScript((tok) => {
    localStorage.setItem('gratonite_access_token', tok);
  }, token);
}

export async function openDmChannel(
  request: APIRequestContext,
  token: string,
  userId: string,
) {
  const dmRes = await request.post(`${API_BASE}/relationships/channels`, {
    headers: { Authorization: `Bearer ${token}` },
    data: { userId },
  });
  if (!dmRes.ok()) {
    const body = await dmRes.text();
    throw new Error(`openDmChannel failed: status=${dmRes.status()} body=${body}`);
  }
  const dm = (await dmRes.json()) as DmChannelResult;
  return dm.id;
}
