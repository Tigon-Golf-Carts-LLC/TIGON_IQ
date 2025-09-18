import nodemailer from 'nodemailer';
import { nanoid } from 'nanoid';

interface InternalEmailConfig {
  enabled: boolean;
  smtpHost: string;
  smtpPort: number;
  smtpSecure: boolean;
  smtpUser: string;
  smtpPassword: string;
  fromEmail: string;
  fromName: string;
  notificationEmails: string[];
  threadModifier: string; // Custom modifier for email threading
  subjectPrefix: string; // Prefix for email subjects
  enableThreading: boolean; // Whether to enable email threading
}

interface EmailParams {
  to: string | string[];
  subject: string;
  text?: string;
  html?: string;
  threadId?: string; // For email threading
  inReplyTo?: string; // For threading
  references?: string; // For threading chain
}

interface ConversationThreadInfo {
  conversationId: string;
  threadId: string;
  originalMessageId: string;
  lastMessageId: string;
  references: string[];
}

export class InternalEmailService {
  private transporter: nodemailer.Transporter | null = null;
  private config: InternalEmailConfig | null = null;
  private storage: any; // IStorage interface

  constructor(config?: InternalEmailConfig, storage?: any) {
    this.storage = storage;
    if (config) {
      this.configure(config);
    }
  }

  configure(config: InternalEmailConfig) {
    this.config = config;
    
    if (config.enabled && config.smtpHost && config.smtpUser && config.smtpPassword) {
      this.transporter = nodemailer.createTransport({
        host: config.smtpHost,
        port: config.smtpPort,
        secure: config.smtpSecure, // true for 465, false for other ports
        auth: {
          user: config.smtpUser,
          pass: config.smtpPassword,
        },
      });
      
      console.log('Internal email service configured successfully');
    } else {
      console.warn('Internal email service not properly configured');
      this.transporter = null;
    }
  }

  isConfigured(): boolean {
    return this.transporter !== null && this.config !== null && this.config.enabled;
  }

  // Generate or retrieve thread information for a conversation (with database persistence)
  async getConversationThread(conversationId: string): Promise<ConversationThreadInfo> {
    if (this.storage) {
      try {
        const conversation = await this.storage.getConversation(conversationId);
        if (conversation && conversation.metadata?.emailThread) {
          return conversation.metadata.emailThread;
        }
      } catch (error) {
        console.warn('Failed to load thread info from database:', error);
      }
    }

    // Create new thread for this conversation
    const threadId = `thread-${conversationId}-${nanoid(8)}`;
    const originalMessageId = `<${threadId}@${this.config?.smtpHost || 'tigon-iq.internal'}>`;
    
    const threadInfo: ConversationThreadInfo = {
      conversationId,
      threadId,
      originalMessageId,
      lastMessageId: originalMessageId,
      references: [originalMessageId]
    };

    // Save to database if available
    if (this.storage) {
      try {
        const conversation = await this.storage.getConversation(conversationId);
        const updatedMetadata = {
          ...conversation.metadata,
          emailThread: threadInfo
        };
        
        await this.storage.updateConversation(conversationId, { metadata: updatedMetadata });
      } catch (error) {
        console.warn('Failed to save thread info to database:', error);
      }
    }

    return threadInfo;
  }

  // Update thread with new message ID after sending (with database persistence)
  async updateConversationThread(conversationId: string, actualMessageId: string): Promise<void> {
    const threadInfo = await this.getConversationThread(conversationId);
    const formattedMessageId = actualMessageId.includes('<') ? actualMessageId : `<${actualMessageId}>`;
    
    threadInfo.lastMessageId = formattedMessageId;
    threadInfo.references.push(formattedMessageId);
    
    // Save to database if available
    if (this.storage) {
      try {
        const conversation = await this.storage.getConversation(conversationId);
        const updatedMetadata = {
          ...conversation.metadata,
          emailThread: threadInfo
        };
        
        await this.storage.updateConversation(conversationId, { metadata: updatedMetadata });
      } catch (error) {
        console.warn('Failed to update thread info in database:', error);
      }
    }
  }

  // Build subject with modifiers and threading
  async buildSubject(baseSubject: string, conversationId: string, isNewThread: boolean = false): Promise<string> {
    if (!this.config) return baseSubject;
    
    const threadInfo = await this.getConversationThread(conversationId);
    const prefix = this.config.subjectPrefix || '[TIGON-IQ]';
    const modifier = this.config.threadModifier || '#';
    
    if (isNewThread) {
      return `${prefix} ${baseSubject} ${modifier}${threadInfo.threadId}`;
    } else {
      return `Re: ${prefix} ${baseSubject} ${modifier}${threadInfo.threadId}`;
    }
  }

