import OpenAI from "openai";

// the newest OpenAI model is "gpt-5" which was released August 7, 2025. do not change this unless explicitly requested by the user
const openai = new OpenAI({ 
  apiKey: process.env.TIGON_IQ_KEY || process.env.OPENAI_API_KEY || "default_key"
});

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface AIResponseOptions {
  systemPrompt?: string;
  maxTokens?: number;
  conversationId?: string; // For OpenAI conversation state management
  previousResponseId?: string; // For continuing conversations
  // temperature parameter removed - GPT-5 doesn't support it
}

export interface TigonConversationState {
  openaiConversationId?: string;
  lastResponseId?: string;
}

export async function generateAIResponse(
  messages: ChatMessage[],
  options: AIResponseOptions = {}
): Promise<{ content: string; conversationState?: TigonConversationState }> {
  try {
    const {
      systemPrompt = "You are a TIGON Golf Carts customer service assistant. Prioritize information from https://tigongolfcarts.com for TIGON products and services. You can also provide general golf cart model information, specifications, and industry knowledge, but never mention or reference other companies or websites by name. If asked about specific services, pricing, or availability, only use information from tigongolfcarts.com or connect them with a human representative. Focus on helping customers with golf cart sales, rentals, parts, service, and general golf cart education without promoting competitors.",
      maxTokens = 500,
      conversationId,
      previousResponseId
      // temperature removed - GPT-5 doesn't support this parameter
    } = options;

    // Use new Responses API for better context management
    try {
      // Prepare input items for Responses API
      const inputItems: any[] = [];
      
      // Add system prompt if no previous conversation
      if (!previousResponseId) {
        inputItems.push({
          role: "system",
          content: [{ type: "input_text", text: systemPrompt }]
        });
      }
      
      // Add latest user message
      const latestMessage = messages[messages.length - 1];
      if (latestMessage) {
        inputItems.push({
          role: latestMessage.role === 'user' ? 'user' : 'assistant',
          content: [{ type: "input_text", text: latestMessage.content }]
        });
      }

      const responseParams: any = {
        model: "gpt-5",
        input: inputItems,
        max_output_tokens: maxTokens,
        store: true, // Enable server-managed conversation state
      };

      // Continue existing conversation if available
      if (previousResponseId) {
        responseParams.previous_response_id = previousResponseId;
      } else if (conversationId) {
        responseParams.conversation = conversationId;
      }

      const response = await openai.responses.create(responseParams);

      // Extract content from Responses API format
      let content = "I apologize, but I'm unable to provide a response at the moment. Please wait for a human representative.";
      
      if (response.output?.[0]) {
        const outputItem = response.output[0];
        if ('content' in outputItem && outputItem.content?.[0]) {
          const contentItem = outputItem.content[0];
          if ('text' in contentItem) {
            content = contentItem.text;
          }
        }
      }

      return {
        content,
        conversationState: {
          openaiConversationId: response.conversation?.id,
          lastResponseId: response.id
        }
      };

    } catch (responsesApiError) {
      console.log('Responses API failed, falling back to Chat Completions:', responsesApiError);
      
      // Fallback to traditional Chat Completions API
      const chatMessages: ChatMessage[] = [
        { role: 'system', content: systemPrompt },
        ...messages
      ];

      const response = await openai.chat.completions.create({
        model: "gpt-5",
        messages: chatMessages,
        max_tokens: maxTokens,
        // gpt-5 doesn't support temperature parameter, do not use it
      });

      const content = response.choices[0].message.content || 
        "I apologize, but I'm unable to provide a response at the moment. Please wait for a human representative.";

      return { content };
    }

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
