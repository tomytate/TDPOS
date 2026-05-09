"use client";

import React from "react";

// ─────────────────────────────────────────────────────────────
// Catalog Data
// ─────────────────────────────────────────────────────────────
export const CATALOG = [
  { id: "bb", name: "Bear Brand sachet", cat: "sachet", price: 12, unit: "pc", stock: 24, low: 10, tingi: true },
  { id: "nb", name: "Nescafe 3-in-1", cat: "sachet", price: 8, unit: "pc", stock: 36, low: 12, tingi: true },
  { id: "lm", name: "Lucky Me Pancit", cat: "noodle", price: 18, unit: "pc", stock: 18, low: 8 },
  { id: "sk", name: "Skyflakes pack", cat: "biscuit", price: 10, unit: "pack", stock: 32, low: 10 },
  { id: "co", name: "Coke Mismo 300ml", cat: "drink", price: 25, unit: "btl", stock: 12, low: 6 },
  { id: "rc", name: "RC Cola 240ml", cat: "drink", price: 18, unit: "btl", stock: 20, low: 8 },
  { id: "tg", name: "Tanduay Ice 330ml", cat: "drink", price: 38, unit: "btl", stock: 8, low: 6 },
  { id: "mr", name: "Marlboro stick", cat: "tobacco", price: 8, unit: "stick", stock: 48, low: 20, tingi: true },
  { id: "wn", name: "Winston stick", cat: "tobacco", price: 7, unit: "stick", stock: 36, low: 20, tingi: true },
  { id: "gl", name: "GLOBE load ₱100", cat: "load", price: 102.5, unit: "tx", stock: 99, low: 0 },
  { id: "sm", name: "Smart load ₱50", cat: "load", price: 51.5, unit: "tx", stock: 99, low: 0 },
  { id: "rh", name: "Red Horse 500ml", cat: "drink", price: 65, unit: "btl", stock: 6, low: 4 },
  { id: "sp", name: "Sprite 1.5L", cat: "drink", price: 68, unit: "btl", stock: 4, low: 3 },
  { id: "ev", name: "Eden cheese slice", cat: "dairy", price: 15, unit: "slice", stock: 10, low: 5, tingi: true },
  { id: "ps", name: "Pandesal", cat: "bakery", price: 3, unit: "pc", stock: 40, low: 15, tingi: true },
  { id: "rs", name: "Rice (per kilo)", cat: "rice", price: 58, unit: "kg", stock: 25, low: 10 },
];

