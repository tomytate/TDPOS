"use client";

import React from "react";
import { PHP } from "./shared";

// ─────────────────────────────────────────────────────────────
// Tier D — Premium (Supermarket)
// Cool corporate · neutrals + single accent · tabular everything
// ─────────────────────────────────────────────────────────────

const FONT = "ui-sans-serif, -apple-system, BlinkMacSystemFont, system-ui, sans-serif";
const MONO = "ui-monospace, 'SF Mono', Menlo, Consolas, monospace";

const N = {
  50: "#fafafa",
  100: "#f4f4f5",
  150: "#ececef",
  200: "#e4e4e7",
  300: "#d4d4d8",
  400: "#a1a1aa",
  500: "#71717a",
  600: "#52525b",
  700: "#3f3f46",
  800: "#27272a",
  900: "#18181b",
};

const ACCENT = "#0369a1"; // single corporate accent
const POS = "#15803d";
const NEG = "#b91c1c";
const WARN = "#b45309";

// ─────────────────────────────────────────────────────────────
// Premium Counter — Weighted PLU + Scale Anchor (1280×800)
// ─────────────────────────────────────────────────────────────
export function PremiumCounter() {
  return (
    <div
      style={{
        width: 1920,
        height: 1200,
        background: N[100],
        color: N[900],
        fontFamily: FONT,
        fontSize: 13,
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
      }}
    >
      {/* Top utility bar */}
      <div
        style={{
          background: N[900],
          color: "#fff",
          padding: "6px 16px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          fontSize: 11,
          fontFamily: MONO,
          letterSpacing: "0.02em",
        }}
      >
        <div style={{ display: "flex", gap: 18 }}>
          <span>STORE 0118 / SM Aura</span>
          <span>LANE 04</span>
          <span>OP: M.GARCIA #2841</span>
          <span>SHIFT: AM 06:00–14:00</span>
        </div>
        <div style={{ display: "flex", gap: 14 }}>
          <span>NET 99%</span>
          <span style={{ color: "#86efac" }}>● HOST</span>
          <span style={{ color: "#86efac" }}>● SCALE</span>
          <span style={{ color: "#86efac" }}>● EMV</span>
          <span style={{ color: "#86efac" }}>● CFD</span>
          <span>22:14:08</span>
        </div>
      </div>

      <div style={{ display: "flex", flex: 1, minHeight: 0 }}>
        {/* LEFT — Cart / receipt */}
        <div
          style={{
            flex: "1.3 1 0",
            background: "#fff",
            borderRight: `1px solid ${N[200]}`,
            display: "flex",
            flexDirection: "column",
            minWidth: 0,
          }}
        >
          {/* TX header */}
          <div
            style={{
              padding: "10px 16px",
              background: N[50],
              borderBottom: `1px solid ${N[200]}`,
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <div>
              <div style={{ fontSize: 10, color: N[500], fontWeight: 700, letterSpacing: "0.06em" }}>
                TRANSACTION
              </div>
              <div style={{ fontSize: 16, fontWeight: 700, fontFamily: MONO }}>#0118-04-218492</div>
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              <SmallBtn label="Hold" />
              <SmallBtn label="Recall" />
              <SmallBtn label="Void Tx" tone="warn" />
            </div>
          </div>

          {/* Column header */}
          <Cols />

          {/* Receipt body */}
          <div style={{ flex: 1, overflowY: "auto" }}>
            {RECEIPT.map((r, i) => (
              <ReceiptRow key={i} {...r} />
            ))}
          </div>

          {/* Totals strip */}
          <div
            style={{
              borderTop: `2px solid ${N[800]}`,
              padding: "12px 16px",
              background: N[50],
              fontFamily: MONO,
              fontSize: 12,
            }}
          >
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
              <div>
                <Tot label="Items" value="14" />
                <Tot label="Units" value="22" />
                <Tot label="Weighted" value="3" />
                <Tot label="Subtotal" value={PHP(2148.6)} />
              </div>
              <div>
                <Tot label="Discounts" value={`-${PHP(85.0)}`} muted />
                <Tot label="VAT 12%" value={PHP(247.63)} muted />
                <Tot label="VAT-exempt" value={PHP(124.5)} muted />
                <div
                  style={{
                    marginTop: 6,
                    paddingTop: 6,
                    borderTop: `1px dashed ${N[400]}`,
                    display: "flex",
                    justifyContent: "space-between",
                    fontSize: 22,
                    fontWeight: 800,
                  }}
                >
                  <span>TOTAL</span>
                  <span>{PHP(2311.23)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* CENTER — Scale + Weighted PLU panel */}
        <div
          style={{
            width: 360,
            background: N[50],
            borderRight: `1px solid ${N[200]}`,
            display: "flex",
            flexDirection: "column",
            padding: 14,
            gap: 12,
          }}
        >
          {/* Scale readout */}
          <div
            style={{
              background: N[900],
              color: "#86efac",
              fontFamily: MONO,
              padding: 14,
              borderRadius: 4,
              border: "1px solid #14532d",
              boxShadow: "inset 0 1px 8px rgba(0,255,127,0.1)",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                fontSize: 9,
                opacity: 0.7,
                marginBottom: 4,
                letterSpacing: "0.08em",
              }}
            >
              <span>● SCALE STABLE</span>
              <span>NET WEIGHT</span>
            </div>
            <div
              style={{
                fontSize: 36,
                fontWeight: 700,
                lineHeight: 1,
                fontVariantNumeric: "tabular-nums",
                letterSpacing: "0.04em",
              }}
            >
              1.245
              <span style={{ fontSize: 16, opacity: 0.7, marginLeft: 6 }}>kg</span>
            </div>
            <div style={{ fontSize: 10, opacity: 0.6, marginTop: 4 }}>
              Tare 0.020 kg · ±2g · NTEP 11-178
            </div>
          </div>

          {/* Active PLU */}
          <div
            style={{
              background: "#fff",
              border: `1px solid ${N[200]}`,
              borderLeft: `3px solid ${ACCENT}`,
              borderRadius: 4,
              padding: 12,
            }}
          >
            <div style={{ fontSize: 10, fontWeight: 700, color: N[500], letterSpacing: "0.06em" }}>
              ACTIVE PLU
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4 }}>
              <div>
                <div style={{ fontSize: 18, fontWeight: 700, fontFamily: MONO }}>4011</div>
                <div style={{ fontSize: 13, color: N[800], marginTop: 2 }}>Banana, lakatan</div>
                <div style={{ fontSize: 11, color: N[500], marginTop: 1 }}>By weight · ₱85.00 / kg</div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: 10, color: N[500], fontWeight: 700, letterSpacing: "0.06em" }}>
                  EXTENDED
                </div>
                <div
                  style={{
                    fontSize: 22,
                    fontWeight: 800,
                    fontFamily: MONO,
                    fontVariantNumeric: "tabular-nums",
                    color: ACCENT,
                  }}
                >
                  ₱105.83
                </div>
              </div>
            </div>
          </div>

          {/* PLU keypad */}
          <div>
            <div
              style={{
                fontSize: 10,
                fontWeight: 700,
                color: N[500],
                letterSpacing: "0.06em",
                marginBottom: 6,
              }}
            >
              ENTER PLU
            </div>
            <div
              style={{
                background: "#fff",
                border: `1px solid ${N[200]}`,
                borderRadius: 4,
                padding: 8,
                fontFamily: MONO,
                fontSize: 24,
                fontWeight: 700,
                textAlign: "right",
                marginBottom: 8,
              }}
            >
              4011
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 4 }}>
              {["1", "2", "3", "4", "5", "6", "7", "8", "9", "C", "0", "↵"].map((k) => (
                <button
                  key={k}
                  style={{
                    padding: "12px 0",
                    background: k === "↵" ? ACCENT : k === "C" ? N[800] : "#fff",
                    color: k === "↵" || k === "C" ? "#fff" : N[800],
                    border: `1px solid ${N[200]}`,
                    borderRadius: 3,
                    fontSize: 14,
                    fontWeight: 700,
                    fontFamily: MONO,
                    cursor: "pointer",
                  }}
                >
                  {k}
                </button>
              ))}
            </div>
          </div>

          {/* Quick produce */}
          <div>
            <div
              style={{
                fontSize: 10,
                fontWeight: 700,
                color: N[500],
                letterSpacing: "0.06em",
                marginBottom: 6,
              }}
            >
              QUICK PRODUCE
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 4 }}>
              {[
                { plu: "4011", n: "Banana" },
                { plu: "4063", n: "Tomato" },
                { plu: "4072", n: "Onion" },
                { plu: "4225", n: "Apple Fuji" },
                { plu: "3027", n: "Mango" },
                { plu: "4632", n: "Lettuce" },
              ].map((p) => (
                <button
                  key={p.plu}
                  style={{
                    background: "#fff",
                    border: `1px solid ${N[200]}`,
                    borderRadius: 3,
                    padding: "8px 4px",
                    cursor: "pointer",
                    fontFamily: "inherit",
                  }}
                >
                  <div style={{ fontSize: 11, fontFamily: MONO, fontWeight: 700, color: N[800] }}>{p.plu}</div>
                  <div style={{ fontSize: 9, color: N[500], marginTop: 1 }}>{p.n}</div>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* RIGHT — Tender + EMV */}
        <div
          style={{
            width: 320,
            background: "#fff",
            display: "flex",
            flexDirection: "column",
            padding: 14,
            gap: 10,
          }}
        >
          {/* Total summary */}
          <div
            style={{
              background: N[900],
              color: "#fff",
              borderRadius: 4,
              padding: 14,
            }}
          >
            <div style={{ fontSize: 10, opacity: 0.6, fontWeight: 700, letterSpacing: "0.08em" }}>
              AMOUNT DUE
            </div>
            <div
              style={{
                fontSize: 32,
                fontWeight: 800,
                fontFamily: MONO,
                fontVariantNumeric: "tabular-nums",
                marginTop: 2,
              }}
            >
              ₱2,311.23
            </div>
          </div>

          {/* Tender modes */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
            {[
              { l: "Cash", k: "F1" },
              { l: "Credit/Debit", k: "F2", active: true },
              { l: "GCash QR", k: "F3" },
              { l: "Maya QR", k: "F4" },
              { l: "Loyalty Points", k: "F5" },
              { l: "Gift Card", k: "F6" },
              { l: "Senior/PWD", k: "F7" },
              { l: "Split Tender", k: "F8" },
            ].map((m) => (
              <button
                key={m.l}
                style={{
                  background: m.active ? ACCENT : "#fff",
                  color: m.active ? "#fff" : N[800],
                  border: `1px solid ${m.active ? ACCENT : N[200]}`,
                  borderRadius: 3,
                  padding: "10px 8px",
                  textAlign: "left",
                  cursor: "pointer",
                  fontFamily: "inherit",
                }}
              >
                <div style={{ fontSize: 10, opacity: 0.7, fontFamily: MONO }}>{m.k}</div>
                <div style={{ fontSize: 12, fontWeight: 700, marginTop: 1 }}>{m.l}</div>
              </button>
            ))}
          </div>

          {/* EMV pinpad status */}
          <div
            style={{
              border: `1px solid ${N[200]}`,
              borderRadius: 4,
              overflow: "hidden",
            }}
          >
            <div
              style={{
                background: N[100],
                padding: "6px 10px",
                fontSize: 10,
                fontWeight: 700,
                letterSpacing: "0.06em",
                color: N[600],
                display: "flex",
                justifyContent: "space-between",
              }}
            >
              <span>EMV PINPAD · INGENICO LANE 3000</span>
              <span style={{ color: POS }}>● READY</span>
            </div>
            <div style={{ padding: 14, background: "#fff" }}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  padding: 10,
                  background: N[50],
                  border: `1px dashed ${N[300]}`,
                  borderRadius: 3,
                }}
              >
                <div
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 4,
                    background: ACCENT,
                    color: "#fff",
                    display: "grid",
                    placeItems: "center",
                  }}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="2" y="5" width="20" height="14" rx="2" />
                    <line x1="2" y1="10" x2="22" y2="10" />
                  </svg>
                </div>
                <div style={{ flex: 1, fontSize: 11 }}>
                  <div style={{ fontWeight: 700, color: N[800] }}>Insert, tap or swipe</div>
                  <div style={{ color: N[500], marginTop: 1 }}>Visa · Mastercard · JCB · UPI</div>
                </div>
                <span
                  style={{
                    fontSize: 9,
                    fontWeight: 700,
                    color: ACCENT,
                    padding: "2px 6px",
                    border: `1px solid ${ACCENT}`,
                    borderRadius: 3,
                  }}
                >
                  ● BLINK
                </span>
              </div>
            </div>
          </div>

          {/* Big CHARGE button */}
          <button
            style={{
              marginTop: "auto",
              padding: "18px",
              background: ACCENT,
              color: "#fff",
              border: 0,
              borderRadius: 4,
              fontSize: 18,
              fontWeight: 800,
              letterSpacing: "0.04em",
              cursor: "pointer",
              fontFamily: "inherit",
              boxShadow: `0 4px 0 ${N[800]}`,
            }}
          >
            CHARGE
          </button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Premium CFD — Customer Facing Display Mirror
