"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { useIsAdmin } from '@/utils/adminCheck';
import SignOutButton from "@/components/SignOutButton";
import { authFetch } from "@/utils/authFetch";
import { CalendarData } from "@/types/interfaces";

const NAV_ITEMS = [
  { id: "home",         label: "Campaign Home",     sub: "Dashboard of the Bounty",       icon: "home",    href: "/campaign" },
  { id: "session",      label: "Next Session",       sub: "Summoning & agenda",            icon: "moon",    href: "/campaign/next-session" },
  { id: "locations",    label: "Locations",          sub: "Towns, cities, landmarks",      icon: "pin",     href: "/campaign/locations" },
  { id: "calendar",     label: "Calendar",           sub: "World calendar & events",       icon: "cal",     href: "/campaign/calendar" },
  { id: "timeline",     label: "Timeline",           sub: "Major events of the realm",     icon: "scroll",  href: "/campaign/timeline" },
  { id: "npcs",         label: "NPCs",               sub: "Characters & merchants",        icon: "skull",   href: "/campaign/npcs" },
  { id: "pcs",          label: "Player Characters",  sub: "The party",                     icon: "shield",  href: "/campaign/pcs" },
  { id: "factions",     label: "Factions",           sub: "Guilds, politics, cabals",      icon: "banner",  href: "/campaign/factions" },
  { id: "quests",       label: "Quests",             sub: "Active, complete, available",   icon: "key",     href: "/campaign/quests" },
  { id: "items",        label: "Items",              sub: "Weapons, artifacts, charms",    icon: "gem",     href: "/campaign/items" },
  { id: "lore",         label: "Lore",               sub: "History & world building",      icon: "book",    href: "/campaign/lore",         dim: true },
  { id: "deities",      label: "Deities",            sub: "Gods, pantheons, powers",       icon: "star",    href: "/campaign/deities" },
  { id: "recaps",       label: "Recaps",             sub: "Session summaries",             icon: "feather", href: "/campaign/recaps" },
  { id: "pronounce",    label: "Pronunciations",     sub: "Name pronunciation guide",      icon: "tongue",  href: "/campaign/pronunciations" },
];

