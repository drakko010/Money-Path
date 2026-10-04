"use client";

import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import {
  IconArrowRight,
  IconInfo,
  IconPlus,
  IconSparkles,
  IconSpinner,
  IconAlertTriangle,
} from "@/components/icons";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getDictionary } from "@/lib/i18n";
import type { AIAnswer, ChatMessage, ConversationRef } from "@/lib/moneyai/types";

export interface ContextCardItem {
  label: string;
  value: string;
}

/* ── Tarjeta de respuesta estructurada ───────────────────────────────── */

function AnswerCard({ answer }: { answer: AIAnswer }) {
  const dict = getDictionary();
  const s = dict.moneyAI.structure;
  return (
    <div className="flex flex-col gap-3">
      <div>
        <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-faint">{s.summary}</p>
        <p className="mt-1 text-sm font-semibold text-text">{answer.summary}</p>
      </div>
      <div>
        <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-faint">{s.explanation}</p>
        <p className="mt-1 text-sm leading-relaxed text-muted">{answer.explanation}</p>
      </div>
      {answer.dataUsed.length > 0 ? (
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-faint">{s.dataUsed}</p>
          <ul className="mt-1 flex flex-col gap-1">
            {answer.dataUsed.map((datum, index) => (
              <li key={index} className="flex items-center gap-2 text-xs tabular-nums text-text">
                <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-primary-400" />
                {datum}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
      {answer.impact ? (
        <div className="rounded-xl bg-primary-soft/60 px-3.5 py-2.5">
          <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-primary-700">{s.impact}</p>
          <p className="mt-1 text-xs leading-relaxed text-primary-900">{answer.impact}</p>
        </div>
      ) : null}
      {answer.nextStep ? (
        <Link
          href={answer.nextStep.href}
          className="group flex items-center justify-between gap-2 rounded-xl bg-primary-950 px-4 py-3 text-primary-50 transition-colors hover:bg-primary-900"
        >
          <span className="flex items-center gap-2 text-xs font-semibold">
            <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-accent-300">{s.nextStep}</span>
            {answer.nextStep.text}
          </span>
          <IconArrowRight size={16} className="shrink-0 text-accent-300 transition-transform group-hover:translate-x-0.5" />
        </Link>
      ) : null}
      {answer.needsMoreInfo ? (
        <p className="flex items-start gap-2 text-[11px] leading-relaxed text-warning-strong">
          <IconAlertTriangle size={13} className="mt-0.5 shrink-0" />
          {dict.moneyAI.missingInfo}
        </p>
      ) : null}
    </div>
  );
}

/* ── Burbuja de mensaje ──────────────────────────────────────────────── */

function MessageBubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === "user";
  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[90%] rounded-2xl px-4 py-3 md:max-w-[75%] ${
          isUser ? "bg-primary text-primary-50" : "border border-border bg-surface shadow-card"
        }`}
      >
        {isUser ? (
          <p className="text-sm leading-relaxed">{message.content}</p>
        ) : message.answer ? (
          <AnswerCard answer={message.answer} />
        ) : (
          <p className="whitespace-pre-line text-sm leading-relaxed text-text">{message.content}</p>
        )}
      </div>
    </div>
  );
}

/* ── Módulo completo ─────────────────────────────────────────────────── */

export function MoneyAIModule({
  contextCards,
  showNoDataNote,
}: {
  contextCards: ContextCardItem[];
  showNoDataNote: boolean;
}) {
  const dict = getDictionary();
  const [conversations, setConversations] = useState<ConversationRef[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  const loadConversations = useCallback(async () => {
    try {
      const response = await fetch("/api/money-ai");
      if (!response.ok) return;
      const data = (await response.json()) as { conversations: ConversationRef[] };
      setConversations(data.conversations);
    } finally {
      setLoadingHistory(false);
    }
  }, []);

  useEffect(() => {
    void loadConversations();
  }, [loadConversations]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const loadMessages = useCallback(async (conversationId: string) => {
    setLoadingMessages(true);
    try {
      const response = await fetch(`/api/money-ai?conversationId=${conversationId}`);
      if (!response.ok) return;
      const data = (await response.json()) as { messages: ChatMessage[] };
      setMessages(data.messages);
    } finally {
      setLoadingMessages(false);
    }
  }, []);

  function selectConversation(conversationId: string) {
    setActiveId(conversationId);
    void loadMessages(conversationId);
  }

  function newChat() {
    setActiveId(null);
    setMessages([]);
  }

  async function send(event?: FormEvent, forced?: string) {
    event?.preventDefault();
    const text = (forced ?? input).trim();
    if (!text || loading) return;
    setInput("");
    setLoading(true);
    const userMessage: ChatMessage = {
      id: `tmp-${Date.now()}`,
      role: "user",
      content: text,
      createdAt: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, userMessage]);
    try {
      const response = await fetch("/api/money-ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text, conversationId: activeId }),
      });
      if (!response.ok) throw new Error("request failed");
      const data = (await response.json()) as { conversationId: string; answer: AIAnswer };
      setActiveId(data.conversationId);
      const assistantMessage: ChatMessage = {
        id: `tmp-assistant-${Date.now()}`,
        role: "assistant",
        content: `${data.answer.summary}\n\n${data.answer.explanation}`,
        answer: data.answer,
        createdAt: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, assistantMessage]);
      void loadConversations();
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: `tmp-error-${Date.now()}`,
          role: "assistant",
          content: dict.moneyAI.missingInfo,
          createdAt: new Date().toISOString(),
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
      {/* Sidebar: historial + contexto */}
      <div className="flex flex-col gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2">
            <CardTitle className="text-sm">{dict.moneyAI.history}</CardTitle>
            <Button size="sm" variant="secondary" iconLeft={<IconPlus size={13} />} onClick={newChat}>
              {dict.moneyAI.newChat}
            </Button>
          </CardHeader>
          <CardContent>
            {loadingHistory ? (
              <div className="flex items-center gap-2 py-3 text-xs text-faint">
                <IconSpinner size={14} className="animate-spin" /> {dict.moneyAI.thinking}
              </div>
            ) : conversations.length === 0 ? (
              <p className="py-2 text-xs text-faint">{dict.moneyAI.emptyHistory}</p>
            ) : (
              <ul className="flex flex-col gap-1">
                {conversations.map((conversation) => (
                  <li key={conversation.id}>
                    <button
                      type="button"
                      onClick={() => selectConversation(conversation.id)}
                      className={`w-full truncate rounded-lg px-3 py-2 text-left text-xs font-semibold transition-colors ${
                        activeId === conversation.id
                          ? "bg-primary-soft text-primary-800"
                          : "text-muted hover:bg-background"
                      }`}
                    >
                      {conversation.title}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm">{dict.moneyAI.contextTitle}</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            {contextCards.map((card) => (
              <div key={card.label} className="flex items-center justify-between gap-2">
                <span className="text-xs text-muted">{card.label}</span>
                <span className="text-xs font-semibold tabular-nums text-text">{card.value}</span>
              </div>
            ))}
            {showNoDataNote ? (
              <p className="mt-1 text-[11px] leading-relaxed text-warning-strong">{dict.moneyAI.noDataNote}</p>
            ) : null}
          </CardContent>
        </Card>
      </div>

      {/* Conversación */}
      <div className="flex flex-col">
        <Card className="flex min-h-[480px] flex-col">
          <CardContent className="flex flex-1 flex-col gap-4 overflow-y-auto">
            {messages.length === 0 && !loading ? (
              <div className="flex flex-1 flex-col items-center justify-center gap-3 py-10 text-center">
                <span className="grid h-14 w-14 place-items-center rounded-2xl bg-primary-soft text-primary-700">
                  <IconSparkles size={26} />
                </span>
                <p className="max-w-sm text-sm text-muted">{dict.moneyAI.subtitle}</p>
                <div className="mt-2 flex max-w-lg flex-wrap justify-center gap-2">
                  {dict.moneyAI.quick.map((question) => (
                    <button
                      key={question}
                      type="button"
                      onClick={() => void send(undefined, question)}
                      className="rounded-full border border-border bg-surface px-3 py-1.5 text-xs font-semibold text-muted transition-colors hover:border-primary-300 hover:text-primary-700"
                    >
                      {question}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <>
                {messages.map((message) => (
                  <MessageBubble key={message.id} message={message} />
                ))}
                {loading ? (
                  <div className="flex items-center gap-2 self-start rounded-2xl border border-border bg-surface px-4 py-3 text-xs text-faint">
                    <IconSpinner size={14} className="animate-spin" /> {dict.moneyAI.thinking}
                  </div>
                ) : null}
                <div ref={bottomRef} />
              </>
            )}
          </CardContent>
        </Card>

        {/* Sugerencias sobre el input cuando ya hay conversación */}
        {messages.length > 0 ? (
          <div className="mt-3 flex flex-wrap gap-2">
            {dict.moneyAI.quick.slice(0, 4).map((question) => (
              <button
                key={question}
                type="button"
                onClick={() => void send(undefined, question)}
                className="rounded-full border border-border bg-surface px-3 py-1.5 text-[11px] font-semibold text-muted transition-colors hover:border-primary-300 hover:text-primary-700"
              >
                {question}
              </button>
            ))}
          </div>
        ) : null}

        <form onSubmit={send} className="mt-3 flex items-center gap-2">
          <input
            value={input}
            onChange={(event) => setInput(event.target.value)}
            placeholder={dict.moneyAI.placeholder}
            maxLength={500}
            className="h-11 flex-1 rounded-xl border border-border-strong bg-surface px-4 text-sm text-text outline-none transition-colors placeholder:text-faint focus:border-primary-500 focus:ring-2 focus:ring-primary-100"
          />
          <Button type="submit" loading={loading}>
            {dict.moneyAI.send}
          </Button>
        </form>

        <p className="mt-3 flex items-start gap-2 text-[11px] leading-relaxed text-faint">
          <IconInfo size={13} className="mt-0.5 shrink-0 text-accent-500" />
          {dict.moneyAI.safetyNote}
        </p>
      </div>
    </div>
  );
}