// ─────────────────────────────────────────────────────────────
export function PremiumCFD() {
  return (
    <div
      style={{
        width: 1920,
        height: 1200,
        background: "#fff",
        color: N[900],
        fontFamily: FONT,
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
      }}
    >
      {/* Brand banner */}
      <div
        style={{
          background: N[900],
          color: "#fff",
          padding: "16px 24px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: 6,
              background: ACCENT,
              display: "grid",
              placeItems: "center",
              fontWeight: 800,
              fontSize: 15,
            }}
          >
            S
          </div>
          <div>
            <div style={{ fontSize: 16, fontWeight: 700 }}>Suki Supermarket</div>
            <div style={{ fontSize: 11, opacity: 0.6 }}>SM Aura · Welcome back, member</div>
          </div>
        </div>
        <div style={{ fontSize: 11, opacity: 0.6, fontFamily: MONO }}>LANE 04</div>
      </div>

      {/* Main area — split */}
      <div style={{ flex: 1, display: "flex", minHeight: 0 }}>
        {/* Last item — big */}
        <div
          style={{
            flex: 1.4,
            padding: 32,
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            background: "linear-gradient(180deg, #fff 0%, #f8fafc 100%)",
          }}
        >
          <div
            style={{
              fontSize: 11,
              fontWeight: 700,
              color: N[400],
              letterSpacing: "0.1em",
              marginBottom: 8,
            }}
          >
            LAST ITEM SCANNED
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 24,
            }}
          >
            <div
              style={{
                width: 120,
                height: 120,
                borderRadius: 8,
                background: "linear-gradient(135deg, #fef3c7, #fde68a)",
                display: "grid",
                placeItems: "center",
              }}
            >
              <svg width="64" height="64" viewBox="0 0 64 64" fill="none">
                <path
                  d="M16 28 Q22 12 36 14 Q50 16 50 36 Q50 52 32 52 Q14 52 16 28 Z"
                  fill="#fcd34d"
                  stroke="#b45309"
                  strokeWidth="1.5"
                />
                <path d="M36 14 Q34 8 38 6" fill="none" stroke="#16a34a" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </div>
            <div>
              <div style={{ fontSize: 28, fontWeight: 700, color: N[900] }}>Banana, lakatan</div>
              <div style={{ fontSize: 14, color: N[500], marginTop: 4, fontFamily: MONO }}>
                PLU 4011 · 1.245 kg @ ₱85.00 / kg
              </div>
              <div
                style={{
                  fontSize: 36,
                  fontWeight: 800,
                  color: ACCENT,
                  marginTop: 12,
                  fontVariantNumeric: "tabular-nums",
                }}
              >
                ₱105.83
              </div>
            </div>
          </div>

          {/* Promo strip */}
          <div
            style={{
              marginTop: 32,
              padding: 14,
              background: "#fef3c7",
              borderLeft: `4px solid #b45309`,
              borderRadius: 4,
              display: "flex",
              alignItems: "center",
              gap: 12,
            }}
          >
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: 4,
                background: "#b45309",
                color: "#fff",
                display: "grid",
                placeItems: "center",
                fontSize: 14,
                fontWeight: 800,
              }}
            >
              %
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: "#78350f" }}>
                Member savings: <span style={{ fontVariantNumeric: "tabular-nums" }}>₱85.00</span> today
              </div>
              <div style={{ fontSize: 11, color: "#92400e", marginTop: 1 }}>
                Earn 218 points on this transaction · 1,425 lifetime points
              </div>
            </div>
          </div>
        </div>

        {/* Receipt mirror — right */}
        <div
          style={{
            width: 320,
            background: N[50],
            borderLeft: `1px solid ${N[200]}`,
            display: "flex",
            flexDirection: "column",
          }}
        >
          <div
            style={{
              padding: "14px 20px",
              borderBottom: `1px solid ${N[200]}`,
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: "0.08em",
              color: N[500],
            }}
          >
            YOUR RECEIPT
          </div>
          <div
            style={{
              flex: 1,
              overflowY: "auto",
              padding: "10px 20px",
              fontFamily: MONO,
              fontSize: 11,
            }}
          >
            {RECEIPT.slice(0, 8).map((r, i) => (
              <div
                key={i}
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr auto",
                  padding: "5px 0",
                  borderBottom: `1px dashed ${N[200]}`,
                }}
              >
                <span style={{ color: N[700] }}>{r.name}</span>
                <span style={{ fontWeight: 700, color: N[900], fontVariantNumeric: "tabular-nums" }}>
                  {PHP(r.qty * r.price)}
                </span>
              </div>
            ))}
          </div>
          <div
            style={{
              padding: "16px 20px",
              background: N[900],
              color: "#fff",
              fontFamily: MONO,
            }}
          >
            <div style={{ fontSize: 10, opacity: 0.6, fontWeight: 700, letterSpacing: "0.08em" }}>
              AMOUNT DUE
            </div>
            <div
              style={{
                fontSize: 32,
                fontWeight: 800,
                fontVariantNumeric: "tabular-nums",
                marginTop: 2,
              }}
            >
              ₱2,311.23
            </div>
          </div>
        </div>
      </div>

      {/* Bottom strip */}
      <div
        style={{
          background: N[100],
          borderTop: `1px solid ${N[200]}`,
          padding: "10px 24px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          fontSize: 11,
          color: N[500],
        }}
      >
        <span>Thank you for shopping with us · Senior/PWD discount available</span>
        <span style={{ display: "flex", gap: 12 }}>
          <span>● VISA</span>
          <span>● MASTER</span>
          <span>● JCB</span>
          <span>● GCASH</span>
          <span>● MAYA</span>
        </span>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Premium Backoffice — Manager Audit (Desktop 1280×800)
