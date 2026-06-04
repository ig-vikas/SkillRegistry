---
name: telegram-integration
type: skill
description: Telegram Bot API integration for AI agent gateway with webhooks, message parsing, and streaming responses.
version: 1.0.0
author: skillregistry
license: MIT
agents: [cursor, claude-code, copilot, gemini-cli]
categories: [backend, messaging, api]
tags: [telegram, bot, webhook, messaging, api, streaming]
---

# Telegram Integration Expert

Complete Telegram Bot API integration for AI agent gateway including webhook setup, message parsing, command handling, and streaming responses back to Telegram.

## Quick Start

### Basic Setup

```bash
# Install dependencies
pnpm add telegraf @types/telegraf
```

```typescript
// src/platforms/telegram/bot.ts
import { Telegraf } from 'telegraf';
import { AgentGateway } from '../../core/gateway';

export class TelegramBot {
  private bot: Telegraf;
  private gateway: AgentGateway;
  
  constructor(gateway: AgentGateway, token: string) {
    this.gateway = gateway;
    this.bot = new Telegraf(token);
    this.setupMiddlewares();
    this.setupHandlers();
  }
  
  private setupMiddlewares() {
    // Error handling
    this.bot.catch((err, ctx) => {
      console.error(`Error in Telegram handler:`, err);
    });
  }
  
  private setupHandlers() {
    // Message handler
    this.bot.on('message', this.handleMessage.bind(this));
    
    // Command handler
    this.bot.command('start', this.handleStart.bind(this));
    this.bot.command('help', this.handleHelp.bind(this));
    this.bot.command('pair', this.handlePair.bind(this));
    
    // Callback query handler
    this.bot.action(/^.*$/, this.handleCallback.bind(this));
    
    // Inline query handler
    this.bot.on('inline_query', this.handleInlineQuery.bind(this));
  }
  
  async start() {
    await this.bot.launch();
    console.log('Telegram bot started');
  }
  
  async stop() {
    await this.bot.stop();
    console.log('Telegram bot stopped');
  }
  
  async useWebhook(url: string, secret?: string) {
    if (secret) {
      await this.bot.telegram.setWebhook(url, { secret_token: secret });
    } else {
      await this.bot.telegram.setWebhook(url);
    }
    console.log(`Telegram webhook set to ${url}`);
  }
  
  private async handleMessage(ctx: any) {
    const { chat, from, message } = ctx;
    
    // Convert to gateway message format
    const gatewayMessage = {
      platform: 'telegram',
      channelId: `telegram:${chat.id}`,
      senderId: `telegram:${from.id}`,
      message: message.text || message.caption || '',
      messageId: String(message.message_id),
      chatType: chat.type,
      timestamp: Date.now(),
      metadata: {
        replyTo: message.reply_to_message ? String(message.reply_to_message.message_id) : undefined,
        entities: message.entities,
        media: message.photo || message.video || message.document || message.audio,
      },
    };
    
    // Route through gateway
    const result = await this.gateway.handleIncomingMessage(gatewayMessage);
    
    if (result && result.shouldRespond) {
      await this.sendResponse(ctx, result);
    }
  }
  
  private async handleStart(ctx: any) {
    const { chat, from } = ctx;
    const welcomeMessage = `Hello! I'm ${(await this.bot.telegram.getMe()).username}. ` +
      `Send me a message and I'll respond.`;
    await ctx.reply(welcomeMessage);
  }
  
  private async handleHelp(ctx: any) {
    await ctx.reply('/start - Start the bot\n/help - Show help\n/pair - Pair with control UI');
  }
  
  private async handlePair(ctx: any) {
    const { chat, from } = ctx;
    const pairingCode = this.gateway.generatePairingCode(`telegram:${from.id}`);
    await ctx.reply(`Pairing code: \`${pairingCode}\`. Enter this in your control UI.`);
  }
  
  private async handleCallback(ctx: any) {
    await ctx.answerCbQuery('Callback received');
    // Handle callback query
  }
  
  private async handleInlineQuery(ctx: any) {
    // Handle inline queries
  }
  
  private async sendResponse(ctx: any, result: any) {
    const { chat, from } = ctx;
    
    if (result.type === 'approval_required') {
      await ctx.reply(`This action requires approval. Please check your control UI.`);
      return;
    }
    
    if (result.type === 'stream') {
      await this.streamResponse(ctx, result.stream);
      return;
    }
    
    // Simple text response
    if (typeof result.response === 'string') {
      await ctx.reply(result.response);
      return;
    }
    
    // Rich response
    if (result.response.type === 'text') {
      await ctx.reply(result.response.text);
    } else if (result.response.type === 'photo') {
      await ctx.replyWithPhoto(result.response.url || Buffer.from(result.response.data, 'utf-8'));
    } else if (result.response.type === 'document') {
      await ctx.replyWithDocument(result.response.url || Buffer.from(result.response.data, 'utf-8'));
    }
  }
  
  private async streamResponse(ctx: any, stream: AsyncIterable<string>) {
    let message = '';
    let sentMessage: any = null;
    
    for await (const chunk of stream) {
      message += chunk;
      
      // Edit message if already sent
      if (sentMessage) {
        try {
          await ctx.telegram.editMessageText(
            chat.id,
            sentMessage.message_id,
            undefined,
            message,
            { parse_mode: 'MarkdownV2' }
          );
        } catch (error) {
          // Message too old to edit, send new one
          sentMessage = await ctx.reply(message, { parse_mode: 'MarkdownV2' });
        }
      } else {
        // Send initial message
        sentMessage = await ctx.reply(message, { parse_mode: 'MarkdownV2' });
      }
    }
  }
}
```

## Webhook Server

### Webhook Endpoint

```typescript
// src/platforms/telegram/webhook.ts
import { Router } from 'express';
import crypto from 'crypto';
import { AgentGateway } from '../../core/gateway';

