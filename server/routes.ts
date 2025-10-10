import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer } from "ws";
import WebSocket from "ws";
import { setupAuth, requireAuth, requireRole } from "./auth";
import { storage } from "./storage";
import { generateAIResponse, shouldHandoffToHuman, extractCustomerIntent } from "./services/openai";
import { internalEmailService } from "./services/internal-email";
import { z } from "zod";
import { 
  wsMessageSchema, 
  wsSendMessageSchema, 
  wsJoinConversationSchema,
  wsTypingSchema,
  insertConversationSchema,
  insertMessageSchema,
  insertWebsiteSchema,
  insertSettingsSchema,
  uuidParamSchema,
  widgetConfigQuerySchema,
  representativeStatusSchema,
  publicMessageSchema,
  type WSMessage,
  type WSSendMessage,
  type WSJoinConversation,
  type WSTyping,
  type ExtendedSettings,
  type AIConfig,
  type EmailConfig
} from "../shared/schema";

interface WebSocketClient extends WebSocket {
  conversationId?: string;
  userId?: string;
  userRole?: 'customer' | 'representative' | 'admin';
  isAuthenticated?: boolean;
  isAlive?: boolean;
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Setup authentication routes
  setupAuth(app);

  const httpServer = createServer(app);

  // WebSocket server for real-time chat
  const wss = new WebSocketServer({ server: httpServer, path: '/ws' });

  // Track connected clients
  const clients = new Map<string, Set<WebSocketClient>>();

  // WebSocket connection handling
  wss.on('connection', (ws: WebSocketClient, req) => {
    ws.isAlive = true;

    ws.on('pong', () => {
      ws.isAlive = true;
    });

    ws.on('message', async (data) => {
      try {
        const rawMessage = JSON.parse(data.toString());
        
        // Validate message with Zod schema
        const validationResult = wsMessageSchema.safeParse(rawMessage);
        if (!validationResult.success) {
          console.error('Invalid WebSocket message:', validationResult.error);
          ws.send(JSON.stringify({ 
            type: 'error', 
            message: 'Invalid message format',
            errors: validationResult.error.issues 
          }));
          return;
        }

        const message = validationResult.data;
        
        switch (message.type) {
          case 'join_conversation':
            await handleJoinConversation(message, ws);
            break;

          case 'send_message':
            await handleNewMessage(message, ws);
            break;

          case 'typing':
            await handleTyping(message, ws);
            break;
        }
      } catch (error) {
        console.error('WebSocket message error:', error);
        ws.send(JSON.stringify({ type: 'error', message: 'Invalid message format' }));
      }
    });

    ws.on('close', () => {
      if (ws.conversationId && clients.has(ws.conversationId)) {
        clients.get(ws.conversationId)!.delete(ws);
        if (clients.get(ws.conversationId)!.size === 0) {
          clients.delete(ws.conversationId);
        }
      }
    });
  });

  // Heartbeat to detect broken connections
  const interval = setInterval(() => {
    wss.clients.forEach((ws: WebSocketClient) => {
      if (ws.isAlive === false) return ws.terminate();
      
      ws.isAlive = false;
      ws.ping();
    });
  }, 30000);

  wss.on('close', () => {
    clearInterval(interval);
  });

  function broadcastToConversation(conversationId: string, message: object, sender?: WebSocketClient) {
    const conversationClients = clients.get(conversationId);
    if (conversationClients) {
      conversationClients.forEach(client => {
        if (client !== sender && client.readyState === WebSocket.OPEN) {
          client.send(JSON.stringify(message));
        }
      });
    }
  }

  async function handleJoinConversation(message: WSJoinConversation, ws: WebSocketClient) {
    // Basic conversation access validation
    try {
      // Verify conversation exists
      const conversation = await storage.getConversationWithDetails(message.conversationId);
      if (!conversation) {
        ws.send(JSON.stringify({ 
          type: 'error', 
          message: 'Conversation not found' 
        }));
        return;
      }

      // For production: Implement proper JWT token validation here
      // Example: Verify token from query string, validate user access to conversation
      // const token = parseTokenFromQuery(ws.url);
      // const user = validateJWT(token);
      // if (!canAccessConversation(user, conversation)) return unauthorized;
      
      ws.conversationId = message.conversationId;
      ws.userId = message.userId;
      
      // Set authentication flags for representatives to enable real-time message sending
      if (message.userId) {
        // Verify the user exists and is a representative
        const user = await storage.getUser(message.userId);
        if (user && (user.role === 'representative' || user.role === 'admin')) {
          ws.isAuthenticated = true;
          ws.userRole = 'representative';
        }
      } else {
        // This is a customer connection
        ws.isAuthenticated = true;
        ws.userRole = 'customer';
      }
      
      if (!clients.has(message.conversationId)) {
        clients.set(message.conversationId, new Set());
      }
      clients.get(message.conversationId)!.add(ws);
      
      ws.send(JSON.stringify({ 
        type: 'joined', 
        conversationId: message.conversationId 
      }));
    } catch (error) {
      console.error('Error handling join conversation:', error);
      ws.send(JSON.stringify({ 
        type: 'error', 
        message: 'Failed to join conversation' 
      }));
    }
  }

