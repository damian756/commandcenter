import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import Anthropic from "@anthropic-ai/sdk";
import { buildSystemPrompt } from "@/lib/assistant-context";

export const dynamic = "force-dynamic";

type ImageBlock = {
  type: "image";
  source: {
    type: "base64";
    media_type: "image/jpeg" | "image/png" | "image/gif" | "image/webp";
    data: string;
  };
};

type TextBlock = {
  type: "text";
  text: string;
};

type ContentBlock = ImageBlock | TextBlock;

type Message = {
  role: "user" | "assistant";
  content: string | ContentBlock[];
};

function toAnthropicMessages(messages: Message[]): Anthropic.MessageParam[] {
  return messages.map((m) => {
    if (typeof m.content === "string") {
      return { role: m.role, content: m.content };
    }
    return {
      role: m.role,
      content: m.content.map((block) => {
        if (block.type === "image") {
          return {
            type: "image" as const,
            source: {
              type: "base64" as const,
              media_type: block.source.media_type,
              data: block.source.data,
            },
          };
        }
        return { type: "text" as const, text: block.text };
      }),
    };
  });
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return new Response(JSON.stringify({ error: "Unauthorised" }), { status: 401 });
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    return new Response(JSON.stringify({ error: "ANTHROPIC_API_KEY not set" }), { status: 503 });
  }

  const body = await req.json();
  const messages: Message[] = body.messages ?? [];

  if (!messages.length || messages[messages.length - 1].role !== "user") {
    return new Response(JSON.stringify({ error: "Invalid messages" }), { status: 400 });
  }

  let systemPrompt: string;
  try {
    systemPrompt = await buildSystemPrompt();
  } catch (err) {
    console.error("[assistant] buildSystemPrompt failed:", err);
    systemPrompt = "You are Gandalf the White. The live context could not be loaded. Respond helpfully with the knowledge you have.";
  }

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const encoder = new TextEncoder();

  const readableStream = new ReadableStream({
    async start(controller) {
      try {
        const stream = client.messages.stream({
          model: "claude-opus-4-5",
          max_tokens: 2048,
          system: systemPrompt,
          messages: toAnthropicMessages(messages),
        });

        for await (const event of stream) {
          if (
            event.type === "content_block_delta" &&
            event.delta.type === "text_delta"
          ) {
            controller.enqueue(encoder.encode(event.delta.text));
          }
        }
      } catch (err) {
        console.error("[assistant] stream error:", err);
        const msg = err instanceof Error ? err.message : String(err);
        controller.enqueue(encoder.encode(`\n[Error: ${msg}]`));
      } finally {
        controller.close();
      }
    },
  });

  return new Response(readableStream, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-cache",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
