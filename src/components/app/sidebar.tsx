"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Wordmark } from "@/components/wordmark";
import {
  NAV_SECTIONS,
  getNavItemsBySection,
  type NavItemDef,
} from "@/config/navigation";
import { getDictionary } from "@/lib/i18n";
import { clearSessionToken, signOut, useSession } from "@/lib/auth-client";
import { NAV_ICONS } from "./nav-icons";

function isActive(pathname: string, item: NavItemDef): boolean {
  if (item.href === "/app") return pathname === "/app";
  return pathname === item.href || pathname.startsWith(`${item.href}/`);
}

function NavEntry({ item, pathname }: { item: NavItemDef; pathname: string }) {
  const dict = getDictionary();
  const Icon = NAV_ICONS[item.id];
  const active = isActive(pathname, item);

  return (
    <Link
      href={item.href}
      aria-current={active ? "page" : undefined}
      className={`flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-semibold transition-colors ${
        active
          ? "bg-primary-soft text-primary-800"
          : "text-muted hover:bg-background hover:text-text"
      }`}
    >
      <Icon size={17} className={active ? "text-primary-600" : "text-faint"} />
      {dict.nav.items[item.id]}
    </Link>
  );
}

/** Sidebar fija de escritorio (≥ lg). */
export function Sidebar() {
  const dict = getDictionary();
  const pathname = usePathname();
  const session = useSession();

  function handleSignOut() {
    signOut({
      fetchOptions: {
        onSuccess: () => {
          clearSessionToken();
          window.location.href = "/login";
        },
      },
    });
  }

  return (
    <aside className="fixed inset-y-0 left-0 z-30 hidden w-[264px] flex-col border-r border-border bg-surface lg:flex">
      <div className="border-b border-border/70 px-5 py-4">
        <Link href="/app" aria-label="Money Path — Inicio">
          <Wordmark />
        </Link>
      </div>

      <nav aria-label="Navegación principal" className="flex-1 overflow-y-auto px-3 py-4">
        <div className="flex flex-col gap-5">
          {NAV_SECTIONS.map((section) => (
            <div key={section.id}>
              <p className="px-3 pb-1.5 text-[10px] font-bold uppercase tracking-[0.12em] text-faint">
                {dict.nav.sections[section.id]}
              </p>
              <div className="flex flex-col gap-0.5">
                {getNavItemsBySection(section.id).map((item) => (
                  <NavEntry key={item.id} item={item} pathname={pathname} />
                ))}
              </div>
            </div>
          ))}
        </div>
      </nav>

      <div className="border-t border-border/70 px-3 py-3">
        {session.data?.user ? (
          <div className="mb-2 flex items-center justify-between gap-2 rounded-xl bg-background px-3 py-2.5">
            <div className="min-w-0">
              <p className="truncate text-xs font-bold text-text">
                {session.data.user.name}
              </p>
              <p className="truncate text-[10px] text-faint">
                {session.data.user.email}
              </p>
            </div>
            <button
              type="button"
              onClick={handleSignOut}
              className="shrink-0 rounded-lg px-2 py-1.5 text-[10px] font-bold text-danger transition-colors hover:bg-danger-soft"
            >
              {dict.auth.signOut}
            </button>
          </div>
        ) : null}
        <div className="flex items-center justify-between gap-2 px-1">
          <Link
            href="/"
            className="rounded-lg px-2 py-1.5 text-xs font-bold text-muted transition-colors hover:bg-background hover:text-text"
          >
            {dict.nav.links.site}
          </Link>
          <Link
            href="/design"
            className="rounded-lg px-2 py-1.5 text-xs font-bold text-muted transition-colors hover:bg-background hover:text-text"
          >
            {dict.nav.links.design}
          </Link>
        </div>
        <p className="mt-1.5 px-1 text-[10px] font-semibold text-faint">
          {dict.nav.stageNote}
        </p>
      </div>
    </aside>
  );
}
