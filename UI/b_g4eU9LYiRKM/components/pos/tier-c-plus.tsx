"use client";

import React from "react";
import { PHP } from "./shared";

// ─────────────────────────────────────────────────────────────
// Tier C — Plus (Convenience / 7-11 scale)
// Cool palette pivot: slate primary, teal accent, data density up
// ─────────────────────────────────────────────────────────────

const COOL_FONT =
  "ui-sans-serif, -apple-system, BlinkMacSystemFont, system-ui, sans-serif";

const slate = {
  50: "#f8fafc",
  100: "#f1f5f9",
  150: "#e9eef5",
  200: "#e2e8f0",
  300: "#cbd5e1",
  400: "#94a3b8",
  500: "#64748b",
  600: "#475569",
  700: "#334155",
  800: "#1e293b",
  900: "#0f172a",
};

const accent = "#0f766e"; // teal accent only
const positive = "#16a34a";
const warn = "#d97706";
const danger = "#dc2626";

// ─────────────────────────────────────────────────────────────
// Shift Handoff — Manager Dashboard (Tablet 1280×800 landscape)
// Anchor moment: 24/7 shift handoff
// ─────────────────────────────────────────────────────────────
export function PlusShiftHandoff() {
  return (
    <div
      style={{
        width: 1920,
        height: 1200,
        background: slate[100],
        color: slate[900],
        fontFamily: COOL_FONT,
        fontSize: 13,
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
      }}
    >
      {/* Top bar */}
      <div
        style={{
          background: slate[900],
          color: "#fff",
          padding: "10px 20px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          borderBottom: `2px solid ${accent}`,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div
            style={{
              width: 28,
              height: 28,
              borderRadius: 6,
              background: accent,
              display: "grid",
              placeItems: "center",
              fontWeight: 800,
              fontSize: 13,
            }}
          >
            S+
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: 14 }}>Suki Plus · Store 042 · Quezon Ave</div>
            <div style={{ fontSize: 11, opacity: 0.7 }}>Open 24h · 3 lanes · Manager: R. Cruz</div>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 16, fontSize: 12 }}>
          <span style={{ opacity: 0.7 }}>Tue 18 Mar 2025</span>
          <span style={{ fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>22:14:08</span>
          <span
            style={{
              padding: "3px 10px",
              background: positive,
              borderRadius: 4,
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: "0.05em",
            }}
          >
            ONLINE
          </span>
        </div>
      </div>

      <div style={{ display: "flex", flex: 1, minHeight: 0 }}>
        {/* Left rail — shift info */}
        <div
          style={{
            width: 280,
            background: "#fff",
            borderRight: `1px solid ${slate[200]}`,
            padding: 16,
            display: "flex",
            flexDirection: "column",
            gap: 12,
            overflowY: "auto",
          }}
        >
          <SectionLabel>Current Shift</SectionLabel>

          <ShiftCard
            tone="active"
            label="Mid shift"
            time="14:00 → 22:00"
            cashier="A. Reyes (Lane 1)"
            tx={142}
            sales={48230.5}
          />

          <SectionLabel>Incoming</SectionLabel>
          <ShiftCard
            tone="incoming"
            label="Night shift"
            time="22:00 → 06:00"
            cashier="J. Lim (Lane 1)"
            tx={0}
            sales={0}
          />

          <SectionLabel>Handoff Checklist</SectionLabel>
          <Checklist
            items={[
              { label: "Cash drop counted", done: true },
              { label: "Z-report printed", done: true },
              { label: "Coffee bean refill", done: true },
              { label: "Hot food disposed (3 items)", done: false },
              { label: "Restroom check", done: false },
              { label: "CCTV review", done: false },
            ]}
          />

          <button
            style={{
              marginTop: "auto",
              padding: "12px",
              background: accent,
              color: "#fff",
              border: 0,
              borderRadius: 4,
              fontWeight: 700,
              fontSize: 13,
              cursor: "pointer",
              fontFamily: "inherit",
            }}
          >
            Confirm Handoff →
          </button>
        </div>

        {/* Center — running tape + KPIs */}
        <div
          style={{
            flex: 1,
            padding: 16,
            display: "flex",
            flexDirection: "column",
            gap: 12,
            minWidth: 0,
          }}
        >
          {/* KPI strip */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8 }}>
            <KPI label="Sales today" value={PHP(184325.0)} delta="+12.4%" tone="up" />
            <KPI label="Transactions" value="487" delta="+8.1%" tone="up" />
            <KPI label="Avg basket" value={PHP(378.5)} delta="+3.9%" tone="up" />
            <KPI label="Voids" value="6" delta="-2" tone="down" />
          </div>

          {/* Running tape */}
          <div
            style={{
              flex: 1,
              background: "#fff",
              border: `1px solid ${slate[200]}`,
              borderRadius: 4,
              display: "flex",
              flexDirection: "column",
              minHeight: 0,
            }}
          >
            <div
              style={{
                padding: "10px 14px",
                borderBottom: `1px solid ${slate[200]}`,
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <div style={{ fontWeight: 700, fontSize: 13 }}>Running tape — Lane 1</div>
              <div style={{ display: "flex", gap: 6, fontSize: 11 }}>
                {["Lane 1", "Lane 2", "Lane 3"].map((l, i) => (
                  <span
                    key={l}
                    style={{
                      padding: "3px 8px",
                      background: i === 0 ? slate[800] : slate[100],
                      color: i === 0 ? "#fff" : slate[600],
                      borderRadius: 3,
                      fontWeight: 600,
                      cursor: "pointer",
                    }}
                  >
                    {l}
                  </span>
                ))}
              </div>
            </div>

            {/* Tape rows — dense */}
            <div
              style={{
                flex: 1,
                overflowY: "auto",
                fontFamily: "ui-monospace, monospace",
                fontSize: 11,
                fontVariantNumeric: "tabular-nums",
              }}
            >
              <TapeHeader />
              {TAPE.map((t, i) => (
                <TapeRow key={i} {...t} />
              ))}
            </div>
          </div>
        </div>

        {/* Right rail — hot food + bills */}
        <div
          style={{
            width: 320,
            background: "#fff",
            borderLeft: `1px solid ${slate[200]}`,
            padding: 16,
            display: "flex",
            flexDirection: "column",
            gap: 14,
            overflowY: "auto",
          }}
        >
          <div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: 8,
              }}
            >
              <SectionLabel>Hot food expiry</SectionLabel>
              <span
                style={{
                  fontSize: 10,
                  fontWeight: 700,
                  padding: "2px 6px",
                  background: "#fef2f2",
                  color: danger,
                  borderRadius: 3,
                }}
              >
                3 EXPIRED
              </span>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <HotFoodRow item="Siopao Asado" exp="-12 min" qty={2} status="expired" />
              <HotFoodRow item="Lumpia Shanghai" exp="-04 min" qty={1} status="expired" />
              <HotFoodRow item="Quail eggs" exp="08 min" qty={6} status="warn" />
              <HotFoodRow item="Cheesedog" exp="22 min" qty={4} status="ok" />
              <HotFoodRow item="Chicken nuggets" exp="44 min" qty={8} status="ok" />
              <HotFoodRow item="Hotdog buns" exp="1h 12m" qty={5} status="ok" />
            </div>
          </div>

          <div>
            <SectionLabel>Bills & Lottery counter</SectionLabel>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, marginTop: 8 }}>
              <BillTile label="Meralco" count={14} amount={28430} />
              <BillTile label="Maynilad" count={9} amount={12200} />
              <BillTile label="Globe" count={22} amount={18900} />
              <BillTile label="Smart" count={18} amount={14400} />
              <BillTile label="PCSO Lotto" count={31} amount={6200} accent />
              <BillTile label="STL" count={47} amount={4700} accent />
            </div>
          </div>

          <div style={{ marginTop: "auto" }}>
            <SectionLabel>Lane status</SectionLabel>
            <div style={{ display: "flex", flexDirection: "column", gap: 4, marginTop: 6 }}>
              <LaneRow lane={1} cashier="A. Reyes" state="OPEN" queue={3} />
              <LaneRow lane={2} cashier="M. Santos" state="OPEN" queue={1} />
              <LaneRow lane={3} cashier="—" state="CLOSED" queue={0} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Plus Counter Terminal — Cashier ringing transactions
