import * as SQLite from 'expo-sqlite';
import { openDatabase } from '../index';

export interface Conversation {
  id: string;
  title?: string;
  started_at: string;
  ended_at?: string;
}

export interface ConversationMessage {
  id: string;
  conversation_id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  created_at: string;
}

export class ConversationRepository {
  private db: SQLite.SQLiteDatabase;

  constructor(db?: SQLite.SQLiteDatabase) {
    this.db = db ?? openDatabase();
  }

  findAll(): Conversation[] {
    return this.db.getAllSync<Conversation>(
      `SELECT * FROM conversations ORDER BY started_at DESC`
    );
  }

  findById(id: string): Conversation | null {
    return this.db.getFirstSync<Conversation>(
      `SELECT * FROM conversations WHERE id = ?`,
      [id]
    ) ?? null;
  }

  create(title?: string): Conversation {
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    this.db.runSync(
      `INSERT INTO conversations (id, title, started_at) VALUES (?, ?, ?)`,
      [id, title ?? null, now]
    );
    return this.findById(id)!;
  }

  addMessage(
    conversationId: string,
    role: 'user' | 'assistant' | 'system',
    content: string
  ): ConversationMessage {
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    this.db.runSync(
      `INSERT INTO conversation_messages (id, conversation_id, role, content, created_at)
       VALUES (?, ?, ?, ?, ?)`,
      [id, conversationId, role, content, now]
    );
    return this.db.getFirstSync<ConversationMessage>(
      `SELECT * FROM conversation_messages WHERE id = ?`,
      [id]
    )!;
  }

  getMessages(conversationId: string): ConversationMessage[] {
    return this.db.getAllSync<ConversationMessage>(
      `SELECT * FROM conversation_messages WHERE conversation_id = ? ORDER BY created_at ASC`,
      [conversationId]
    );
  }

  end(id: string): void {
    const now = new Date().toISOString();
    this.db.runSync(
      `UPDATE conversations SET ended_at = ? WHERE id = ?`,
      [now, id]
    );
  }
}