  async function handleTyping(message: WSTyping, ws: WebSocketClient) {
    if (!ws.isAuthenticated || !ws.conversationId) {
      ws.send(JSON.stringify({ 
        type: 'error', 
        message: 'Not authenticated or not joined to conversation' 
      }));
      return;
    }

    broadcastToConversation(ws.conversationId, {
      type: 'typing',
      userId: ws.userId,
      isTyping: message.isTyping,
    }, ws);
  }

  async function handleNewMessage(messageData: WSSendMessage, ws: WebSocketClient) {
    try {
      if (!ws.isAuthenticated || !ws.conversationId) {
        ws.send(JSON.stringify({ 
          type: 'error', 
          message: 'Not authenticated or not joined to conversation' 
        }));
        return;
      }

      const { content } = messageData;
      
      // Derive identity from authenticated WebSocket connection
      const conversationId = ws.conversationId;
      const senderType = ws.userRole === 'customer' ? 'customer' : 'representative';
      const senderId = ws.userRole === 'customer' ? null : ws.userId;

      // Create message in database
      const newMessage = await storage.createMessage({
        conversationId,
        content,
        senderType,
        senderId: senderId || null,
        messageType: 'text',
        metadata: {},
      });

      // Get conversation details
      const conversation = await storage.getConversationWithDetails(conversationId);
      if (!conversation) return;

      // Broadcast message to all clients in conversation
      broadcastToConversation(conversationId, {
        type: 'new_message',
        message: newMessage,
      });

      // Handle AI response for customer messages
      if (senderType === 'customer' && conversation.isAiAssisted) {
        await handleAIResponse(conversation, newMessage);
      }

      // Send email notifications if configured
      const settings = await storage.getSettings() as ExtendedSettings | undefined;
      if (settings?.emailConfig?.enabled && senderType === 'customer') {
        // Configure internal email service with current settings
        if (settings.emailConfig.useInternalEmail && settings.emailConfig.smtpHost) {
          // Inject storage instance into email service for persistence
          (internalEmailService as any).storage = storage;
          
          internalEmailService.configure({
            enabled: settings.emailConfig.enabled,
            smtpHost: settings.emailConfig.smtpHost,
            smtpPort: settings.emailConfig.smtpPort || 587,
            smtpSecure: settings.emailConfig.smtpSecure || false,
            smtpUser: settings.emailConfig.smtpUser || '',
            smtpPassword: settings.emailConfig.smtpPassword || '',
            fromEmail: settings.emailConfig.fromEmail || '',
            fromName: settings.emailConfig.fromName || 'TIGON IQ Support',
            notificationEmails: settings.emailConfig.notificationEmails || [],
            threadModifier: settings.emailConfig.threadModifier || '#TIQ',
            subjectPrefix: settings.emailConfig.subjectPrefix || '[TIGON-IQ]',
            enableThreading: settings.emailConfig.enableThreading !== false
          });

          // Check if this is a new conversation (first customer message)
          const conversationMessages = await storage.getConversationMessages(conversation.id);
          const isNewConversation = conversationMessages.length === 1;

          await internalEmailService.sendConversationNotification(
            conversation,
            newMessage,
            isNewConversation
          );
        }
      }

    } catch (error) {
      console.error('Error handling new message:', error);
      ws.send(JSON.stringify({ type: 'error', message: 'Failed to send message' }));
    }
  }

