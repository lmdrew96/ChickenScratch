import { logNotificationFailure } from '@/lib/email';
import { getDiscordWebhookUrl, getEventSignupDiscordWebhookUrl } from '@/lib/site-config';
import { easternWallClockToDate } from '@/lib/utils';

interface DiscordEmbed {
  title?: string;
  description?: string;
  color?: number;
  fields?: Array<{ name: string; value: string; inline?: boolean }>;
  footer?: { text: string };
  url?: string;
  timestamp?: string;
}

export async function sendDiscordEmbed(
  embed: DiscordEmbed,
  options: { webhookUrl?: string | null } = {},
): Promise<boolean> {
  const webhookUrl = options.webhookUrl ?? (await getDiscordWebhookUrl());

  if (!webhookUrl) {
    console.info('[discord] No webhook URL configured, skipping notification');
    return true;
  }

  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ embeds: [embed] }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('[discord] Webhook error:', errorData);
      await logNotificationFailure({
        type: 'discord',
        recipient: 'discord-webhook',
        subject: embed.title ?? '(no title)',
        errorMessage: JSON.stringify(errorData),
        context: { embedTitle: embed.title },
      });
      return false;
    }

    return true;
  } catch (error) {
    console.error('[discord] Failed to send embed:', error);
    await logNotificationFailure({
      type: 'discord',
      recipient: 'discord-webhook',
      subject: embed.title ?? '(no title)',
      errorMessage: String(error),
      context: { embedTitle: embed.title },
    }).catch(() => {});
    return false;
  }
}

const BRAND_BLUE = 21407;   // #00539f
const ACCENT_GOLD = 16765440; // #ffd200
const OFFICERS_URL = 'https://chickenscratch.me/officers';
const FOOTER_SUFFIX = 'Chicken Scratch • chickenscratch.me/officers';

function priorityEmoji(priority: string): string {
  if (priority === 'high') return '🔴';
  if (priority === 'low') return '🟢';
  return '🟡';
}

function formatDueDate(dueDate: Date | null | undefined): string {
  if (!dueDate) return 'No due date';
  return new Date(dueDate).toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'America/New_York',
  });
}

export async function notifyDiscordTaskCreated(
  task: {
    title: string;
    priority: string | null;
    assigned_to: string | null;
    due_date: Date | null;
  },
  assigneeName?: string,
  creatorName?: string,
): Promise<boolean> {
  return sendDiscordEmbed({
    title: 'New Task Created',
    color: BRAND_BLUE,
    fields: [
      { name: 'Title', value: task.title.slice(0, 1024), inline: false },
      {
        name: 'Priority',
        value: `${priorityEmoji(task.priority ?? 'medium')} ${task.priority ?? 'medium'}`,
        inline: true,
      },
      {
        name: 'Assigned to',
        value: assigneeName ?? 'Unassigned',
        inline: true,
      },
      {
        name: 'Due',
        value: formatDueDate(task.due_date),
        inline: true,
      },
      ...(creatorName ? [{ name: 'Created by', value: creatorName, inline: true }] : []),
    ],
    footer: { text: FOOTER_SUFFIX },
    url: OFFICERS_URL,
  });
}

export async function notifyDiscordAnnouncement(
  message: string,
  authorName: string,
): Promise<boolean> {
  return sendDiscordEmbed({
    title: 'Officer Announcement',
    description: message.slice(0, 2048),
    color: ACCENT_GOLD,
    footer: { text: `Posted by ${authorName} • Chicken Scratch` },
    url: OFFICERS_URL,
  });
}

export async function notifyDiscordMeetingFinalized(
  title: string,
  finalizedDate: Date,
  finalizerName: string,
): Promise<boolean> {
  return sendDiscordEmbed({
    title: `Meeting Finalized: ${title}`.slice(0, 256),
    color: ACCENT_GOLD,
    fields: [
      {
        name: 'Date & time',
        value: finalizedDate.toLocaleDateString('en-US', {
          weekday: 'long',
          month: 'long',
          day: 'numeric',
          year: 'numeric',
          hour: 'numeric',
          minute: '2-digit',
          timeZone: 'America/New_York',
        }),
        inline: false,
      },
      { name: 'Finalized by', value: finalizerName, inline: true },
    ],
    footer: { text: FOOTER_SUFFIX },
    url: OFFICERS_URL,
  });
}

export async function notifyDiscordTaskCompleted(
  task: { title: string; priority: string | null; due_date: Date | null },
  completedByName?: string,
): Promise<boolean> {
  return sendDiscordEmbed({
    title: '✅ Task Completed',
    color: 0x22c55e,
    fields: [
      { name: 'Task', value: task.title.slice(0, 1024), inline: false },
      {
        name: 'Priority',
        value: `${priorityEmoji(task.priority ?? 'medium')} ${task.priority ?? 'medium'}`,
        inline: true,
      },
      ...(completedByName ? [{ name: 'Completed by', value: completedByName, inline: true }] : []),
    ],
    footer: { text: FOOTER_SUFFIX },
    url: OFFICERS_URL,
  });
}

