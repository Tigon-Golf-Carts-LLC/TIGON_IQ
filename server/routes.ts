import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer } from "ws";
import WebSocket from "ws";
import { setupAuth, requireAuth, requireRole } from "./auth";
import { storage } from "./storage";
import { generateAIResponse, shouldHandoffToHuman, extractCustomerIntent } from "./services/openai";
import { sendConversationNotification, sendConversationSummary } from "./services/sendgrid";

interface WebSocketClient extends WebSocket {
  conversationId?: string;
  userId?: string;
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
        const message = JSON.parse(data.toString());
        
        switch (message.type) {
          case 'join_conversation':
            ws.conversationId = message.conversationId;
            ws.userId = message.userId;
            
            if (!clients.has(message.conversationId)) {
              clients.set(message.conversationId, new Set());
            }
            clients.get(message.conversationId)!.add(ws);
            break;

          case 'send_message':
            await handleNewMessage(message, ws);
            break;

          case 'typing':
            broadcastToConversation(message.conversationId, {
              type: 'typing',
              userId: message.userId,
              isTyping: message.isTyping,
            }, ws);
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

  function broadcastToConversation(conversationId: string, message: any, sender?: WebSocketClient) {
    const conversationClients = clients.get(conversationId);
    if (conversationClients) {
      conversationClients.forEach(client => {
        if (client !== sender && client.readyState === WebSocket.OPEN) {
          client.send(JSON.stringify(message));
        }
      });
    }
  }

  async function handleNewMessage(messageData: any, ws: WebSocketClient) {
    try {
      const { conversationId, content, senderType, senderId } = messageData;

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
      const settings = await storage.getSettings();
      if (settings?.emailConfig?.enabled && senderType === 'customer') {
        await sendConversationNotification(
          conversation,
          newMessage,
          settings.emailConfig.notificationEmails || [],
          settings.emailConfig.fromEmail || ''
        );
      }

    } catch (error) {
      console.error('Error handling new message:', error);
      ws.send(JSON.stringify({ type: 'error', message: 'Failed to send message' }));
    }
  }

  async function handleAIResponse(conversation: any, customerMessage: any) {
    try {
      const settings = await storage.getSettings();
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
        systemPrompt: settings.aiConfig.systemPrompt,
        maxTokens: settings.aiConfig.maxTokens,
      });

      // Save AI response
      const aiMessage = await storage.createMessage({
        conversationId: conversation.id,
        content: aiResponse,
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
      const conversation = await storage.getConversationWithDetails(req.params.id);
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
      const { websiteId, customerEmail, customerName } = req.body;
      
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
      const conversation = await storage.updateConversation(req.params.id, req.body);
      if (!conversation) {
        return res.status(404).json({ message: 'Conversation not found' });
      }
      res.json(conversation);
    } catch (error) {
      console.error('Error updating conversation:', error);
      res.status(500).json({ message: 'Failed to update conversation' });
    }
  });

  // Messages
  app.post('/api/messages', async (req, res) => {
    try {
      const message = await storage.createMessage(req.body);
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
      const { status } = req.body;
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
      const website = await storage.createWebsite(req.body);
      res.status(201).json(website);
    } catch (error) {
      console.error('Error creating website:', error);
      res.status(500).json({ message: 'Failed to create website' });
    }
  });

  app.patch('/api/websites/:id', requireAuth, async (req, res) => {
    try {
      const website = await storage.updateWebsite(req.params.id, req.body);
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
      res.json(settings);
    } catch (error) {
      console.error('Error fetching settings:', error);
      res.status(500).json({ message: 'Failed to fetch settings' });
    }
  });

  app.post('/api/settings', requireAuth, async (req, res) => {
    try {
      const settings = await storage.createOrUpdateSettings(req.body);
      res.json(settings);
    } catch (error) {
      console.error('Error updating settings:', error);
      res.status(500).json({ message: 'Failed to update settings' });
    }
  });

  // Public API for widget
  app.get('/api/widget/config', async (req, res) => {
    try {
      const { domain } = req.query;
      if (!domain) {
        return res.status(400).json({ message: 'Domain is required' });
      }

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

  return httpServer;
}
