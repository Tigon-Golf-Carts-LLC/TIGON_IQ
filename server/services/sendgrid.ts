import { MailService } from '@sendgrid/mail';

if (!process.env.SENDGRID_API_KEY) {
  console.warn("SENDGRID_API_KEY environment variable not set - email features will be disabled");
}

const mailService = new MailService();
if (process.env.SENDGRID_API_KEY) {
  mailService.setApiKey(process.env.SENDGRID_API_KEY);
}

interface EmailParams {
  to: string;
  from: string;
  subject: string;
  text?: string;
  html?: string;
}

export async function sendEmail(params: EmailParams): Promise<boolean> {
  try {
    if (!process.env.SENDGRID_API_KEY) {
      console.warn("SendGrid not configured - skipping email send");
      return false;
    }

    const emailData: any = {
      to: params.to,
      from: params.from,
      subject: params.subject,
    };
    if (params.text) emailData.text = params.text;
    if (params.html) emailData.html = params.html;

    await mailService.send(emailData);
    return true;
  } catch (error) {
    console.error('SendGrid email error:', error);
    return false;
  }
}

export async function sendConversationNotification(
  conversation: any,
  message: any,
  notificationEmails: string[],
  fromEmail: string
): Promise<boolean> {
  if (!notificationEmails.length || !fromEmail) {
    return false;
  }

  const subject = `New Chat Message - ${conversation.customerEmail || 'Anonymous Customer'}`;
  const html = `
    <h2>New Customer Chat Message</h2>
    <p><strong>Customer:</strong> ${conversation.customerEmail || 'Anonymous'}</p>
    <p><strong>Website:</strong> ${conversation.website?.domain || 'Unknown'}</p>
    <p><strong>Time:</strong> ${new Date(message.createdAt).toLocaleString()}</p>
    <p><strong>Message:</strong></p>
    <div style="background: #f5f5f5; padding: 15px; border-radius: 5px; margin: 10px 0;">
      ${message.content}
    </div>
    <p><a href="${process.env.APP_URL || 'http://localhost:5000'}/conversations/${conversation.id}">View Conversation</a></p>
  `;

  for (const email of notificationEmails) {
    await sendEmail({
      to: email,
      from: fromEmail,
      subject,
      html,
      text: `New message from ${conversation.customerEmail || 'Anonymous'}: ${message.content}`
    });
  }

  return true;
}

export async function sendConversationSummary(
  conversation: any,
  messages: any[],
  customerEmail: string,
  fromEmail: string
): Promise<boolean> {
  if (!customerEmail || !fromEmail) {
    return false;
  }

  const subject = `Chat Conversation Summary`;
  const messagesHtml = messages.map(msg => `
    <div style="margin: 10px 0; padding: 10px; background: ${msg.senderType === 'customer' ? '#e3f2fd' : '#f3e5f5'}; border-radius: 5px;">
      <strong>${msg.senderType === 'customer' ? 'You' : 'Support'}:</strong> ${msg.content}
      <div style="font-size: 12px; color: #666; margin-top: 5px;">
        ${new Date(msg.createdAt).toLocaleString()}
      </div>
    </div>
  `).join('');

  const html = `
    <h2>Your Chat Conversation Summary</h2>
    <p>Thank you for contacting our support team. Here's a summary of your conversation:</p>
    <div style="border: 1px solid #ddd; padding: 20px; border-radius: 5px; margin: 20px 0;">
      ${messagesHtml}
    </div>
    <p>If you have any additional questions, please don't hesitate to contact us again.</p>
  `;

  return await sendEmail({
    to: customerEmail,
    from: fromEmail,
    subject,
    html,
    text: `Your chat conversation summary: ${messages.map(m => `${m.senderType}: ${m.content}`).join('\n')}`
  });
}