// ─────────────────────────────────────────────────────────────
export function PlusCounterTerminal() {
  return (
    <div
      style={{
        width: 1920,
        height: 1200,
        background: slate[100],
        color: slate[900],
        fontFamily: COOL_FONT,
        fontSize: 13,
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
      }}
    >
      {/* Compact terminal top bar */}
      <div
        style={{
          background: "#fff",
          borderBottom: `1px solid ${slate[200]}`,
          padding: "8px 14px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          fontSize: 12,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <span style={{ fontWeight: 700, color: slate[700] }}>Lane 1 · A. Reyes</span>
          <span style={{ color: slate[500] }}>Mid shift · 14:00–22:00</span>
        </div>
        <div style={{ display: "flex", gap: 14, fontVariantNumeric: "tabular-nums" }}>
          <span style={{ color: slate[500] }}>TX #4218</span>
          <span style={{ color: slate[700], fontWeight: 600 }}>22:14:08</span>
        </div>
      </div>

      <div style={{ display: "flex", flex: 1, minHeight: 0 }}>
        {/* Cart panel — left */}
        <div
          style={{
            flex: "1 1 0",
            display: "flex",
            flexDirection: "column",
            background: "#fff",
            borderRight: `1px solid ${slate[200]}`,
            minWidth: 0,
          }}
        >
          {/* Cart table header */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "60px 1fr 60px 80px 80px 28px",
              gap: 8,
              padding: "8px 14px",
              background: slate[50],
              borderBottom: `1px solid ${slate[200]}`,
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: "0.06em",
              textTransform: "uppercase",
              color: slate[500],
            }}
          >
            <span>SKU</span>
            <span>Item</span>
            <span style={{ textAlign: "right" }}>Qty</span>
            <span style={{ textAlign: "right" }}>Price</span>
            <span style={{ textAlign: "right" }}>Total</span>
            <span></span>
          </div>

          {/* Cart rows — dense */}
          <div style={{ flex: 1, overflowY: "auto" }}>
            {CART_C.map((c, i) => (
              <CartRow key={i} {...c} />
            ))}
          </div>

          {/* Cart totals */}
          <div
            style={{
              borderTop: `2px solid ${slate[800]}`,
              padding: "10px 14px",
              background: slate[50],
              fontVariantNumeric: "tabular-nums",
            }}
          >
            <TotalLine label="Subtotal (5 items)" value={PHP(312.5)} />
            <TotalLine label="Loyalty -5%" value={`-${PHP(15.6)}`} muted />
            <TotalLine label="VAT 12%" value={PHP(35.63)} muted />
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                marginTop: 6,
                paddingTop: 6,
                borderTop: `1px dashed ${slate[300]}`,
                fontSize: 18,
                fontWeight: 800,
              }}
            >
              <span>TOTAL</span>
              <span>{PHP(332.53)}</span>
            </div>
          </div>
        </div>

        {/* Action panel — right */}
        <div
          style={{
            width: 360,
            display: "flex",
            flexDirection: "column",
            background: slate[50],
            padding: 14,
            gap: 10,
            overflowY: "auto",
          }}
        >
          <SectionLabel>Quick services</SectionLabel>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            <QuickService label="Bills payment" sub="Meralco, Maynilad +14" />
            <QuickService label="Lottery / STL" sub="PCSO 6/45 Lotto" />
            <QuickService label="E-Load" sub="Globe, Smart, DITO" />
            <QuickService label="Remittance" sub="GCash, PalawanPay" />
            <QuickService label="ATM withdraw" sub="Bancnet · ₱200 fee" />
            <QuickService label="Hot food" sub="6 ready · 3 expired" warn />
          </div>

          <SectionLabel>Tender</SectionLabel>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 6 }}>
            {["Cash", "GCash", "Maya", "Card", "Voucher", "Split"].map((m, i) => (
              <button
                key={m}
                style={{
                  padding: "12px 6px",
                  border: `1px solid ${i === 0 ? slate[800] : slate[200]}`,
                  background: i === 0 ? slate[800] : "#fff",
                  color: i === 0 ? "#fff" : slate[700],
                  borderRadius: 4,
                  fontWeight: 700,
                  fontSize: 12,
                  cursor: "pointer",
                  fontFamily: "inherit",
                }}
              >
                {m}
              </button>
            ))}
          </div>

          <button
            style={{
              marginTop: "auto",
              padding: "16px",
              background: accent,
              color: "#fff",
              border: 0,
              borderRadius: 4,
              fontWeight: 800,
              fontSize: 16,
              cursor: "pointer",
              fontFamily: "inherit",
              letterSpacing: "0.02em",
            }}
          >
            CHARGE {PHP(332.53)}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Plus Manager — Mobile companion (Phone)
