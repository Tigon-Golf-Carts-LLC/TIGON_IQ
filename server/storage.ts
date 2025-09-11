import { 
  users, websites, conversations, messages, settings, integrationLogs,
  type User, type InsertUser, type Website, type InsertWebsite,
  type Conversation, type InsertConversation, type Message, type InsertMessage,
  type Settings, type InsertSettings, type IntegrationLog
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, and, or, sql } from "drizzle-orm";
import session from "express-session";
import connectPg from "connect-pg-simple";
import { pool } from "./db";

const PostgresSessionStore = connectPg(session);

export interface IStorage {
  // User methods
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: string, updates: Partial<User>): Promise<User | undefined>;
  getAllRepresentatives(): Promise<User[]>;
  updateRepresentativeStatus(id: string, status: string): Promise<void>;

  // Website methods
  getWebsite(id: string): Promise<Website | undefined>;
  getWebsiteByDomain(domain: string): Promise<Website | undefined>;
  createWebsite(website: InsertWebsite): Promise<Website>;
  updateWebsite(id: string, updates: Partial<Website>): Promise<Website | undefined>;
  getAllWebsites(): Promise<Website[]>;

  // Conversation methods
  getConversation(id: string): Promise<Conversation | undefined>;
  getConversationWithDetails(id: string): Promise<any>;
  createConversation(conversation: InsertConversation): Promise<Conversation>;
  updateConversation(id: string, updates: Partial<Conversation>): Promise<Conversation | undefined>;
  getActiveConversations(): Promise<any[]>;
  getConversationsByRepresentative(repId: string): Promise<any[]>;
  getConversationStats(): Promise<any>;

  // Message methods
  getMessage(id: string): Promise<Message | undefined>;
  createMessage(message: InsertMessage): Promise<Message>;
  getConversationMessages(conversationId: string): Promise<Message[]>;
  getRecentMessages(limit?: number): Promise<any[]>;

  // Settings methods
  getSettings(): Promise<Settings | undefined>;
  createOrUpdateSettings(settings: Partial<InsertSettings>): Promise<Settings>;

  // Integration logs
  createIntegrationLog(log: Omit<IntegrationLog, 'id' | 'createdAt'>): Promise<IntegrationLog>;
  getIntegrationLogs(conversationId?: string): Promise<IntegrationLog[]>;

  // Session store
  sessionStore: session.SessionStore;
}

export class DatabaseStorage implements IStorage {
  public sessionStore: session.SessionStore;

  constructor() {
    this.sessionStore = new PostgresSessionStore({ 
      pool, 
      createTableIfMissing: true 
    });
  }

