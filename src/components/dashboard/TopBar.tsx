"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useQueryClient } from "@tanstack/react-query";

export interface TopBarProps {
  userEmail: string;
  signOutAction: () => Promise<void>;
}

/** App-level top bar, shared by the dashboard, library, and directory screens. */
export function TopBar({ userEmail, signOutAction }: TopBarProps) {
  const queryClient = useQueryClient();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [menuOpen]);

  const initials = userEmail.slice(0, 2).toUpperCase();

  return (
    <div className="flex items-center gap-md px-xl py-base border-b border-border-default bg-surface-card-solid sticky top-0 z-20">
      <span className="font-display italic font-semibold text-display text-text-primary">
        Scenewright
      </span>
      <div className="flex-1" />
      <Link href="/library" className="text-ui font-medium text-text-secondary hover:text-link">
        Library
      </Link>
      <div className="relative" ref={menuRef}>
        <button
          type="button"
          onClick={() => setMenuOpen((open) => !open)}
          className="w-[30px] h-[30px] rounded-pill bg-entity-npc-bg text-entity-npc-text flex items-center justify-center text-label font-semibold cursor-pointer"
        >
          {initials}
        </button>
        {menuOpen && (
          <div className="absolute right-0 top-[38px] z-30 w-[220px] bg-surface-card-solid border border-border-default rounded-md shadow-popover p-[6px] flex flex-col gap-[2px]">
            <div className="px-sm py-sm text-ui text-text-secondary truncate">{userEmail}</div>
            <div className="h-px bg-border-default my-[2px]" />
            {/*
              The QueryClient is a module-scope singleton (see
              QueryProvider) reused across a client-side sign-out, so
              cached data from this session must be cleared explicitly
              here or the next signed-in user's dashboard can flash the
              previous user's campaigns before the background refetch
              resolves.
            */}
            <form action={signOutAction} onSubmit={() => queryClient.clear()}>
              <button
                type="submit"
                className="w-full text-left text-ui font-medium px-sm py-[8px] rounded-sm text-text-button hover:bg-surface-panel cursor-pointer"
              >
                Sign out
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
