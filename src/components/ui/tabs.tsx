"use client";

import {
  createContext,
  useContext,
  useRef,
  type KeyboardEvent,
  type ReactNode,
} from "react";

interface TabsContextValue {
  active: string;
  setActive: (value: string) => void;
}

const TabsContext = createContext<TabsContextValue | null>(null);

function useTabsContext(component: string): TabsContextValue {
  const context = useContext(TabsContext);
  if (!context) {
    throw new Error(`${component} deve ser usado dentro de <Tabs>`);
  }
  return context;
}

export interface TabsProps {
  value: string;
  onValueChange: (value: string) => void;
  children: ReactNode;
  className?: string;
}

/** Abas controladas com navegação por teclado (setas). */
export function Tabs({ value, onValueChange, children, className = "" }: TabsProps) {
  return (
    <TabsContext.Provider value={{ active: value, setActive: onValueChange }}>
      <div className={className}>{children}</div>
    </TabsContext.Provider>
  );
}

export function TabsList({ children, className = "" }: { children: ReactNode; className?: string }) {
  const context = useContext(TabsContext);
  const listRef = useRef<HTMLDivElement>(null);

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (!context || !listRef.current) return;
    if (event.key !== "ArrowRight" && event.key !== "ArrowLeft") return;
    event.preventDefault();
    const triggers = Array.from(
      listRef.current.querySelectorAll<HTMLButtonElement>("[role='tab']:not(:disabled)"),
    );
    const index = triggers.findIndex((el) => el === document.activeElement);
    if (index === -1) return;
    const next =
      event.key === "ArrowRight"
        ? triggers[(index + 1) % triggers.length]
        : triggers[(index - 1 + triggers.length) % triggers.length];
    next.focus();
    next.click();
  }

  return (
    <div
      ref={listRef}
      role="tablist"
      onKeyDown={handleKeyDown}
      className={`flex gap-1 overflow-x-auto border-b border-border ${className}`}
    >
      {children}
    </div>
  );
}

export interface TabsTriggerProps {
  value: string;
  children: ReactNode;
  className?: string;
}

export function TabsTrigger({ value, children, className = "" }: TabsTriggerProps) {
  const context = useTabsContext("TabsTrigger");
  const isActive = context.active === value;

  return (
    <button
      type="button"
      role="tab"
      id={`tab-${value}`}
      aria-selected={isActive}
      aria-controls={`panel-${value}`}
      tabIndex={isActive ? 0 : -1}
      onClick={() => context.setActive(value)}
      className={`relative shrink-0 whitespace-nowrap px-4 py-2.5 text-sm font-semibold transition-colors ${
        isActive ? "text-primary-700" : "text-muted hover:text-text"
      } ${className}`}
    >
      {children}
      <span
        aria-hidden
        className={`absolute inset-x-2 -bottom-px h-0.5 rounded-full transition-colors ${
          isActive ? "bg-primary-600" : "bg-transparent"
        }`}
      />
    </button>
  );
}

export interface TabsPanelProps {
  value: string;
  children: ReactNode;
  className?: string;
}

export function TabsPanel({ value, children, className = "" }: TabsPanelProps) {
  const context = useTabsContext("TabsPanel");
  if (context.active !== value) return null;

  return (
    <div
      role="tabpanel"
      id={`panel-${value}`}
      aria-labelledby={`tab-${value}`}
      tabIndex={0}
      className={`pt-4 outline-none ${className}`}
    >
      {children}
    </div>
  );
}
