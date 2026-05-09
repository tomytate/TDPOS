"use client";

import React from "react";
import {
  PhoneShell,
  AppBar,
  ChipRow,
  BottomTabs,
  Icon,
  Money,
  Eyebrow,
  Hairline,
  StatusChip,
  Kpi,
  CATALOG,
  PHP,
  T,
  tileBg,
  ProductGlyph,
} from "./shared";

// ═══════════════════════════════════════════════════════════════════
// TIER A — SUKI PRO LITE (Sari-sari / Micro-stall)
// Warm teal + amber, photo tiles, cozy phone-only
// ═══════════════════════════════════════════════════════════════════

export function SukiProSale({ lang = "en" }: { lang?: string }) {
  const shortcuts = CATALOG.slice(0, 8);
  const cart = [
    { ...CATALOG[14], qty: 6 }, // Pandesal
    { ...CATALOG[0], qty: 2 },  // Bear Brand
  ];
  const total = cart.reduce((s, i) => s + i.qty * i.price, 0);

  return (
    <PhoneShell statusBar="light">
      <AppBar
        variant="teal"
        title={T("New sale", "Bagong benta", lang)}
        subtitle="Aling Nena Store"
        trailing={<Icon name="search" size={72} />}
      />

      <ChipRow
        items={[
          { id: "all", label: T("All", "Lahat", lang) },
          { id: "recent", label: T("Recent", "Kamakailang", lang) },
          { id: "sachet", label: "Sachet" },
          { id: "drinks", label: T("Drinks", "Inumin", lang) },
          { id: "load", label: "Load" },
        ]}
        active="all"
        onSelect={() => {}}
      />

      {/* Product Grid */}
      <div
        style={{
          flex: 1,
          overflowY: "auto",
          padding: "0 40px 40px",
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: 33,
          alignContent: "start",
        }}
      >
        {shortcuts.map((p) => (
          <button
            key={p.id}
            style={{
              aspectRatio: "1",
              borderRadius: 32,
              border: "3px solid var(--border)",
              background: tileBg(p),
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              padding: 20,
              cursor: "pointer",
              position: "relative",
            }}
          >
            <ProductGlyph p={p} size={118} />
            <div
              style={{
                fontSize: 33,
                fontWeight: 600,
                color: "var(--ink-700)",
                marginTop: 13,
                textAlign: "center",
                lineHeight: 1.2,
                overflow: "hidden",
                textOverflow: "ellipsis",
                display: "-webkit-box",
                WebkitLineClamp: 2,
                WebkitBoxOrient: "vertical",
              }}
            >
              {p.name}
            </div>
            <div
              className="tabular"
              style={{
                position: "absolute",
                top: 13,
                right: 13,
                fontSize: 30,
                fontWeight: 700,
                color: "var(--teal-700)",
                background: "rgba(255, 255, 255, 0.9)",
                padding: "6px 16px",
                borderRadius: 16,
              }}
            >
              {PHP(p.price)}
            </div>
          </button>
        ))}
      </div>

      {/* Cart Summary */}
      {cart.length > 0 && (
        <div
          style={{
            background: "var(--teal-800)",
            color: "#fff",
            padding: "40px 52px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexShrink: 0,
          }}
        >
          <div>
            <div style={{ fontSize: 40, opacity: 0.8 }}>
              {cart.length} {T("items", "item", lang)} · {cart.reduce((s, i) => s + i.qty, 0)} {T("pcs", "piraso", lang)}
            </div>
            <Money value={total} size={72} weight={800} color="#fff" />
          </div>
          <button
            style={{
              height: 144,
              padding: "0 66px",
              borderRadius: 24,
              border: 0,
              background: "var(--amber-500)",
              color: "var(--ink-900)",
              fontSize: 46,
              fontWeight: 800,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: 26,
              fontFamily: "inherit",
            }}
          >
            {T("Charge", "Bayad", lang)} →
          </button>
        </div>
      )}

      <BottomTabs
        active="sale"
        onChange={() => {}}
        tabs={[
          { id: "sale", icon: "cart", label: T("Sale", "Benta", lang) },
          { id: "stock", icon: "box", label: "Stock" },
          { id: "utang", icon: "utang", label: "Utang" },
          { id: "report", icon: "trend", label: T("Report", "Ulat", lang) },
        ]}
      />
    </PhoneShell>
  );
}