  async function handleAIResponse(conversation: { id: string; isAiAssisted: boolean; }, customerMessage: { id: string; content: string; senderType: string; }) {
    try {
      const settings = await storage.getSettings() as ExtendedSettings | undefined;
      if (!settings?.aiConfig?.enabled) return;

      // Get conversation history for context
      const messages = await storage.getConversationMessages(conversation.id);
      const chatHistory = messages.slice(-10).map(msg => ({
        role: msg.senderType === 'customer' ? 'user' as const : 'assistant' as const,
        content: msg.content,
      }));

      // Check if we should hand off to human
      const handoffCheck = await shouldHandoffToHuman(customerMessage.content, chatHistory);
      
      if (handoffCheck.shouldHandoff) {
        // Update conversation to require human assistance
        await storage.updateConversation(conversation.id, {
          status: 'waiting',
          isAiAssisted: false,
        });

        // Notify that a human will assist
        const handoffMessage = await storage.createMessage({
          conversationId: conversation.id,
          content: `I understand you need additional assistance. I'm connecting you with one of our human representatives who will be with you shortly. ${handoffCheck.reason ? `Reason: ${handoffCheck.reason}` : ''}`,
          senderType: 'ai',
          senderId: null,
          messageType: 'text',
          metadata: { handoffReason: handoffCheck.reason },
        });

        broadcastToConversation(conversation.id, {
          type: 'new_message',
          message: handoffMessage,
        });

        return;
      }

      // Generate AI response
      const aiResponse = await generateAIResponse(chatHistory, {
        systemPrompt: settings.aiConfig?.systemPrompt || 'You are a helpful customer service assistant.',
        maxTokens: settings.aiConfig?.maxTokens || 2000,
        temperature: settings.aiConfig?.temperature || 0.7,
      });

      // Save AI response
      const aiMessage = await storage.createMessage({
        conversationId: conversation.id,
        content: aiResponse.content,
        senderType: 'ai',
        senderId: null,
        messageType: 'text',
        metadata: {},
      });

      // Broadcast AI response
      broadcastToConversation(conversation.id, {
        type: 'new_message',
        message: aiMessage,
      });

    } catch (error) {
      console.error('Error generating AI response:', error);
      
      // Send fallback message
      const fallbackMessage = await storage.createMessage({
        conversationId: conversation.id,
        content: "I apologize, but I'm experiencing technical difficulties. A human representative will assist you shortly.",
        senderType: 'ai',
        senderId: null,
        messageType: 'text',
        metadata: { error: true },
      });

      broadcastToConversation(conversation.id, {
        type: 'new_message',
        message: fallbackMessage,
      });
    }
  }

  // API Routes

  // Dashboard stats
  app.get('/api/stats', requireAuth, async (req, res) => {
    try {
      const stats = await storage.getConversationStats();
      res.json(stats);
    } catch (error) {
      console.error('Error fetching stats:', error);
      res.status(500).json({ message: 'Failed to fetch stats' });
    }
  });

  // Conversations
  app.get('/api/conversations', requireAuth, async (req, res) => {
    try {
      const conversations = await storage.getActiveConversations();
      res.json(conversations);
    } catch (error) {
      console.error('Error fetching conversations:', error);
      res.status(500).json({ message: 'Failed to fetch conversations' });
    }
  });

  app.get('/api/conversations/:id', requireAuth, async (req, res) => {
    try {
      const paramValidation = uuidParamSchema.safeParse(req.params);
      if (!paramValidation.success) {
        return res.status(400).json({ 
          error: 'Invalid conversation ID', 
          details: paramValidation.error.issues 
        });
      }
      
      const conversation = await storage.getConversationWithDetails(paramValidation.data.id);
      if (!conversation) {
        return res.status(404).json({ message: 'Conversation not found' });
      }
      res.json(conversation);
    } catch (error) {
      console.error('Error fetching conversation:', error);
      res.status(500).json({ message: 'Failed to fetch conversation' });
    }
  });

  app.post('/api/conversations', async (req, res) => {
    try {
      const validationResult = insertConversationSchema.safeParse(req.body);
      if (!validationResult.success) {
        return res.status(400).json({ 
          error: 'Invalid request body', 
          details: validationResult.error.issues 
        });
      }
      
      const { websiteId, customerEmail, customerName } = validationResult.data;
      
      const conversation = await storage.createConversation({
        websiteId,
        customerEmail,
        customerName,
        status: 'active',
        isAiAssisted: true,
        metadata: {
          userAgent: req.headers['user-agent'],
          ip: req.ip,
          startTime: new Date().toISOString(),
        },
      });

      res.status(201).json(conversation);
    } catch (error) {
      console.error('Error creating conversation:', error);
      res.status(500).json({ message: 'Failed to create conversation' });
    }
  });