const router = Router();

export class TelegramWebhook {
  constructor(private gateway: AgentGateway, private secret?: string) {}
  
  getRouter(): Router {
    router.post('/webhook/telegram', this.handleWebhook.bind(this));
    return router;
  }
  
  private async handleWebhook(req: any, res: any) {
    // Verify secret if configured
    if (this.secret) {
      const hash = crypto
        .createHmac('sha256', this.secret)
        .update(JSON.stringify(req.body))
        .digest('hex');
      
      const expectedHash = req.headers['x-telegram-bot-api-secret-token'];
      
      if (hash !== expectedHash) {
        return res.status(401).send('Unauthorized');
      }
    }
    
    // Process update
    const update = req.body;
    await this.processUpdate(update);
    
    res.status(200).send('OK');
  }
  
  private async processUpdate(update: any) {
    try {
      // Message update
      if (update.message) {
        await this.processMessage(update.message);
        return;
      }
      
      // Edited message
      if (update.edited_message) {
        await this.processMessage(update.edited_message, true);
        return;
      }
      
      // Callback query
      if (update.callback_query) {
        await this.processCallback(update.callback_query);
        return;
      }
      
      // Inline query
      if (update.inline_query) {
        await this.processInlineQuery(update.inline_query);
        return;
      }
      
      // Channel post
      if (update.channel_post) {
        await this.processMessage(update.channel_post);
        return;
      }
      
      // Other update types
      console.log('Unhandled update type:', Object.keys(update));
    } catch (error) {
      console.error('Error processing Telegram update:', error);
    }
  }
  
  private async processMessage(message: any, isEdit: boolean = false) {
    const { chat, from, text, caption, entities } = message;
    
    // Skip system messages
    if (from?.is_bot) return;
    
    // Convert to gateway message
    const gatewayMessage = {
      platform: 'telegram',
      channelId: `telegram:${chat.id}`,
      senderId: `telegram:${from.id}`,
      message: text || caption || '',
      messageId: String(message.message_id),
      chatType: chat.type,
      timestamp: message.date * 1000,
      isEdit,
      metadata: {
        replyTo: message.reply_to_message ? String(message.reply_to_message.message_id) : undefined,
        entities: entities,
        media: message.photo || message.video || message.document || message.audio || message.voice,
      },
    };
    
    // Route through gateway
    const result = await this.gateway.handleIncomingMessage(gatewayMessage);
    
    if (result && result.shouldRespond) {
      await this.sendTelegramResponse(gatewayMessage, result);
    }
  }
  
  private async processCallback(callback: any) {
    // Handle callback query
  }
  
  private async processInlineQuery(query: any) {
    // Handle inline query
  }
  
  private async sendTelegramResponse(message: any, result: any) {
    const { channelId, messageId } = message;
    const chatId = channelId.replace('telegram:', '');
    
    // Build Telegram send options
    const options: any = {
      parse_mode: 'MarkdownV2',
    };
    
    if (message.metadata?.replyTo) {
      options.reply_to_message_id = parseInt(message.metadata.replyTo);
    }
    
    if (result.type === 'approval_required') {
      // Send pairing code
      const pairingCode = this.gateway.generatePairingCode(message.senderId);
      await this.sendTelegramMessage(chatId, 
        `This action requires approval. Pairing code: \`${pairingCode}\``,
        options
      );
      return;
    }
    
    if (result.type === 'stream') {
      await this.streamTelegramResponse(chatId, result.stream, options);
      return;
    }
    
    if (typeof result.response === 'string') {
      await this.sendTelegramMessage(chatId, result.response, options);
      return;
    }
    
    if (result.response.type === 'text') {
      await this.sendTelegramMessage(chatId, result.response.text, options);
    } else if (result.response.type === 'photo') {
      await this.sendTelegramPhoto(chatId, result.response, options);
    } else if (result.response.type === 'document') {
      await this.sendTelegramDocument(chatId, result.response, options);
    }
  }
  
  private async sendTelegramMessage(chatId: string, text: string, options: any = {}) {
    // Implement Telegram API call
    const { Telegraf } = require('telegraf');
    const bot = new Telegraf(process.env.TELEGRAM_TOKEN!);
    await bot.telegram.sendMessage(chatId, text, options);
  }
  
  private async sendTelegramPhoto(chatId: string, photo: any, options: any = {}) {
    const { Telegraf } = require('telegraf');
    const bot = new Telegraf(process.env.TELEGRAM_TOKEN!);
    
    if (photo.url) {
      await bot.telegram.sendPhoto(chatId, photo.url, {
        caption: photo.caption,
        ...options,
      });
    } else if (photo.data) {
      await bot.telegram.sendPhoto(chatId, { source: Buffer.from(photo.data, 'utf-8') }, {
        caption: photo.caption,
        ...options,
      });
    }
  }
  