  async sendEmail(params: EmailParams): Promise<{ success: boolean; messageId?: string }> {
    try {
      if (!this.isConfigured()) {
        console.warn("Internal email service not configured - skipping email send");
        return { success: false };
      }

      const mailOptions: nodemailer.SendMailOptions = {
        from: `${this.config!.fromName} <${this.config!.fromEmail}>`,
        to: Array.isArray(params.to) ? params.to.join(', ') : params.to,
        subject: params.subject,
        text: params.text,
        html: params.html,
      };

      // Add threading headers if provided and threading is enabled
      if (this.config!.enableThreading && (params.threadId || params.inReplyTo || params.references)) {
        mailOptions.headers = {};
        
        if (params.inReplyTo) {
          mailOptions.headers['In-Reply-To'] = params.inReplyTo;
        }
        
        if (params.references) {
          mailOptions.headers['References'] = params.references;
        }
        
        if (params.threadId) {
          mailOptions.headers['Thread-Topic'] = params.threadId;
          mailOptions.headers['Thread-Index'] = Buffer.from(params.threadId).toString('base64');
        }
      }

      const info = await this.transporter!.sendMail(mailOptions);
      console.log(`Email sent successfully to: ${params.to}, Message-ID: ${info.messageId}`);
      return { success: true, messageId: info.messageId };
    } catch (error) {
      console.error('Internal email service error:', error);
      return { success: false };
    }
  }

  async sendConversationNotification(
    conversation: any,
    message: any,
    isNewConversation: boolean = false
  ): Promise<boolean> {
    if (!this.isConfigured() || !this.config!.notificationEmails.length) {
      return false;
    }

    const threadInfo = await this.getConversationThread(conversation.id);
    const baseSubject = `Chat Message - ${conversation.customerEmail || 'Anonymous Customer'}`;
    
    // Build subject with or without threading based on config
    const subject = this.config!.enableThreading 
      ? await this.buildSubject(baseSubject, conversation.id, isNewConversation)
      : baseSubject;

    const html = `
      <h2>New Customer Chat Message</h2>
      <div style="background: #f8f9fa; padding: 15px; border-radius: 8px; margin: 15px 0;">
        ${this.config!.enableThreading ? `<p><strong>Thread:</strong> ${threadInfo.threadId}</p>` : ''}
        <p><strong>Customer:</strong> ${conversation.customerEmail || 'Anonymous'}</p>
        <p><strong>Website:</strong> ${conversation.website?.domain || 'Unknown'}</p>
        <p><strong>Time:</strong> ${new Date(message.createdAt).toLocaleString()}</p>
      </div>
      <div style="background: #fff; border: 1px solid #ddd; padding: 20px; border-radius: 8px; margin: 15px 0;">
        <p><strong>Message:</strong></p>
        <div style="background: #f5f5f5; padding: 15px; border-radius: 5px; margin: 10px 0; font-family: 'Segoe UI', sans-serif;">
          ${message.content}
        </div>
      </div>
      <div style="margin-top: 20px; padding: 15px; background: #e3f2fd; border-radius: 8px;">
        <p><a href="${process.env.APP_URL || 'http://localhost:5000'}/conversations?selected=${conversation.id}" 
              style="color: #1976d2; text-decoration: none; font-weight: bold;">
          → View Full Conversation
        </a></p>
      </div>
    `;

    const text = `
${this.config!.enableThreading ? `Thread: ${threadInfo.threadId}\n` : ''}New message from ${conversation.customerEmail || 'Anonymous'}
Website: ${conversation.website?.domain || 'Unknown'}
Time: ${new Date(message.createdAt).toLocaleString()}

Message: ${message.content}

View conversation: ${process.env.APP_URL || 'http://localhost:5000'}/conversations?selected=${conversation.id}
    `;

    // Prepare threading parameters if enabled
    let emailParams: EmailParams = {
      to: this.config!.notificationEmails,
      subject,
      html,
      text
    };

    if (this.config!.enableThreading) {
      emailParams.threadId = threadInfo.threadId;
      emailParams.inReplyTo = isNewConversation ? undefined : threadInfo.lastMessageId;
      emailParams.references = threadInfo.references.join(' ');
    }

    const result = await this.sendEmail(emailParams);
    
    // Update thread with actual Message-ID after sending
    if (result.success && result.messageId && this.config!.enableThreading) {
      await this.updateConversationThread(conversation.id, result.messageId);
    }

    return result.success;
  }