  app.patch('/api/conversations/:id', requireAuth, async (req, res) => {
    try {
      const paramValidation = uuidParamSchema.safeParse(req.params);
      if (!paramValidation.success) {
        return res.status(400).json({ 
          error: 'Invalid conversation ID', 
          details: paramValidation.error.issues 
        });
      }
      
      const validationResult = insertConversationSchema.partial().safeParse(req.body);
      if (!validationResult.success) {
        return res.status(400).json({ 
          error: 'Invalid request body', 
          details: validationResult.error.issues 
        });
      }
      
      const conversation = await storage.updateConversation(req.params.id, validationResult.data);
      if (!conversation) {
        return res.status(404).json({ message: 'Conversation not found' });
      }
      res.json(conversation);
    } catch (error) {
      console.error('Error updating conversation:', error);
      res.status(500).json({ message: 'Failed to update conversation' });
    }
  });

  // POST /api/conversations/:id/takeover - Allow representatives to take over AI-assisted conversations
  app.post('/api/conversations/:id/takeover', requireAuth, async (req, res) => {
    try {
      const paramValidation = uuidParamSchema.safeParse(req.params);
      if (!paramValidation.success) {
        return res.status(400).json({ 
          error: 'Invalid conversation ID', 
          details: paramValidation.error.issues 
        });
      }

      // Get current user from session
      const user = req.user;
      if (!user || user.role !== 'representative') {
        return res.status(403).json({ message: 'Only representatives can take over conversations' });
      }

      // Check if conversation exists
      const conversation = await storage.getConversation(paramValidation.data.id);
      if (!conversation) {
        return res.status(404).json({ message: 'Conversation not found' });
      }

      // Update conversation to assign representative and disable AI assistance
      const updatedConversation = await storage.updateConversation(req.params.id, {
        assignedRepresentativeId: user.id,
        isAiAssisted: false,
        status: 'active', // Ensure conversation remains active
      });

      if (!updatedConversation) {
        return res.status(500).json({ message: 'Failed to update conversation' });
      }

      // Create a system message to notify about the takeover
      await storage.createMessage({
        conversationId: req.params.id,
        content: `${user.name} has joined the conversation and will be assisting you.`,
        senderType: 'ai',
        senderId: null,
        messageType: 'text',
        metadata: { systemMessage: true, takeoverBy: user.id },
      });

      res.json({ 
        success: true, 
        conversation: updatedConversation,
        message: 'Conversation taken over successfully' 
      });
    } catch (error) {
      console.error('Error taking over conversation:', error);
      res.status(500).json({ message: 'Failed to take over conversation' });
    }
  });

  // POST /api/conversations/:id/ai-suggestions - Generate 3 AI-suggested response options
  app.post('/api/conversations/:id/ai-suggestions', requireAuth, async (req, res) => {
    try {
      const paramValidation = uuidParamSchema.safeParse(req.params);
      if (!paramValidation.success) {
        return res.status(400).json({ 
          error: 'Invalid conversation ID', 
          details: paramValidation.error.issues 
        });
      }

      // Get current user from session
      const user = req.user;
      if (!user || user.role !== 'representative') {
        return res.status(403).json({ message: 'Only representatives can access AI suggestions' });
      }

      // Get conversation details and messages
      const conversation = await storage.getConversationWithDetails(paramValidation.data.id);
      if (!conversation) {
        return res.status(404).json({ message: 'Conversation not found' });
      }

      const messages = await storage.getConversationMessages(conversation.id);
      if (messages.length === 0) {
        return res.status(400).json({ message: 'No messages found in conversation' });
      }

      // Convert messages to chat history format
      const chatHistory = messages.slice(-10).map(msg => ({
        role: msg.senderType === 'customer' ? 'user' as const : 'assistant' as const,
        content: msg.content,
      }));

      // Get the latest customer message for context
      const latestCustomerMessage = messages
        .filter(msg => msg.senderType === 'customer')
        .slice(-1)[0];

      if (!latestCustomerMessage) {
        return res.status(400).json({ message: 'No customer message found to respond to' });
      }

      // Define 3 different system prompts to generate varied responses
      const systemPrompts = [
        {
          id: 'professional',
          name: 'Professional & Direct',
          prompt: 'You are a professional customer service representative. Provide clear, direct, and efficient responses. Focus on solving the customer\'s issue quickly and professionally.'
        },
        {
          id: 'empathetic',
          name: 'Empathetic & Supportive',
          prompt: 'You are a caring and empathetic customer service representative. Show understanding and emotional support. Acknowledge the customer\'s feelings and provide reassuring, helpful responses.'
        },
        {
          id: 'detailed',
          name: 'Detailed & Educational',
          prompt: 'You are a knowledgeable customer service representative. Provide comprehensive, educational responses with step-by-step guidance. Include helpful context and detailed explanations.'
        }
      ];

      // Generate 3 AI suggestions with different approaches
      const suggestions = await Promise.allSettled(
        systemPrompts.map(async (promptConfig) => {
          const response = await generateAIResponse(chatHistory, {
            systemPrompt: promptConfig.prompt,
            maxTokens: 300,
          });
          return {
            id: promptConfig.id,
            name: promptConfig.name,
            content: response.content
          };
        })
      );

      // Process results and handle any failures
      const successfulSuggestions = suggestions
        .filter((result): result is PromiseFulfilledResult<any> => result.status === 'fulfilled')
        .map(result => result.value);

      if (successfulSuggestions.length === 0) {
        return res.status(500).json({ message: 'Failed to generate AI suggestions' });
      }

      res.json({
        suggestions: successfulSuggestions,
        customerMessage: latestCustomerMessage.content,
        conversationId: conversation.id
      });
    } catch (error) {
      console.error('Error generating AI suggestions:', error);
      res.status(500).json({ message: 'Failed to generate AI suggestions' });
    }
  });