export function SukiProCheckout({ lang = "en" }: { lang?: string }) {
  const cart = [
    { ...CATALOG[14], qty: 6 },
    { ...CATALOG[0], qty: 2 },
    { ...CATALOG[7], qty: 3 },
    { ...CATALOG[2], qty: 1 },
    { ...CATALOG[4], qty: 1 },
    { ...CATALOG[9], qty: 1 },
  ];
  const total = cart.reduce((s, i) => s + i.qty * i.price, 0);
  const tendered = 250;
  const change = tendered - total;

  const methods = [
    { id: "cash", icon: "cash", label: T("Cash", "Cash", lang), hint: T("Count change", "Sukli", lang), selected: true, bg: "var(--green-500)", tone: "#fff" },
    { id: "gcash", icon: "qr", label: "GCash", hint: T("Scan QR", "I-scan", lang), selected: false, bg: "#0066cc", tone: "#fff" },
    { id: "utang", icon: "utang", label: "Utang", hint: T("Credit", "Pautang", lang), selected: false, bg: "var(--amber-500)", tone: "var(--ink-900)" },
  ];

  return (
    <PhoneShell statusBar="light">
      <AppBar
        variant="teal"
        title={T("Checkout", "Checkout", lang)}
        subtitle={`${cart.length} ${T("lines", "linya", lang)} · ${cart.reduce((s, i) => s + i.qty, 0)} ${T("items", "piraso", lang)}`}
      />

      {/* Payment methods */}
      <div style={{ padding: "40px 52px 20px" }}>
        <Eyebrow>{T("Payment method", "Paraan ng bayad", lang)}</Eyebrow>
        <div style={{ display: "flex", gap: 26, marginTop: 33 }}>
          {methods.map((m) => (
            <button
              key={m.id}
              style={{
                flex: 1,
                padding: "40px 33px",
                borderRadius: 24,
                border: m.selected ? "6px solid var(--teal-700)" : "3px solid var(--border-strong)",
                background: m.selected ? "var(--teal-50)" : "#fff",
                cursor: "pointer",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 20,
                fontFamily: "inherit",
              }}
            >
              <div
                style={{
                  width: 118,
                  height: 118,
                  borderRadius: 24,
                  background: m.bg,
                  color: m.tone,
                  display: "grid",
                  placeItems: "center",
                }}
              >
                <Icon name={m.icon} size={59} />
              </div>
              <div style={{ fontSize: 40, fontWeight: 700, color: "var(--ink-900)" }}>{m.label}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Cash denominations */}
      <div style={{ padding: "46px 52px 26px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 26 }}>
          <Eyebrow>{T("Cash tendered", "Cash ibinigay", lang)}</Eyebrow>
          <span style={{ fontSize: 36, color: "var(--ink-500)" }}>{T("Tap a denomination", "Tap denominasyon", lang)}</span>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 20 }}>
          {[20, 50, 100, 200, 250, 300, 500, 1000].map((n) => {
            const sel = n === 250;
            return (
              <button
                key={n}
                className="wp-num"
                style={{
                  height: 144,
                  borderRadius: 24,
                  border: sel ? "5px solid var(--teal-700)" : "3px solid var(--border-strong)",
                  background: sel ? "var(--teal-100)" : "#fff",
                  color: sel ? "var(--teal-700)" : "var(--ink-700)",
                  fontSize: 43,
                  fontWeight: 700,
                  cursor: "pointer",
                  fontFamily: "inherit",
                }}
              >
                ₱{n.toLocaleString("en-PH")}
              </button>
            );
          })}
        </div>
      </div>

      <div style={{ flex: 1 }} />

      {/* Total summary */}
      <div style={{ background: "var(--ink-100)", padding: "40px 52px", borderTop: "3px solid var(--border)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 40, color: "var(--ink-500)", padding: "6px 0" }}>
          <span>{T("Subtotal", "Subtotal", lang)}</span>
          <Money value={total} size={40} weight={500} color="var(--ink-700)" />
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 40, color: "var(--ink-500)", padding: "6px 0" }}>
          <span>{T("Tendered (₱250)", "Ibinigay (₱250)", lang)}</span>
          <Money value={tendered} size={40} weight={500} color="var(--ink-700)" />
        </div>
        <Hairline />
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", padding: "20px 0 0" }}>
          <span style={{ fontSize: 46, fontWeight: 700, color: "var(--ink-900)" }}>{T("Change due", "Sukli", lang)}</span>
          <Money value={change} size={72} weight={800} color="var(--green-600)" />
        </div>
      </div>

      <div style={{ display: "flex", gap: 26, padding: 40, background: "#fff", borderTop: "3px solid var(--border)", flexShrink: 0 }}>
        <button
          style={{
            width: 184,
            height: 170,
            borderRadius: 24,
            border: "5px solid var(--border-strong)",
            background: "#fff",
            display: "grid",
            placeItems: "center",
            cursor: "pointer",
          }}
        >
          <Icon name="x" size={66} />
        </button>
        <button
          style={{
            flex: 1,
            height: 170,
            borderRadius: 24,
            border: 0,
            background: "linear-gradient(180deg, var(--teal-600) 0%, var(--teal-700) 100%)",
            color: "#fff",
            fontSize: 49,
            fontWeight: 800,
            cursor: "pointer",
            fontFamily: "inherit",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 26,
            boxShadow: "0 13px 40px rgba(13, 122, 114, 0.35)",
          }}
        >
          {T("Confirm sale", "Tapusin", lang)} · <span className="wp-num">₱{total.toFixed(2)}</span>
        </button>
      </div>
    </PhoneShell>
  );
}

export function SukiProReceipt({ lang = "en" }: { lang?: string }) {
  return (
    <PhoneShell tone="dark" statusBar="light">
      <div
        style={{
          padding: "92px 52px 59px",
          background: "linear-gradient(180deg, #0a3d3a 0%, #115e59 100%)",
          color: "#fff",
          textAlign: "center",
          position: "relative",
        }}
      >
        <div
          style={{
            width: 210,
            height: 210,
            margin: "0 auto",
            borderRadius: 105,
            background: "var(--green-500)",
            display: "grid",
            placeItems: "center",
            boxShadow: "0 0 0 26px rgba(34, 197, 94, 0.2), 0 26px 66px rgba(34, 197, 94, 0.3)",
          }}
        >
          <Icon name="check" size={112} stroke={3} />
        </div>
        <div style={{ fontSize: 43, opacity: 0.8, fontWeight: 600, marginTop: 40 }}>
          {T("Sale recorded", "Naitala ang benta", lang)}
        </div>
        <div style={{ marginTop: 13 }}>
          <Money value={247.5} size={105} weight={800} color="#fff" />
        </div>
        <div
          style={{
            fontSize: 40,
            opacity: 0.8,
            marginTop: 13,
            display: "inline-flex",
            alignItems: "center",
            gap: 20,
            padding: "13px 33px",
            background: "rgba(34, 197, 94, 0.18)",
            borderRadius: 100,
          }}
        >
          {T("Change", "Sukli", lang)}{" "}
          <span className="wp-num" style={{ color: "var(--amber-300)", fontWeight: 800 }}>
            ₱2.50
          </span>
        </div>
      </div>

      {/* Thermal receipt */}
      <div style={{ flex: 1, overflowY: "auto", padding: "0 52px 40px", background: "var(--teal-900)" }}>
        <div style={{ position: "relative", marginTop: 40 }}>
          {/* Torn top */}
          <svg width="100%" height="20" viewBox="0 0 100 6" preserveAspectRatio="none" style={{ display: "block" }}>
            <path
              d="M0,6 L0,3 L4,5 L8,2 L12,5 L16,2 L20,5 L24,2 L28,5 L32,2 L36,5 L40,2 L44,5 L48,2 L52,5 L56,2 L60,5 L64,2 L68,5 L72,2 L76,5 L80,2 L84,5 L88,2 L92,5 L96,2 L100,5 L100,6 Z"
              fill="#fffdf8"
            />
          </svg>
          <div
            style={{
              background: "#fffdf8",
              padding: "46px 59px 26px",
              fontFamily: "var(--font-mono)",
              fontSize: 38,
              color: "var(--ink-800)",
            }}
          >
            <div
              style={{
                textAlign: "center",
                borderBottom: "3px dashed var(--border-strong)",
                paddingBottom: 33,
                marginBottom: 33,
              }}
            >
              <div style={{ fontSize: 46, fontWeight: 800, letterSpacing: ".04em" }}>ALING NENA STORE</div>
              <div style={{ fontSize: 33, color: "var(--ink-500)", marginTop: 6 }}>123 Mabini St · Brgy. San Roque</div>
              <div style={{ fontSize: 33, color: "var(--ink-500)" }}>VAT REG TIN 234-456-789-000</div>
              <div style={{ fontSize: 33, color: "var(--ink-500)", marginTop: 6 }}>Mar 14, 2026 · 14:08 · OR #0247</div>
            </div>
            {[
              ["2× Pandesal", 6.0],
              ["6× Bear Brand sachet", 72.0],
              ["3× Marlboro stick", 24.0],
              ["1× Lucky Me Pancit", 18.0],
              ["1× Coke Mismo 300ml", 25.0],
              ["1× GLOBE load ₱100", 102.5],
            ].map(([n, v]) => (
              <div key={String(n)} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0" }}>
                <span>{n}</span>
                <span className="wp-num">₱{(v as number).toFixed(2)}</span>
              </div>
            ))}
            <div style={{ borderTop: "3px dashed var(--border-strong)", marginTop: 26, paddingTop: 20 }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontWeight: 800, fontSize: 43, marginTop: 13, paddingTop: 13, borderTop: "3px dashed var(--border-strong)" }}>
                <span>TOTAL</span>
                <span className="wp-num">₱247.50</span>
              </div>
            </div>
            <div
              style={{
                textAlign: "center",
                fontSize: 33,
                color: "var(--ink-500)",
                marginTop: 40,
                paddingTop: 26,
                borderTop: "3px dashed var(--border-strong)",
              }}
            >
              Salamat po! · Balik kayo ulit
              <div style={{ marginTop: 6, opacity: 0.7 }}>Powered by Suki POS</div>
            </div>
          </div>
          {/* Torn bottom */}
          <svg
            width="100%"
            height="20"
            viewBox="0 0 100 6"
            preserveAspectRatio="none"
            style={{ display: "block", transform: "scaleY(-1)" }}
          >
            <path
              d="M0,6 L0,3 L4,5 L8,2 L12,5 L16,2 L20,5 L24,2 L28,5 L32,2 L36,5 L40,2 L44,5 L48,2 L52,5 L56,2 L60,5 L64,2 L68,5 L72,2 L76,5 L80,2 L84,5 L88,2 L92,5 L96,2 L100,5 L100,6 Z"
              fill="#fffdf8"
            />
          </svg>
        </div>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr 1.4fr",
          gap: 20,
          padding: 40,
          background: "var(--teal-900)",
          flexShrink: 0,
        }}
      >
        {[
          { icon: "phone", label: "SMS" },
          { icon: "qr", label: "Print" },
          { icon: "plus", label: T("New sale", "Bagong benta", lang), primary: true },
        ].map((b) => (
          <button
            key={b.label}
            style={{
              height: 157,
              borderRadius: 24,
              border: 0,
              background: b.primary ? "var(--amber-500)" : "rgba(255, 255, 255, 0.10)",
              color: "#fff",
              fontSize: 43,
              fontWeight: 700,
              cursor: "pointer",
              fontFamily: "inherit",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 20,
              boxShadow: b.primary ? "0 13px 40px rgba(245, 158, 11, 0.32)" : "none",
            }}
          >
            <Icon name={b.icon} size={52} /> {b.label}
          </button>
        ))}
      </div>
    </PhoneShell>
  );
}