// ─────────────────────────────────────────────────────────────
export function PlusManagerPhone() {
  return (
    <div
      style={{
        width: 1179,
        height: 2665,
        background: slate[100],
        color: slate[900],
        fontFamily: COOL_FONT,
        fontSize: 13,
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
      }}
    >
      {/* Status Bar - Phone style */}
      <div
        style={{
          height: 147,
          padding: "0 66px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          fontSize: 46,
          fontWeight: 600,
          color: "#fff",
          background: slate[900],
          flexShrink: 0,
        }}
      >
        <span>9:41</span>
        <div style={{ display: "flex", gap: 20, alignItems: "center" }}>
          <svg width="56" height="36" viewBox="0 0 17 11" fill="currentColor">
            <path d="M1 4.5C1 3.67 1.67 3 2.5 3h1C4.33 3 5 3.67 5 4.5v4c0 .83-.67 1.5-1.5 1.5h-1C1.67 10 1 9.33 1 8.5v-4zM6 3.5C6 2.67 6.67 2 7.5 2h1C9.33 2 10 2.67 10 3.5v5c0 .83-.67 1.5-1.5 1.5h-1C6.67 10 6 9.33 6 8.5v-5zM11 2.5c0-.83.67-1.5 1.5-1.5h1c.83 0 1.5.67 1.5 1.5v6c0 .83-.67 1.5-1.5 1.5h-1c-.83 0-1.5-.67-1.5-1.5v-6z" />
          </svg>
          <svg width="82" height="40" viewBox="0 0 25 12" fill="currentColor">
            <rect x="0" y="1" width="21" height="10" rx="2.5" stroke="currentColor" strokeWidth="1" fill="none" />
            <rect x="2" y="3" width="17" height="6" rx="1" />
            <path d="M23 4v4a2 2 0 000-4z" />
          </svg>
        </div>
      </div>

      {/* Header */}
      <div
        style={{
          background: slate[900],
          color: "#fff",
          padding: "52px 52px 46px",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            marginBottom: 40,
          }}
        >
          <div>
            <div style={{ fontSize: 33, opacity: 0.6, marginBottom: 6, letterSpacing: "0.08em" }}>STORE 042 · QUEZON AVE</div>
            <div style={{ fontSize: 72, fontWeight: 700 }}>Today</div>
          </div>
          <div
            style={{
              width: 105,
              height: 105,
              borderRadius: 52,
              background: accent,
              display: "grid",
              placeItems: "center",
              fontSize: 40,
              fontWeight: 700,
            }}
          >
            RC
          </div>
        </div>

        <div
          style={{
            background: "rgba(255,255,255,0.06)",
            border: "3px solid rgba(255,255,255,0.1)",
            borderRadius: 20,
            padding: 46,
          }}
        >
          <div style={{ fontSize: 33, opacity: 0.6, marginBottom: 13 }}>Sales · Today</div>
          <div
            style={{
              fontSize: 85,
              fontWeight: 800,
              fontVariantNumeric: "tabular-nums",
              marginBottom: 13,
            }}
          >
            {PHP(184325)}
          </div>
          <div style={{ fontSize: 36, color: "#86efac" }}>+12.4% vs yesterday · 487 tx</div>
        </div>
      </div>

      {/* Tab strip */}
      <div
        style={{
          background: "#fff",
          borderBottom: `3px solid ${slate[200]}`,
          padding: "0 52px",
          display: "flex",
          gap: 52,
        }}
      >
        {["Overview", "Lanes", "Stock", "Audit"].map((t, i) => (
          <div
            key={t}
            style={{
              padding: "40px 0 33px",
              fontSize: 40,
              fontWeight: i === 0 ? 700 : 500,
              color: i === 0 ? slate[900] : slate[500],
              borderBottom: i === 0 ? `6px solid ${accent}` : "6px solid transparent",
              cursor: "pointer",
            }}
          >
            {t}
          </div>
        ))}
      </div>

      {/* Body */}
      <div style={{ flex: 1, overflowY: "auto", padding: 52, display: "flex", flexDirection: "column", gap: 40 }}>
        {/* Lane status compact */}
        <div
          style={{
            background: "#fff",
            border: `3px solid ${slate[200]}`,
            borderRadius: 20,
            padding: 40,
          }}
        >
          <div style={{ fontSize: 30, fontWeight: 700, color: slate[500], letterSpacing: "0.06em", marginBottom: 26 }}>
            LIVE LANES
          </div>
          {[
            { lane: 1, cashier: "A. Reyes", queue: 3, sales: 48230 },
            { lane: 2, cashier: "M. Santos", queue: 1, sales: 39120 },
            { lane: 3, cashier: "—", queue: 0, sales: 0 },
          ].map((l) => (
            <div
              key={l.lane}
              style={{
                display: "grid",
                gridTemplateColumns: "85px 1fr 180px 220px",
                gap: 26,
                alignItems: "center",
                padding: "26px 0",
                borderTop: `3px solid ${slate[100]}`,
                fontSize: 36,
              }}
            >
              <span
                style={{
                  width: 72,
                  height: 72,
                  borderRadius: 16,
                  background: l.cashier === "—" ? slate[200] : slate[800],
                  color: l.cashier === "—" ? slate[500] : "#fff",
                  display: "grid",
                  placeItems: "center",
                  fontSize: 33,
                  fontWeight: 700,
                }}
              >
                {l.lane}
              </span>
              <span style={{ color: slate[700] }}>{l.cashier}</span>
              <span
                style={{
                  fontSize: 30,
                  color: l.queue > 0 ? warn : slate[400],
                  fontWeight: 600,
                }}
              >
                {l.queue > 0 ? `${l.queue} in queue` : "Idle"}
              </span>
              <span style={{ textAlign: "right", fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>
                {l.sales > 0 ? PHP(l.sales) : "—"}
              </span>
            </div>
          ))}
        </div>

        {/* Alerts */}
        <div
          style={{
            background: "#fff",
            border: `3px solid ${slate[200]}`,
            borderRadius: 20,
            padding: 40,
          }}
        >
          <div
            style={{
              fontSize: 30,
              fontWeight: 700,
              color: slate[500],
              letterSpacing: "0.06em",
              marginBottom: 26,
              display: "flex",
              justifyContent: "space-between",
            }}
          >
            <span>ALERTS</span>
            <span style={{ color: danger }}>4 OPEN</span>
          </div>
          {[
            { tone: "danger", msg: "Hot food: 3 items expired", sub: "Lane 1 · 12 min ago" },
            { tone: "warn", msg: "Coffee bean low (~30 cups)", sub: "Auto-restock pending" },
            { tone: "warn", msg: "Cash drawer over float ₱8,500", sub: "Lane 1 · drop required" },
            { tone: "info", msg: "Night shift in 5h 46m", sub: "J. Lim scheduled" },
          ].map((a, i) => (
            <div
              key={i}
              style={{
                display: "flex",
                gap: 33,
                padding: "26px 0",
                borderTop: i === 0 ? "0" : `3px solid ${slate[100]}`,
              }}
            >
              <span
                style={{
                  width: 20,
                  height: 20,
                  borderRadius: 10,
                  marginTop: 18,
                  background:
                    a.tone === "danger" ? danger : a.tone === "warn" ? warn : accent,
                  flexShrink: 0,
                }}
              />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 40, fontWeight: 600, color: slate[800] }}>{a.msg}</div>
                <div style={{ fontSize: 33, color: slate[500], marginTop: 6 }}>{a.sub}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Top categories */}
        <div
          style={{
            background: "#fff",
            border: `3px solid ${slate[200]}`,
            borderRadius: 20,
            padding: 40,
          }}
        >
          <div style={{ fontSize: 30, fontWeight: 700, color: slate[500], letterSpacing: "0.06em", marginBottom: 33 }}>
            TOP CATEGORIES
          </div>
          {[
            { name: "Hot food", pct: 28, amt: 51610 },
            { name: "Beverages", pct: 22, amt: 40550 },
            { name: "Cigarettes", pct: 18, amt: 33180 },
            { name: "Bills/Lottery", pct: 16, amt: 29490 },
            { name: "Snacks", pct: 9, amt: 16590 },
            { name: "Other", pct: 7, amt: 12895 },
          ].map((c) => (
            <div key={c.name} style={{ marginBottom: 20 }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 36, marginBottom: 10 }}>
                <span style={{ color: slate[700], fontWeight: 600 }}>{c.name}</span>
                <span style={{ fontVariantNumeric: "tabular-nums", color: slate[500] }}>
                  {PHP(c.amt)} · {c.pct}%
                </span>
              </div>
              <div style={{ height: 13, background: slate[100], borderRadius: 6, overflow: "hidden" }}>
                <div style={{ width: `${c.pct * 3}%`, height: "100%", background: accent }} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────────────────────────

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        fontSize: 10,
        fontWeight: 700,
        letterSpacing: "0.08em",
        textTransform: "uppercase",
        color: slate[500],
      }}
    >
      {children}
    </div>
  );
}

function ShiftCard({
  tone,
  label,
  time,
  cashier,
  tx,
  sales,
}: {
  tone: "active" | "incoming";
  label: string;
  time: string;
  cashier: string;
  tx: number;
  sales: number;
}) {
  const isActive = tone === "active";
  return (
    <div
      style={{
        border: `1px solid ${isActive ? accent : slate[200]}`,
        borderLeft: `3px solid ${isActive ? accent : slate[400]}`,
        borderRadius: 4,
        padding: 10,
        background: isActive ? "#f0fdfa" : slate[50],
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
        <span style={{ fontSize: 12, fontWeight: 700, color: slate[800] }}>{label}</span>
        <span
          style={{
            fontSize: 9,
            fontWeight: 700,
            padding: "2px 6px",
            background: isActive ? accent : slate[300],
            color: "#fff",
            borderRadius: 3,
            letterSpacing: "0.05em",
          }}
        >
          {isActive ? "ACTIVE" : "QUEUED"}
        </span>
      </div>
      <div style={{ fontSize: 11, color: slate[500], marginBottom: 6, fontVariantNumeric: "tabular-nums" }}>
        {time}
      </div>
      <div style={{ fontSize: 12, color: slate[700], marginBottom: 6 }}>{cashier}</div>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          paddingTop: 6,
          borderTop: `1px dashed ${slate[200]}`,
          fontSize: 11,
          fontVariantNumeric: "tabular-nums",
        }}
      >
        <span style={{ color: slate[500] }}>{tx} tx</span>
        <span style={{ fontWeight: 700, color: slate[800] }}>{sales > 0 ? PHP(sales) : "—"}</span>
      </div>
    </div>
  );
}

function Checklist({ items }: { items: { label: string; done: boolean }[] }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      {items.map((item, i) => (
        <div
          key={i}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            padding: "6px 8px",
            background: item.done ? slate[50] : "#fff",
            border: `1px solid ${slate[200]}`,
            borderRadius: 3,
            fontSize: 12,
          }}
        >
          <span
            style={{
              width: 14,
              height: 14,
              borderRadius: 3,
              border: `1.5px solid ${item.done ? positive : slate[300]}`,
              background: item.done ? positive : "#fff",
              display: "grid",
              placeItems: "center",
              flexShrink: 0,
            }}
          >
            {item.done && (
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3">
                <path d="M20 6L9 17l-5-5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            )}
          </span>
          <span
            style={{
              color: item.done ? slate[400] : slate[800],
              textDecoration: item.done ? "line-through" : "none",
              flex: 1,
            }}
          >
            {item.label}
          </span>
        </div>
      ))}
    </div>
  );
}

function KPI({
  label,
  value,
  delta,
  tone,
}: {
  label: string;
  value: string;
  delta: string;
  tone: "up" | "down";
}) {
  return (
    <div
      style={{
        background: "#fff",
        border: `1px solid ${slate[200]}`,
        borderRadius: 4,
        padding: 10,
      }}
    >
      <div style={{ fontSize: 10, color: slate[500], fontWeight: 600, letterSpacing: "0.04em" }}>
        {label.toUpperCase()}
      </div>
      <div
        style={{
          fontSize: 18,
          fontWeight: 800,
          marginTop: 3,
          color: slate[900],
          fontVariantNumeric: "tabular-nums",
        }}
      >
        {value}
      </div>
      <div
        style={{
          fontSize: 10,
          fontWeight: 600,
          color: tone === "up" ? positive : danger,
          marginTop: 2,
        }}
      >
        {delta}
      </div>
    </div>
  );
}

const TAPE = [
  { time: "22:13", lane: 1, sku: "8801", item: "Coke 1.5L", qty: 1, amt: 78.0, tender: "CASH" },
  { time: "22:13", lane: 1, sku: "8801", item: "Lays 75g", qty: 2, amt: 90.0, tender: "" },
  { time: "22:12", lane: 1, sku: "—", item: "TOTAL #4217", qty: 0, amt: 168.0, tender: "GCASH", total: true },
  { time: "22:11", lane: 1, sku: "8810", item: "Hotdog bun combo", qty: 1, amt: 89.0, tender: "" },
  { time: "22:11", lane: 1, sku: "—", item: "TOTAL #4216", qty: 0, amt: 89.0, tender: "CASH", total: true },
  { time: "22:09", lane: 1, sku: "5102", item: "Marlboro pack", qty: 1, amt: 165.0, tender: "" },
  { time: "22:09", lane: 1, sku: "9001", item: "Meralco bill", qty: 1, amt: 2840.0, tender: "" },
  { time: "22:09", lane: 1, sku: "—", item: "TOTAL #4215", qty: 0, amt: 3005.0, tender: "CASH", total: true },
  { time: "22:07", lane: 1, sku: "9201", item: "PCSO Lotto 6/45", qty: 1, amt: 200.0, tender: "" },
  { time: "22:07", lane: 1, sku: "—", item: "TOTAL #4214", qty: 0, amt: 200.0, tender: "CASH", total: true },
  { time: "22:05", lane: 1, sku: "—", item: "VOID #4213", qty: 0, amt: -82.0, tender: "VOID", total: true, void: true },
  { time: "22:04", lane: 1, sku: "8704", item: "Lucky Me cup", qty: 2, amt: 64.0, tender: "" },
];

function TapeHeader() {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "50px 30px 60px 1fr 40px 80px 70px",
        gap: 6,
        padding: "6px 14px",
        background: slate[100],
        borderBottom: `1px solid ${slate[200]}`,
        fontSize: 9,
        fontWeight: 700,
        letterSpacing: "0.06em",
        textTransform: "uppercase",
        color: slate[500],
      }}
    >
      <span>Time</span>
      <span>Ln</span>
      <span>SKU</span>
      <span>Item</span>
      <span style={{ textAlign: "right" }}>Qty</span>
      <span style={{ textAlign: "right" }}>Amount</span>
      <span style={{ textAlign: "right" }}>Tender</span>
    </div>
  );
}