// ─────────────────────────────────────────────────────────────
export function PremiumBackoffice() {
  return (
    <div
      style={{
        width: 1920,
        height: 1200,
        background: N[100],
        color: N[900],
        fontFamily: FONT,
        fontSize: 13,
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
      }}
    >
      {/* Top */}
      <div
        style={{
          background: "#fff",
          borderBottom: `1px solid ${N[200]}`,
          padding: "12px 24px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div
              style={{
                width: 28,
                height: 28,
                borderRadius: 5,
                background: ACCENT,
                display: "grid",
                placeItems: "center",
                color: "#fff",
                fontWeight: 800,
                fontSize: 13,
              }}
            >
              S
            </div>
            <div style={{ fontWeight: 700, fontSize: 14 }}>Suki Premium · Backoffice</div>
          </div>
          <nav style={{ display: "flex", gap: 4, fontSize: 13 }}>
            {["Overview", "Transactions", "Voids & Refunds", "Stock", "Promotions", "Audit", "Staff"].map(
              (n, i) => (
                <span
                  key={n}
                  style={{
                    padding: "6px 12px",
                    color: i === 2 ? "#fff" : N[600],
                    background: i === 2 ? N[800] : "transparent",
                    borderRadius: 4,
                    fontWeight: i === 2 ? 700 : 500,
                    cursor: "pointer",
                  }}
                >
                  {n}
                </span>
              )
            )}
          </nav>
        </div>
        <div style={{ display: "flex", gap: 10, alignItems: "center", fontSize: 12 }}>
          <span style={{ color: N[500] }}>Store 0118 · SM Aura</span>
          <div
            style={{
              width: 28,
              height: 28,
              borderRadius: 14,
              background: N[200],
              display: "grid",
              placeItems: "center",
              fontSize: 11,
              fontWeight: 700,
              color: N[700],
            }}
          >
            MG
          </div>
        </div>
      </div>

      {/* Sub-header — filters */}
      <div
        style={{
          padding: "10px 24px",
          background: N[50],
          borderBottom: `1px solid ${N[200]}`,
          display: "flex",
          gap: 12,
          alignItems: "center",
          fontSize: 12,
        }}
      >
        <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, marginRight: "auto" }}>
          Voids &amp; Refunds — Today
        </h2>
        <Filter label="Lane" value="All" />
        <Filter label="Cashier" value="All" />
        <Filter label="Reason" value="All" />
        <Filter label="Date" value="Today" />
        <button
          style={{
            padding: "6px 14px",
            background: ACCENT,
            color: "#fff",
            border: 0,
            borderRadius: 3,
            fontSize: 12,
            fontWeight: 700,
            cursor: "pointer",
            fontFamily: "inherit",
          }}
        >
          Export CSV
        </button>
      </div>

      {/* KPI strip */}
      <div
        style={{
          padding: 24,
          display: "grid",
          gridTemplateColumns: "repeat(5, 1fr)",
          gap: 12,
        }}
      >
        <Kard label="Voids" value="14" sub="↓ 22% vs avg" tone="up" />
        <Kard label="Refunds" value="3" sub={`${PHP(845)} returned`} tone="neutral" />
        <Kard label="No-sales" value="38" sub="Drawer opens" tone="neutral" />
        <Kard label="Discount overrides" value="6" sub="₱1,240 total" tone="warn" />
        <Kard label="Suspicious" value="1" sub="Flagged for review" tone="down" />
      </div>

      {/* Table */}
      <div
        style={{
          margin: "0 24px 24px",
          flex: 1,
          background: "#fff",
          border: `1px solid ${N[200]}`,
          borderRadius: 4,
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
          minHeight: 0,
        }}
      >
        <TblHeader />
        <div style={{ flex: 1, overflowY: "auto", fontFamily: MONO, fontSize: 11 }}>
          {AUDIT.map((a, i) => (
            <TblRow key={i} {...a} />
          ))}
        </div>
        <div
          style={{
            padding: "8px 16px",
            borderTop: `1px solid ${N[200]}`,
            background: N[50],
            display: "flex",
            justifyContent: "space-between",
            fontSize: 11,
            color: N[500],
          }}
        >
          <span>Showing 12 of 17 events</span>
          <span style={{ display: "flex", gap: 6 }}>
            <PageBtn label="‹" />
            <PageBtn label="1" active />
            <PageBtn label="2" />
            <PageBtn label="›" />
          </span>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────────────────────────

function SmallBtn({ label, tone }: { label: string; tone?: "warn" }) {
  return (
    <button
      style={{
        padding: "5px 10px",
        background: "#fff",
        color: tone === "warn" ? NEG : N[700],
        border: `1px solid ${tone === "warn" ? "#fecaca" : N[200]}`,
        borderRadius: 3,
        fontSize: 11,
        fontWeight: 600,
        cursor: "pointer",
        fontFamily: "inherit",
      }}
    >
      {label}
    </button>
  );
}

function Cols() {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "70px 1fr 70px 90px 90px 70px",
        gap: 12,
        padding: "8px 16px",
        background: N[100],
        borderBottom: `1px solid ${N[200]}`,
        fontSize: 9,
        fontWeight: 700,
        letterSpacing: "0.06em",
        color: N[500],
      }}
    >
      <span>SKU/PLU</span>
      <span>ITEM</span>
      <span style={{ textAlign: "right" }}>QTY/KG</span>
      <span style={{ textAlign: "right" }}>UNIT</span>
      <span style={{ textAlign: "right" }}>EXTENDED</span>
      <span style={{ textAlign: "right" }}>FLAG</span>
    </div>
  );
}