export async function notifyDiscordTaskReopened(
  task: { title: string; priority: string | null },
  reopenedByName?: string,
): Promise<boolean> {
  return sendDiscordEmbed({
    title: '🔄 Task Reopened',
    color: BRAND_BLUE,
    fields: [
      { name: 'Task', value: task.title.slice(0, 1024), inline: false },
      {
        name: 'Priority',
        value: `${priorityEmoji(task.priority ?? 'medium')} ${task.priority ?? 'medium'}`,
        inline: true,
      },
      ...(reopenedByName ? [{ name: 'Reopened by', value: reopenedByName, inline: true }] : []),
    ],
    footer: { text: FOOTER_SUFFIX },
    url: OFFICERS_URL,
  });
}

export async function notifyDiscordTaskNudge(
  task: { title: string; priority: string | null; due_date: Date | null },
  nudgerName: string,
): Promise<boolean> {
  return sendDiscordEmbed({
    title: '👋 Task Needs an Owner',
    description: `**${task.title.slice(0, 256)}** has no one assigned — can someone pick this up?`,
    color: ACCENT_GOLD,
    fields: [
      {
        name: 'Priority',
        value: `${priorityEmoji(task.priority ?? 'medium')} ${task.priority ?? 'medium'}`,
        inline: true,
      },
      {
        name: 'Due',
        value: formatDueDate(task.due_date),
        inline: true,
      },
      { name: 'Nudged by', value: nudgerName, inline: true },
    ],
    footer: { text: FOOTER_SUFFIX },
    url: OFFICERS_URL,
  });
}

export async function notifyDiscordMeeting(
  title: string,
  description: string | null,
  proposedDates: Array<{ date: string; time: string }>,
  authorName: string,
): Promise<boolean> {
  const formattedDates = proposedDates
    .map((slot) => {
      const date = easternWallClockToDate(slot.date, slot.time);
      return date.toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        timeZone: 'America/New_York',
      });
    })
    .map((d) => `• ${d}`)
    .join('\n');

  return sendDiscordEmbed({
    title: `New Meeting Proposal: ${title}`.slice(0, 256),
    description: description?.slice(0, 2048) ?? undefined,
    color: BRAND_BLUE,
    fields: [
      {
        name: 'Proposed times',
        value: formattedDates.slice(0, 1024) || 'No times specified',
        inline: false,
      },
    ],
    footer: { text: `Proposed by ${authorName} • Mark availability at chickenscratch.me/officers` },
    url: OFFICERS_URL,
  });
}

const CATEGORY_LABEL: Record<string, string> = {
  sweet: 'Sweet',
  savory: 'Savory',
  drink: 'Drink',
  utensils: 'Utensils',
  other: 'Other',
};

export async function notifyNewEventSignup(
  signup: { name: string; item: string; category: string; notes: string | null },
  event: { slug: string; name: string },
): Promise<boolean> {
  const webhookUrl = await getEventSignupDiscordWebhookUrl();
  if (!webhookUrl) {
    console.info('[discord] No event-signup webhook configured, skipping');
    return true;
  }
  const categoryLabel = CATEGORY_LABEL[signup.category] ?? signup.category;
  return sendDiscordEmbed(
    {
      title: `🐔 New signup for ${event.name}!`,
      description: `**${signup.name}** is bringing **${signup.item}** _(${categoryLabel})_`,
      color: BRAND_BLUE,
      fields: signup.notes
        ? [{ name: 'Notes', value: signup.notes.slice(0, 1024), inline: false }]
        : [],
      footer: { text: `chickenscratch.me/events/${event.slug}` },
      url: `https://chickenscratch.me/events/${event.slug}`,
      timestamp: new Date().toISOString(),
    },
    { webhookUrl },
  );
}

const PERFORMANCE_KIND_LABEL: Record<string, string> = {
  poetry: 'Poetry reading',
  storytelling: 'Storytelling',
  one_act_play: 'One-act play',
};

export async function notifyNewPerformanceSignup(
  signup: {
    name: string;
    kind: string;
    piece_title: string;
    estimated_minutes: number;
    content_warnings: string | null;
    notes: string | null;
  },
  event: { slug: string; name: string },
): Promise<boolean> {
  const webhookUrl = await getEventSignupDiscordWebhookUrl();
  if (!webhookUrl) {
    console.info('[discord] No event-signup webhook configured, skipping');
    return true;
  }
  const kindLabel = PERFORMANCE_KIND_LABEL[signup.kind] ?? signup.kind;
  const fields: Array<{ name: string; value: string; inline?: boolean }> = [
    { name: 'Type', value: kindLabel, inline: true },
    { name: 'Length', value: `${signup.estimated_minutes} min`, inline: true },
  ];
  if (signup.content_warnings) {
    fields.push({
      name: 'Content warnings',
      value: signup.content_warnings.slice(0, 1024),
      inline: false,
    });
  }
  if (signup.notes) {
    fields.push({ name: 'Notes', value: signup.notes.slice(0, 1024), inline: false });
  }
  return sendDiscordEmbed(
    {
      title: `🎤 New performance signup for ${event.name}!`,
      description: `**${signup.name}** — _"${signup.piece_title}"_`,
      color: ACCENT_GOLD,
      fields,
      footer: { text: `chickenscratch.me/events/${event.slug}` },
      url: `https://chickenscratch.me/events/${event.slug}`,
      timestamp: new Date().toISOString(),
    },
    { webhookUrl },
  );
}