function TapeRow(t: (typeof TAPE)[number]) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "50px 30px 60px 1fr 40px 80px 70px",
        gap: 6,
        padding: "5px 14px",
        borderBottom: `1px solid ${slate[100]}`,
        background: t.total ? slate[50] : "#fff",
        color: t.void ? danger : slate[800],
        fontWeight: t.total ? 700 : 500,
      }}
    >
      <span style={{ color: slate[500] }}>{t.time}</span>
      <span style={{ color: slate[500] }}>L{t.lane}</span>
      <span style={{ color: slate[500] }}>{t.sku}</span>
      <span>{t.item}</span>
      <span style={{ textAlign: "right" }}>{t.qty || ""}</span>
      <span style={{ textAlign: "right" }}>{PHP(t.amt)}</span>
      <span style={{ textAlign: "right", fontSize: 9, color: slate[500] }}>{t.tender}</span>
    </div>
  );
}

function HotFoodRow({
  item,
  exp,
  qty,
  status,
}: {
  item: string;
  exp: string;
  qty: number;
  status: "ok" | "warn" | "expired";
}) {
  const colorMap = { ok: positive, warn: warn, expired: danger };
  const c = colorMap[status];
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "8px 1fr 60px 30px",
        gap: 8,
        alignItems: "center",
        padding: "6px 8px",
        background: status === "expired" ? "#fef2f2" : slate[50],
        border: `1px solid ${status === "expired" ? "#fecaca" : slate[150]}`,
        borderRadius: 3,
        fontSize: 12,
      }}
    >
      <span style={{ width: 6, height: 6, borderRadius: 3, background: c }} />
      <span style={{ fontWeight: 600, color: slate[800] }}>{item}</span>
      <span style={{ fontSize: 11, color: c, fontWeight: 700, textAlign: "right", fontVariantNumeric: "tabular-nums" }}>
        {exp}
      </span>
      <span
        style={{
          fontSize: 10,
          background: slate[200],
          color: slate[700],
          padding: "1px 5px",
          borderRadius: 3,
          textAlign: "center",
          fontWeight: 700,
        }}
      >
        ×{qty}
      </span>
    </div>
  );
}