  // Messages
  app.post('/api/messages', async (req, res) => {
    try {
      const validationResult = publicMessageSchema.safeParse(req.body);
      if (!validationResult.success) {
        return res.status(400).json({ 
          error: 'Invalid request body', 
          details: validationResult.error.issues 
        });
      }
      
      const message = await storage.createMessage(validationResult.data);
      
      // Broadcast the message to conversation participants
      broadcastToConversation(validationResult.data.conversationId, {
        type: 'new_message',
        message,
      });
      
      // Handle AI response for customer messages
      if (message.senderType === 'customer') {
        const conversation = await storage.getConversation(validationResult.data.conversationId);
        if (conversation && conversation.isAiAssisted) {
          // Trigger AI response asynchronously (don't wait)
          handleAIResponse(conversation, message).catch(error => {
            console.error('Error generating AI response:', error);
          });
        }
      }
      
      res.status(201).json(message);
    } catch (error) {
      console.error('Error creating message:', error);
      res.status(500).json({ message: 'Failed to create message' });
    }
  });

  // Representatives
  app.get('/api/representatives', requireAuth, async (req, res) => {
    try {
      const representatives = await storage.getAllRepresentatives();
      const repsWithoutPasswords = representatives.map(({ password, ...rep }) => rep);
      res.json(repsWithoutPasswords);
    } catch (error) {
      console.error('Error fetching representatives:', error);
      res.status(500).json({ message: 'Failed to fetch representatives' });
    }
  });

  app.patch('/api/representatives/:id/status', requireAuth, async (req, res) => {
    try {
      const paramValidation = uuidParamSchema.safeParse(req.params);
      if (!paramValidation.success) {
        return res.status(400).json({ 
          error: 'Invalid representative ID', 
          details: paramValidation.error.issues 
        });
      }
      
      const validationResult = representativeStatusSchema.safeParse(req.body);
      if (!validationResult.success) {
        return res.status(400).json({ 
          error: 'Invalid request body', 
          details: validationResult.error.issues 
        });
      }
      
      const { status } = validationResult.data;
      await storage.updateRepresentativeStatus(req.params.id, status);
      res.json({ success: true });
    } catch (error) {
      console.error('Error updating representative status:', error);
      res.status(500).json({ message: 'Failed to update status' });
    }
  });

  // Websites
  app.get('/api/websites', requireAuth, async (req, res) => {
    try {
      const websites = await storage.getAllWebsites();
      res.json(websites);
    } catch (error) {
      console.error('Error fetching websites:', error);
      res.status(500).json({ message: 'Failed to fetch websites' });
    }
  });

  app.post('/api/websites', requireAuth, async (req, res) => {
    try {
      const validationResult = insertWebsiteSchema.safeParse(req.body);
      if (!validationResult.success) {
        return res.status(400).json({ 
          error: 'Invalid request body', 
          details: validationResult.error.issues 
        });
      }
      
      const website = await storage.createWebsite(validationResult.data);
      res.status(201).json(website);
    } catch (error) {
      console.error('Error creating website:', error);
      res.status(500).json({ message: 'Failed to create website' });
    }
  });

