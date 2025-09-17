(function() {
  'use strict';

  // Configuration
  const WIDGET_ID = 'chatbot-widget';
  const API_BASE = 'https://tigoniq.com';
  let widgetConfig = null;
  let conversationId = null;
  let socket = null;
  let isConnected = false;

  // State
  let isOpen = false;
  let messages = [];
  let messageInput = '';

  // Create widget styles
  function createStyles() {
    const style = document.createElement('style');
    style.textContent = `
      .chatbot-widget-container {
        position: fixed;
        z-index: 9999;
        font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      }
      
      .chatbot-widget-container.bottom-right {
        bottom: 20px;
        right: 20px;
      }
      
      .chatbot-widget-container.bottom-left {
        bottom: 20px;
        left: 20px;
      }
      
      .chatbot-widget-container.top-right {
        top: 20px;
        right: 20px;
      }
      
      .chatbot-button {
        width: 56px;
        height: 56px;
        border-radius: 50%;
        border: none;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: transform 0.2s;
      }
      
      .chatbot-button:hover {
        transform: scale(1.1);
      }
      
      .chatbot-window {
        width: 320px;
        height: 400px;
        background: white;
        border-radius: 12px;
        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
        display: flex;
        flex-direction: column;
        overflow: hidden;
        border: 1px solid #e2e8f0;
      }
      
      .chatbot-header {
        padding: 16px;
        color: white;
        display: flex;
        align-items: center;
        justify-content: space-between;
      }
      
      .chatbot-header-content {
        display: flex;
        align-items: center;
        gap: 8px;
      }
      
      .chatbot-header-icon {
        width: 32px;
        height: 32px;
        border-radius: 50%;
        background: rgba(255, 255, 255, 0.2);
        display: flex;
        align-items: center;
        justify-content: center;
      }
      
      .chatbot-close {
        background: none;
        border: none;
        color: rgba(255, 255, 255, 0.8);
        cursor: pointer;
        padding: 4px;
        border-radius: 4px;
        transition: background-color 0.2s;
      }
      
      .chatbot-close:hover {
        background: rgba(255, 255, 255, 0.1);
        color: white;
      }
      
      .chatbot-messages {
        flex: 1;
        overflow-y: auto;
        padding: 16px;
        display: flex;
        flex-direction: column;
        gap: 12px;
      }
      
      .chatbot-message {
        display: flex;
        max-width: 80%;
      }
      
      .chatbot-message.customer {
        align-self: flex-end;
      }
      
      .chatbot-message.bot {
        align-self: flex-start;
      }
      
      .chatbot-message-content {
        padding: 8px 12px;
        border-radius: 12px;
        font-size: 14px;
        line-height: 1.4;
        word-break: break-word;
      }
      
      .chatbot-message.customer .chatbot-message-content {
        color: white;
      }
      
      .chatbot-message.bot .chatbot-message-content {
        background: #f1f5f9;
        color: #334155;
      }
      
      .chatbot-message-meta {
        display: flex;
        align-items: center;
        gap: 4px;
        font-size: 10px;
        opacity: 0.7;
        margin-bottom: 4px;
      }
      
      .chatbot-input-container {
        padding: 16px;
        border-top: 1px solid #e2e8f0;
        display: flex;
        gap: 8px;
      }
      
      .chatbot-input {
        flex: 1;
        padding: 8px 12px;
        border: 1px solid #d1d5db;
        border-radius: 6px;
        font-size: 14px;
        outline: none;
      }
      
      .chatbot-input:focus {
        border-color: #3b82f6;
        box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.1);
      }
      
      .chatbot-send {
        padding: 8px 12px;
        border: none;
        border-radius: 6px;
        color: white;
        cursor: pointer;
        font-size: 14px;
        transition: opacity 0.2s;
      }
      
      .chatbot-send:disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }
      
      .chatbot-status {
        padding: 8px 16px;
        background: #fef3c7;
        color: #92400e;
        font-size: 12px;
        border-bottom: 1px solid #e2e8f0;
      }
      
      .chatbot-fade-in {
        animation: chatbotFadeIn 0.3s ease-out;
      }
      
      @keyframes chatbotFadeIn {
        from {
          opacity: 0;
          transform: translateY(10px);
        }
        to {
          opacity: 1;
          transform: translateY(0);
        }
      }
      
      @media (max-width: 480px) {
        .chatbot-widget-container {
          bottom: 10px !important;
          right: 10px !important;
          left: 10px !important;
        }
        
        .chatbot-window {
          width: 100%;
          height: 80vh;
        }
      }
    `;
    document.head.appendChild(style);
  }

  // Create SVG icons
  function createIcon(type) {
    const icons = {
      chat: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>',
      close: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6L6 18M6 6l12 12"/></svg>',
      send: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z"/></svg>',
      user: '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z"/></svg>',
      bot: '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="10" rx="2" ry="2"/><circle cx="12" cy="5" r="2"/><path d="M12 7v4"/><line x1="8" y1="16" x2="8" y2="16"/><line x1="16" y1="16" x2="16" y2="16"/></svg>'
    };
    return icons[type] || '';
  }

  // Fetch widget configuration
  async function loadConfig() {
    try {
      const domain = window.location.hostname;
      const response = await fetch(`${API_BASE}/api/widget/config?domain=${domain}`);
      
      if (!response.ok) {
        throw new Error('Widget not configured for this domain');
      }
      
      const config = await response.json();
      widgetConfig = config.widgetConfig;
      return config;
    } catch (error) {
      console.error('Failed to load widget config:', error);
      return null;
    }
  }

  // Create conversation
  async function createConversation(websiteId) {
    try {
      const response = await fetch(`${API_BASE}/api/conversations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          websiteId,
          customerEmail: null,
          customerName: null,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to create conversation');
      }

      const conversation = await response.json();
      conversationId = conversation.id;
      
      // Add welcome message
      messages.push({
        id: 'welcome',
        content: widgetConfig.welcomeMessage || 'Hi! How can we help you today?',
        senderType: 'ai',
        createdAt: new Date().toISOString(),
      });
      
      renderMessages();
      return conversation;
    } catch (error) {
      console.error('Error creating conversation:', error);
      return null;
    }
  }

  // WebSocket connection
  function connectWebSocket() {
    if (!conversationId) return;

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${API_BASE.replace('https://', '').replace('http://', '')}/ws`;
    
    socket = new WebSocket(wsUrl);

    socket.onopen = () => {
      isConnected = true;
      updateConnectionStatus();
      
      socket.send(JSON.stringify({
        type: 'join_conversation',
        conversationId,
        userId: null,
      }));
    };

    socket.onmessage = (event) => {
      const data = JSON.parse(event.data);
      
      if (data.type === 'new_message') {
        messages.push(data.message);
        renderMessages();
      } else if (data.type === 'typing') {
        // Handle typing indicators if needed
      }
    };

    socket.onclose = () => {
      isConnected = false;
      updateConnectionStatus();
    };

    socket.onerror = (error) => {
      console.error('WebSocket error:', error);
      isConnected = false;
      updateConnectionStatus();
    };
  }

  // Send message
  async function sendMessage() {
    const content = messageInput.trim();
    if (!content || !conversationId) return;

    const messageData = {
      type: 'send_message',
      conversationId,
      content,
      senderType: 'customer',
      senderId: null,
    };

    // Send via WebSocket if connected
    if (socket && isConnected) {
      socket.send(JSON.stringify(messageData));
    }

    // Also send via HTTP as backup
    try {
      await fetch(`${API_BASE}/api/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conversationId,
          content,
          senderType: 'customer',
          senderId: null,
          messageType: 'text',
        }),
      });
    } catch (error) {
      console.error('Error sending message via HTTP:', error);
    }

    // Clear input
    messageInput = '';
    updateInput();
  }

  // Format time
  function formatTime(timestamp) {
    return new Date(timestamp).toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  }

  // Render functions
  function renderWidget() {
    const container = document.getElementById(WIDGET_ID);
    if (!container) return;

    const primaryColor = widgetConfig.primaryColor || '#af1f31';
    const position = widgetConfig.position || 'bottom-right';

    container.className = `chatbot-widget-container ${position}`;
    
    if (!isOpen) {
      container.innerHTML = `
        <button class="chatbot-button" style="background-color: ${primaryColor};" onclick="openWidget()">
          ${createIcon('chat')}
        </button>
      `;
    } else {
      container.innerHTML = `
        <div class="chatbot-window chatbot-fade-in">
          <div class="chatbot-header" style="background-color: ${primaryColor};">
            <div class="chatbot-header-content">
              <div class="chatbot-header-icon">
                ${createIcon('chat')}
              </div>
              <span style="font-weight: 500; font-size: 14px;">Customer Support</span>
            </div>
            <button class="chatbot-close" onclick="closeWidget()">
              ${createIcon('close')}
            </button>
          </div>
          ${!isConnected && conversationId ? '<div class="chatbot-status">Connecting...</div>' : ''}
          <div class="chatbot-messages" id="chatbot-messages"></div>
          <div class="chatbot-input-container">
            <input 
              type="text" 
              class="chatbot-input" 
              id="chatbot-input"
              placeholder="Type your message..."
              onkeypress="handleKeyPress(event)"
              ${!isConnected && conversationId ? 'disabled' : ''}
            />
            <button 
              class="chatbot-send" 
              style="background-color: ${primaryColor};" 
              onclick="handleSendMessage()"
              ${!isConnected && conversationId ? 'disabled' : ''}
            >
              ${createIcon('send')}
            </button>
          </div>
        </div>
      `;
      
      renderMessages();
      updateInput();
    }
  }

  function renderMessages() {
    const messagesContainer = document.getElementById('chatbot-messages');
    if (!messagesContainer) return;

    const primaryColor = widgetConfig.primaryColor || '#af1f31';
    
    messagesContainer.innerHTML = messages.map(message => `
      <div class="chatbot-message ${message.senderType}">
        <div class="chatbot-message-content" ${message.senderType === 'customer' ? `style="background-color: ${primaryColor};"` : ''}>
          <div class="chatbot-message-meta">
            ${message.senderType === 'customer' ? createIcon('user') : createIcon('bot')}
            <span>${formatTime(message.createdAt)}</span>
          </div>
          ${message.content}
        </div>
      </div>
    `).join('');

    // Scroll to bottom
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
  }

  function updateInput() {
    const input = document.getElementById('chatbot-input');
    if (input) {
      input.value = messageInput;
    }
  }

  function updateConnectionStatus() {
    renderWidget();
  }

  // Global functions for event handlers
  window.openWidget = async function() {
    isOpen = true;
    renderWidget();
    
    if (!conversationId) {
      const config = await loadConfig();
      if (config) {
        await createConversation(config.website.id);
        connectWebSocket();
      }
    }
  };

  window.closeWidget = function() {
    isOpen = false;
    renderWidget();
    
    if (socket) {
      socket.close();
    }
  };

  window.handleSendMessage = function() {
    const input = document.getElementById('chatbot-input');
    if (input) {
      messageInput = input.value;
    }
    sendMessage();
  };

  window.handleKeyPress = function(event) {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      const input = document.getElementById('chatbot-input');
      if (input) {
        messageInput = input.value;
      }
      sendMessage();
    } else {
      const input = document.getElementById('chatbot-input');
      if (input) {
        messageInput = input.value;
      }
    }
  };

  // Check device compatibility
  function checkCompatibility() {
    const isMobile = window.innerWidth <= 768;
    const showOnMobile = widgetConfig.showOnMobile !== false;
    const showOnDesktop = widgetConfig.showOnDesktop !== false;
    
    return (isMobile && showOnMobile) || (!isMobile && showOnDesktop);
  }

  // Initialize widget
  async function initWidget() {
    // Create styles
    createStyles();
    
    // Load configuration
    const config = await loadConfig();
    if (!config) {
      console.error('Failed to load widget configuration');
      return;
    }

    // Check if widget should be shown on this device
    if (!checkCompatibility()) {
      return;
    }

    // Create widget container
    const container = document.createElement('div');
    container.id = WIDGET_ID;
    document.body.appendChild(container);

    // Render initial widget
    renderWidget();
  }

  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initWidget);
  } else {
    initWidget();
  }

})();
