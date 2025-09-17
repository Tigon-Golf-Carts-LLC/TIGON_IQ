(function() {
  'use strict';

  // Configuration
  const WIDGET_ID = 'chatbot-widget';
  const API_BASE = 'https://tigoniq.com';
  let widgetConfig = null;
  let conversationId = null;
  let socket = null;
  let isConnected = false;
  let isLiveMode = false;

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
        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        position: relative;
        overflow: hidden;
      }
      
      .chatbot-button:hover {
        transform: scale(1.1);
        box-shadow: 0 8px 25px rgba(0, 0, 0, 0.3);
      }
      
      .chatbot-button::before {
        content: '';
        position: absolute;
        top: 0;
        left: -100%;
        width: 100%;
        height: 100%;
        background: linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent);
        transition: left 0.5s;
      }
      
      .chatbot-button:hover::before {
        left: 100%;
      }
      
      .chatbot-window {
        width: 320px;
        height: 400px;
        background: white;
        border-radius: 0px 42px 42px 42px;
        box-shadow: 0 12px 40px rgba(0, 0, 0, 0.25);
        display: flex;
        flex-direction: column;
        overflow: hidden;
        border: 1px solid #e2e8f0;
        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      }
      
      .chatbot-header {
        padding: 16px;
        color: white;
        display: flex;
        align-items: center;
        justify-content: space-between;
        position: relative;
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
        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        position: relative;
      }
      
      .live-indicator {
        position: absolute;
        top: -2px;
        right: -2px;
        width: 12px;
        height: 12px;
        background: #10b981;
        border-radius: 50%;
        border: 2px solid white;
        animation: livePulse 2s infinite;
        opacity: 0;
        transition: opacity 0.3s ease;
      }
      
      .live-indicator.active {
        opacity: 1;
      }
      
      @keyframes livePulse {
        0% { transform: scale(1); opacity: 1; }
        50% { transform: scale(1.2); opacity: 0.7; }
        100% { transform: scale(1); opacity: 1; }
      }
      
      .mode-toggle {
        position: absolute;
        top: -8px;
        right: 50px;
        background: rgba(255, 255, 255, 0.15);
        border: none;
        border-radius: 12px;
        padding: 4px 8px;
        font-size: 10px;
        color: white;
        cursor: pointer;
        transition: all 0.3s ease;
        backdrop-filter: blur(10px);
      }
      
      .mode-toggle:hover {
        background: rgba(255, 255, 255, 0.25);
        transform: translateY(-1px);
      }
      
      .mode-toggle.live {
        background: #10b981;
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
        scrollbar-width: thin;
        scrollbar-color: #cbd5e1 #f1f5f9;
      }
      
      .chatbot-messages::-webkit-scrollbar {
        width: 6px;
      }
      
      .chatbot-messages::-webkit-scrollbar-track {
        background: #f1f5f9;
        border-radius: 3px;
      }
      
      .chatbot-messages::-webkit-scrollbar-thumb {
        background: #cbd5e1;
        border-radius: 3px;
      }
      
      .chatbot-messages::-webkit-scrollbar-thumb:hover {
        background: #94a3b8;
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
      
      .chatbot-message.system .chatbot-message-content {
        background: #e0f2fe;
        color: #0369a1;
        font-style: italic;
        text-align: center;
        border-radius: 16px;
        margin: 8px auto;
        max-width: 90%;
      }
      
      .chatbot-message.system {
        align-self: center;
      }
      
      .chatbot-message.representative .chatbot-message-content {
        background: #dcfce7;
        color: #166534;
        border-left: 3px solid #10b981;
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
        transform: translateY(-1px);
      }
      
      .chatbot-input {
        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      }
      
      .chatbot-send {
        width: 40px;
        height: 40px;
        padding: 0;
        border: none;
        border-radius: 50%;
        color: white;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
      }
      
      .chatbot-send:hover {
        transform: scale(1.05);
        box-shadow: 0 4px 16px rgba(0, 0, 0, 0.25);
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
      tiger: '<svg width="24" height="24" viewBox="0 0 24 24" fill="white"><path d="M12 2C10.9 2 10 2.9 10 4C10 4.7 10.4 5.4 11 5.7V7C11 7.6 11.4 8 12 8S13 7.6 13 7V5.7C13.6 5.4 14 4.7 14 4C14 2.9 13.1 2 12 2ZM7.5 6C6.7 6 6 6.7 6 7.5S6.7 9 7.5 9S9 8.3 9 7.5S8.3 6 7.5 6ZM16.5 6C15.7 6 15 6.7 15 7.5S15.7 9 16.5 9S18 8.3 18 7.5S17.3 6 16.5 6ZM12 9C8.7 9 6 11.7 6 15V18C6 19.1 6.9 20 8 20H16C17.1 20 18 19.1 18 18V15C18 11.7 15.3 9 12 9ZM10 13C10.6 13 11 13.4 11 14S10.6 15 10 15S9 14.6 9 14S9.4 13 10 13ZM14 13C14.6 13 15 13.4 15 14S14.6 15 14 15S13 14.6 13 14S13.4 13 14 13ZM12 16.5C11.2 16.5 10.5 16.1 10.1 15.4L10.9 14.9C11.1 15.3 11.5 15.5 12 15.5S12.9 15.3 13.1 14.9L13.9 15.4C13.5 16.1 12.8 16.5 12 16.5Z"/><path d="M4 10L3 11L4.5 12.5L3 14L4 15L6 13L4 10ZM20 10L18 13L20 15L21 14L19.5 12.5L21 11L20 10Z"/></svg>',
      close: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6L6 18M6 6l12 12"/></svg>',
      send: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z"/></svg>',
      user: '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z"/></svg>',
      representative: '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z"/></svg>',
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
        senderType: 'bot',
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
    
    // Add message to UI immediately for better UX
    const customerMessage = {
      id: Date.now().toString(),
      content: content,
      senderType: 'customer',
      createdAt: new Date().toISOString(),
    };
    messages.push(customerMessage);
    renderMessages();

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
    
    // Scroll to bottom after adding message
    const messagesContainer = document.getElementById('chatbot-messages');
    if (messagesContainer) {
      messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }
  }

  // Format time
  function formatTime(timestamp) {
    return new Date(timestamp).toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  }

  // Function to sanitize color values to prevent XSS
  function sanitizeColor(color) {
    if (!color) return '#af1f31';
    
    // Allow only safe color formats: hex, rgb, rgba, hsl, hsla
    const safeColorRegex = /^(#[0-9a-fA-F]{3,8}|rgb\(\d{1,3},\s*\d{1,3},\s*\d{1,3}\)|rgba\(\d{1,3},\s*\d{1,3},\s*\d{1,3},\s*[0-1]?(\.\d+)?\)|hsl\(\d{1,3},\s*\d{1,3}%,\s*\d{1,3}%\)|hsla\(\d{1,3},\s*\d{1,3}%,\s*\d{1,3}%,\s*[0-1]?(\.\d+)?\))$/;
    
    return safeColorRegex.test(color.trim()) ? color.trim() : '#af1f31';
  }

  // Render functions
  function renderWidget() {
    const container = document.getElementById(WIDGET_ID);
    if (!container) return;

    const primaryColor = sanitizeColor(widgetConfig.primaryColor || '#af1f31');
    const position = widgetConfig.position || 'bottom-right';

    container.className = `chatbot-widget-container ${position}`;
    
    if (!isOpen) {
      container.innerHTML = `
        <button class="chatbot-button" style="background-color: ${primaryColor};" onclick="openWidget()">
          ${createIcon('tiger')}
        </button>
      `;
    } else {
      container.innerHTML = `
        <div class="chatbot-window chatbot-fade-in">
          <div class="chatbot-header" style="background-color: ${primaryColor};">
            <button class="mode-toggle ${isLiveMode ? 'live' : ''}" onclick="toggleLiveMode()">
              ${isLiveMode ? '🟢 LIVE' : '🤖 BOT'}
            </button>
            <div class="chatbot-header-content">
              <div class="chatbot-header-icon">
                ${isLiveMode ? createIcon('representative') : createIcon('tiger')}
                <div class="live-indicator ${isLiveMode ? 'active' : ''}"></div>
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
              ${!isConnected ? 'disabled' : ''}
            />
            <button 
              class="chatbot-send" 
              style="background-color: ${primaryColor};" 
              onclick="handleSendMessage()"
              ${!isConnected ? 'disabled' : ''}
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

    const primaryColor = sanitizeColor(widgetConfig.primaryColor || '#af1f31');
    
    // Function to safely escape HTML to prevent XSS
    function escapeHtml(text) {
      const div = document.createElement('div');
      div.textContent = text;
      return div.innerHTML;
    }
    
    messagesContainer.innerHTML = messages.map(message => {
      let icon;
      
      // Whitelist and normalize sender types to prevent attribute injection
      const allowedTypes = ['customer', 'bot', 'representative', 'system', 'ai'];
      let messageType = allowedTypes.includes(message.senderType) ? message.senderType : 'bot';
      
      // Normalize message types for consistent styling
      if (messageType === 'ai') messageType = 'bot';
      
      if (message.senderType === 'customer') {
        icon = createIcon('user');
      } else if (message.senderType === 'representative') {
        icon = createIcon('representative');
      } else {
        icon = createIcon('tiger');
      }
      
      return `
        <div class="chatbot-message ${messageType}">
          <div class="chatbot-message-content" ${message.senderType === 'customer' ? `style="background-color: ${primaryColor};"` : ''}>
            <div class="chatbot-message-meta">
              ${icon}
              <span>${formatTime(message.createdAt)}</span>
            </div>
            ${escapeHtml(message.content)}
          </div>
        </div>
      `;
    }).join('');

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

  window.toggleLiveMode = function() {
    isLiveMode = !isLiveMode;
    renderWidget();
    
    // Add a system message to show the mode change
    if (conversationId) {
      const modeMessage = {
        id: `mode-${Date.now()}`,
        content: isLiveMode ? 'You are now connected to a live representative!' : 'You are now chatting with our AI assistant.',
        senderType: 'system',
        createdAt: new Date().toISOString(),
      };
      messages.push(modeMessage);
      renderMessages();
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