export function SukiProInventory({ lang = "en" }: { lang?: string }) {
  const samples = CATALOG.slice(0, 8).map((p, i) => ({
    ...p,
    vals: [0.4, 0.7, 0.5, 0.6, 0.8, 0.55, 0.35, 0.3 + ((i * 0.08) % 0.6)].map((v) => Math.min(1, v)),
  }));

  const SparkBar = ({ vals, low }: { vals: number[]; low: boolean }) => (
    <svg width="184" height="59" viewBox="0 0 56 18">
      {vals.map((v, i) => (
        <rect
          key={i}
          x={i * 7}
          y={18 - v * 14}
          width="5"
          height={v * 14}
          fill={low && i === vals.length - 1 ? "var(--red-500)" : "var(--teal-500)"}
          rx="1"
          opacity={i === vals.length - 1 ? 1 : 0.55}
        />
      ))}
    </svg>
  );

  return (
    <PhoneShell statusBar="light">
      <AppBar
        variant="teal"
        title={T("Inventory", "Stock", lang)}
        subtitle="156 SKUs · 4 low"
        trailing={<Icon name="search" size={66} />}
      >
        <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr 1fr", gap: 20, marginTop: 40 }}>
          <Kpi label={T("Stock value", "Halaga", lang)} value="₱4,280" delta="↑ ₱220 wk" />
          <Kpi label={T("Items low", "Konti na", lang)} value="4" accent="var(--amber-300)" delta={T("reorder", "i-order", lang)} />
          <Kpi label={T("Out", "Ubos", lang)} value="1" accent="rgba(255, 255, 255, 0.85)" delta="Tasty loaf" />
        </div>
      </AppBar>

      <ChipRow
        items={[
          { id: "all", label: T("All · 156", "Lahat · 156", lang) },
          { id: "low", label: "⚠ " + T("Low · 4", "Konti · 4", lang) },
          { id: "sachet", label: "Sachet · 38" },
          { id: "drink", label: T("Drinks · 24", "Inumin · 24", lang) },
          { id: "cig", label: T("Sticks · 12", "Stik · 12", lang) },
        ]}
        active="all"
        onSelect={() => {}}
      />

      <div style={{ flex: 1, overflowY: "auto" }}>
        {samples.map((p, i) => {
          const low = p.stock <= p.low && p.low > 0;
          return (
            <div
              key={p.id}
              style={{
                padding: "40px 52px",
                display: "flex",
                alignItems: "center",
                gap: 40,
                borderBottom: i < samples.length - 1 ? "3px solid var(--border)" : "none",
                background: low ? "rgba(254, 226, 226, 0.35)" : "#fff",
              }}
            >
              <div
                style={{
                  width: 144,
                  height: 144,
                  borderRadius: 24,
                  background: tileBg(p),
                  display: "grid",
                  placeItems: "center",
                  flexShrink: 0,
                  border: "3px solid rgba(0, 0, 0, 0.04)",
                }}
              >
                <ProductGlyph p={p} size={105} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
                  <span style={{ fontSize: 44, fontWeight: 700, color: "var(--ink-900)" }}>{p.name}</span>
                  {low && (
                    <span
                      style={{
                        fontSize: 30,
                        fontWeight: 800,
                        color: "#fff",
                        background: "var(--red-600)",
                        padding: "3px 16px",
                        borderRadius: 10,
                      }}
                    >
                      LOW
                    </span>
                  )}
                </div>
                <div style={{ fontSize: 36, color: "var(--ink-500)", marginTop: 6 }}>
                  <span className="wp-num">{p.stock}</span> {p.unit}
                  {p.tingi ? " · " + T("tingi", "tingi", lang) : ""}
                  {" · " + T("cost", "puhunan", lang) + " "}
                  <span className="wp-num">₱{(p.price * 0.7).toFixed(2)}</span>
                </div>
              </div>
              <SparkBar vals={p.vals} low={low} />
              <button
                style={{
                  width: 118,
                  height: 118,
                  borderRadius: 24,
                  border: "3px solid var(--border-strong)",
                  background: "#fff",
                  display: "grid",
                  placeItems: "center",
                  cursor: "pointer",
                }}
              >
                <Icon name="plus" size={52} />
              </button>
            </div>
          );
        })}
      </div>

      <BottomTabs
        active="stock"
        onChange={() => {}}
        tabs={[
          { id: "sale", icon: "cart", label: T("Sale", "Benta", lang) },
          { id: "stock", icon: "box", label: "Stock" },
          { id: "utang", icon: "utang", label: "Utang" },
          { id: "report", icon: "trend", label: T("Report", "Ulat", lang) },
        ]}
      />
    </PhoneShell>
  );
}