const RECEIPT = [
  { sku: "884100", name: "Magnolia Fresh Milk 1L", qty: 2, price: 95.0, unit: "pc", weighted: false },
  { sku: "871045", name: "Skyflakes pack 700g", qty: 1, price: 88.5, unit: "pc", weighted: false },
  { sku: "PLU4011", name: "Banana, lakatan", qty: 1.245, price: 85.0, unit: "kg", weighted: true },
  { sku: "PLU4063", name: "Tomato, native", qty: 0.62, price: 110.0, unit: "kg", weighted: true },
  { sku: "DELI", name: "Roast chicken whole", qty: 1.84, price: 320.0, unit: "kg", weighted: true, deli: true },
  { sku: "880123", name: "Coke Zero 1.5L", qty: 2, price: 78.0, unit: "pc", weighted: false },
  { sku: "750129", name: "Tide Bar 130g", qty: 3, price: 22.0, unit: "pc", weighted: false },
  { sku: "881122", name: "Pandesal x6", qty: 2, price: 18.0, unit: "pc", weighted: false },
  { sku: "910044", name: "Lucky Me Pancit Canton", qty: 6, price: 18.5, unit: "pc", weighted: false, vatExempt: true },
  { sku: "740112", name: "Eden cheese 165g", qty: 1, price: 99.5, unit: "pc", weighted: false },
];