  app.patch('/api/websites/:id', requireAuth, async (req, res) => {
    try {
      const paramValidation = uuidParamSchema.safeParse(req.params);
      if (!paramValidation.success) {
        return res.status(400).json({ 
          error: 'Invalid website ID', 
          details: paramValidation.error.issues 
        });
      }
      
      const validationResult = insertWebsiteSchema.partial().safeParse(req.body);
      if (!validationResult.success) {
        return res.status(400).json({ 
          error: 'Invalid request body', 
          details: validationResult.error.issues 
        });
      }
      
      const website = await storage.updateWebsite(req.params.id, validationResult.data);
      if (!website) {
        return res.status(404).json({ message: 'Website not found' });
      }
      res.json(website);
    } catch (error) {
      console.error('Error updating website:', error);
      res.status(500).json({ message: 'Failed to update website' });
    }
  });

  // Settings
  app.get('/api/settings', requireAuth, async (req, res) => {
    try {
      const settings = await storage.getSettings();
      
      // Redact sensitive information before sending to client
      if (settings.emailConfig && settings.emailConfig.smtpPassword) {
        settings.emailConfig = {
          ...settings.emailConfig,
          smtpPassword: '[REDACTED]' // Never expose password to frontend
        };
      }
      
      res.json(settings);
    } catch (error) {
      console.error('Error fetching settings:', error);
      res.status(500).json({ message: 'Failed to fetch settings' });
    }
  });

  app.post('/api/settings', requireAuth, async (req, res) => {
    try {
      const validationResult = insertSettingsSchema.safeParse(req.body);
      if (!validationResult.success) {
        return res.status(400).json({ 
          error: 'Invalid request body', 
          details: validationResult.error.issues 
        });
      }
      
      const settings = await storage.createOrUpdateSettings(validationResult.data);
      res.json(settings);
    } catch (error) {
      console.error('Error updating settings:', error);
      res.status(500).json({ message: 'Failed to update settings' });
    }
  });

  // Public API for widget
  app.get('/api/widget/config', async (req, res) => {
    try {
      const queryValidation = widgetConfigQuerySchema.safeParse(req.query);
      if (!queryValidation.success) {
        return res.status(400).json({ 
          error: 'Invalid domain parameter', 
          details: queryValidation.error.issues 
        });
      }
      
      const { domain } = queryValidation.data;

      const website = await storage.getWebsiteByDomain(domain as string);
      if (!website || !website.isActive) {
        return res.status(404).json({ message: 'Website not found or inactive' });
      }

      const settings = await storage.getSettings();
      res.json({
        website,
        widgetConfig: settings?.widgetConfig || {},
      });
    } catch (error) {
      console.error('Error fetching widget config:', error);
      res.status(500).json({ message: 'Failed to fetch widget config' });
    }
  });

  // Sync API - Export all data (for production to serve development)
  app.get('/api/sync/export', async (req, res) => {
    try {
      // Verify sync secret key for security
      const authHeader = req.headers.authorization;
      const syncSecret = process.env.SYNC_SECRET_KEY || 'development';
      
      if (authHeader !== `Bearer ${syncSecret}`) {
        return res.status(401).json({ message: 'Unauthorized' });
      }

      // Fetch all data from storage
      const users = await storage.getAllUsers();
      const websites = await storage.getAllWebsites();
      const conversations = await storage.getAllConversations();
      const messages = await storage.getAllMessages();
      const settings = await storage.getAllSettings();
      const integrationLogs = await storage.getAllIntegrationLogs();

      res.json({
        users,
        websites,
        conversations,
        messages,
        settings,
        integrationLogs,
      });
    } catch (error) {
      console.error('Error exporting data:', error);
      res.status(500).json({ message: 'Failed to export data' });
    }
  });

  // Sync API - Trigger sync from production (for development)
  app.post('/api/sync/trigger', requireAuth, async (req, res) => {
    try {
      const { productionSyncService } = await import('./services/production-sync');
      const result = await productionSyncService.syncFromProduction();
      res.json(result);
    } catch (error) {
      console.error('Error triggering sync:', error);
      res.status(500).json({ 
        success: false,
        message: error instanceof Error ? error.message : 'Failed to trigger sync',
        stats: {},
      });
    }
  });

  return httpServer;
}
