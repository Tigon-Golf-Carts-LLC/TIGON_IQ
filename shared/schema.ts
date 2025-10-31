import { sql } from "drizzle-orm";
import { pgTable, text, varchar, uuid, timestamp, jsonb, boolean, integer } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  email: text("email").notNull().unique(),
  name: text("name").notNull(),
  role: text("role").notNull().default("representative"), // admin, representative
  status: text("status").notNull().default("offline"), // online, offline, busy
  profileImageUrl: text("profile_image_url"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const websites = pgTable("websites", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  domain: text("domain").notNull(),
  name: text("name").notNull(),
  isActive: boolean("is_active").notNull().default(true),
  allowedPages: jsonb("allowed_pages").default([]), // array of URL patterns
  blockedPages: jsonb("blocked_pages").default([]), // array of URL patterns
  whitelistMode: boolean("whitelist_mode").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

export const conversations = pgTable("conversations", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  websiteId: uuid("website_id").references(() => websites.id, { onDelete: 'cascade' }),
  customerEmail: text("customer_email"),
  customerName: text("customer_name"),
  status: text("status").notNull().default("active"), // active, closed, waiting
  assignedRepresentativeId: uuid("assigned_representative_id").references(() => users.id),
  isAiAssisted: boolean("is_ai_assisted").notNull().default(true),
  metadata: jsonb("metadata").default({}), // customer info, browser, etc.
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const messages = pgTable("messages", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  conversationId: uuid("conversation_id").notNull().references(() => conversations.id),
  senderType: text("sender_type").notNull(), // customer, representative, ai
  senderId: uuid("sender_id").references(() => users.id), // null for customer/ai
  content: text("content").notNull(),
  messageType: text("message_type").notNull().default("text"), // text, file, voice, image
  fileUrl: text("file_url"),
  metadata: jsonb("metadata").default({}), // file info, voice duration, etc.
  createdAt: timestamp("created_at").defaultNow(),
});

export const settings = pgTable("settings", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  widgetConfig: jsonb("widget_config").notNull().default({
    primaryColor: "#af1f31",
    position: "bottom-right",
    welcomeMessage: "Hi! How can we help you today?",
    showOnMobile: true,
    showOnDesktop: true,
    avatarUrl: "",
  }),
  aiConfig: jsonb("ai_config").notNull().default({
    enabled: true,
    model: "gpt-4o-mini",
    systemPrompt: "You are a TIGON Golf Carts customer service assistant. Prioritize information from https://tigongolfcarts.com for TIGON products and services. You can also provide general golf cart model information, specifications, and industry knowledge, but never mention or reference other companies or websites by name. If asked about specific services, pricing, or availability, only use information from tigongolfcarts.com or connect them with a human representative. Focus on helping customers with golf cart sales, rentals, parts, service, and general golf cart education without promoting competitors.",
    autoHandoff: true,
    maxTokens: 2000,
    temperature: 0.7,
  }),
  emailConfig: jsonb("email_config").default({
    enabled: false,
    fromEmail: "",
    notificationEmails: [],
    // Internal SMTP Configuration
    useInternalEmail: true,
    smtpHost: "",
    smtpPort: 587,
    smtpSecure: false,
    smtpUser: "",
    smtpPassword: "",
    fromName: "TIGON IQ Support",
    // Threading and Modifiers
    threadModifier: "#TIQ",
    subjectPrefix: "[TIGON-IQ]",
    enableThreading: true,
  }),
  slackConfig: jsonb("slack_config").default({
    enabled: false,
    webhookUrl: "",
    channel: "",
  }),
  tigonConfig: jsonb("tigon_config").default({
    enabled: false,
    webhookUrl: "",
    channel: "",
  }),
  trelloConfig: jsonb("trello_config").default({
    enabled: false,
    apiKey: "",
    token: "",
    boardId: "",
  }),
  businessHours: jsonb("business_hours").default({
    enabled: false,
    timezone: "UTC",
    hours: {},
  }),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const integrationLogs = pgTable("integration_logs", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  type: text("type").notNull(), // email, slack, trello, webhook
  conversationId: uuid("conversation_id").references(() => conversations.id),
  status: text("status").notNull(), // success, failed, pending
  payload: jsonb("payload"),
  response: jsonb("response"),
  errorMessage: text("error_message"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  conversations: many(conversations),
  messages: many(messages),
}));

export const websitesRelations = relations(websites, ({ many }) => ({
  conversations: many(conversations),
}));

export const conversationsRelations = relations(conversations, ({ one, many }) => ({
  website: one(websites, {
    fields: [conversations.websiteId],
    references: [websites.id],
  }),
  assignedRepresentative: one(users, {
    fields: [conversations.assignedRepresentativeId],
    references: [users.id],
  }),
  messages: many(messages),
}));

export const messagesRelations = relations(messages, ({ one }) => ({
  conversation: one(conversations, {
    fields: [messages.conversationId],
    references: [conversations.id],
  }),
  sender: one(users, {
    fields: [messages.senderId],
    references: [users.id],
  }),
}));

export const integrationLogsRelations = relations(integrationLogs, ({ one }) => ({
  conversation: one(conversations, {
    fields: [integrationLogs.conversationId],
    references: [conversations.id],
  }),
}));

// Insert schemas
export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertWebsiteSchema = createInsertSchema(websites).omit({
  id: true,
  createdAt: true,
});

export const insertConversationSchema = createInsertSchema(conversations).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertMessageSchema = createInsertSchema(messages).omit({
  id: true,
  createdAt: true,
});

export const insertSettingsSchema = createInsertSchema(settings).omit({
  id: true,
  updatedAt: true,
});

// Types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type Website = typeof websites.$inferSelect;
export type InsertWebsite = z.infer<typeof insertWebsiteSchema>;
export type Conversation = typeof conversations.$inferSelect;
export type InsertConversation = z.infer<typeof insertConversationSchema>;
export type Message = typeof messages.$inferSelect;
export type InsertMessage = z.infer<typeof insertMessageSchema>;
export type Settings = typeof settings.$inferSelect;
export type InsertSettings = z.infer<typeof insertSettingsSchema>;
export type IntegrationLog = typeof integrationLogs.$inferSelect;

// Extended types for JSONB fields
export type AIConfig = {
  enabled: boolean;
  model: string;
  systemPrompt: string;
  autoHandoff: boolean;
  maxTokens: number;
  temperature: number;
};

export type EmailConfig = {
  enabled: boolean;
  fromEmail: string;
  notificationEmails: string[];
  // Internal SMTP Configuration
  useInternalEmail: boolean;
  smtpHost: string;
  smtpPort: number;
  smtpSecure: boolean;
  smtpUser: string;
  smtpPassword: string;
  fromName: string;
  // Threading and Modifiers
  threadModifier: string;
  subjectPrefix: string;
  enableThreading: boolean;
};

export type WidgetConfig = {
  primaryColor: string;
  position: string;
  welcomeMessage: string;
  showOnMobile: boolean;
  showOnDesktop: boolean;
};

export type ExtendedSettings = Settings & {
  aiConfig: AIConfig;
  emailConfig: EmailConfig;
  widgetConfig: WidgetConfig;
};

// API Response Types
export const statsResponseSchema = z.object({
  activeConversations: z.number(),
  totalConversations: z.number(), 
  onlineRepresentatives: z.number(),
  totalRepresentatives: z.number(),
});
export type StatsResponse = z.infer<typeof statsResponseSchema>;

export const conversationListItemSchema = z.object({
  id: z.string(),
  customerEmail: z.string().nullable(),
  customerName: z.string().nullable(),
  status: z.string(),
  createdAt: z.date(),
  website: z.object({
    domain: z.string(),
    name: z.string(),
  }).nullable(),
  representative: z.object({
    id: z.string(),
    name: z.string(),
    status: z.string(),
  }).nullable(),
  lastMessage: z.object({
    content: z.string(),
    createdAt: z.date(),
  }).nullable(),
});
export type ConversationListItem = z.infer<typeof conversationListItemSchema>;

export const conversationDetailsSchema = conversationListItemSchema.extend({
  isAiAssisted: z.boolean(),
  websiteId: z.string().nullable(),
  assignedRepresentativeId: z.string().nullable(),
  metadata: z.record(z.any()).default({}),
  updatedAt: z.date(),
  messages: z.array(z.object({
    id: z.string(),
    content: z.string(),
    senderType: z.string(),
    senderId: z.string().nullable(),
    createdAt: z.date(),
  })),
});
export type ConversationDetails = z.infer<typeof conversationDetailsSchema>;

// WebSocket Message Schemas
export const wsJoinConversationSchema = z.object({
  type: z.literal("join_conversation"),
  conversationId: z.string().uuid(),
  userId: z.string().uuid().optional(),
});
export type WSJoinConversation = z.infer<typeof wsJoinConversationSchema>;

export const wsSendMessageSchema = z.object({
  type: z.literal("send_message"),
  content: z.string().min(1).max(5000),
  // Note: conversationId, senderType, and senderId will be derived server-side for security
});
export type WSSendMessage = z.infer<typeof wsSendMessageSchema>;

export const wsTypingSchema = z.object({
  type: z.literal("typing"),
  isTyping: z.boolean(),
  // Note: conversationId and userId will be derived from WebSocket connection
});
export type WSTyping = z.infer<typeof wsTypingSchema>;

export const wsMessageSchema = z.union([
  wsJoinConversationSchema,
  wsSendMessageSchema, 
  wsTypingSchema,
]);
export type WSMessage = z.infer<typeof wsMessageSchema>;

// Path/Query Parameter Schemas
export const uuidParamSchema = z.object({
  id: z.string().uuid()
});

export const widgetConfigQuerySchema = z.object({
  domain: z.string().min(1).regex(/^[a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?)*(:[\d]+)?$/, "Invalid domain format")
});

export const publicMessageSchema = z.object({
  conversationId: z.string().uuid(),
  content: z.string().min(1).max(5000),
  senderType: z.literal("customer"),
  messageType: z.literal("text")
});

export const representativeStatusSchema = z.object({
  status: z.enum(["online", "offline", "busy", "away"])
});