  private async sendTelegramDocument(chatId: string, doc: any, options: any = {}) {
    const { Telegraf } = require('telegraf');
    const bot = new Telegraf(process.env.TELEGRAM_TOKEN!);
    
    if (doc.url) {
      await bot.telegram.sendDocument(chatId, doc.url, {
        caption: doc.caption,
        ...options,
      });
    } else if (doc.data) {
      await bot.telegram.sendDocument(chatId, { source: Buffer.from(doc.data, 'utf-8') }, {
        caption: doc.caption,
        ...options,
      });
    }
  }
  
  private async streamTelegramResponse(chatId: string, stream: AsyncIterable<string>, options: any = {}) {
    let message = '';
    let sentMessage: any = null;
    
    for await (const chunk of stream) {
      message += chunk;
      
      if (sentMessage) {
        try {
          const { Telegraf } = require('telegraf');
          const bot = new Telegraf(process.env.TELEGRAM_TOKEN!);
          await bot.telegram.editMessageText(
            chatId,
            sentMessage.message_id,
            undefined,
            message,
            options
          );
        } catch (error) {
          // Message too old to edit
          const { Telegraf } = require('telegraf');
          const bot = new Telegraf(process.env.TELEGRAM_TOKEN!);
          sentMessage = await bot.telegram.sendMessage(chatId, message, options);
        }
      } else {
        const { Telegraf } = require('telegraf');
        const bot = new Telegraf(process.env.TELEGRAM_TOKEN!);
        sentMessage = await bot.telegram.sendMessage(chatId, message, options);
      }
    }
  }
}
```

## Message Parsing

### Telegram Message Types

```typescript
// src/platforms/telegram/types.ts
export interface TelegramUpdate {
  update_id: number;
  message?: TelegramMessage;
  edited_message?: TelegramMessage;
  channel_post?: TelegramMessage;
  edited_channel_post?: TelegramMessage;
  inline_query?: TelegramInlineQuery;
  chosen_inline_result?: any;
  callback_query?: TelegramCallbackQuery;
  shipping_query?: any;
  pre_checkout_query?: any;
  poll?: any;
  poll_answer?: any;
  my_chat_member?: any;
  chat_member?: any;
  chat_join_request?: any;
}

export interface TelegramMessage {
  message_id: number;
  from?: TelegramUser;
  sender_chat?: TelegramChat;
  date: number;
  chat: TelegramChat;
  forward_from?: TelegramUser;
  forward_from_chat?: TelegramChat;
  forward_from_message_id?: number;
  forward_signature?: string;
  forward_sender_name?: string;
  forward_date?: number;
  is_automatic_forward?: boolean;
  reply_to_message?: TelegramMessage;
  via_bot?: TelegramUser;
  edit_date?: number;
  has_protected_content?: boolean;
  media_group_id?: string;
  author_signature?: string;
  text?: string;
  entities?: TelegramMessageEntity[];
  caption_entities?: TelegramMessageEntity[];
  audio?: TelegramAudio;
  document?: TelegramDocument;
  animation?: TelegramAnimation;
  game?: any;
  photo?: TelegramPhotoSize[];
  sticker?: TelegramSticker;
  video?: TelegramVideo;
  voice?: TelegramVoice;
  video_note?: TelegramVideoNote;
  caption?: string;
  contact?: any;
  dice?: any;
  location?: any;
  venue?: any;
  poll?: any;
  new_chat_members?: TelegramUser[];
  left_chat_member?: TelegramUser;
  new_chat_title?: string;
  new_chat_photo?: TelegramPhotoSize[];
  delete_chat_photo?: boolean;
  group_chat_created?: boolean;
  supergroup_chat_created?: boolean;
  channel_chat_created?: boolean;
  message_auto_delete_timer_changed?: any;
  migrate_to_chat_id?: number;
  migrate_from_chat_id?: number;
  pinned_message?: TelegramMessage;
  invoice?: any;
  successful_payment?: any;
  connected_website?: string;
  reply_markup?: TelegramInlineKeyboardMarkup;
}

export interface TelegramUser {
  id: number;
  is_bot: boolean;
  first_name: string;
  last_name?: string;
  username?: string;
  language_code?: string;
  is_premium?: boolean;
  added_to_attachment_menu?: boolean;
}

export interface TelegramChat {
  id: number;
  type: 'private' | 'group' | 'supergroup' | 'channel';
  title?: string;
  username?: string;
  first_name?: string;
  last_name?: string;
  is_forum?: boolean;
  photo?: TelegramChatPhoto;
  bio?: string;
  has_private_forwards?: boolean;
  has_restricted_voice_and_video_messages?: boolean;
  join_to_send_messages?: boolean;
  join_by_request?: boolean;
  description?: string;
  invite_link?: string;
  pinned_message?: TelegramMessage;
  permissions?: TelegramChatPermissions;
  slow_mode_delay?: number;
  message_auto_delete_time?: number;
  has_aggressive_anti_spam_enabled?: boolean;
  has_hidden_members?: boolean;
  has_protected_content?: boolean;
  sticker_set_name?: string;
  can_set_sticker_set?: boolean;
  linked_chat_id?: number;
  location?: TelegramChatLocation;
}

