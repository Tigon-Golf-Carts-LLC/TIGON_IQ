import OpenAI from "openai";

// the newest OpenAI model is "gpt-5" which was released August 7, 2025. do not change this unless explicitly requested by the user
const openai = new OpenAI({ 
  apiKey: process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY_ENV_VAR || "default_key"
});

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface AIResponseOptions {
  systemPrompt?: string;
  maxTokens?: number;
  temperature?: number;
}

export async function generateAIResponse(
  messages: ChatMessage[],
  options: AIResponseOptions = {}
): Promise<string> {
  try {
    const {
      systemPrompt = "You are a helpful customer service assistant. Provide clear, concise, and helpful responses to customer inquiries.",
      maxTokens = 500,
      temperature = 0.7
    } = options;

    const chatMessages: ChatMessage[] = [
      { role: 'system', content: systemPrompt },
      ...messages
    ];

    const response = await openai.chat.completions.create({
      model: "gpt-5",
      messages: chatMessages,
      max_tokens: maxTokens,
      temperature,
    });

    return response.choices[0].message.content || "I apologize, but I'm unable to provide a response at the moment. Please wait for a human representative.";
  } catch (error) {
    console.error('OpenAI API error:', error);
    throw new Error("Failed to generate AI response: " + (error as Error).message);
  }
}

export async function shouldHandoffToHuman(
  messageContent: string,
  conversationHistory: ChatMessage[]
): Promise<{ shouldHandoff: boolean; reason?: string }> {
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-5",
      messages: [
        {
          role: "system",
          content: `You are an AI assistant that determines when a conversation should be handed off to a human representative. 
          Analyze the customer's message and conversation history to determine if human intervention is needed.
          Consider factors like: complex technical issues, complaints, billing disputes, refund requests, emotional distress, or requests for management.
          Respond with JSON in this format: { "shouldHandoff": boolean, "reason": "string" }`
        },
        {
          role: "user",
          content: `Customer message: "${messageContent}"\n\nConversation history: ${JSON.stringify(conversationHistory.slice(-5))}`
        }
      ],
      response_format: { type: "json_object" },
    });

    const result = JSON.parse(response.choices[0].message.content || '{"shouldHandoff": false}');
    return {
      shouldHandoff: result.shouldHandoff || false,
      reason: result.reason
    };
  } catch (error) {
    console.error('Error determining handoff:', error);
    // Default to not handing off on error
    return { shouldHandoff: false };
  }
}

export async function extractCustomerIntent(messageContent: string): Promise<{
  intent: string;
  confidence: number;
  entities: Record<string, string>;
}> {
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-5",
      messages: [
        {
          role: "system",
          content: `Analyze the customer's message to extract their intent and any relevant entities.
          Common intents include: support_request, billing_inquiry, refund_request, product_question, complaint, compliment, general_inquiry.
          Respond with JSON in this format: { "intent": "string", "confidence": 0.0-1.0, "entities": {"key": "value"} }`
        },
        {
          role: "user",
          content: messageContent
        }
      ],
      response_format: { type: "json_object" },
    });

    const result = JSON.parse(response.choices[0].message.content || '{"intent": "general_inquiry", "confidence": 0.5, "entities": {}}');
    return {
      intent: result.intent || "general_inquiry",
      confidence: Math.max(0, Math.min(1, result.confidence || 0.5)),
      entities: result.entities || {}
    };
  } catch (error) {
    console.error('Error extracting customer intent:', error);
    return {
      intent: "general_inquiry",
      confidence: 0.5,
      entities: {}
    };
  }
}
