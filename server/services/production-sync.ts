import { db } from "../db";
import { users, websites, conversations, messages, settings, integrationLogs } from "@shared/schema";
import { eq } from "drizzle-orm";

const PRODUCTION_URL = process.env.PRODUCTION_URL || "https://tigoniq.com";

interface SyncResponse {
  users: any[];
  websites: any[];
  conversations: any[];
  messages: any[];
  settings: any[];
  integrationLogs: any[];
}

export class ProductionSyncService {
  /**
   * Fetch all data from production
   */
  async fetchProductionData(): Promise<SyncResponse> {
    try {
      const response = await fetch(`${PRODUCTION_URL}/api/sync/export`, {
        headers: {
          'Authorization': `Bearer ${process.env.SYNC_SECRET_KEY || 'development'}`,
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch production data: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error fetching production data:', error);
      throw error;
    }
  }

  /**
   * Sync users from production to development
   */
  async syncUsers(productionUsers: any[]) {
    for (const user of productionUsers) {
      try {
        // Check if user exists
        const existing = await db.query.users.findFirst({
          where: eq(users.id, user.id),
        });

        if (existing) {
          // Update existing user
          await db.update(users)
            .set({
              username: user.username,
              email: user.email,
              name: user.name,
              role: user.role,
              status: user.status,
              profileImageUrl: user.profileImageUrl,
              updatedAt: new Date(user.updatedAt),
            })
            .where(eq(users.id, user.id));
        } else {
          // Insert new user (preserve password from production)
          await db.insert(users).values({
            id: user.id,
            username: user.username,
            password: user.password,
            email: user.email,
            name: user.name,
            role: user.role,
            status: user.status,
            profileImageUrl: user.profileImageUrl,
            createdAt: new Date(user.createdAt),
            updatedAt: new Date(user.updatedAt),
          });
        }
      } catch (error) {
        console.error(`Error syncing user ${user.id}:`, error);
      }
    }
  }

  /**
   * Sync websites from production to development
   */
  async syncWebsites(productionWebsites: any[]) {
    for (const website of productionWebsites) {
      try {
        const existing = await db.query.websites.findFirst({
          where: eq(websites.id, website.id),
        });

        if (existing) {
          await db.update(websites)
            .set({
              domain: website.domain,
              name: website.name,
              isActive: website.isActive,
              allowedPages: website.allowedPages,
              blockedPages: website.blockedPages,
              whitelistMode: website.whitelistMode,
            })
            .where(eq(websites.id, website.id));
        } else {
          await db.insert(websites).values({
            id: website.id,
            domain: website.domain,
            name: website.name,
            isActive: website.isActive,
            allowedPages: website.allowedPages,
            blockedPages: website.blockedPages,
            whitelistMode: website.whitelistMode,
            createdAt: new Date(website.createdAt),
          });
        }
      } catch (error) {
        console.error(`Error syncing website ${website.id}:`, error);
      }
    }
  }

  /**
   * Sync conversations from production to development
   */
  async syncConversations(productionConversations: any[]) {
    for (const conv of productionConversations) {
      try {
        const existing = await db.query.conversations.findFirst({
          where: eq(conversations.id, conv.id),
        });

        if (existing) {
          await db.update(conversations)
            .set({
              websiteId: conv.websiteId,
              customerEmail: conv.customerEmail,
              customerName: conv.customerName,
              status: conv.status,
              assignedRepresentativeId: conv.assignedRepresentativeId,
              isAiAssisted: conv.isAiAssisted,
              metadata: conv.metadata,
              updatedAt: new Date(conv.updatedAt),
            })
            .where(eq(conversations.id, conv.id));
        } else {
          await db.insert(conversations).values({
            id: conv.id,
            websiteId: conv.websiteId,
            customerEmail: conv.customerEmail,
            customerName: conv.customerName,
            status: conv.status,
            assignedRepresentativeId: conv.assignedRepresentativeId,
            isAiAssisted: conv.isAiAssisted,
            metadata: conv.metadata,
            createdAt: new Date(conv.createdAt),
            updatedAt: new Date(conv.updatedAt),
          });
        }
      } catch (error) {
        console.error(`Error syncing conversation ${conv.id}:`, error);
      }
    }
  }

  /**
   * Sync messages from production to development
   */
  async syncMessages(productionMessages: any[]) {
    for (const msg of productionMessages) {
      try {
        const existing = await db.query.messages.findFirst({
          where: eq(messages.id, msg.id),
        });

        if (!existing) {
          await db.insert(messages).values({
            id: msg.id,
            conversationId: msg.conversationId,
            senderType: msg.senderType,
            senderId: msg.senderId,
            content: msg.content,
            messageType: msg.messageType,
            fileUrl: msg.fileUrl,
            metadata: msg.metadata,
            createdAt: new Date(msg.createdAt),
          });
        }
      } catch (error) {
        console.error(`Error syncing message ${msg.id}:`, error);
      }
    }
  }

  /**
   * Sync settings from production to development
   */
  async syncSettings(productionSettings: any[]) {
    for (const setting of productionSettings) {
      try {
        const existing = await db.query.settings.findFirst({
          where: eq(settings.id, setting.id),
        });

        if (existing) {
          await db.update(settings)
            .set({
              widgetConfig: setting.widgetConfig,
              aiConfig: setting.aiConfig,
              emailConfig: setting.emailConfig,
              slackConfig: setting.slackConfig,
              tigonConfig: setting.tigonConfig,
              trelloConfig: setting.trelloConfig,
              businessHours: setting.businessHours,
              updatedAt: new Date(setting.updatedAt),
            })
            .where(eq(settings.id, setting.id));
        } else {
          await db.insert(settings).values({
            id: setting.id,
            widgetConfig: setting.widgetConfig,
            aiConfig: setting.aiConfig,
            emailConfig: setting.emailConfig,
            slackConfig: setting.slackConfig,
            tigonConfig: setting.tigonConfig,
            trelloConfig: setting.trelloConfig,
            businessHours: setting.businessHours,
            updatedAt: new Date(setting.updatedAt),
          });
        }
      } catch (error) {
        console.error(`Error syncing settings ${setting.id}:`, error);
      }
    }
  }

  /**
   * Sync integration logs from production to development
   */
  async syncIntegrationLogs(productionLogs: any[]) {
    for (const log of productionLogs) {
      try {
        const existing = await db.query.integrationLogs.findFirst({
          where: eq(integrationLogs.id, log.id),
        });

        if (!existing) {
          await db.insert(integrationLogs).values({
            id: log.id,
            type: log.type,
            conversationId: log.conversationId,
            status: log.status,
            payload: log.payload,
            response: log.response,
            errorMessage: log.errorMessage,
            createdAt: new Date(log.createdAt),
          });
        }
      } catch (error) {
        console.error(`Error syncing integration log ${log.id}:`, error);
      }
    }
  }

  /**
   * Main sync function - pulls all data from production and syncs to development
   */
  async syncFromProduction(): Promise<{ success: boolean; message: string; stats: any }> {
    try {
      console.log('🔄 Starting production sync...');
      
      const productionData = await this.fetchProductionData();

      // Sync in order to respect foreign key constraints
      await this.syncUsers(productionData.users);
      await this.syncWebsites(productionData.websites);
      await this.syncConversations(productionData.conversations);
      await this.syncMessages(productionData.messages);
      await this.syncSettings(productionData.settings);
      await this.syncIntegrationLogs(productionData.integrationLogs);

      const stats = {
        users: productionData.users.length,
        websites: productionData.websites.length,
        conversations: productionData.conversations.length,
        messages: productionData.messages.length,
        settings: productionData.settings.length,
        integrationLogs: productionData.integrationLogs.length,
      };

      console.log('✅ Production sync completed:', stats);
      
      return {
        success: true,
        message: 'Production data synced successfully',
        stats,
      };
    } catch (error) {
      console.error('❌ Production sync failed:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error',
        stats: {},
      };
    }
  }
}

export const productionSyncService = new ProductionSyncService();