export interface TelegramMessageEntity {
  type: 'mention' | 'hashtag' | 'cashtag' | 'bot_command' | 'url' | 'email' | 'phone_number' | 'bold' | 'italic' | 'code' | 'pre' | 'text_link' | 'text_mention' | 'custom_emoji';
  offset: number;
  length: number;
  url?: string;
  user?: TelegramUser;
  language?: string;
  custom_emoji_id?: string;
}

export interface TelegramCallbackQuery {
  id: string;
  from: TelegramUser;
  message?: TelegramMessage;
  inline_message_id?: string;
  chat_instance: string;
  data?: string;
  game_short_name?: string;
}

export interface TelegramInlineQuery {
  id: string;
  from: TelegramUser;
  query: string;
  offset: string;
  chat_type?: string;
  location?: any;
}
```

### Message Parser

```typescript
// src/platforms/telegram/parser.ts
export class TelegramParser {
  static parseUpdate(update: TelegramUpdate): ParsedMessage | null {
    if (update.message) {
      return this.parseMessage(update.message, false);
    }
    if (update.edited_message) {
      return this.parseMessage(update.edited_message, true);
    }
    if (update.channel_post) {
      return this.parseMessage(update.channel_post, false);
    }
    return null;
  }
  
  static parseMessage(message: TelegramMessage, isEdit: boolean): ParsedMessage {
    const { chat, from, text, caption, entities } = message;
    
    // Determine chat type
    const chatType = this.determineChatType(chat);
    
    // Extract sender
    const sender = from || message.sender_chat;
    const senderId = sender ? `telegram:${sender.id}` : `telegram:unknown`;
    
    // Extract channel
    const channelId = `telegram:${chat.id}`;
    
    // Get message content
    const content = text || caption || '';
    
    // Parse entities
    const parsedEntities = this.parseEntities(entities || []);
    
    // Check for commands
    const command = this.extractCommand(entities || [], content);
    
    // Extract mentions
    const mentions = this.extractMentions(entities || [], content);
    
    // Extract media
    const media = this.extractMedia(message);
    
    return {
      platform: 'telegram',
      channelId,
      senderId,
      content,
      messageId: String(message.message_id),
      chatType,
      timestamp: message.date * 1000,
      isEdit,
      command,
      mentions,
      media,
      metadata: {
        replyTo: message.reply_to_message ? String(message.reply_to_message.message_id) : undefined,
        entities: parsedEntities,
        raw: message,
      },
    };
  }
  
  private static determineChatType(chat: TelegramChat): 'private' | 'group' | 'supergroup' | 'channel' {
    return chat.type;
  }
  
  private static parseEntities(entities: TelegramMessageEntity[]): ParsedEntity[] {
    return entities.map(entity => ({
      type: entity.type,
      text: entity.type === 'bot_command' ? entity.text?.substring(1) : undefined,
      offset: entity.offset,
      length: entity.length,
      url: entity.url,
      user: entity.user ? `telegram:${entity.user.id}` : undefined,
    }));
  }
  
  private static extractCommand(entities: TelegramMessageEntity[], content: string): string | null {
    const commandEntity = entities.find(e => e.type === 'bot_command');
    if (!commandEntity) return null;
    return content.substring(commandEntity.offset, commandEntity.offset + commandEntity.length);
  }
  
  private static extractMentions(entities: TelegramMessageEntity[], content: string): string[] {
    const mentions: string[] = [];
    
    for (const entity of entities) {
      if (entity.type === 'mention' || entity.type === 'text_mention') {
        const mentionText = content.substring(entity.offset, entity.offset + entity.length);
        mentions.push(mentionText);
      }
    }
    
    return mentions;
  }
  
  private static extractMedia(message: TelegramMessage): TelegramMedia | null {
    if (message.photo) {
      const photo = message.photo[message.photo.length - 1]; // Highest resolution
      return {
        type: 'photo',
        id: photo.file_id,
        width: photo.width,
        height: photo.height,
        fileSize: photo.file_size,
      };
    }
    
    if (message.video) {
      return {
        type: 'video',
        id: message.video.file_id,
        duration: message.video.duration,
        width: message.video.width,
        height: message.video.height,
        fileSize: message.video.file_size,
        mimeType: message.video.mime_type,
      };
    }
    
    if (message.document) {
      return {
        type: 'document',
        id: message.document.file_id,
        fileName: message.document.file_name,
        mimeType: message.document.mime_type,
        fileSize: message.document.file_size,
      };
    }
    
    if (message.audio) {
      return {
        type: 'audio',
        id: message.audio.file_id,
        duration: message.audio.duration,
        fileSize: message.audio.file_size,
        mimeType: message.audio.mime_type,
      };
    }
    
    if (message.voice) {
      return {
        type: 'voice',
        id: message.voice.file_id,
        duration: message.voice.duration,
        fileSize: message.voice.file_size,
        mimeType: message.voice.mime_type,
      };
    }
    
    return null;
  }
}

interface ParsedMessage {
  platform: string;
  channelId: string;
  senderId: string;
  content: string;
  messageId: string;
  chatType: 'private' | 'group' | 'supergroup' | 'channel';
  timestamp: number;
  isEdit: boolean;
  command?: string;
  mentions: string[];
  media?: TelegramMedia;
  metadata: any;
}

interface TelegramMedia {
  type: 'photo' | 'video' | 'document' | 'audio' | 'voice';
  id: string;
  [key: string]: any;
}