function NavIcon({ name }: { name: string }) {
  const common = { width: 16, height: 16, viewBox: "0 0 16 16", fill: "none", stroke: "currentColor", strokeWidth: 1.4, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
  switch (name) {
    case "home":    return <svg {...common}><path d="M2 7l6-5 6 5v7H2V7z"/><path d="M6 14V9h4v5"/></svg>;
    case "moon":    return <svg {...common}><path d="M13 9.5A5.5 5.5 0 1 1 6.5 3a4.5 4.5 0 0 0 6.5 6.5z"/></svg>;
    case "pin":     return <svg {...common}><path d="M8 14s5-4.5 5-8a5 5 0 1 0-10 0c0 3.5 5 8 5 8z"/><circle cx="8" cy="6" r="1.6"/></svg>;
    case "cal":     return <svg {...common}><rect x="2" y="3" width="12" height="11" rx="1"/><path d="M2 6h12M5 2v3M11 2v3"/></svg>;
    case "scroll":  return <svg {...common}><path d="M3 3h8v10H4a1 1 0 0 1-1-1V3z"/><path d="M11 3h2v8a2 2 0 0 1-2 2"/></svg>;
    case "skull":   return <svg {...common}><path d="M3 7a5 5 0 1 1 10 0v3l-1 1v2H4v-2l-1-1V7z"/><circle cx="6" cy="8" r="1"/><circle cx="10" cy="8" r="1"/></svg>;
    case "shield":  return <svg {...common}><path d="M8 2l5 2v4c0 3-2.5 5.5-5 6-2.5-.5-5-3-5-6V4l5-2z"/></svg>;
    case "banner":  return <svg {...common}><path d="M3 2h10v9l-5-2-5 2V2z"/></svg>;
    case "key":     return <svg {...common}><circle cx="5" cy="8" r="3"/><path d="M8 8h6M11 8v2M14 8v2"/></svg>;
    case "gem":     return <svg {...common}><path d="M3 6l3-4h4l3 4-5 8-5-8z"/><path d="M3 6h10M6 2l-1 4 3 8M10 2l1 4-3 8"/></svg>;
    case "book":    return <svg {...common}><path d="M3 3h4a2 2 0 0 1 2 2v9a2 2 0 0 0-2-2H3V3z"/><path d="M13 3H9a2 2 0 0 0-2 2v9a2 2 0 0 1 2-2h4V3z"/></svg>;
    case "star":    return <svg {...common}><path d="M8 2l1.8 3.8 4.2.6-3 3 .7 4.2L8 11.6 4.3 13.6 5 9.4 2 6.4l4.2-.6L8 2z"/></svg>;
    case "feather": return <svg {...common}><path d="M13 3c-2 0-9 3-9 9v1h1c6 0 9-7 9-9l-2 2M4 13l4-4"/></svg>;
    case "tongue":  return <svg {...common}><path d="M3 4h10M3 8h7M3 12h10"/></svg>;
    case "cog":     return <svg {...common}><circle cx="8" cy="8" r="2.5"/><path d="M8 1v2M8 13v2M1 8h2M13 8h2M3 3l1.5 1.5M11.5 11.5L13 13M3 13l1.5-1.5M11.5 4.5L13 3"/></svg>;
    case "chevron-left": return <svg {...common}><path d="M10 12L6 8l4-4"/></svg>;
    case "chevron-right": return <svg {...common}><path d="M6 12l4-4-4-4"/></svg>;
    default:        return null;
  }
}

export default function SideNavigation() {
  const pathname = usePathname();
  const isAdmin = useIsAdmin();
  const [collapsed, setCollapsed] = useState(false);

  const { data: calendarData } = useQuery<CalendarData | null>({
    queryKey: ['/api/data/calendar'],
    queryFn: () => authFetch('/api/data/calendar').then(r => r.ok ? r.json() : null),
  });

  const calCurrent = calendarData?.current;
  const calMonths = calendarData?.static?.months ?? [];
  const monthName = calCurrent ? (calMonths[calCurrent.month - 1]?.name ?? `Month ${calCurrent.month}`) : null;
  const gameDateLine1 = calCurrent && monthName ? `${monthName} ${calCurrent.day}` : null;
  const gameDateLine2 = calCurrent ? `year ${calCurrent.year} of the Bounty` : null;

  useEffect(() => {
    const saved = localStorage.getItem("sidenav-collapsed");
    if (saved === "true") setCollapsed(true);
  }, []);

  const toggle = () => {
    setCollapsed((prev) => {
      localStorage.setItem("sidenav-collapsed", String(!prev));
      return !prev;
    });
  };

  const isActive = (href: string) => {
    if (href === "/campaign") return pathname === "/campaign";
    return pathname.startsWith(href);
  };

  return (
    <aside className={`grim-sidebar${collapsed ? " is-collapsed" : ""}`}>
      <button
        className="grim-collapse-btn"
        onClick={toggle}
        title={collapsed ? "Expand navigation" : "Collapse navigation"}
        aria-label={collapsed ? "Expand navigation" : "Collapse navigation"}
      >
        <NavIcon name={collapsed ? "chevron-right" : "chevron-left"} />
      </button>

      <div className="grim-brand">
        <div className="grim-brand-mark">A</div>
        <div className="grim-brand-text">
          <h1 className="grim-brand-name">Azorian&apos;s<br/>Bounty</h1>
          <div className="grim-brand-sub">Campaign Codex · vol. iii</div>
        </div>
      </div>

      <div className="grim-nav-label">Navigation</div>
      <nav className="grim-nav">
        {NAV_ITEMS.map((item) => (
          item.dim ? (
            <span
              key={item.id}
              className="grim-nav-item is-dim"
              title={item.label}
            >
              <span className="grim-nav-ico"><NavIcon name={item.icon}/></span>
              <span className="grim-nav-body">
                <div>{item.label}</div>
                <div className="grim-nav-sub">{item.sub}</div>
              </span>
            </span>
          ) : (
            <Link
              key={item.id}
              href={item.href}
              className={`grim-nav-item${isActive(item.href) ? " is-active" : ""}`}
              title={item.label}
            >
              <span className="grim-nav-ico"><NavIcon name={item.icon}/></span>
              <span className="grim-nav-body">
                <div>{item.label}</div>
                <div className="grim-nav-sub">{item.sub}</div>
              </span>
            </Link>
          )
        ))}

        {isAdmin && (
          <Link
            href="/admin"
            className={`grim-nav-item${pathname === "/admin" ? " is-active" : ""}`}
            style={{ marginTop: 12, borderTop: "1px solid var(--grim-line)", paddingTop: 12 }}
            title="Admin"
          >
            <span className="grim-nav-ico"><NavIcon name="cog"/></span>
            <span className="grim-nav-body">
              <div>Admin</div>
              <div className="grim-nav-sub">Administration panel</div>
            </span>
          </Link>
        )}
      </nav>

      <div style={{ flex: 1 }}/>

      <div className="grim-sidebar-footer">
        <div className="grim-label" style={{ marginBottom: 6 }}>Game Date</div>
        {gameDateLine1 ? (
          <>
            <div style={{ fontFamily: "var(--font-display)", fontSize: 18, color: "var(--grim-gold)", lineHeight: 1.1 }}>
              {gameDateLine1}
            </div>
            <div className="grim-mono" style={{ fontSize: 11, color: "var(--grim-ink-3)", letterSpacing: ".18em" }}>
              {gameDateLine2}
            </div>
          </>
        ) : (
          <div className="grim-mono" style={{ fontSize: 11, color: "var(--grim-ink-4)", letterSpacing: ".14em" }}>not set</div>
        )}
      </div>
      <div className="grim-sidebar-signout">
        <SignOutButton />
      </div>
    </aside>
  );
}