export function SukiProEod({ lang = "en" }: { lang?: string }) {
  const hours = [20, 35, 80, 95, 60, 45, 30, 70, 88, 75, 50, 40];
  const peak = Math.max(...hours);

  return (
    <PhoneShell statusBar="light">
      <AppBar
        variant="dark"
        title={T("Today", "Ngayon", lang)}
        subtitle="Sat, Mar 14 · 6 AM – now"
        trailing={<StatusChip label={T("Live", "Live", lang)} />}
      >
        <div style={{ marginTop: 46 }}>
          <Eyebrow style={{ color: "rgba(255, 255, 255, 0.6)" }}>{T("Gross sales", "Kabuuang benta", lang)}</Eyebrow>
          <div style={{ marginTop: 6 }}>
            <Money value={3847.5} size={131} weight={800} color="#fff" />
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 26, marginTop: 20 }}>
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 13,
                fontSize: 40,
                fontWeight: 700,
                color: "var(--green-500)",
                background: "rgba(34, 197, 94, 0.18)",
                padding: "10px 26px",
                borderRadius: 100,
              }}
            >
              <Icon name="trend" size={40} stroke={2.5} /> +18% {T("vs Tue", "kumpara Mar", lang)}
            </span>
            <span style={{ fontSize: 36, color: "rgba(255, 255, 255, 0.7)" }}>
              47 {T("items", "items", lang)} · 26 {T("sales", "benta", lang)}
            </span>
          </div>
        </div>
      </AppBar>

      <div style={{ flex: 1, overflowY: "auto", background: "var(--ink-100)" }}>
        {/* Hour chart card */}
        <div className="wp-card" style={{ margin: 40, padding: 46 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 33 }}>
            <Eyebrow>{T("Sales by hour", "Bawat oras", lang)}</Eyebrow>
            <span style={{ fontSize: 36, color: "var(--ink-500)" }}>{T("Peak 9–11 AM", "Peak 9–11 NU", lang)}</span>
          </div>
          <div style={{ display: "flex", alignItems: "flex-end", gap: 13, height: 295 }}>
            {hours.map((h, i) => {
              const isPeak = h === peak;
              return (
                <div
                  key={i}
                  style={{
                    flex: 1,
                    position: "relative",
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "flex-end",
                    height: "100%",
                  }}
                >
                  <div
                    style={{
                      height: `${h}%`,
                      background: isPeak
                        ? "linear-gradient(180deg, var(--amber-500) 0%, var(--amber-600) 100%)"
                        : "linear-gradient(180deg, var(--teal-500) 0%, var(--teal-700) 100%)",
                      borderRadius: "10px 10px 0 0",
                    }}
                  />
                  {isPeak && (
                    <div
                      style={{
                        position: "absolute",
                        bottom: "100%",
                        left: "50%",
                        transform: "translateX(-50%) translateY(-13px)",
                        fontSize: 30,
                        fontWeight: 800,
                        color: "var(--amber-700)",
                        whiteSpace: "nowrap",
                      }}
                    >
                      peak
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              marginTop: 20,
              fontSize: 33,
              color: "var(--ink-500)",
              fontWeight: 600,
            }}
          >
            <span>6a</span>
            <span>10a</span>
            <span>2p</span>
            <span>6p</span>
            <span>10p</span>
          </div>
        </div>

        {/* Tender mix card */}
        <div className="wp-card" style={{ margin: "0 40px 40px", padding: 46 }}>
          <Eyebrow style={{ marginBottom: 33 }}>{T("Payment mix", "Paraan ng bayad", lang)}</Eyebrow>
          <div style={{ height: 26, borderRadius: 13, overflow: "hidden", display: "flex", marginBottom: 40 }}>
            <div style={{ width: "68%", background: "var(--green-500)" }} />
            <div style={{ width: "22%", background: "#0066cc" }} />
            <div style={{ width: "10%", background: "var(--amber-500)" }} />
          </div>
          {[
            { label: T("Cash", "Cash", lang), v: 2640.5, pct: 68, color: "var(--green-600)", icon: "cash" },
            { label: "GCash", v: 845.0, pct: 22, color: "#0066cc", icon: "qr" },
            { label: T("Utang (credit)", "Utang", lang), v: 362.0, pct: 10, color: "var(--amber-600)", icon: "utang" },
          ].map((row) => (
            <div key={row.label} style={{ display: "flex", alignItems: "center", gap: 33, padding: "20px 0" }}>
              <div style={{ width: 26, height: 26, borderRadius: 13, background: row.color }} />
              <Icon name={row.icon} size={46} style={{ color: row.color }} />
              <span style={{ flex: 1, fontSize: 43, fontWeight: 600, color: "var(--ink-700)" }}>{row.label}</span>
              <span style={{ fontSize: 36, color: "var(--ink-500)", marginRight: 26 }} className="wp-num">
                {row.pct}%
              </span>
              <Money value={row.v} size={43} weight={700} />
            </div>
          ))}
        </div>
      </div>
    </PhoneShell>
  );
}
