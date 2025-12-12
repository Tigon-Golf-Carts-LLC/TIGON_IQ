import type { Express } from "express";
import { storage } from "./storage";

// Store for managing polling connections and last-seen message IDs
const pollingConnections = new Map<string, {
  conversationId: string;
  lastMessageId: string | null;
  lastPoll: number;
}>();

// Cleanup old polling connections every 5 minutes
setInterval(() => {
  const fiveMinutesAgo = Date.now() - 5 * 60 * 1000;
  for (const [key, connection] of pollingConnections.entries()) {
    if (connection.lastPoll < fiveMinutesAgo) {
      pollingConnections.delete(key);
    }
  }
}, 5 * 60 * 1000);

/**
 * Setup polling endpoints as an alternative to WebSockets
 * This is necessary for serverless environments like Vercel that don't support WebSockets
 */
export function setupPolling(app: Express) {

  // GET /api/polling/messages/:conversationId - Long-polling endpoint for new messages
  app.get('/api/polling/messages/:conversationId', async (req, res) => {
    const { conversationId } = req.params;
    const { lastMessageId, timeout = 25000 } = req.query;

    // Set headers for SSE-like response
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    const pollTimeout = Math.min(Number(timeout), 30000); // Max 30 seconds
    const startTime = Date.now();

    // Store polling connection
    const connectionKey = `${conversationId}-${Date.now()}`;
    pollingConnections.set(connectionKey, {
      conversationId,
      lastMessageId: lastMessageId as string || null,
      lastPoll: startTime
    });

    // Poll for new messages
    const checkForMessages = async (): Promise<boolean> => {
      try {
        const messages = await storage.getConversationMessages(conversationId);

        // Filter messages newer than lastMessageId
        let newMessages = messages;
        if (lastMessageId) {
          const lastIndex = messages.findIndex(m => m.id === lastMessageId);
          if (lastIndex >= 0) {
            newMessages = messages.slice(lastIndex + 1);
          }
        }

        if (newMessages.length > 0) {
          res.json({
            type: 'messages',
            messages: newMessages,
            hasMore: false
          });
          pollingConnections.delete(connectionKey);
          return true;
        }

        return false;
      } catch (error) {
        console.error('Error polling messages:', error);
        return false;
      }
    };

    // Initial check
    const hasMessages = await checkForMessages();
    if (hasMessages) return;

    // Long polling - check every 2 seconds
    const pollInterval = setInterval(async () => {
      const hasMessages = await checkForMessages();
      if (hasMessages || Date.now() - startTime > pollTimeout) {
        clearInterval(pollInterval);
        pollingConnections.delete(connectionKey);

        if (!res.headersSent) {
          res.json({
            type: 'timeout',
            messages: [],
            hasMore: true
          });
        }
      }
    }, 2000);

    // Cleanup on client disconnect
    req.on('close', () => {
      clearInterval(pollInterval);
      pollingConnections.delete(connectionKey);
    });
  });

  // POST /api/polling/send/:conversationId - Send message via polling (non-WebSocket)
  app.post('/api/polling/send/:conversationId', async (req, res) => {
    try {
      const { conversationId } = req.params;
      const { content, senderType = 'customer', senderId = null } = req.body;

      if (!content) {
        return res.status(400).json({ error: 'Message content is required' });
      }

      // Create message
      const message = await storage.createMessage({
        conversationId,
        content,
        senderType,
        senderId,
        messageType: 'text',
        metadata: {}
      });

      // Get conversation to check if AI is enabled
      const conversation = await storage.getConversation(conversationId);

      // Handle AI response for customer messages (if applicable)
      if (senderType === 'customer' && conversation?.isAiAssisted) {
        // Import AI handling dynamically to avoid circular dependencies
        const { generateAIResponse } = await import('./services/openai');
        const messages = await storage.getConversationMessages(conversationId);
        const chatHistory = messages.slice(-10).map(msg => ({
          role: msg.senderType === 'customer' ? 'user' as const : 'assistant' as const,
          content: msg.content,
        }));

        try {
          const aiResponse = await generateAIResponse(chatHistory, {
            systemPrompt: 'You are a helpful customer service assistant.',
            maxTokens: 2000,
            temperature: 0.7,
            model: 'gpt-4o-mini',
          });

          await storage.createMessage({
            conversationId,
            content: aiResponse.content,
            senderType: 'ai',
            senderId: null,
            messageType: 'text',
            metadata: {}
          });
        } catch (aiError) {
          console.error('AI response error:', aiError);
        }
      }

      res.json({
        success: true,
        message
      });
    } catch (error) {
      console.error('Error sending message:', error);
      res.status(500).json({ error: 'Failed to send message' });
    }
  });

  // GET /api/polling/status - Health check for polling
  app.get('/api/polling/status', (req, res) => {
    res.json({
      status: 'ok',
      activeConnections: pollingConnections.size,
      timestamp: Date.now()
    });
  });
}