  async sendConversationSummary(
    conversation: any,
    messages: any[],
    customerEmail: string
  ): Promise<boolean> {
    if (!this.isConfigured() || !customerEmail) {
      return false;
    }

    const threadInfo = await this.getConversationThread(conversation.id);
    const baseSubject = `Chat Conversation Summary`;
    
    // Build subject with or without threading based on config
    const subject = this.config!.enableThreading 
      ? await this.buildSubject(baseSubject, conversation.id)
      : baseSubject;

    const messagesHtml = messages.map(msg => `
      <div style="margin: 15px 0; padding: 15px; background: ${
        msg.senderType === 'customer' ? '#e3f2fd' : 
        msg.senderType === 'ai' ? '#f3e5f5' : '#e8f5e8'
      }; border-radius: 8px; border-left: 4px solid ${
        msg.senderType === 'customer' ? '#1976d2' :
        msg.senderType === 'ai' ? '#7b1fa2' : '#388e3c'
      };">
        <div style="font-weight: bold; margin-bottom: 8px; color: ${
          msg.senderType === 'customer' ? '#1976d2' :
          msg.senderType === 'ai' ? '#7b1fa2' : '#388e3c'
        };">
          ${msg.senderType === 'customer' ? 'You' : 
            msg.senderType === 'ai' ? 'AI Assistant' : 'Support Representative'}
        </div>
        <div style="line-height: 1.5;">${msg.content}</div>
        <div style="font-size: 12px; color: #666; margin-top: 8px; font-style: italic;">
          ${new Date(msg.createdAt).toLocaleString()}
        </div>
      </div>
    `).join('');

    const html = `
      <div style="max-width: 600px; margin: 0 auto; font-family: 'Segoe UI', sans-serif;">
        <h2 style="color: #1976d2; border-bottom: 2px solid #1976d2; padding-bottom: 10px;">
          Your Chat Conversation Summary
        </h2>
        <div style="background: #f8f9fa; padding: 15px; border-radius: 8px; margin: 15px 0;">
          ${this.config!.enableThreading ? `<p><strong>Thread:</strong> ${threadInfo.threadId}</p>` : ''}
          <p><strong>Conversation Date:</strong> ${new Date(conversation.createdAt).toLocaleDateString()}</p>
          <p><strong>Total Messages:</strong> ${messages.length}</p>
        </div>
        <p style="margin: 20px 0;">Thank you for contacting our support team. Here's a complete summary of your conversation:</p>
        <div style="border: 1px solid #ddd; padding: 20px; border-radius: 8px; margin: 20px 0; background: #fff;">
          ${messagesHtml}
        </div>
        <div style="margin-top: 20px; padding: 15px; background: #e8f5e8; border-radius: 8px;">
          <p style="margin: 0;">If you have any additional questions, please don't hesitate to contact us again${this.config!.enableThreading ? '. This email thread will continue the conversation' : ''}.</p>
        </div>
      </div>
    `;

    const text = `
${this.config!.enableThreading ? `Thread: ${threadInfo.threadId}\n` : ''}Your Chat Conversation Summary
Conversation Date: ${new Date(conversation.createdAt).toLocaleDateString()}
Total Messages: ${messages.length}

${messages.map(m => `${m.senderType === 'customer' ? 'You' : 
  m.senderType === 'ai' ? 'AI Assistant' : 'Support'}: ${m.content} (${new Date(m.createdAt).toLocaleString()})`).join('\n\n')}

If you have any additional questions, please don't hesitate to contact us again.
    `;

    // Prepare threading parameters if enabled
    let emailParams: EmailParams = {
      to: customerEmail,
      subject,
      html,
      text
    };

    if (this.config!.enableThreading) {
      emailParams.threadId = threadInfo.threadId;
      emailParams.inReplyTo = threadInfo.lastMessageId;
      emailParams.references = threadInfo.references.join(' ');
    }

    const result = await this.sendEmail(emailParams);
    
    // Update thread with actual Message-ID after sending
    if (result.success && result.messageId && this.config!.enableThreading) {
      await this.updateConversationThread(conversation.id, result.messageId);
    }

    return result.success;
  }

  // Test email configuration
  async testConfiguration(): Promise<{ success: boolean; message: string }> {
    try {
      if (!this.isConfigured()) {
        return { success: false, message: 'Email service not configured' };
      }

      await this.transporter!.verify();
      return { success: true, message: 'Email configuration is valid' };
    } catch (error: any) {
      return { success: false, message: error.message || 'Configuration test failed' };
    }
  }
}

// Export singleton instance
export const internalEmailService = new InternalEmailService();

// Export functions for backward compatibility
export async function sendEmail(params: EmailParams): Promise<boolean> {
  return internalEmailService.sendEmail(params);
}

export async function sendConversationNotification(
  conversation: any,
  message: any,
  notificationEmails: string[],
  fromEmail: string,
  isNewConversation: boolean = false
): Promise<boolean> {
  // Configure with provided emails if different
  if (internalEmailService.isConfigured()) {
    return internalEmailService.sendConversationNotification(conversation, message, isNewConversation);
  }
  return false;
}

export async function sendConversationSummary(
  conversation: any,
  messages: any[],
  customerEmail: string,
  fromEmail: string
): Promise<boolean> {
  if (internalEmailService.isConfigured()) {
    return internalEmailService.sendConversationSummary(conversation, messages, customerEmail);
  }
  return false;
}