function BillTile({
  label,
  count,
  amount,
  accent: hasAccent,
}: {
  label: string;
  count: number;
  amount: number;
  accent?: boolean;
}) {
  return (
    <div
      style={{
        background: hasAccent ? "#f0fdfa" : slate[50],
        border: `1px solid ${hasAccent ? "#99f6e4" : slate[200]}`,
        borderRadius: 3,
        padding: 8,
      }}
    >
      <div style={{ fontSize: 11, fontWeight: 700, color: slate[800] }}>{label}</div>
      <div
        style={{
          fontSize: 13,
          fontWeight: 800,
          marginTop: 2,
          color: slate[900],
          fontVariantNumeric: "tabular-nums",
        }}
      >
        {PHP(amount)}
      </div>
      <div style={{ fontSize: 10, color: slate[500], marginTop: 1 }}>{count} tx</div>
    </div>
  );
}

function LaneRow({
  lane,
  cashier,
  state,
  queue,
}: {
  lane: number;
  cashier: string;
  state: "OPEN" | "CLOSED";
  queue: number;
}) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "24px 1fr 50px 50px",
        gap: 6,
        alignItems: "center",
        padding: "5px 0",
        fontSize: 11,
      }}
    >
      <span
        style={{
          width: 18,
          height: 18,
          borderRadius: 3,
          background: state === "OPEN" ? slate[800] : slate[200],
          color: state === "OPEN" ? "#fff" : slate[500],
          display: "grid",
          placeItems: "center",
          fontSize: 10,
          fontWeight: 700,
        }}
      >
        {lane}
      </span>
      <span style={{ color: slate[700] }}>{cashier}</span>
      <span
        style={{
          fontSize: 9,
          fontWeight: 700,
          color: state === "OPEN" ? positive : slate[400],
          letterSpacing: "0.05em",
        }}
      >
        {state}
      </span>
      <span style={{ fontSize: 10, color: slate[500], textAlign: "right" }}>
        {queue > 0 ? `${queue} q` : "—"}
      </span>
    </div>
  );
}

