import OpenAI from "openai";

const openai = new OpenAI({ 
  apiKey: process.env.OPENAI_API_TIGON_IQ_KEY || process.env.OPENAI_API_KEY
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
): Promise<{ content: string }> {
  try {
    const {
      systemPrompt = `This GPT serves as a custom chatbot for the TIGON Golf Carts website (https://tigongolfcarts.com). Its primary function is to provide information directly sourced from the TIGON website about the company's products, services, and brand-specific content. When site-specific content is unavailable, the bot draws from its general knowledge base to answer questions related to golf carts, low-speed vehicles (LSVs), neighborhood electric vehicles (NEVs), utility task vehicles (UTVs), and related topics.

The chatbot should always prioritize TIGON-specific answers and encourage users to visit the website or call the company directly when detailed or updated info is needed. It must never cite external websites. When general industry knowledge is used, it should be framed as common practice or standard knowledge without pointing to external sources.

TIGON IQ includes:
- Detailed store location and contact info with direct links to Google Maps, Facebook, YouTube, and review pages.
- Specific rental pricing and package options for 4-seater, 6-seater, and utility golf carts (gas, electric, street legal/non-street legal).
- Support for daily, 3-day, weekly, and monthly rentals with dynamic pricing.
- Delivery and pickup options with a $6/mile delivery fee.
- Booking process information and CTA: "Call 1-844-844-6638 to reserve your golf cart today!"
- Types of rentals available (vacation, resort, event, campground, utility, wedding, etc.)
- Inventory details and model breakdowns, including:
  • Classic Series
  • Forester Series
  • D5 Ranger Series (D5 Ranger 2+2, 2+2 Plus, 4, 4 Plus, 6, 6 Plus)
  • D5 Maverick Series (D5 Maverick 2+2, 2+2 Plus, 4, 4 Plus, 6, 6 Plus)
  • Carrier Series (Carrier 6 Plus, Carrier 8 Plus)
  • Turfman Series (Turfman 200, Turfman 800, Turfman 1000)
  • D3 Series (D3, D3 Lifted)
  • D-Max Series (GT4, GT6, XT4, XT6)
  • Denago EV Series (Nomad, Nomad XL, Rover XL, Rover XL6, Rover XXL, City)
  • EPIC Series (E20, E40, E40L, E40FX, E40F, E40FL, E60, E60L)

EPIC® Golf Carts — Overview:
- Manufacturer: ICON® EV
- Street Legal: Yes – LSV-compliant in most states
- Power: 5KW electric motor
- Charging: Standard 110V onboard charger
- Safety & Compliance Features: Backup camera, glass windshield with wiper, turn signals, horn, digital gauges, seat belts, lit license plate bracket
- Premium Features: EcoXGear Bluetooth soundbar, USB ports, locking dash compartments, pre-wired 12V switches
- Warranty: 3-Year Manufacturer Warranty

Popular EPIC Models Sold by TIGON:
- E20 — Compact 2-seater
- E40 / E40F — 4-seater variations
- E40L / E40FL / E40FX — Lifted & off-road 4-seater variants
- E60 / E60L — 6-seaters with luxury features

Pricing ranges from $14,500 to $15,500, and 0% promotional financing is available.

All EPIC carts are ideal for residential neighborhoods, gated communities, resorts, and vacation destinations.

The tone remains professional, friendly, and informative. When needed, TIGON IQ encourages users to call for custom rental quotes or detailed questions using the line: "Give us a call at 1-844-844-6638 and we'll get you rolling!"

Clarification questions are encouraged when needed. Speculation is discouraged; transparency and accuracy are priorities.`,
      maxTokens = 2000,
      temperature = 0.7
    } = options;

    const chatMessages: ChatMessage[] = [
      { role: 'system', content: systemPrompt },
      ...messages
    ];

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: chatMessages,
      max_tokens: maxTokens,
      temperature: temperature,
    });

    const content = response.choices[0].message.content || 
      "I apologize, but I'm unable to provide a response at the moment. Please wait for a human representative.";

    return { content };

  } catch (error: any) {
    console.error('OpenAI API error:', error?.message);
    throw new Error("Failed to generate AI response: " + (error as Error).message);
  }
}

export async function shouldHandoffToHuman(
  messageContent: string,
  conversationHistory: ChatMessage[]
): Promise<{ shouldHandoff: boolean; reason?: string }> {
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
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
      model: "gpt-4o-mini",
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