interface ParsedEntity {
  type: string;
  text?: string;
  offset: number;
  length: number;
  url?: string;
  user?: string;
}
```

## Formatting Responses

### MarkdownV2 Formatter

```typescript
// src/platforms/telegram/formatter.ts
export class TelegramFormatter {
  static formatText(text: string): string {
    // Escape MarkdownV2 special characters
    return text
      .replace(/\\/g, '\\\\')
      .replace(/_/g, '\\_')
      .replace(/\*/g, '\\*')
      .replace(/[`]/g, '\\`')
      .replace(/\]/g, '\\]')
      .replace(/\=/g, '\\=')
      .replace(/\+/g, '\\+')
      .replace(/-/g, '\\-')
      .replace(/\./g, '\\.')
      .replace(/!\[/g, '\\!\\[')
      .replace(/\(/g, '\\\(\\')
      .replace(/\\)/g, '\\\)\\')
      .replace(/>/g, '\\>')
      .replace(/</g, '\\<');
  }
  
  static formatResponse(response: GatewayResponse): TelegramResponse {
    if (typeof response === 'string') {
      return { type: 'text', text: this.formatText(response) };
    }
    
    switch (response.type) {
      case 'text':
        return { type: 'text', text: this.formatText(response.text) };
      
      case 'markdown':
        return { type: 'text', text: this.formatText(response.markdown) };
      
      case 'html':
        // Convert HTML to Telegram HTML
        return { type: 'text', text: response.html, parse_mode: 'HTML' };
      
      case 'photo':
        return { type: 'photo', url: response.url, caption: response.caption };
      
      case 'document':
        return { type: 'document', url: response.url, caption: response.caption };
      
      case 'buttons':
        return { 
          type: 'text', 
          text: this.formatText(response.text),
          reply_markup: this.formatButtons(response.buttons)
        };
      
      case 'inline_buttons':
        return { 
          type: 'text', 
          text: this.formatText(response.text),
          reply_markup: this.formatInlineButtons(response.buttons)
        };
      
      default:
        return { type: 'text', text: this.formatText(JSON.stringify(response)) };
    }
  }
  
  static formatButtons(buttons: any[][]): any {
    return {
      keyboard: buttons.map(row => 
        row.map(btn => ({
          text: btn.text,
          callback_data: btn.callbackData,
        }))
      ),
      resize_keyboard: true,
    };
  }
  
  static formatInlineButtons(buttons: any[][]): any {
    return {
      inline_keyboard: buttons.map(row =>
        row.map(btn => {
          if (btn.url) {
            return { text: btn.text, url: btn.url };
          }
          if (btn.callbackData) {
            return { text: btn.text, callback_data: btn.callbackData };
          }
          return { text: btn.text };
        })
      ),
    };
  }
}

interface TelegramResponse {
  type: 'text' | 'photo' | 'document';
  text?: string;
  url?: string;
  caption?: string;
  parse_mode?: 'MarkdownV2' | 'HTML';
  reply_markup?: any;
}
```

## Streaming with EditMessage

### Stream Chunk Strategy

```typescript
// src/platforms/telegram/streaming.ts
export class TelegramStreamer {
  private bot: any;
  private pendingEdits = new Map<string, { messageId: number; chatId: string; text: string }>();
  
  constructor(bot: any) {
    this.bot = bot;
  }
  
  async startStream(
    chatId: string,
    stream: AsyncIterable<string>,
    options: any = {}
  ): Promise<void> {
    let fullText = '';
    let sentMessage: any = null;
    let lastEditTime = Date.now();
    
    const editInterval = options.editInterval || 2000; // Edit every 2 seconds
    
    for await (const chunk of stream) {
      fullText += chunk;
      const now = Date.now();
      
      // If we have a sent message and enough time has passed, edit it
      if (sentMessage && now - lastEditTime > editInterval) {
        try {
          await this.bot.telegram.editMessageText(
            chatId,
            sentMessage.message_id,
            undefined,
            fullText,
            { parse_mode: 'MarkdownV2', ...options }
          );
          lastEditTime = now;
        } catch (error) {
          // Can't edit anymore, send as new message
          sentMessage = await this.bot.telegram.sendMessage(
            chatId,
            fullText,
            { parse_mode: 'MarkdownV2', ...options }
          );
          lastEditTime = now;
        }
      }
      
      // If no message sent yet, send initial message
      if (!sentMessage) {
        sentMessage = await this.bot.telegram.sendMessage(
          chatId,
          fullText,
          { parse_mode: 'MarkdownV2', ...options }
        );
        lastEditTime = now;
      }
    }
    
    // Final edit to mark as complete
    if (sentMessage && fullText) {
      try {
        await this.bot.telegram.editMessageText(
          chatId,
          sentMessage.message_id,
          undefined,
          fullText,
          { parse_mode: 'MarkdownV2', ...options }
        );
      } catch (error) {
        // Ignore edit errors on final message
      }
    }
  }
}
```

## Rate Limiting & Error Handling

### Rate Limiter

```typescript
// src/platforms/telegram/rate-limiter.ts
export class TelegramRateLimiter {
  private limits = new Map<string, { limit: number; used: number; resetAt: number }>();
  
  constructor(
    private limit: number = 30,  // 30 requests
    private windowMs: number = 1000  // per second
  ) {}
  
  check(userId: string): boolean {
    const now = Date.now();
    const key = `user:${userId}`;
    
    const userLimit = this.limits.get(key);
    
    if (!userLimit || now > userLimit.resetAt) {
      // New window
      this.limits.set(key, { limit: this.limit, used: 0, resetAt: now + this.windowMs });
      return true;
    }
    
    if (userLimit.used >= userLimit.limit) {
      return false; // Rate limited
    }
    
    // Increment usage
    userLimit.used++;
    return true;
  }
  
  async waitForSlot(userId: string): Promise<void> {
    while (!this.check(userId)) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }
  
  getRemaining(userId: string): number {
    const key = `user:${userId}`;
    const userLimit = this.limits.get(key);
    
    if (!userLimit) return this.limit;
    
    const now = Date.now();
    if (now > userLimit.resetAt) {
      return this.limit;
    }
    
    return Math.max(0, userLimit.limit - userLimit.used);
  }
  
  getResetTime(userId: string): number {
    const key = `user:${userId}`;
    const userLimit = this.limits.get(key);
    
    if (!userLimit) return 0;
    
    const now = Date.now();
    if (now > userLimit.resetAt) return 0;
    
    return userLimit.resetAt - now;
  }
}
```

### Error Handling

```typescript
// src/platforms/telegram/errors.ts
import { TelegramError } from 'telegraf';

export class TelegramErrorHandler {
  static handle(error: Error, ctx?: any): { message: string; retry?: boolean } {
    if (error instanceof TelegramError) {
      return this.handleTelegramError(error, ctx);
    }
    
    return {
      message: `Error: ${error.message}`,
      retry: false,
    };
  }
  
  private static handleTelegramError(error: TelegramError, ctx?: any): { message: string; retry?: boolean } {
    // Rate limit exceeded (retry after 429)
    if (error.code === 429) {
      const retryAfter = error.response?.parameters?.retry_after || 1;
      return {
        message: `Rate limit exceeded. Retry in ${retryAfter} seconds.`,
        retry: true,
      };
    }
    
    // Bot blocked by user
    if (error.code === 403 && error.message.includes('blocked')) {
      return {
        message: 'This bot has been blocked by the user.',
        retry: false,
      };
    }
    
    // Chat not found
    if (error.code === 404) {
      return {
        message: 'Chat not found.',
        retry: false,
      };
    }
    
    // Invalid token
    if (error.code === 401) {
      return {
        message: 'Invalid Telegram token. Please check your configuration.',
        retry: false,
      };
    }
    
    // Message too long
    if (error.message.includes('Message text is too long')) {
      return {
        message: 'Message is too long. Please shorten your response.',
        retry: false,
      };
    }
    
    // Message not modified (edit conflict)
    if (error.message.includes('message is not modified')) {
      return {
        message: '',
        retry: false,
      };
    }
    
    // Default
    return {
      message: `Telegram error: ${error.message}`,
      retry: false,
    };
  }
}
```

## WebSocket Integration

### Real-time Updates

```typescript
// src/platforms/telegram/websocket-bridge.ts
export class TelegramWebSocketBridge {
  private bot: any;
  private wsServer: any;
  
  constructor(bot: any, wsServer: any) {
    this.bot = bot;
    this.wsServer = wsServer;
  }
  
  async bridgeMessages() {
    // Listen for WebSocket messages meant for Telegram
    this.wsServer.on('telegram-send', async (data: { chatId: string; message: string }) => {
      await this.bot.telegram.sendMessage(data.chatId, data.message);
    });
    
    // Bridge Telegram updates to WebSocket
    this.bot.on('message', (ctx: any) => {
      const { chat, from, message } = ctx;
      
      this.wsServer.broadcast('telegram-update', {
        type: 'message',
        chatId: `telegram:${chat.id}`,
        senderId: `telegram:${from.id}`,
        message: message.text || message.caption || '',
        timestamp: Date.now(),
      });
    });
    
    this.bot.on('callback_query', (ctx: any) => {
      this.wsServer.broadcast('telegram-update', {
        type: 'callback',
        chatId: `telegram:${ctx.callbackQuery.message?.chat.id}`,
        senderId: `telegram:${ctx.callbackQuery.from.id}`,
        data: ctx.callbackQuery.data,
        timestamp: Date.now(),
      });
    });
  }
}
```

## Complete Implementation

### Main Telegram Service

```typescript
// src/platforms/telegram/index.ts
import { TelegramBot } from './bot';
import { TelegramWebhook } from './webhook';
import { TelegramParser } from './parser';
import { TelegramFormatter } from './formatter';
import { TelegramStreamer } from './streaming';
import { TelegramRateLimiter } from './rate-limiter';
import { TelegramErrorHandler } from './errors';
import { AgentGateway } from '../../core/gateway';

export class TelegramService {
  private bot: TelegramBot;
  private webhook: TelegramWebhook;
  private parser: TelegramParser;
  private formatter: TelegramFormatter;
  private streamer: TelegramStreamer;
  private rateLimiter: TelegramRateLimiter;
  private errorHandler: TelegramErrorHandler;
  
  constructor(private gateway: AgentGateway, token: string) {
    this.parser = new TelegramParser();
    this.formatter = new TelegramFormatter();
    this.rateLimiter = new TelegramRateLimiter();
    this.errorHandler = new TelegramErrorHandler();
    
    // Initialize bot
    this.bot = new TelegramBot(gateway, token);
    
    // Initialize webhook
    this.webhook = new TelegramWebhook(gateway, process.env.TELEGRAM_WEBHOOK_SECRET);
  }
  
  async initialize() {
    // Set up webhook if in production
    if (process.env.NODE_ENV === 'production' && process.env.PUBLIC_URL) {
      await this.webhook.useWebhook(
        `${process.env.PUBLIC_URL}/gateway/webhook/telegram`,
        process.env.TELEGRAM_WEBHOOK_SECRET
      );
    }
    
    // Start bot for polling (if webhook not used)
    if (!process.env.USE_WEBHOOK) {
      await this.bot.start();
    }
  }
  
  async shutdown() {
    await this.bot.stop();
  }
  
  getWebhookRouter() {
    return this.webhook.getRouter();
  }
  
  async sendMessage(
    channelId: string,
    senderId: string,
    response: any,
    options: any = {}
  ) {
    const chatId = channelId.replace('telegram:', '');
    
    try {
      const formatted = this.formatter.formatResponse(response);
      
      if (formatted.type === 'text') {
        await this.sendText(chatId, formatted.text, options);
      } else if (formatted.type === 'photo') {
        await this.sendPhoto(chatId, formatted, options);
      } else if (formatted.type === 'document') {
        await this.sendDocument(chatId, formatted, options);
      }
    } catch (error) {
      const handled = this.errorHandler.handle(error);
      if (handled.message) {
        await this.sendText(chatId, handled.message, options);
      }
    }
  }
  
  async sendStream(
    channelId: string,
    stream: AsyncIterable<string>,
    options: any = {}
  ) {
    const chatId = channelId.replace('telegram:', '');
    await this.streamer.startStream(chatId, stream, options);
  }
  
  private async sendText(chatId: string, text: string, options: any = {}) {
    await this.rateLimiter.waitForSlot(chatId);
    const { Telegraf } = require('telegraf');
    const bot = new Telegraf(process.env.TELEGRAM_TOKEN!);
    await bot.telegram.sendMessage(chatId, text, { parse_mode: 'MarkdownV2', ...options });
  }
  
  private async sendPhoto(chatId: string, photo: any, options: any = {}) {
    await this.rateLimiter.waitForSlot(chatId);
    const { Telegraf } = require('telegraf');
    const bot = new Telegraf(process.env.TELEGRAM_TOKEN!);
    
    if (photo.url) {
      await bot.telegram.sendPhoto(chatId, photo.url, {
        caption: photo.caption,
        parse_mode: 'MarkdownV2',
        ...options,
      });
    } else if (photo.data) {
      await bot.telegram.sendPhoto(chatId, { source: Buffer.from(photo.data) }, {
        caption: photo.caption,
        parse_mode: 'MarkdownV2',
        ...options,
      });
    }
  }
  
  private async sendDocument(chatId: string, doc: any, options: any = {}) {
    await this.rateLimiter.waitForSlot(chatId);
    const { Telegraf } = require('telegraf');
    const bot = new Telegraf(process.env.TELEGRAM_TOKEN!);
    
    if (doc.url) {
      await bot.telegram.sendDocument(chatId, doc.url, {
        caption: doc.caption,
        parse_mode: 'MarkdownV2',
        ...options,
      });
    } else if (doc.data) {
      await bot.telegram.sendDocument(chatId, { source: Buffer.from(doc.data) }, {
        caption: doc.caption,
        parse_mode: 'MarkdownV2',
        ...options,
      });
    }
  }
}
```

## Configuration

### config/telegram.json

```json
{
  "enabled": true,
  "token": "${TELEGRAM_TOKEN}",
  "webhookUrl": "${PUBLIC_URL}/gateway/webhook/telegram",
  "webhookSecret": "${TELEGRAM_WEBHOOK_SECRET}",
  "useWebhook": true,
  "allowedChats": ["12345", "67890"],
  "blockedChats": ["-1001234567890"],
  "botName": "MyAgentBot",
  "parseMode": "MarkdownV2",
  "pollInterval": 1000,
  "rateLimit": {
    "messagesPerSecond": 30,
    "editIntervalMs": 2000
  }
}
```

## Testing

### Unit Tests

```typescript
describe('TelegramParser', () => {
  it('parses text message', () => {
    const message = {
      message_id: 1,
      from: { id: 123, is_bot: false, first_name: 'John' },
      chat: { id: 456, type: 'private' },
      date: 1717412345,
      text: 'Hello!',
    };
    
    const parsed = TelegramParser.parseMessage(message as any, false);
    expect(parsed.platform).toBe('telegram');
    expect(parsed.channelId).toBe('telegram:456');
    expect(parsed.senderId).toBe('telegram:123');
    expect(parsed.content).toBe('Hello!');
    expect(parsed.chatType).toBe('private');
  });
  
  it('parses command message', () => {
    const message = {
      message_id: 1,
      from: { id: 123 },
      chat: { id: 456, type: 'private' },
      date: 1717412345,
      text: '/start',
      entities: [{ type: 'bot_command', offset: 0, length: 6 }],
    };
    
    const parsed = TelegramParser.parseMessage(message as any, false);
    expect(parsed.command).toBe('/start');
  });
  
  it('parses photo message', () => {
    const message = {
      message_id: 1,
      from: { id: 123 },
      chat: { id: 456, type: 'private' },
      date: 1717412345,
      photo: [
        { file_id: '1', width: 100, height: 100, file_size: 1024 },
        { file_id: '2', width: 200, height: 200, file_size: 4096 },
      ],
      caption: 'A photo',
    };
    
    const parsed = TelegramParser.parseMessage(message as any, false);
    expect(parsed.media?.type).toBe('photo');
    expect(parsed.media?.id).toBe('2'); // Highest resolution
    expect(parsed.content).toBe('A photo');
  });
});
```

### Integration Tests

```typescript
describe('TelegramService', () => {
  let service: TelegramService;
  let mockGateway: any;
  
  beforeAll(() => {
    mockGateway = {
      handleIncomingMessage: vi.fn(),
      generatePairingCode: vi.fn().mockReturnValue('ABC123'),
    };
    
    service = new TelegramService(mockGateway, 'test-token');
  });
  
  it('parses and routes message', async () => {
    const message = {
      message_id: 1,
      from: { id: 123 },
      chat: { id: 456, type: 'private' },
      date: 1717412345,
      text: 'Hello',
    };
    
    mockGateway.handleIncomingMessage.mockResolvedValue({
      shouldRespond: true,
      response: 'Hi there!',
    });
    
    await service['webhook']['processUpdate']({ message });
    
    expect(mockGateway.handleIncomingMessage).toHaveBeenCalled();
  });
  
  it('handles stream response', async () => {
    const stream = (async function* () {
      yield 'Hello';
      yield ' ';
      yield 'world!';
    })();
    
    await service.sendStream('telegram:456', stream);
    
    // Should not throw
  });
});
```

## Deployment

### Docker Setup

```dockerfile
FROM node:20-alpine

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm ci --only=production

# Copy source
COPY dist ./dist

# Set environment variables
ENV TELEGRAM_TOKEN=${TELEGRAM_TOKEN}
ENV PUBLIC_URL=${PUBLIC_URL}
ENV TELEGRAM_WEBHOOK_SECRET=${TELEGRAM_WEBHOOK_SECRET}

# Expose ports
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/health || exit 1

CMD ["node", "dist/index.js"]
```

### Webhook Setup Script

```bash
#!/bin/bash
# setup-webhook.sh

# Set webhook URL
curl -F "url=${PUBLIC_URL}/gateway/webhook/telegram" \
  -F "secret_token=${TELEGRAM_WEBHOOK_SECRET}" \
  "https://api.telegram.org/bot${TELEGRAM_TOKEN}/setWebhook"

# Delete existing webhook (optional)
# curl "https://api.telegram.org/bot${TELEGRAM_TOKEN}/deleteWebhook"
```

## Best Practices

1. **Use Webhooks in Production**: More reliable than polling
2. **Secure Webhooks**: Always use secret tokens
3. **Rate Limiting**: Respect Telegram's rate limits (30 msg/sec)
4. **Error Handling**: Handle all Telegram error codes gracefully
5. **Logging**: Log all incoming/outgoing messages for debugging
6. **Message Batching**: For long responses, use editMessage
7. **Markdown Escaping**: Always escape MarkdownV2 special characters
8. **User Context**: Store user-specific data in context
9. **Session Management**: Maintain conversation state
10. **Security**: Validate all inputs, sanitize outputs

## Troubleshooting

### Common Issues

| Issue | Cause | Solution |
|-------|-------|----------|
| Bot not responding | Wrong token | Verify TELEGRAM_TOKEN |
| Webhook not working | URL not set | Run setup-webhook.sh |
| Rate limited | Too many requests | Slow down, check rate limiter |
| Message too long | >4096 chars | Split message into chunks |
| Edit not working | Message too old | Send new message instead |
| Invalid token | Token expired | Get new token from @BotFather |
| Connection errors | Network issues | Check network, retry |

### Debug Commands

```bash
# Test webhook locally with ngrok
ngrok http 3000
curl -F "url=https://abc123.ngrok.io/gateway/webhook/telegram" \
  "https://api.telegram.org/botTOKEN/setWebhook"

# Check bot info
curl "https://api.telegram.org/botTOKEN/getMe"

# Get webhook info
curl "https://api.telegram.org/botTOKEN/getWebhookInfo"

# Delete webhook
curl "https://api.telegram.org/botTOKEN/deleteWebhook"

# Send test message
curl -X POST "https://api.telegram.org/botTOKEN/sendMessage" \
  -d "chat_id=12345&text=Hello"
```

## Resources

- [Telegram Bot API](https://core.telegram.org/bots/api)
- [Telegraf.js](https://telegraf.js.org/) - Node.js framework
- [BotFather](https://t.me/BotFather) - Create bots
- [Telegram API Limits](https://core.telegram.org/bots/faq#my-bot-is-hitting-limits-how-do-i-avoid-this)
- [MarkdownV2 Syntax](https://core.telegram.org/bots/api#markdownv2-style)

## Principles

1. **Reliability**: Handle all error cases gracefully
2. **Performance**: Optimize for Telegram's rate limits
3. **User Experience**: Provide good formatting and responses
4. **Security**: Validate all inputs, protect tokens
5. **Maintainability**: Well-structured, documented code
6. **Extensibility**: Easy to add new features