function ReceiptRow(r: (typeof RECEIPT)[number]) {
  const ext = r.qty * r.price;
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "70px 1fr 70px 90px 90px 70px",
        gap: 12,
        padding: "7px 16px",
        borderBottom: `1px solid ${N[100]}`,
        fontSize: 12,
        alignItems: "center",
        fontFamily: MONO,
        background: r.weighted ? "#f0f9ff" : "#fff",
      }}
    >
      <span style={{ color: N[500], fontSize: 11 }}>{r.sku}</span>
      <span style={{ fontFamily: FONT, color: N[800], fontWeight: 500 }}>{r.name}</span>
      <span
        style={{
          textAlign: "right",
          fontVariantNumeric: "tabular-nums",
          color: r.weighted ? ACCENT : N[700],
          fontWeight: r.weighted ? 700 : 500,
        }}
      >
        {r.weighted ? r.qty.toFixed(3) : r.qty}
      </span>
      <span
        style={{
          textAlign: "right",
          color: N[600],
          fontVariantNumeric: "tabular-nums",
        }}
      >
        ₱{r.price.toFixed(2)}/{r.unit}
      </span>
      <span
        style={{
          textAlign: "right",
          fontWeight: 700,
          color: N[900],
          fontVariantNumeric: "tabular-nums",
        }}
      >
        {PHP(ext)}
      </span>
      <span style={{ textAlign: "right", display: "flex", gap: 4, justifyContent: "flex-end" }}>
        {r.weighted && (
          <span
            style={{
              fontSize: 9,
              padding: "1px 4px",
              background: ACCENT,
              color: "#fff",
              borderRadius: 2,
              fontWeight: 700,
              fontFamily: FONT,
            }}
          >
            KG
          </span>
        )}
        {r.deli && (
          <span
            style={{
              fontSize: 9,
              padding: "1px 4px",
              background: WARN,
              color: "#fff",
              borderRadius: 2,
              fontWeight: 700,
              fontFamily: FONT,
            }}
          >
            DELI
          </span>
        )}
        {r.vatExempt && (
          <span
            style={{
              fontSize: 9,
              padding: "1px 4px",
              background: N[300],
              color: N[800],
              borderRadius: 2,
              fontWeight: 700,
              fontFamily: FONT,
            }}
          >
            VE
          </span>
        )}
      </span>
    </div>
  );
}