// ─────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────
export const PHP = (v: number) => `₱${v.toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export const T = (en: string, tl: string, lang: string = "en") => (lang === "tl" ? tl : en);

export const tileBg = (p: { cat: string }) => {
  const map: Record<string, string> = {
    sachet: "linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)",
    noodle: "linear-gradient(135deg, #fee2e2 0%, #fecaca 100%)",
    biscuit: "linear-gradient(135deg, #ffedd5 0%, #fed7aa 100%)",
    drink: "linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%)",
    tobacco: "linear-gradient(135deg, #e5e7eb 0%, #d1d5db 100%)",
    load: "linear-gradient(135deg, #d1fae5 0%, #a7f3d0 100%)",
    dairy: "linear-gradient(135deg, #fdf4ff 0%, #f5d0fe 100%)",
    bakery: "linear-gradient(135deg, #fef9c3 0%, #fef08a 100%)",
    rice: "linear-gradient(135deg, #f5f5f4 0%, #e7e5e4 100%)",
  };
  return map[p.cat] || "#f5f5f4";
};

// ─────────────────────────────────────────────────────────────
// Icon Component
// ─────────────────────────────────────────────────────────────
export function Icon({
  name,
  size = 20,
  stroke = 2,
  style,
}: {
  name: string;
  size?: number;
  stroke?: number;
  style?: React.CSSProperties;
}) {
  const icons: Record<string, React.ReactNode> = {
    back: (
      <path d="M15 18l-6-6 6-6" strokeLinecap="round" strokeLinejoin="round" />
    ),
    x: (
      <>
        <path d="M18 6L6 18" strokeLinecap="round" />
        <path d="M6 6l12 12" strokeLinecap="round" />
      </>
    ),
    check: <path d="M20 6L9 17l-5-5" strokeLinecap="round" strokeLinejoin="round" />,
    plus: (
      <>
        <path d="M12 5v14" strokeLinecap="round" />
        <path d="M5 12h14" strokeLinecap="round" />
      </>
    ),
    minus: <path d="M5 12h14" strokeLinecap="round" />,
    search: (
      <>
        <circle cx="11" cy="11" r="6" />
        <path d="M21 21l-4.35-4.35" strokeLinecap="round" />
      </>
    ),
    scan: (
      <>
        <path d="M3 7V5a2 2 0 012-2h2" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M17 3h2a2 2 0 012 2v2" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M21 17v2a2 2 0 01-2 2h-2" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M7 21H5a2 2 0 01-2-2v-2" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M7 12h10" strokeLinecap="round" />
      </>
    ),
    cart: (
      <>
        <circle cx="9" cy="21" r="1" />
        <circle cx="20" cy="21" r="1" />
        <path d="M1 1h4l2.68 13.39a2 2 0 002 1.61h9.72a2 2 0 002-1.61L23 6H6" strokeLinecap="round" strokeLinejoin="round" />
      </>
    ),
    box: (
      <>
        <path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z" />
        <path d="M3.27 6.96L12 12.01l8.73-5.05" />
        <path d="M12 22.08V12" />
      </>
    ),
    utang: (
      <>
        <rect x="2" y="5" width="20" height="14" rx="2" />
        <path d="M2 10h20" />
      </>
    ),
    trend: (
      <path d="M23 6l-9.5 9.5-5-5L1 18" strokeLinecap="round" strokeLinejoin="round" />
    ),
    cash: (
      <>
        <rect x="1" y="4" width="22" height="16" rx="2" />
        <circle cx="12" cy="12" r="3" />
        <path d="M6 12h.01M18 12h.01" strokeLinecap="round" />
      </>
    ),
    qr: (
      <>
        <rect x="3" y="3" width="7" height="7" />
        <rect x="14" y="3" width="7" height="7" />
        <rect x="3" y="14" width="7" height="7" />
        <rect x="14" y="14" width="3" height="3" />
        <rect x="18" y="14" width="3" height="3" />
        <rect x="14" y="18" width="3" height="3" />
        <rect x="18" y="18" width="3" height="3" />
      </>
    ),
    phone: (
      <>
        <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72c.13.96.36 1.9.68 2.81a2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.91.31 1.85.54 2.81.68a2 2 0 011.72 2.04z" />
      </>
    ),
    bell: (
      <>
        <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9" />
        <path d="M13.73 21a2 2 0 01-3.46 0" />
      </>
    ),
    menu: (
      <>
        <path d="M3 12h18" strokeLinecap="round" />
        <path d="M3 6h18" strokeLinecap="round" />
        <path d="M3 18h18" strokeLinecap="round" />
      </>
    ),
    mic: (
      <>
        <path d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z" />
        <path d="M19 10v2a7 7 0 01-14 0v-2" strokeLinecap="round" />
        <path d="M12 19v4" strokeLinecap="round" />
        <path d="M8 23h8" strokeLinecap="round" />
      </>
    ),
  };

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={stroke}
      style={style}
    >
      {icons[name] || null}
    </svg>
  );
}

// ─────────────────────────────────────────────────────────────
// Product Glyph
// ─────────────────────────────────────────────────────────────
export function ProductGlyph({ p, size = 40 }: { p: { name: string; cat: string }; size?: number }) {
  const glyphs: Record<string, React.ReactNode> = {
    sachet: (
      <svg viewBox="0 0 40 40" width={size} height={size}>
        <rect x="8" y="6" width="24" height="28" rx="2" fill="#fbbf24" />
        <path d="M8 12h24" stroke="#92400e" strokeWidth="1.5" />
        <circle cx="20" cy="22" r="6" fill="#fff" opacity="0.8" />
      </svg>
    ),
    drink: (
      <svg viewBox="0 0 40 40" width={size} height={size}>
        <path d="M12 8h16l-2 26H14L12 8z" fill="#3b82f6" />
        <path d="M12 8h16" stroke="#1e40af" strokeWidth="2" strokeLinecap="round" />
        <ellipse cx="20" cy="8" rx="8" ry="2" fill="#60a5fa" />
      </svg>
    ),
    bakery: (
      <svg viewBox="0 0 40 40" width={size} height={size}>
        <ellipse cx="20" cy="24" rx="14" ry="10" fill="#fcd34d" />
        <ellipse cx="20" cy="22" rx="10" ry="6" fill="#fef08a" />
      </svg>
    ),
    tobacco: (
      <svg viewBox="0 0 40 40" width={size} height={size}>
        <rect x="10" y="16" width="20" height="8" rx="1" fill="#9ca3af" />
        <rect x="26" y="16" width="4" height="8" fill="#f97316" />
      </svg>
    ),
    noodle: (
      <svg viewBox="0 0 40 40" width={size} height={size}>
        <rect x="6" y="10" width="28" height="20" rx="3" fill="#ef4444" />
        <path d="M10 20c4-4 8 4 12 0s8 4 12 0" stroke="#fef08a" strokeWidth="2" fill="none" />
      </svg>
    ),
    load: (
      <svg viewBox="0 0 40 40" width={size} height={size}>
        <circle cx="20" cy="20" r="14" fill="#10b981" />
        <path d="M14 20h12M20 14v12" stroke="#fff" strokeWidth="2" strokeLinecap="round" />
      </svg>
    ),
    default: (
      <svg viewBox="0 0 40 40" width={size} height={size}>
        <rect x="8" y="8" width="24" height="24" rx="4" fill="#d1d5db" />
        <text x="20" y="25" textAnchor="middle" fontSize="14" fill="#374151" fontWeight="bold">
          {p.name.charAt(0)}
        </text>
      </svg>
    ),
  };

  return <>{glyphs[p.cat] || glyphs.default}</>;
}

// ─────────────────────────────────────────────────────────────
// Money Display
// ─────────────────────────────────────────────────────────────
export function Money({
  value,
  size = 16,
  weight = 600,
  color = "inherit",
}: {
  value: number;
  size?: number;
  weight?: number;
  color?: string;
}) {
  return (
    <span
      className="tabular"
      style={{ fontSize: size, fontWeight: weight, color }}
    >
      {PHP(value)}
    </span>
  );
}

// ─────────────────────────────────────────────────────────────
// UI Components
// ─────────────────────────────────────────────────────────────
export function Eyebrow({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: React.CSSProperties;
}) {
  return (
    <div
      style={{
        fontSize: 33,
        fontWeight: 700,
        letterSpacing: "0.08em",
        textTransform: "uppercase",
        color: "var(--ink-500)",
        ...style,
      }}
    >
      {children}
    </div>
  );
}

export function Hairline() {
  return (
    <div
      style={{
        height: 3,
        background: "var(--border)",
        margin: "26px 0",
      }}
    />
  );
}

export function StatusChip({ label }: { label: string }) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 13,
        padding: "10px 26px",
        borderRadius: 100,
        background: "rgba(34, 197, 94, 0.15)",
        color: "var(--green-500)",
        fontSize: 36,
        fontWeight: 700,
      }}
    >
      <span
        style={{
          width: 20,
          height: 20,
          borderRadius: 10,
          background: "currentColor",
        }}
      />
      {label}
    </span>
  );
}

export function Kpi({
  label,
  value,
  delta,
  accent,
}: {
  label: string;
  value: string;
  delta?: string;
  accent?: string;
}) {
  return (
    <div
      style={{
        padding: "33px 40px",
        background: "rgba(255, 255, 255, 0.1)",
        borderRadius: 20,
      }}
    >
      <div
        style={{
          fontSize: 33,
          fontWeight: 600,
          color: "rgba(255, 255, 255, 0.65)",
          letterSpacing: "0.04em",
          textTransform: "uppercase",
        }}
      >
        {label}
      </div>
      <div
        className="tabular"
        style={{
          fontSize: 59,
          fontWeight: 800,
          color: accent || "#fff",
          marginTop: 6,
        }}
      >
        {value}
      </div>
      {delta && (
        <div
          style={{
            fontSize: 33,
            color: "rgba(255, 255, 255, 0.5)",
            marginTop: 6,
          }}
        >
          {delta}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Phone Shell
// ─────────────────────────────────────────────────────────────
export function PhoneShell({
  children,
  tone = "light",
  statusBar = "dark",
  style,
}: {
  children: React.ReactNode;
  tone?: "light" | "dark";
  statusBar?: "light" | "dark";
  style?: React.CSSProperties;
}) {
  const isDark = tone === "dark";
  const statusLight = statusBar === "light";

  return (
    <div
      style={{
        width: 1179,
        height: 2665,
        background: isDark ? "var(--ink-900)" : "#fff",
        color: isDark ? "#fff" : "var(--ink-900)",
        display: "flex",
        flexDirection: "column",
        fontFamily: "var(--font-sans)",
        overflow: "hidden",
        position: "relative",
        ...style,
      }}
    >
      {/* Status Bar - iPhone 15 scale */}
      <div
        style={{
          height: 147,
          padding: "0 66px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          fontSize: 46,
          fontWeight: 600,
          color: statusLight ? "#fff" : "var(--ink-900)",
          flexShrink: 0,
        }}
      >
        <span>9:41</span>
        <div style={{ display: "flex", gap: 13, alignItems: "center" }}>
          <svg width="56" height="36" viewBox="0 0 17 11" fill="currentColor">
            <path d="M1 4.5C1 3.67 1.67 3 2.5 3h1C4.33 3 5 3.67 5 4.5v4c0 .83-.67 1.5-1.5 1.5h-1C1.67 10 1 9.33 1 8.5v-4zM6 3.5C6 2.67 6.67 2 7.5 2h1C9.33 2 10 2.67 10 3.5v5c0 .83-.67 1.5-1.5 1.5h-1C6.67 10 6 9.33 6 8.5v-5zM11 2.5c0-.83.67-1.5 1.5-1.5h1c.83 0 1.5.67 1.5 1.5v6c0 .83-.67 1.5-1.5 1.5h-1c-.83 0-1.5-.67-1.5-1.5v-6z" />
          </svg>
          <svg width="50" height="36" viewBox="0 0 15 11" fill="currentColor">
            <path d="M7.5 2.5a6.5 6.5 0 015.18 2.6.5.5 0 01-.8.6A5.5 5.5 0 007.5 3.5a5.5 5.5 0 00-4.38 2.2.5.5 0 01-.8-.6A6.5 6.5 0 017.5 2.5z" />
            <path d="M7.5 5.5a4 4 0 013.18 1.6.5.5 0 01-.8.6A3 3 0 007.5 6.5a3 3 0 00-2.38 1.2.5.5 0 01-.8-.6A4 4 0 017.5 5.5z" />
            <circle cx="7.5" cy="9.5" r="1.5" />
          </svg>
          <svg width="82" height="40" viewBox="0 0 25 12" fill="currentColor">
            <rect x="0" y="1" width="21" height="10" rx="2.5" stroke="currentColor" strokeWidth="1" fill="none" />
            <rect x="2" y="3" width="17" height="6" rx="1" />
            <path d="M23 4v4a2 2 0 000-4z" />
          </svg>
        </div>
      </div>
      {children}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// App Bar
// ─────────────────────────────────────────────────────────────
export function AppBar({
  variant = "teal",
  title,
  subtitle,
  trailing,
  children,
}: {
  variant?: "teal" | "dark" | "light";
  title: string;
  subtitle?: string;
  trailing?: React.ReactNode;
  children?: React.ReactNode;
}) {
  const variants = {
    teal: {
      bg: "linear-gradient(180deg, var(--teal-700) 0%, var(--teal-800) 100%)",
      color: "#fff",
    },
    dark: {
      bg: "linear-gradient(180deg, var(--ink-800) 0%, var(--ink-900) 100%)",
      color: "#fff",
    },
    light: {
      bg: "#fff",
      color: "var(--ink-900)",
    },
  };

  const v = variants[variant];

  return (
    <div
      style={{
        background: v.bg,
        color: v.color,
        padding: "40px 52px 52px",
        flexShrink: 0,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          gap: 40,
        }}
      >
        <div>
          <div style={{ fontSize: 66, fontWeight: 700 }}>{title}</div>
          {subtitle && (
            <div
              style={{
                fontSize: 40,
                opacity: 0.75,
                marginTop: 6,
              }}
            >
              {subtitle}
            </div>
          )}
        </div>
        {trailing}
      </div>
      {children}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Chip Row
// ─────────────────────────────────────────────────────────────
export function ChipRow({
  items,
  active,
  onSelect,
}: {
  items: { id: string; label: string }[];
  active: string;
  onSelect: (id: string) => void;
}) {
  return (
    <div
      style={{
        display: "flex",
        gap: 26,
        padding: "40px 52px",
        overflowX: "auto",
        flexShrink: 0,
      }}
    >
      {items.map((item) => (
        <button
          key={item.id}
          onClick={() => onSelect(item.id)}
          style={{
            padding: "26px 46px",
            borderRadius: 100,
            border:
              active === item.id
                ? "5px solid var(--teal-700)"
                : "3px solid var(--border-strong)",
            background: active === item.id ? "var(--teal-50)" : "#fff",
            color: active === item.id ? "var(--teal-700)" : "var(--ink-700)",
            fontSize: 40,
            fontWeight: 600,
            whiteSpace: "nowrap",
            cursor: "pointer",
            fontFamily: "inherit",
          }}
        >
          {item.label}
        </button>
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Bottom Tabs
// ─────────────────────────────────────────────────────────────
export function BottomTabs({
  tabs,
  active,
  onChange,
  accent = "var(--teal-700)",
}: {
  tabs: { id: string; icon: string; label: string }[];
  active: string;
  onChange: (id: string) => void;
  accent?: string;
}) {
  return (
    <div
      style={{
        display: "flex",
        borderTop: "3px solid var(--border)",
        background: "#fff",
        flexShrink: 0,
        paddingBottom: 40,
      }}
    >
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onChange(tab.id)}
          style={{
            flex: 1,
            padding: "33px 0 26px",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 13,
            border: 0,
            background: "transparent",
            color: active === tab.id ? accent : "var(--ink-400)",
            cursor: "pointer",
            fontFamily: "inherit",
          }}
        >
          <Icon name={tab.icon} size={72} stroke={active === tab.id ? 2.2 : 1.8} />
          <span
            style={{
              fontSize: 33,
              fontWeight: active === tab.id ? 700 : 500,
            }}
          >
            {tab.label}
          </span>
        </button>
      ))}
    </div>
  );
}
