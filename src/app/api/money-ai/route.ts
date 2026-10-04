import { NextResponse } from "next/server";
import { and, desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { aiConversations, aiMessages } from "@/db/schema";
import { getSession } from "@/lib/auth";
import { getDictionary } from "@/lib/i18n";
import { buildAIContext } from "@/lib/moneyai/context";
import { answerQuestion } from "@/lib/moneyai/engine";
import type { AIAnswer, ChatMessage, ConversationRef } from "@/lib/moneyai/types";

export const dynamic = "force-dynamic";

function fail(message: string, status = 400) {
  return NextResponse.json({ message }, { status });
}

/**
 * Money AI (Etapa 17).
 * - GET  /api/money-ai                  → lista de conversaciones.
 * - GET  /api/money-ai?conversationId=  → mensajes de una conversación.
 * - POST /api/money-ai { message, conversationId? } → responde con datos reales.
 * El asistente SOLO lee datos del usuario; nunca ejecuta acciones.
 */
export async function GET(request: Request) {
  const session = await getSession();
  if (!session) return fail("unauthorized", 401);
  const userId = session.user.id;

  const { searchParams } = new URL(request.url);
  const conversationId = searchParams.get("conversationId");

  if (conversationId) {
    const rows = await db
      .select()
      .from(aiMessages)
      .where(and(eq(aiMessages.conversationId, conversationId), eq(aiMessages.userId, userId)))
      .orderBy(aiMessages.createdAt);
    const messages: ChatMessage[] = rows.map((row) => ({
      id: row.id,
      role: row.role as "user" | "assistant",
      content: row.content,
      answer: (row.metadata as { answer?: AIAnswer } | null)?.answer ?? null,
      createdAt: row.createdAt.toISOString(),
    }));
    return NextResponse.json({ messages });
  }

  const rows = await db
    .select()
    .from(aiConversations)
    .where(eq(aiConversations.userId, userId))
    .orderBy(desc(aiConversations.updatedAt))
    .limit(30);
  const conversations: ConversationRef[] = rows.map((row) => ({
    id: row.id,
    title: row.title ?? "Conversación",
    updatedAt: row.updatedAt.toISOString(),
  }));
  return NextResponse.json({ conversations });
}

export async function POST(request: Request) {
  const dict = getDictionary();
  const session = await getSession();
  if (!session) return fail("unauthorized", 401);
  const userId = session.user.id;

  let body: { message?: unknown; conversationId?: unknown };
  try {
    body = await request.json();
  } catch {
    return fail("invalid body");
  }
  const message = typeof body.message === "string" ? body.message.trim() : "";
  if (!message) return fail("empty message");
  if (message.length > 500) return fail("message too long");

  const context = await buildAIContext(userId);
  if (!context) return fail("onboarding required", 404);

  // Conversación (nueva o existente, siempre del usuario).
  let conversationId = typeof body.conversationId === "string" ? body.conversationId : "";
  if (conversationId) {
    const owner = await db
      .select({ id: aiConversations.id })
      .from(aiConversations)
      .where(and(eq(aiConversations.id, conversationId), eq(aiConversations.userId, userId)))
      .limit(1);
    if (owner.length === 0) conversationId = "";
  }
  if (!conversationId) {
    const title = message.length > 48 ? `${message.slice(0, 48)}…` : message;
    const created = await db
      .insert(aiConversations)
      .values({ userId, title, status: "active" })
      .returning({ id: aiConversations.id });
    conversationId = created[0]?.id ?? "";
  } else {
    await db.update(aiConversations).set({ updatedAt: new Date() }).where(eq(aiConversations.id, conversationId));
  }

  // Guarda el mensaje del usuario.
  await db.insert(aiMessages).values({
    conversationId,
    userId,
    role: "user",
    content: message,
  });

  // Genera la respuesta a partir de los datos reales.
  const answer = answerQuestion(context, message);

  await db.insert(aiMessages).values({
    conversationId,
    userId,
    role: "assistant",
    content: `${answer.summary}\n\n${answer.explanation}`,
    metadata: { answer },
  });

  return NextResponse.json({ conversationId, answer, needsMoreInfo: answer.needsMoreInfo });
}
