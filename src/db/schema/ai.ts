import { index, jsonb, pgTable, text, uuid } from "drizzle-orm/pg-core";
import { id, timestamps } from "./common";
import { users } from "./identity";

/** Conversaciones con Money AI (una por tema/consulta). */
export const aiConversations = pgTable(
  "ai_conversations",
  {
    id: id(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    title: text("title"),
    status: text("status", { enum: ["active", "archived"] })
      .notNull()
      .default("active"),
    ...timestamps,
  },
  (t) => [index("ai_conversations_user_updated_idx").on(t.userId, t.updatedAt)],
);

/**
 * Mensajes de una conversación. `user_id` se mantiene desnormalizado para
 * que toda consulta de mensajes pueda filtrarse por dueño sin joins.
 */
export const aiMessages = pgTable(
  "ai_messages",
  {
    id: id(),
    conversationId: uuid("conversation_id")
      .notNull()
      .references(() => aiConversations.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    role: text("role", { enum: ["user", "assistant", "system"] }).notNull(),
    content: text("content").notNull(),
    metadata: jsonb("metadata"),
    ...timestamps,
  },
  (t) => [
    index("ai_messages_conversation_idx").on(t.conversationId, t.createdAt),
    index("ai_messages_user_idx").on(t.userId),
  ],
);