function Tot({ label, value, muted }: { label: string; value: string; muted?: boolean }) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        padding: "2px 0",
        color: muted ? N[500] : N[800],
      }}
    >
      <span>{label}</span>
      <span style={{ fontVariantNumeric: "tabular-nums", fontWeight: muted ? 500 : 700 }}>{value}</span>
    </div>
  );
}

function Kard({
  label,
  value,
  sub,
  tone,
}: {
  label: string;
  value: string;
  sub: string;
  tone: "up" | "down" | "warn" | "neutral";
}) {
  const c = tone === "up" ? POS : tone === "down" ? NEG : tone === "warn" ? WARN : N[500];
  return (
    <div
      style={{
        background: "#fff",
        border: `1px solid ${N[200]}`,
        borderTop: `3px solid ${c}`,
        borderRadius: 4,
        padding: 14,
      }}
    >
      <div style={{ fontSize: 10, fontWeight: 700, color: N[500], letterSpacing: "0.06em" }}>
        {label.toUpperCase()}
      </div>
      <div
        style={{
          fontSize: 26,
          fontWeight: 800,
          color: N[900],
          marginTop: 4,
          fontVariantNumeric: "tabular-nums",
        }}
      >
        {value}
      </div>
      <div style={{ fontSize: 11, color: c, fontWeight: 600, marginTop: 2 }}>{sub}</div>
    </div>
  );
}