const CART_C = [
  { sku: "880123", item: "Coke 1.5L", qty: 1, price: 78.0 },
  { sku: "871045", item: "Lays Classic 75g", qty: 2, price: 45.0 },
  { sku: "510289", item: "Marlboro Red pack", qty: 1, price: 165.0 },
  { sku: "910044", item: "Skyflakes pack", qty: 1, price: 12.5 },
  { sku: "881122", item: "Pandesal x6", qty: 1, price: 18.0 },
];

function CartRow({ sku, item, qty, price }: { sku: string; item: string; qty: number; price: number }) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "60px 1fr 60px 80px 80px 28px",
        gap: 8,
        padding: "8px 14px",
        borderBottom: `1px solid ${slate[100]}`,
        fontSize: 12,
        alignItems: "center",
        fontVariantNumeric: "tabular-nums",
      }}
    >
      <span style={{ color: slate[500], fontFamily: "ui-monospace, monospace", fontSize: 11 }}>{sku}</span>
      <span style={{ color: slate[800], fontWeight: 500 }}>{item}</span>
      <span style={{ textAlign: "right", color: slate[700] }}>{qty}</span>
      <span style={{ textAlign: "right", color: slate[700] }}>{PHP(price)}</span>
      <span style={{ textAlign: "right", fontWeight: 700, color: slate[900] }}>{PHP(price * qty)}</span>
      <button
        style={{
          width: 22,
          height: 22,
          border: 0,
          background: "transparent",
          color: slate[400],
          cursor: "pointer",
          fontSize: 14,
        }}
      >
        ×
      </button>
    </div>
  );
}

function TotalLine({ label, value, muted }: { label: string; value: string; muted?: boolean }) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        fontSize: 12,
        color: muted ? slate[500] : slate[700],
        marginBottom: 3,
      }}
    >
      <span>{label}</span>
      <span style={{ fontWeight: 600 }}>{value}</span>
    </div>
  );
}

function QuickService({ label, sub, warn: isWarn }: { label: string; sub: string; warn?: boolean }) {
  return (
    <button
      style={{
        background: "#fff",
        border: `1px solid ${isWarn ? "#fed7aa" : slate[200]}`,
        borderLeft: `3px solid ${isWarn ? warn : accent}`,
        borderRadius: 3,
        padding: 10,
        textAlign: "left",
        cursor: "pointer",
        fontFamily: "inherit",
      }}
    >
      <div style={{ fontSize: 12, fontWeight: 700, color: slate[800] }}>{label}</div>
      <div style={{ fontSize: 10, color: slate[500], marginTop: 2 }}>{sub}</div>
    </button>
  );
}
