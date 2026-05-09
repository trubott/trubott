import { NextResponse } from "next/server";
import { completeText } from "@/server/llm/client";

const SYSTEM_PROMPT = `
You are the TruBott Support Assistant. Keep your responses VERY SHORT, clear, and conversational.
TruBott provides "Flash Cards" (verified digital identities) using face & social media checks.

RULES:
- DO NOT use long bulleted lists for simple greetings.
- Keep answers under 2-3 sentences whenever possible.
- Only discuss TruBott features (Face check, Social verify, Ephemeral cards).
- For technical/account issues, redirect to contact@trubott.com.
- Use a helpful but punchy tone.

Example short response: 
"I can help you with Flash Cards, face verification, or social media links. What would you like to know?"
`.trim();

export async function POST(req: Request) {
  try {
    const { message, history } = await req.json();

    if (!message) {
      return NextResponse.json({ error: "Message is required" }, { status: 400 });
    }

    // Combine history for context if needed, but keep it simple for now
    const userPrompt = history 
      ? `Conversation History:\n${history}\n\nUser Question: ${message}`
      : message;

    const response = await completeText({
      system: SYSTEM_PROMPT,
      user: userPrompt,
      maxTokens: 500,
    });

    return NextResponse.json({ response });
  } catch (err) {
    console.error("Support chat error:", err);
    return NextResponse.json(
      { response: "I'm having trouble connecting to my brain. Please contact us at contact@trubott.com." },
      { status: 500 }
    );
  }
}