function Filter({ label, value }: { label: string; value: string }) {
  return (
    <button
      style={{
        display: "flex",
        gap: 6,
        alignItems: "center",
        padding: "5px 10px",
        background: "#fff",
        border: `1px solid ${N[200]}`,
        borderRadius: 3,
        fontSize: 11,
        cursor: "pointer",
        fontFamily: "inherit",
      }}
    >
      <span style={{ color: N[500] }}>{label}:</span>
      <span style={{ color: N[800], fontWeight: 600 }}>{value}</span>
      <span style={{ color: N[400] }}>▾</span>
    </button>
  );
}

const AUDIT = [
  { time: "21:48", lane: 4, op: "M.GARCIA", type: "VOID", item: "Magnolia milk 1L ×1", amt: -95.0, reason: "Customer cancel", flag: false },
  { time: "21:32", lane: 1, op: "L.MEDINA", type: "REFUND", item: "Tide bar 130g ×3", amt: -66.0, reason: "Damaged item", flag: false },
  { time: "21:18", lane: 2, op: "F.ABAD", type: "DISCOUNT", item: "Senior 20% on TX", amt: -218.5, reason: "Senior ID 1947-001", flag: false },
  { time: "20:55", lane: 4, op: "M.GARCIA", type: "VOID", item: "Banana 4011 1.245kg", amt: -105.83, reason: "Wrong PLU", flag: false },
  { time: "20:42", lane: 3, op: "R.SY", type: "VOID", item: "Roast chicken 1.84kg", amt: -588.8, reason: "Override mgr", flag: true },
  { time: "20:30", lane: 1, op: "L.MEDINA", type: "NO-SALE", item: "Drawer open", amt: 0, reason: "Change", flag: false },
  { time: "20:15", lane: 4, op: "M.GARCIA", type: "VOID", item: "Lucky Me ×6", amt: -111.0, reason: "Wrong qty", flag: false },
  { time: "19:58", lane: 2, op: "F.ABAD", type: "REFUND", item: "Skyflakes ×1", amt: -88.5, reason: "Stale", flag: false },
  { time: "19:42", lane: 3, op: "R.SY", type: "VOID", item: "Coke Zero ×2", amt: -156.0, reason: "Customer cancel", flag: false },
  { time: "19:30", lane: 4, op: "M.GARCIA", type: "DISCOUNT", item: "PWD 20%", amt: -148.4, reason: "PWD ID 22-1118", flag: false },
  { time: "19:11", lane: 1, op: "L.MEDINA", type: "NO-SALE", item: "Drawer open", amt: 0, reason: "—", flag: false },
  { time: "18:58", lane: 2, op: "F.ABAD", type: "VOID", item: "Eden cheese ×1", amt: -99.5, reason: "Customer cancel", flag: false },
];

