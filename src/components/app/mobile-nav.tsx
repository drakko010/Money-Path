"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  MAIN_NAV_ITEMS,
  NAV_SECTIONS,
  getNavItemsBySection,
  type NavItemDef,
} from "@/config/navigation";
import { getDictionary } from "@/lib/i18n";
import { Drawer } from "@/components/ui/drawer";
import { clearSessionToken, signOut } from "@/lib/auth-client";
import { NAV_ICONS } from "./nav-icons";

function isItemActive(pathname: string, item: NavItemDef): boolean {
  if (item.href === "/app") return pathname === "/app";
  return pathname === item.href || pathname.startsWith(`${item.href}/`);
}

/**
 * Navegación móvil (< lg): bottom bar con las áreas principales y menú
 * "Más" (bottom-sheet) para las áreas secundarias.
 */
export function MobileNav() {
  const dict = getDictionary();
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);

  const secondaryActive = NAV_SECTIONS.some((section) =>
    getNavItemsBySection(section.id)
      .filter((item) => !item.main)
      .some((item) => isItemActive(pathname, item)),
  );

  return (
    <>
      <nav
        aria-label="Navegación inferior"
        className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-elevated/95 backdrop-blur-sm lg:hidden"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        <div className="grid grid-cols-5">
          {MAIN_NAV_ITEMS.map((item) => {
            const Icon = NAV_ICONS[item.id];
            const active = isItemActive(pathname, item);
            return (
              <Link
                key={item.id}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={`flex flex-col items-center gap-1 px-1 pb-2 pt-2.5 text-[10px] font-bold transition-colors ${
                  active ? "text-primary-700" : "text-faint hover:text-text"
                }`}
              >
                <span
                  className={`grid h-7 w-12 place-items-center rounded-full transition-colors ${
                    active ? "bg-primary-soft" : ""
                  }`}
                >
                  <Icon size={18} />
                </span>
                {dict.nav.items[item.id]}
              </Link>
            );
          })}

          <button
            type="button"
            onClick={() => setMenuOpen(true)}
            aria-expanded={menuOpen}
            aria-haspopup="dialog"
            className={`flex flex-col items-center gap-1 px-1 pb-2 pt-2.5 text-[10px] font-bold transition-colors ${
              secondaryActive ? "text-primary-700" : "text-faint hover:text-text"
            }`}
          >
            <span
              className={`grid h-7 w-12 place-items-center rounded-full transition-colors ${
                secondaryActive ? "bg-primary-soft" : ""
              }`}
            >
              <svg
                viewBox="0 0 24 24"
                width="18"
                height="18"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                aria-hidden="true"
              >
                <circle cx="5" cy="5" r="1.2" />
                <circle cx="12" cy="5" r="1.2" />
                <circle cx="19" cy="5" r="1.2" />
                <circle cx="5" cy="12" r="1.2" />
                <circle cx="12" cy="12" r="1.2" />
                <circle cx="19" cy="12" r="1.2" />
                <circle cx="5" cy="19" r="1.2" />
                <circle cx="12" cy="19" r="1.2" />
                <circle cx="19" cy="19" r="1.2" />
              </svg>
            </span>
            {dict.nav.more}
          </button>
        </div>
      </nav>

      <Drawer
        open={menuOpen}
        onOpenChange={setMenuOpen}
        side="bottom"
        title={dict.nav.menuTitle}
        description={dict.nav.menuDescription}
      >
        <div className="flex flex-col gap-5 pb-2">
          {NAV_SECTIONS.map((section) => (
            <div key={section.id}>
              <p className="pb-1.5 text-[10px] font-bold uppercase tracking-[0.12em] text-faint">
                {dict.nav.sections[section.id]}
              </p>
              <div className="flex flex-col gap-0.5">
                {getNavItemsBySection(section.id).map((item) => {
                  const Icon = NAV_ICONS[item.id];
                  const active = isItemActive(pathname, item);
                  return (
                    <Link
                      key={item.id}
                      href={item.href}
                      onClick={() => setMenuOpen(false)}
                      aria-current={active ? "page" : undefined}
                      className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition-colors ${
                        active
                          ? "bg-primary-soft text-primary-800"
                          : "text-muted hover:bg-background hover:text-text"
                      }`}
                    >
                      <Icon
                        size={18}
                        className={active ? "text-primary-600" : "text-faint"}
                      />
                      {dict.nav.items[item.id]}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}

          <button
            type="button"
            onClick={() => {
              setMenuOpen(false);
              signOut({
                fetchOptions: {
                  onSuccess: () => {
                    clearSessionToken();
                    window.location.href = "/login";
                  },
                },
              });
            }}
            className="mt-1 flex items-center justify-center gap-2 rounded-xl border border-danger/25 bg-danger-soft px-3 py-2.5 text-sm font-bold text-danger transition-colors hover:bg-danger/15"
          >
            {dict.auth.signOut}
          </button>
        </div>
      </Drawer>
    </>
  );
}