  // User methods
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user || undefined;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values({
        ...insertUser,
        updatedAt: new Date(),
      })
      .returning();
    return user;
  }

  async updateUser(id: string, updates: Partial<User>): Promise<User | undefined> {
    const [user] = await db
      .update(users)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(users.id, id))
      .returning();
    return user || undefined;
  }

  async getAllRepresentatives(): Promise<User[]> {
    return await db.select().from(users).where(eq(users.role, 'representative'));
  }

  async updateRepresentativeStatus(id: string, status: string): Promise<void> {
    await db
      .update(users)
      .set({ status, updatedAt: new Date() })
      .where(eq(users.id, id));
  }

  // Website methods
  async getWebsite(id: string): Promise<Website | undefined> {
    const [website] = await db.select().from(websites).where(eq(websites.id, id));
    return website || undefined;
  }

  async getWebsiteByDomain(domain: string): Promise<Website | undefined> {
    const [website] = await db.select().from(websites).where(eq(websites.domain, domain));
    return website || undefined;
  }

  async createWebsite(website: InsertWebsite): Promise<Website> {
    const [newWebsite] = await db
      .insert(websites)
      .values(website)
      .returning();
    return newWebsite;
  }

  async updateWebsite(id: string, updates: Partial<Website>): Promise<Website | undefined> {
    const [website] = await db
      .update(websites)
      .set(updates)
      .where(eq(websites.id, id))
      .returning();
    return website || undefined;
  }

  async getAllWebsites(): Promise<Website[]> {
    return await db.select().from(websites).orderBy(desc(websites.createdAt));
  }

  // Conversation methods
  async getConversation(id: string): Promise<Conversation | undefined> {
    const [conversation] = await db.select().from(conversations).where(eq(conversations.id, id));
    return conversation || undefined;
  }

  async getConversationWithDetails(id: string): Promise<any> {
    const [conversation] = await db
      .select({
        conversation: conversations,
        website: websites,
        representative: users,
      })
      .from(conversations)
      .leftJoin(websites, eq(conversations.websiteId, websites.id))
      .leftJoin(users, eq(conversations.assignedRepresentativeId, users.id))
      .where(eq(conversations.id, id));

    if (!conversation) return undefined;

    const conversationMessages = await this.getConversationMessages(id);

    return {
      ...conversation.conversation,
      website: conversation.website,
      representative: conversation.representative,
      messages: conversationMessages,
    };
  }

  async createConversation(conversation: InsertConversation): Promise<Conversation> {
    const [newConversation] = await db
      .insert(conversations)
      .values({
        ...conversation,
        updatedAt: new Date(),
      })
      .returning();
    return newConversation;
  }

  async updateConversation(id: string, updates: Partial<Conversation>): Promise<Conversation | undefined> {
    const [conversation] = await db
      .update(conversations)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(conversations.id, id))
      .returning();
    return conversation || undefined;
  }

  async getActiveConversations(): Promise<any[]> {
    return await db
      .select({
        conversation: conversations,
        website: websites,
        representative: users,
      })
      .from(conversations)
      .leftJoin(websites, eq(conversations.websiteId, websites.id))
      .leftJoin(users, eq(conversations.assignedRepresentativeId, users.id))
      .where(or(eq(conversations.status, 'active'), eq(conversations.status, 'waiting')))
      .orderBy(desc(conversations.updatedAt));
  }

  async getConversationsByRepresentative(repId: string): Promise<any[]> {
    return await db
      .select({
        conversation: conversations,
        website: websites,
      })
      .from(conversations)
      .leftJoin(websites, eq(conversations.websiteId, websites.id))
      .where(and(
        eq(conversations.assignedRepresentativeId, repId),
        or(eq(conversations.status, 'active'), eq(conversations.status, 'waiting'))
      ))
      .orderBy(desc(conversations.updatedAt));
  }

  async getConversationStats(): Promise<any> {
    const [stats] = await db
      .select({
        total: sql<number>`count(*)`,
        active: sql<number>`count(*) filter (where status = 'active')`,
        waiting: sql<number>`count(*) filter (where status = 'waiting')`,
        closed: sql<number>`count(*) filter (where status = 'closed')`,
      })
      .from(conversations);

    const [onlineReps] = await db
      .select({
        count: sql<number>`count(*)`,
      })
      .from(users)
      .where(and(eq(users.role, 'representative'), eq(users.status, 'online')));

    return {
      totalConversations: stats.total || 0,
      activeConversations: stats.active || 0,
      waitingConversations: stats.waiting || 0,
      closedConversations: stats.closed || 0,
      onlineRepresentatives: onlineReps.count || 0,
    };
  }

  // Message methods
  async getMessage(id: string): Promise<Message | undefined> {
    const [message] = await db.select().from(messages).where(eq(messages.id, id));
    return message || undefined;
  }

  async createMessage(message: InsertMessage): Promise<Message> {
    const [newMessage] = await db
      .insert(messages)
      .values(message)
      .returning();

    // Update conversation timestamp
    await db
      .update(conversations)
      .set({ updatedAt: new Date() })
      .where(eq(conversations.id, message.conversationId));

    return newMessage;
  }

  async getConversationMessages(conversationId: string): Promise<Message[]> {
    return await db
      .select()
      .from(messages)
      .where(eq(messages.conversationId, conversationId))
      .orderBy(messages.createdAt);
  }

  async getRecentMessages(limit: number = 50): Promise<any[]> {
    return await db
      .select({
        message: messages,
        conversation: conversations,
        sender: users,
      })
      .from(messages)
      .leftJoin(conversations, eq(messages.conversationId, conversations.id))
      .leftJoin(users, eq(messages.senderId, users.id))
      .orderBy(desc(messages.createdAt))
      .limit(limit);
  }

  // Settings methods
  async getSettings(): Promise<Settings | undefined> {
    const [settingsRecord] = await db.select().from(settings).limit(1);
    return settingsRecord || undefined;
  }

  async createOrUpdateSettings(settingsData: Partial<InsertSettings>): Promise<Settings> {
    const existingSettings = await this.getSettings();
    
    if (existingSettings) {
      const [updated] = await db
        .update(settings)
        .set({ ...settingsData, updatedAt: new Date() })
        .where(eq(settings.id, existingSettings.id))
        .returning();
      return updated;
    } else {
      const [created] = await db
        .insert(settings)
        .values({ ...settingsData, updatedAt: new Date() })
        .returning();
      return created;
    }
  }

  // Integration logs
  async createIntegrationLog(log: Omit<IntegrationLog, 'id' | 'createdAt'>): Promise<IntegrationLog> {
    const [newLog] = await db
      .insert(integrationLogs)
      .values(log)
      .returning();
    return newLog;
  }

  async getIntegrationLogs(conversationId?: string): Promise<IntegrationLog[]> {
    if (conversationId) {
      return await db
        .select()
        .from(integrationLogs)
        .where(eq(integrationLogs.conversationId, conversationId))
        .orderBy(desc(integrationLogs.createdAt));
    }
    
    return await db
      .select()
      .from(integrationLogs)
      .orderBy(desc(integrationLogs.createdAt))
      .limit(100);
  }
}

export const storage = new DatabaseStorage();