function TblHeader() {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "60px 50px 100px 90px 1fr 100px 1fr 50px",
        gap: 8,
        padding: "8px 16px",
        background: N[50],
        borderBottom: `1px solid ${N[200]}`,
        fontSize: 9,
        fontWeight: 700,
        letterSpacing: "0.06em",
        color: N[500],
      }}
    >
      <span>TIME</span>
      <span>LANE</span>
      <span>OPERATOR</span>
      <span>TYPE</span>
      <span>ITEM</span>
      <span style={{ textAlign: "right" }}>AMOUNT</span>
      <span>REASON</span>
      <span>FLAG</span>
    </div>
  );
}

function TblRow(a: (typeof AUDIT)[number]) {
  const tone = a.type === "VOID" ? NEG : a.type === "REFUND" ? WARN : a.type === "DISCOUNT" ? ACCENT : N[500];
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "60px 50px 100px 90px 1fr 100px 1fr 50px",
        gap: 8,
        padding: "7px 16px",
        borderBottom: `1px solid ${N[100]}`,
        background: a.flag ? "#fef2f2" : "#fff",
        alignItems: "center",
      }}
    >
      <span style={{ color: N[500] }}>{a.time}</span>
      <span style={{ color: N[700] }}>L{a.lane}</span>
      <span style={{ color: N[700] }}>{a.op}</span>
      <span
        style={{
          display: "inline-block",
          padding: "1px 6px",
          background: tone + "15",
          color: tone,
          borderRadius: 2,
          fontWeight: 700,
          fontSize: 9,
          letterSpacing: "0.04em",
          textAlign: "center",
          width: "fit-content",
        }}
      >
        {a.type}
      </span>
      <span style={{ color: N[800], fontFamily: FONT, fontSize: 12 }}>{a.item}</span>
      <span
        style={{
          textAlign: "right",
          color: a.amt < 0 ? NEG : N[800],
          fontWeight: 700,
          fontVariantNumeric: "tabular-nums",
        }}
      >
        {a.amt === 0 ? "—" : PHP(a.amt)}
      </span>
      <span style={{ color: N[500], fontFamily: FONT, fontSize: 11 }}>{a.reason}</span>
      <span>
        {a.flag && (
          <span
            style={{
              fontSize: 9,
              fontWeight: 700,
              color: NEG,
              padding: "1px 5px",
              background: "#fee2e2",
              borderRadius: 2,
              fontFamily: FONT,
            }}
          >
            ★ REVIEW
          </span>
        )}
      </span>
    </div>
  );
}

function PageBtn({ label, active }: { label: string; active?: boolean }) {
  return (
    <button
      style={{
        width: 24,
        height: 24,
        background: active ? N[800] : "#fff",
        color: active ? "#fff" : N[700],
        border: `1px solid ${N[200]}`,
        borderRadius: 3,
        fontSize: 11,
        fontWeight: 600,
        cursor: "pointer",
        fontFamily: "inherit",
      }}
    >
      {label}
    </button>
  );
}
