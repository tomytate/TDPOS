"use client";

import React from "react";
import { PHP } from "./shared";

// ─────────────────────────────────────────────────────────────
// Tier E — Enterprise (Mall / Dept-store chain)
// Fully corporate · white, charcoal, single sapphire accent · chart-heavy
// ─────────────────────────────────────────────────────────────

const FONT = "ui-sans-serif, -apple-system, BlinkMacSystemFont, system-ui, sans-serif";
const MONO = "ui-monospace, 'SF Mono', Menlo, Consolas, monospace";

// Cool corporate neutrals
const C = {
  paper: "#ffffff",
  bg: "#f8fafc",
  line: "#e2e8f0",
  lineSoft: "#eef2f7",
  ink: "#0f172a",
  inkSub: "#475569",
  inkMute: "#94a3b8",
};

// Sapphire single accent
const S = {
  50: "#eff6ff",
  100: "#dbeafe",
  200: "#bfdbfe",
  300: "#93c5fd",
  400: "#60a5fa",
  500: "#3b82f6",
  600: "#2563eb",
  700: "#1d4ed8",
  800: "#1e40af",
  900: "#1e3a8a",
  };

const POS = "#15803d";
const NEG = "#b91c1c";
const WARN = "#a16207";

// ─────────────────────────────────────────────────────────────
// HQ Rollup Dashboard — Multi-store regional view (1440×900)
// ANCHOR MOMENT
// ─────────────────────────────────────────────────────────────
export function EnterpriseHQRollup() {
  return (
    <div
      style={{
        width: 1920,
        height: 1200,
        background: C.bg,
        color: C.ink,
        fontFamily: FONT,
        fontSize: 13,
        display: "flex",
        overflow: "hidden",
      }}
    >
      {/* Sidebar */}
      <div
        style={{
          width: 220,
          background: "#0b1220",
          color: "#fff",
          padding: "18px 0",
          display: "flex",
          flexDirection: "column",
          flexShrink: 0,
        }}
      >
        <div style={{ padding: "0 18px 18px", display: "flex", alignItems: "center", gap: 10 }}>
          <div
            style={{
              width: 30,
              height: 30,
              borderRadius: 6,
              background: S[600],
              display: "grid",
              placeItems: "center",
              fontWeight: 800,
              fontSize: 14,
            }}
          >
            S
          </div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700 }}>Suki Enterprise</div>
            <div style={{ fontSize: 10, opacity: 0.5 }}>HQ · Mandaluyong</div>
          </div>
        </div>

        <NavSection title="OVERVIEW">
          <NavItem label="Live dashboard" active />
          <NavItem label="Regional rollup" />
          <NavItem label="Store leaderboard" />
        </NavSection>

        <NavSection title="OPERATIONS">
          <NavItem label="Stores · 24" />
          <NavItem label="Inventory" />
          <NavItem label="Returns / warranty" />
          <NavItem label="Gift cards" />
        </NavSection>

        <NavSection title="ANALYTICS">
          <NavItem label="Sales trends" />
          <NavItem label="Margin & shrink" />
          <NavItem label="Cohort & loyalty" />
        </NavSection>

        <NavSection title="ADMIN">
          <NavItem label="Staff · 412" />
          <NavItem label="Pricing zones" />
          <NavItem label="Audit log" />
        </NavSection>

        <div
          style={{
            marginTop: "auto",
            margin: "auto 12px 12px",
            padding: 10,
            background: "rgba(255,255,255,0.04)",
            borderRadius: 4,
            fontSize: 11,
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          <div
            style={{
              width: 26,
              height: 26,
              borderRadius: 13,
              background: S[600],
              display: "grid",
              placeItems: "center",
              fontWeight: 700,
              fontSize: 10,
            }}
          >
            JD
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 600 }}>Juan Dela Cruz</div>
            <div style={{ fontSize: 9, opacity: 0.5 }}>Regional VP</div>
          </div>
        </div>
      </div>

      {/* Main */}
      <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column" }}>
        {/* Top bar */}
        <div
          style={{
            background: C.paper,
            borderBottom: `1px solid ${C.line}`,
            padding: "12px 24px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div>
            <div style={{ fontSize: 11, color: C.inkSub, fontWeight: 600 }}>Live dashboard</div>
            <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, marginTop: 1 }}>
              National rollup — Today
            </h1>
          </div>
          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <Pill label="Compare: vs LW" />
            <Pill label="Region: All (4)" />
            <Pill label="Tue 18 Mar 2025" />
            <button
              style={{
                padding: "7px 14px",
                background: S[700],
                color: "#fff",
                border: 0,
                borderRadius: 4,
                fontSize: 12,
                fontWeight: 700,
                cursor: "pointer",
                fontFamily: "inherit",
              }}
            >
              Export
            </button>
          </div>
        </div>

        {/* KPI strip */}
        <div
          style={{
            padding: 24,
            display: "grid",
            gridTemplateColumns: "repeat(4, 1fr)",
            gap: 12,
          }}
        >
          <BigKPI
            label="Net sales"
            value="₱18.42M"
            spark={[40, 52, 48, 60, 56, 70, 78, 74, 82, 88, 92, 100]}
            delta="+8.4%"
            tone="up"
          />
          <BigKPI
            label="Transactions"
            value="42,180"
            spark={[60, 58, 62, 70, 68, 75, 78, 76, 80, 82, 88, 90]}
            delta="+5.1%"
            tone="up"
          />
          <BigKPI
            label="Basket avg"
            value="₱436.70"
            spark={[70, 72, 68, 74, 72, 78, 80, 76, 82, 80, 85, 88]}
            delta="+3.2%"
            tone="up"
          />
          <BigKPI
            label="Margin"
            value="28.4%"
            spark={[80, 78, 82, 76, 84, 82, 80, 86, 84, 82, 88, 86]}
            delta="-0.6 pp"
            tone="down"
          />
        </div>

        {/* Chart row */}
        <div
          style={{
            padding: "0 24px 24px",
            display: "grid",
            gridTemplateColumns: "2fr 1fr",
            gap: 12,
          }}
        >
          {/* Sales by region — area */}
          <Panel title="Sales by region · last 12 weeks">
            <RegionChart />
          </Panel>

          {/* Top stores */}
          <Panel title="Top stores · today">
            <div style={{ padding: "8px 4px" }}>
              {TOP_STORES.map((s, i) => (
                <StoreRow key={s.code} rank={i + 1} {...s} />
              ))}
            </div>
          </Panel>
        </div>

        {/* Lower row — store grid + ops */}
        <div
          style={{
            padding: "0 24px 24px",
            display: "grid",
            gridTemplateColumns: "1.6fr 1fr",
            gap: 12,
          }}
        >
          <Panel title="All stores · 24" trailing="Live">
            <StoreGrid />
          </Panel>

          <Panel title="Operations">
            <div style={{ padding: "10px 14px", display: "flex", flexDirection: "column", gap: 10 }}>
              <OpRow icon="↩" label="Open returns" value="38" tone="warn" sub="Across 12 stores · 3 escalated" />
              <OpRow icon="◷" label="Warranty claims" value="14" tone="neutral" sub="Avg resolution 2.4 days" />
              <OpRow icon="◈" label="Gift card load" value={PHP(82400)} tone="up" sub="218 cards issued · 42 redeemed" />
              <OpRow icon="◉" label="Loyalty signups" value="142" tone="up" sub="National daily goal 90% met" />
              <OpRow icon="!" label="Stockout alerts" value="6" tone="down" sub="Premium produce · 3 stores" />
              <OpRow icon="●" label="Lanes online" value="186 / 192" tone="neutral" sub="6 closed for maintenance" />
            </div>
          </Panel>
        </div>

        {/* Bottom — category mix bar + cohort */}
        <div
          style={{
            padding: "0 24px 24px",
            display: "grid",
            gridTemplateColumns: "1fr 1fr 1fr",
            gap: 12,
          }}
        >
          <Panel title="Category mix · today">
            <div style={{ padding: "12px 14px" }}>
              {[
                { n: "Apparel", p: 32, v: 5894400 },
                { n: "Food & bev", p: 24, v: 4420800 },
                { n: "Home & living", p: 16, v: 2947200 },
                { n: "Electronics", p: 12, v: 2210400 },
                { n: "Beauty", p: 9, v: 1657800 },
                { n: "Other", p: 7, v: 1289400 },
              ].map((c) => (
                <div key={c.n} style={{ marginBottom: 8 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, marginBottom: 3 }}>
                    <span style={{ color: C.inkSub, fontWeight: 600 }}>{c.n}</span>
                    <span style={{ color: C.ink, fontVariantNumeric: "tabular-nums" }}>
                      ₱{(c.v / 1_000_000).toFixed(2)}M · {c.p}%
                    </span>
                  </div>
                  <div style={{ height: 5, background: C.lineSoft, borderRadius: 2, overflow: "hidden" }}>
                    <div style={{ width: `${c.p * 3}%`, height: "100%", background: S[600] }} />
                  </div>
                </div>
              ))}
            </div>
          </Panel>

          <Panel title="Tender mix">
            <DonutTender />
          </Panel>

          <Panel title="Membership cohort">
            <CohortGrid />
          </Panel>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Self-Service Kiosk — Mall floor (Portrait 720×1280)
// ─────────────────────────────────────────────────────────────
export function EnterpriseKiosk() {
  return (
    <div
      style={{
        width: 1179,
        height: 2665,
        background: "linear-gradient(180deg, #ffffff 0%, #f1f5f9 100%)",
        color: C.ink,
        fontFamily: FONT,
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
      }}
    >
      {/* Status Bar - Kiosk style */}
      <div
        style={{
          height: 147,
          padding: "0 66px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          fontSize: 46,
          fontWeight: 600,
          color: C.ink,
          background: "#fff",
          flexShrink: 0,
        }}
      >
        <span>9:41</span>
        <div style={{ display: "flex", gap: 20, alignItems: "center" }}>
          <span style={{ fontSize: 36, color: POS, fontWeight: 700 }}>● Online</span>
        </div>
      </div>

      {/* Brand strip */}
      <div
        style={{
          padding: "52px 66px",
          background: "#ffffff",
          borderBottom: `3px solid ${C.line}`,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 33 }}>
          <div
            style={{
              width: 118,
              height: 118,
              borderRadius: 24,
              background: S[700],
              color: "#fff",
              display: "grid",
              placeItems: "center",
              fontSize: 52,
              fontWeight: 800,
            }}
          >
            S
          </div>
          <div>
            <div style={{ fontSize: 52, fontWeight: 800, color: C.ink }}>Suki Department Store</div>
            <div style={{ fontSize: 36, color: C.inkSub, marginTop: 10 }}>Self-service kiosk · Floor 2 · West wing</div>
          </div>
        </div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 16,
            padding: "16px 33px",
            background: S[50],
            border: `3px solid ${S[200]}`,
            borderRadius: 16,
            fontSize: 36,
            fontWeight: 700,
            color: S[800],
          }}
        >
          <span style={{ width: 20, height: 20, borderRadius: 10, background: POS }} />
          NETWORK OK
        </div>
      </div>

      {/* Hero */}
      <div
        style={{
          padding: "105px 66px 66px",
          textAlign: "center",
        }}
      >
        <div
          style={{
            fontSize: 33,
            color: S[700],
            fontWeight: 700,
            letterSpacing: "0.16em",
            marginBottom: 26,
          }}
        >
          WELCOME
        </div>
        <h1 style={{ margin: 0, fontSize: 92, fontWeight: 800, lineHeight: 1.1, color: C.ink }}>
          How can we help today?
        </h1>
        <p style={{ margin: "33px auto 0", fontSize: 46, color: C.inkSub, lineHeight: 1.5, maxWidth: 950 }}>
          Tap an option below or scan a barcode to begin. Need a person? Press the call button.
        </p>
      </div>

      {/* Big actions */}
      <div
        style={{
          flex: 1,
          padding: "0 66px",
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 33,
          alignContent: "start",
        }}
      >
        <KioskCard icon="◫" title="Find a product" sub="Search aisle, brand or barcode" tone="primary" />
        <KioskCard icon="◉" title="Loyalty & points" sub="Sign up, check points, redeem" />
        <KioskCard icon="↩" title="Returns & exchanges" sub="Bring receipt — we'll guide you" />
        <KioskCard icon="◈" title="Gift cards" sub="Buy, reload, check balance" />
        <KioskCard icon="◷" title="Warranty claim" sub="Register product or file a claim" />
        <KioskCard icon="?" title="Store directory" sub="Map · departments · floor guide" />
      </div>

      {/* Now-on banner */}
      <div
        style={{
          margin: "52px 66px",
          padding: "40px 46px",
          background: S[800],
          color: "#fff",
          borderRadius: 24,
          display: "flex",
          gap: 40,
          alignItems: "center",
        }}
      >
        <div
          style={{
            width: 118,
            height: 118,
            borderRadius: 20,
            background: "rgba(255,255,255,0.12)",
            display: "grid",
            placeItems: "center",
            fontSize: 52,
            fontWeight: 800,
          }}
        >
          %
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 33, opacity: 0.7, fontWeight: 700, letterSpacing: "0.08em" }}>NOW ON</div>
          <div style={{ fontSize: 46, fontWeight: 700, marginTop: 10 }}>
            Members earn 3× points on apparel until 9pm tonight
          </div>
        </div>
        <div
          style={{
            fontSize: 36,
            padding: "16px 33px",
            background: "rgba(255,255,255,0.15)",
            borderRadius: 10,
            fontWeight: 700,
          }}
        >
          ENDS 21:00
        </div>
      </div>

      {/* Bottom strip */}
      <div
        style={{
          padding: "40px 66px 80px",
          background: C.paper,
          borderTop: `3px solid ${C.line}`,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexShrink: 0,
        }}
      >
        <div style={{ display: "flex", gap: 33, alignItems: "center" }}>
          <button
            style={{
              padding: "33px 52px",
              background: C.paper,
              border: `3px solid ${C.line}`,
              borderRadius: 16,
              fontSize: 43,
              fontWeight: 700,
              color: C.ink,
              cursor: "pointer",
              fontFamily: "inherit",
              display: "flex",
              gap: 20,
              alignItems: "center",
            }}
          >
            <span style={{ fontSize: 46 }}>◔</span>
            English
          </button>
          <button
            style={{
              padding: "33px 52px",
              background: "transparent",
              border: 0,
              fontSize: 43,
              color: C.inkSub,
              cursor: "pointer",
              fontFamily: "inherit",
            }}
          >
            ♿ Accessibility
          </button>
        </div>
        <button
          style={{
            padding: "33px 66px",
            background: S[700],
            color: "#fff",
            border: 0,
            borderRadius: 16,
            fontSize: 46,
            fontWeight: 700,
            cursor: "pointer",
            fontFamily: "inherit",
            display: "flex",
            gap: 20,
            alignItems: "center",
            boxShadow: `0 13px 40px ${S[900]}55`,
          }}
        >
          <span style={{ fontSize: 52 }}>♔</span> Call associate
        </button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Returns / Warranty — Cashier Terminal (1280×800)
// ─────────────────────────────────────────────────────────────
export function EnterpriseReturns() {
  return (
    <div
      style={{
        width: 1920,
        height: 1200,
        background: C.bg,
        color: C.ink,
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
          background: C.paper,
          borderBottom: `1px solid ${C.line}`,
          padding: "12px 24px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div
            style={{
              width: 30,
              height: 30,
              borderRadius: 6,
              background: S[700],
              color: "#fff",
              display: "grid",
              placeItems: "center",
              fontWeight: 800,
            }}
          >
            S
          </div>
          <div>
            <div style={{ fontSize: 14, fontWeight: 700 }}>Returns & Warranty Desk</div>
            <div style={{ fontSize: 11, color: C.inkSub }}>Store 0118 · SM Aura · Counter R1</div>
          </div>
        </div>
        <div style={{ display: "flex", gap: 10, fontSize: 12 }}>
          <span style={{ color: C.inkSub }}>Op: M.Garcia · Tue 18 Mar · 22:14</span>
          <span
            style={{
              padding: "3px 9px",
              background: S[50],
              color: S[700],
              borderRadius: 3,
              fontWeight: 700,
              fontSize: 11,
              border: `1px solid ${S[200]}`,
            }}
          >
            CASE #RW-2025-04218
          </span>
        </div>
      </div>

      {/* Workspace */}
      <div style={{ flex: 1, display: "flex", padding: 18, gap: 14, minHeight: 0 }}>
        {/* Left — original transaction */}
        <div style={{ flex: 1.2, display: "flex", flexDirection: "column", gap: 12, minWidth: 0 }}>
          <Panel title="Original transaction" trailing="Found by receipt scan">
            <div style={{ padding: 14 }}>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr 1fr 1fr",
                  gap: 10,
                  fontSize: 12,
                  marginBottom: 12,
                  paddingBottom: 12,
                  borderBottom: `1px solid ${C.lineSoft}`,
                }}
              >
                <DT label="Date" value="14 Mar 2025" />
                <DT label="Store" value="0118 · SM Aura" />
                <DT label="TX #" value="#0118-04-194021" />
                <DT label="Tender" value="Visa ★★★★ 4421" />
                <DT label="Cashier" value="L.Medina" />
                <DT label="Total" value={PHP(4218.5)} />
                <DT label="Member" value="GOLD #88412" />
                <DT label="Within 30d" value="YES (4 days ago)" tone="up" />
              </div>

              <div
                style={{
                  fontSize: 10,
                  fontWeight: 700,
                  color: C.inkSub,
                  letterSpacing: "0.06em",
                  marginBottom: 6,
                }}
              >
                LINE ITEMS — SELECT TO RETURN
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                {RETURN_ITEMS.map((r, i) => (
                  <ReturnItemRow key={i} {...r} />
                ))}
              </div>
            </div>
          </Panel>

          <Panel title="Refund summary">
            <div style={{ padding: 14, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24, fontSize: 12 }}>
              <div>
                <RefLine label="Items returned" value="2 of 6" />
                <RefLine label="Original paid" value={PHP(1248)} muted />
                <RefLine label="Restocking fee" value={PHP(0)} muted />
                <RefLine label="Loyalty points reverted" value="-125 pts" muted />
              </div>
              <div>
                <div
                  style={{
                    background: S[50],
                    border: `1px solid ${S[200]}`,
                    borderRadius: 4,
                    padding: 12,
                  }}
                >
                  <div style={{ fontSize: 10, fontWeight: 700, color: S[700], letterSpacing: "0.06em" }}>
                    REFUND TO
                  </div>
                  <div style={{ fontSize: 13, color: C.ink, marginTop: 3 }}>Visa ★★★★ 4421 · 1-2 banking days</div>
                  <div
                    style={{
                      fontSize: 24,
                      fontWeight: 800,
                      color: S[800],
                      marginTop: 6,
                      fontVariantNumeric: "tabular-nums",
                      fontFamily: MONO,
                    }}
                  >
                    {PHP(1248.0)}
                  </div>
                </div>
              </div>
            </div>
          </Panel>
        </div>

        {/* Right — workflow */}
        <div style={{ width: 360, display: "flex", flexDirection: "column", gap: 12 }}>
          <Panel title="Return workflow">
            <div style={{ padding: 14, display: "flex", flexDirection: "column", gap: 8 }}>
              <Step n={1} label="Receipt or member ID" done />
              <Step n={2} label="Verify items + condition" done />
              <Step n={3} label="Reason & evidence" active />
              <Step n={4} label="Manager approval" />
              <Step n={5} label="Process refund" />
              <Step n={6} label="Print return slip" />
            </div>
          </Panel>

          <Panel title="Reason & condition">
            <div style={{ padding: 14, display: "flex", flexDirection: "column", gap: 10 }}>
              <Select label="Reason" value="Defective on arrival" />
              <Select label="Condition" value="Unopened · sealed" />
              <Select label="Resolution" value="Refund to original tender" />
              <div style={{ marginTop: 4 }}>
                <div
                  style={{
                    fontSize: 10,
                    fontWeight: 700,
                    color: C.inkSub,
                    letterSpacing: "0.06em",
                    marginBottom: 4,
                  }}
                >
                  EVIDENCE
                </div>
                <div
                  style={{
                    border: `1px dashed ${C.line}`,
                    borderRadius: 4,
                    padding: 14,
                    textAlign: "center",
                    fontSize: 11,
                    color: C.inkSub,
                  }}
                >
                  Drop photos here · or scan from kiosk
                </div>
              </div>
            </div>
          </Panel>

          <button
            style={{
              padding: 14,
              background: S[700],
              color: "#fff",
              border: 0,
              borderRadius: 4,
              fontSize: 14,
              fontWeight: 700,
              cursor: "pointer",
              fontFamily: "inherit",
            }}
          >
            Request manager approval →
          </button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────────────────────────

function NavSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ padding: "10px 0" }}>
      <div
        style={{
          padding: "0 18px 6px",
          fontSize: 9,
          fontWeight: 700,
          letterSpacing: "0.1em",
          opacity: 0.45,
        }}
      >
        {title}
      </div>
      {children}
    </div>
  );
}

function NavItem({ label, active }: { label: string; active?: boolean }) {
  return (
    <div
      style={{
        padding: "7px 18px",
        fontSize: 12,
        cursor: "pointer",
        background: active ? "rgba(59,130,246,0.15)" : "transparent",
        color: active ? "#fff" : "rgba(255,255,255,0.78)",
        borderLeft: active ? `3px solid ${S[500]}` : "3px solid transparent",
        fontWeight: active ? 600 : 500,
      }}
    >
      {label}
    </div>
  );
}

function Pill({ label }: { label: string }) {
  return (
    <button
      style={{
        padding: "6px 12px",
        background: C.paper,
        border: `1px solid ${C.line}`,
        borderRadius: 999,
        fontSize: 11,
        color: C.inkSub,
        fontWeight: 600,
        cursor: "pointer",
        fontFamily: "inherit",
      }}
    >
      {label} <span style={{ marginLeft: 4, color: C.inkMute }}>▾</span>
    </button>
  );
}

function BigKPI({
  label,
  value,
  spark,
  delta,
  tone,
}: {
  label: string;
  value: string;
  spark: number[];
  delta: string;
  tone: "up" | "down";
}) {
  const max = Math.max(...spark);
  const min = Math.min(...spark);
  const W = 200;
  const H = 36;
  const points = spark
    .map((v, i) => {
      const x = (i / (spark.length - 1)) * W;
      const y = H - ((v - min) / (max - min || 1)) * H;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
  return (
    <div
      style={{
        background: C.paper,
        border: `1px solid ${C.line}`,
        borderRadius: 6,
        padding: 16,
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <div style={{ fontSize: 11, color: C.inkSub, fontWeight: 600 }}>{label}</div>
          <div
            style={{
              fontSize: 26,
              fontWeight: 800,
              color: C.ink,
              marginTop: 3,
              fontVariantNumeric: "tabular-nums",
            }}
          >
            {value}
          </div>
        </div>
        <span
          style={{
            fontSize: 11,
            fontWeight: 700,
            color: tone === "up" ? POS : NEG,
            background: tone === "up" ? "#dcfce7" : "#fee2e2",
            padding: "3px 8px",
            borderRadius: 3,
          }}
        >
          {delta}
        </span>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" height="36" style={{ marginTop: 10, display: "block" }} preserveAspectRatio="none">
        <defs>
          <linearGradient id={`grad-${label}`} x1="0" x2="0" y1="0" y2="1">
            <stop offset="0" stopColor={S[500]} stopOpacity="0.25" />
            <stop offset="1" stopColor={S[500]} stopOpacity="0" />
          </linearGradient>
        </defs>
        <polygon points={`0,${H} ${points} ${W},${H}`} fill={`url(#grad-${label})`} />
        <polyline points={points} fill="none" stroke={S[600]} strokeWidth="1.5" strokeLinejoin="round" />
      </svg>
    </div>
  );
}

function Panel({
  title,
  trailing,
  children,
}: {
  title: string;
  trailing?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      style={{
        background: C.paper,
        border: `1px solid ${C.line}`,
        borderRadius: 6,
        display: "flex",
        flexDirection: "column",
      }}
    >
      <div
        style={{
          padding: "10px 16px",
          borderBottom: `1px solid ${C.lineSoft}`,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <div style={{ fontSize: 13, fontWeight: 700, color: C.ink }}>{title}</div>
        {trailing && (
          <div style={{ fontSize: 10, color: C.inkSub, fontWeight: 600, letterSpacing: "0.04em" }}>
            <span style={{ color: POS, marginRight: 4 }}>●</span>
            {trailing.toUpperCase()}
          </div>
        )}
      </div>
      <div style={{ flex: 1 }}>{children}</div>
    </div>
  );
}

function RegionChart() {
  const W = 720;
  const H = 200;
  const pad = { l: 30, r: 12, t: 12, b: 24 };
  const innerW = W - pad.l - pad.r;
  const innerH = H - pad.t - pad.b;
  const weeks = 12;
  const series = [
    { name: "NCR", color: S[600], data: [60, 64, 62, 70, 68, 74, 78, 76, 82, 80, 88, 92] },
    { name: "Luzon", color: S[400], data: [40, 44, 46, 48, 50, 54, 58, 56, 62, 64, 68, 72] },
    { name: "Visayas", color: "#0ea5e9", data: [25, 28, 30, 32, 30, 36, 38, 40, 44, 46, 48, 52] },
    { name: "Mindanao", color: "#06b6d4", data: [15, 16, 18, 20, 22, 24, 26, 28, 30, 32, 34, 36] },
  ];
  const max = 100;

  const path = (data: number[]) =>
    data
      .map((v, i) => {
        const x = pad.l + (i / (weeks - 1)) * innerW;
        const y = pad.t + innerH - (v / max) * innerH;
        return `${i === 0 ? "M" : "L"}${x},${y}`;
      })
      .join(" ");

  const area = (data: number[]) =>
    `${path(data)} L${pad.l + innerW},${pad.t + innerH} L${pad.l},${pad.t + innerH} Z`;

  return (
    <div style={{ padding: 14 }}>
      <div style={{ display: "flex", gap: 14, marginBottom: 8, fontSize: 11 }}>
        {series.map((s) => (
          <span key={s.name} style={{ display: "flex", alignItems: "center", gap: 6, color: C.inkSub }}>
            <span style={{ width: 8, height: 8, borderRadius: 2, background: s.color }} />
            {s.name}
          </span>
        ))}
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" height={H} preserveAspectRatio="none">
        {[0, 0.25, 0.5, 0.75, 1].map((g, i) => (
          <line
            key={i}
            x1={pad.l}
            x2={W - pad.r}
            y1={pad.t + innerH * g}
            y2={pad.t + innerH * g}
            stroke={C.lineSoft}
            strokeWidth="1"
          />
        ))}
        {series
          .slice()
          .reverse()
          .map((s) => (
            <g key={s.name}>
              <path d={area(s.data)} fill={s.color} fillOpacity="0.08" />
              <path d={path(s.data)} fill="none" stroke={s.color} strokeWidth="1.8" strokeLinejoin="round" />
            </g>
          ))}
        {Array.from({ length: weeks }).map((_, i) => (
          <text
            key={i}
            x={pad.l + (i / (weeks - 1)) * innerW}
            y={H - 6}
            textAnchor="middle"
            fontSize="9"
            fill={C.inkMute}
            fontFamily={MONO}
          >
            W{i + 1}
          </text>
        ))}
        {[0, 50, 100].map((v) => (
          <text
            key={v}
            x={pad.l - 4}
            y={pad.t + innerH - (v / max) * innerH + 3}
            textAnchor="end"
            fontSize="9"
            fill={C.inkMute}
            fontFamily={MONO}
          >
            {v}M
          </text>
        ))}
      </svg>
    </div>
  );
}

const TOP_STORES = [
  { code: "0118", name: "SM Aura", region: "NCR", sales: 1842500, delta: "+12%", tone: "up" as const },
  { code: "0102", name: "Glorietta", region: "NCR", sales: 1648200, delta: "+8%", tone: "up" as const },
  { code: "0301", name: "Ayala Cebu", region: "Visayas", sales: 1428400, delta: "+5%", tone: "up" as const },
  { code: "0114", name: "MoA", region: "NCR", sales: 1284800, delta: "-2%", tone: "down" as const },
  { code: "0202", name: "Ayala Vertis", region: "Luzon", sales: 1184200, delta: "+14%", tone: "up" as const },
  { code: "0401", name: "Davao Abreeza", region: "Mindanao", sales: 988400, delta: "+9%", tone: "up" as const },
];

function StoreRow({
  rank,
  code,
  name,
  region,
  sales,
  delta,
  tone,
}: {
  rank: number;
  code: string;
  name: string;
  region: string;
  sales: number;
  delta: string;
  tone: "up" | "down";
}) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "24px 1fr auto auto",
        gap: 10,
        alignItems: "center",
        padding: "8px 14px",
        borderTop: rank === 1 ? "0" : `1px solid ${C.lineSoft}`,
      }}
    >
      <div
        style={{
          width: 22,
          height: 22,
          borderRadius: 11,
          background: rank <= 3 ? S[100] : C.lineSoft,
          color: rank <= 3 ? S[700] : C.inkSub,
          display: "grid",
          placeItems: "center",
          fontSize: 10,
          fontWeight: 700,
          fontFamily: MONO,
        }}
      >
        {rank}
      </div>
      <div style={{ minWidth: 0 }}>
        <div
          style={{
            fontSize: 12,
            fontWeight: 600,
            color: C.ink,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {name}
        </div>
        <div style={{ fontSize: 10, color: C.inkSub, fontFamily: MONO }}>
          #{code} · {region}
        </div>
      </div>
      <div
        style={{
          fontSize: 12,
          fontWeight: 700,
          color: C.ink,
          fontVariantNumeric: "tabular-nums",
        }}
      >
        ₱{(sales / 1000).toFixed(0)}K
      </div>
      <span
        style={{
          fontSize: 10,
          fontWeight: 700,
          color: tone === "up" ? POS : NEG,
          minWidth: 32,
          textAlign: "right",
        }}
      >
        {delta}
      </span>
    </div>
  );
}

function StoreGrid() {
  // 24 stores, color = sales density
  const stores = Array.from({ length: 24 }).map((_, i) => ({
    code: String(100 + i).padStart(4, "0"),
    name: ["SM Aura", "Glorietta", "Ayala Cebu", "MoA", "Vertis", "Abreeza"][i % 6],
    sales: Math.round(200 + Math.random() * 1700),
    state: i === 7 || i === 19 ? "alert" : i === 3 ? "down" : "ok",
  }));
  return (
    <div
      style={{
        padding: 14,
        display: "grid",
        gridTemplateColumns: "repeat(8, 1fr)",
        gap: 8,
      }}
    >
      {stores.map((s) => (
        <div
          key={s.code}
          style={{
            background: s.state === "alert" ? "#fef2f2" : s.state === "down" ? "#fef9c3" : C.bg,
            border: `1px solid ${
              s.state === "alert" ? "#fecaca" : s.state === "down" ? "#fde68a" : C.line
            }`,
            borderRadius: 4,
            padding: 8,
          }}
        >
          <div
            style={{
              fontSize: 9,
              color: C.inkSub,
              fontFamily: MONO,
              fontWeight: 700,
              letterSpacing: "0.04em",
            }}
          >
            #{s.code}
          </div>
          <div
            style={{
              fontSize: 10,
              color: C.ink,
              fontWeight: 600,
              marginTop: 1,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {s.name}
          </div>
          <div
            style={{
              fontSize: 11,
              fontWeight: 800,
              color: S[700],
              marginTop: 4,
              fontVariantNumeric: "tabular-nums",
              fontFamily: MONO,
            }}
          >
            ₱{s.sales}K
          </div>
          <div style={{ height: 3, background: C.lineSoft, borderRadius: 2, marginTop: 4, overflow: "hidden" }}>
            <div
              style={{
                width: `${Math.min(100, (s.sales / 1900) * 100)}%`,
                height: "100%",
                background: s.state === "alert" ? NEG : s.state === "down" ? WARN : S[600],
              }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

function OpRow({
  icon,
  label,
  value,
  tone,
  sub,
}: {
  icon: string;
  label: string;
  value: string;
  tone: "up" | "down" | "warn" | "neutral";
  sub: string;
}) {
  const c = tone === "up" ? POS : tone === "down" ? NEG : tone === "warn" ? WARN : C.inkSub;
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "32px 1fr auto",
        gap: 10,
        alignItems: "center",
        padding: "6px 0",
        borderTop: `1px solid ${C.lineSoft}`,
      }}
    >
      <div
        style={{
          width: 28,
          height: 28,
          borderRadius: 4,
          background: C.bg,
          color: c,
          display: "grid",
          placeItems: "center",
          fontSize: 14,
          fontWeight: 700,
        }}
      >
        {icon}
      </div>
      <div>
        <div style={{ fontSize: 12, color: C.ink, fontWeight: 600 }}>{label}</div>
        <div style={{ fontSize: 10, color: C.inkSub, marginTop: 1 }}>{sub}</div>
      </div>
      <div
        style={{
          fontSize: 14,
          fontWeight: 800,
          color: c,
          fontVariantNumeric: "tabular-nums",
          fontFamily: MONO,
        }}
      >
        {value}
      </div>
    </div>
  );
}

function DonutTender() {
  const data = [
    { l: "Card", v: 42, c: S[600] },
    { l: "Cash", v: 24, c: S[400] },
    { l: "GCash", v: 18, c: "#06b6d4" },
    { l: "Maya", v: 10, c: "#0ea5e9" },
    { l: "Other", v: 6, c: C.inkMute },
  ];
  const R = 60;
  const r = 38;
  const cx = 80;
  const cy = 80;
  let cum = 0;
  return (
    <div style={{ padding: 14, display: "flex", gap: 12, alignItems: "center" }}>
      <svg width="160" height="160" viewBox="0 0 160 160">
        {data.map((d) => {
          const start = (cum / 100) * Math.PI * 2 - Math.PI / 2;
          cum += d.v;
          const end = (cum / 100) * Math.PI * 2 - Math.PI / 2;
          const x1 = cx + R * Math.cos(start);
          const y1 = cy + R * Math.sin(start);
          const x2 = cx + R * Math.cos(end);
          const y2 = cy + R * Math.sin(end);
          const x3 = cx + r * Math.cos(end);
          const y3 = cy + r * Math.sin(end);
          const x4 = cx + r * Math.cos(start);
          const y4 = cy + r * Math.sin(start);
          const large = end - start > Math.PI ? 1 : 0;
          return (
            <path
              key={d.l}
              d={`M${x1},${y1} A${R},${R} 0 ${large} 1 ${x2},${y2} L${x3},${y3} A${r},${r} 0 ${large} 0 ${x4},${y4} Z`}
              fill={d.c}
            />
          );
        })}
        <text x={cx} y={cy - 2} textAnchor="middle" fontSize="11" fill={C.inkSub} fontFamily={MONO}>
          TOTAL
        </text>
        <text x={cx} y={cy + 12} textAnchor="middle" fontSize="13" fontWeight="800" fill={C.ink}>
          42K
        </text>
      </svg>
      <div style={{ flex: 1 }}>
        {data.map((d) => (
          <div
            key={d.l}
            style={{
              display: "grid",
              gridTemplateColumns: "10px 1fr auto",
              gap: 8,
              padding: "4px 0",
              fontSize: 11,
              alignItems: "center",
            }}
          >
            <span style={{ width: 8, height: 8, borderRadius: 2, background: d.c }} />
            <span style={{ color: C.inkSub }}>{d.l}</span>
            <span style={{ fontWeight: 700, color: C.ink, fontVariantNumeric: "tabular-nums" }}>
              {d.v}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function CohortGrid() {
  // weeks × cohorts heatmap
  const W = 12;
  const H = 6;
  const cells = Array.from({ length: H * W }).map((_, i) => {
    const row = Math.floor(i / W);
    const col = i % W;
    const v = Math.max(0, 1 - col * 0.08 - Math.random() * 0.3 + (5 - row) * 0.03);
    return { row, col, v: Math.min(1, v) };
  });
  return (
    <div style={{ padding: 14 }}>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: `40px repeat(${W}, 1fr)`,
          gap: 2,
          fontSize: 9,
          color: C.inkMute,
          fontFamily: MONO,
        }}
      >
        <span></span>
        {Array.from({ length: W }).map((_, i) => (
          <span key={i} style={{ textAlign: "center" }}>
            W{i}
          </span>
        ))}
        {Array.from({ length: H }).map((_, r) => (
          <React.Fragment key={r}>
            <span style={{ alignSelf: "center" }}>{`'${24 - r}Q4`}</span>
            {Array.from({ length: W }).map((_, c) => {
              const cell = cells.find((x) => x.row === r && x.col === c)!;
              return (
                <div
                  key={c}
                  style={{
                    aspectRatio: "1",
                    background: `rgba(37, 99, 235, ${cell.v.toFixed(2)})`,
                    borderRadius: 2,
                  }}
                />
              );
            })}
          </React.Fragment>
        ))}
      </div>
      <div style={{ display: "flex", gap: 6, marginTop: 10, alignItems: "center", fontSize: 10, color: C.inkSub }}>
        <span>Retention 0%</span>
        <div
          style={{
            flex: 1,
            height: 6,
            background: `linear-gradient(90deg, ${S[100]}, ${S[600]})`,
            borderRadius: 2,
          }}
        />
        <span>100%</span>
      </div>
    </div>
  );
}

function KioskCard({
  icon,
  title,
  sub,
  tone,
}: {
  icon: string;
  title: string;
  sub: string;
  tone?: "primary";
}) {
  const isPrimary = tone === "primary";
  return (
    <button
      style={{
        textAlign: "left",
        padding: "52px 46px",
        background: isPrimary ? S[700] : C.paper,
        color: isPrimary ? "#fff" : C.ink,
        border: isPrimary ? "0" : `3px solid ${C.line}`,
        borderRadius: 24,
        cursor: "pointer",
        fontFamily: "inherit",
        display: "flex",
        flexDirection: "column",
        gap: 33,
        boxShadow: isPrimary ? "0 13px 40px -8px rgba(30,64,175,0.4)" : "0 2px 0 rgba(0,0,0,0.02)",
      }}
    >
      <div
        style={{
          width: 118,
          height: 118,
          borderRadius: 20,
          background: isPrimary ? "rgba(255,255,255,0.15)" : S[50],
          color: isPrimary ? "#fff" : S[700],
          display: "grid",
          placeItems: "center",
          fontSize: 59,
          fontWeight: 700,
        }}
      >
        {icon}
      </div>
      <div>
        <div style={{ fontSize: 46, fontWeight: 800 }}>{title}</div>
        <div style={{ fontSize: 36, opacity: isPrimary ? 0.8 : 1, color: isPrimary ? "#fff" : C.inkSub, marginTop: 10 }}>
          {sub}
        </div>
      </div>
    </button>
  );
}

const RETURN_ITEMS = [
  { sku: "740112", name: "Eden cheese 165g", qty: 1, price: 99.5, sel: false },
  { sku: "884100", name: "Magnolia milk 1L", qty: 2, price: 95.0, sel: false },
  { sku: "ELEC-2840", name: "JBL Tune 510BT (defective)", qty: 1, price: 1248.0, sel: true, defect: true },
  { sku: "871045", name: "Skyflakes 700g", qty: 1, price: 88.5, sel: false },
  { sku: "750129", name: "Tide bar ×3", qty: 3, price: 22.0, sel: false },
  { sku: "881122", name: "Pandesal x6", qty: 2, price: 18.0, sel: false },
];

function ReturnItemRow(r: (typeof RETURN_ITEMS)[number]) {
  return (
    <label
      style={{
        display: "grid",
        gridTemplateColumns: "20px 80px 1fr 50px 70px 80px",
        gap: 10,
        alignItems: "center",
        padding: "8px 10px",
        background: r.sel ? S[50] : "#fff",
        border: `1px solid ${r.sel ? S[200] : C.lineSoft}`,
        borderRadius: 4,
        cursor: "pointer",
        fontSize: 12,
      }}
    >
      <input
        type="checkbox"
        defaultChecked={r.sel}
        style={{ accentColor: S[700], width: 16, height: 16 }}
      />
      <span style={{ fontFamily: MONO, fontSize: 11, color: C.inkSub }}>{r.sku}</span>
      <span style={{ color: C.ink, fontWeight: 500 }}>
        {r.name}
        {r.defect && (
          <span
            style={{
              marginLeft: 6,
              fontSize: 9,
              fontWeight: 700,
              color: NEG,
              padding: "1px 5px",
              background: "#fee2e2",
              borderRadius: 2,
            }}
          >
            DEFECT
          </span>
        )}
      </span>
      <span style={{ textAlign: "right", color: C.inkSub, fontVariantNumeric: "tabular-nums" }}>×{r.qty}</span>
      <span
        style={{
          textAlign: "right",
          color: C.inkSub,
          fontVariantNumeric: "tabular-nums",
          fontFamily: MONO,
        }}
      >
        {PHP(r.price)}
      </span>
      <span
        style={{
          textAlign: "right",
          fontWeight: 700,
          color: C.ink,
          fontVariantNumeric: "tabular-nums",
          fontFamily: MONO,
        }}
      >
        {PHP(r.qty * r.price)}
      </span>
    </label>
  );
}

function DT({ label, value, tone }: { label: string; value: string; tone?: "up" }) {
  return (
    <div>
      <div
        style={{
          fontSize: 10,
          color: C.inkSub,
          fontWeight: 700,
          letterSpacing: "0.04em",
          marginBottom: 2,
        }}
      >
        {label.toUpperCase()}
      </div>
      <div style={{ fontSize: 12, color: tone === "up" ? POS : C.ink, fontWeight: 600 }}>{value}</div>
    </div>
  );
}

function RefLine({ label, value, muted }: { label: string; value: string; muted?: boolean }) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        padding: "5px 0",
        fontSize: 12,
        color: muted ? C.inkSub : C.ink,
        borderBottom: `1px solid ${C.lineSoft}`,
      }}
    >
      <span>{label}</span>
      <span style={{ fontWeight: 600, fontVariantNumeric: "tabular-nums", fontFamily: MONO }}>{value}</span>
    </div>
  );
}

function Step({ n, label, done, active }: { n: number; label: string; done?: boolean; active?: boolean }) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "24px 1fr",
        gap: 10,
        alignItems: "center",
      }}
    >
      <div
        style={{
          width: 22,
          height: 22,
          borderRadius: 11,
          background: done ? POS : active ? S[700] : C.lineSoft,
          color: done || active ? "#fff" : C.inkSub,
          display: "grid",
          placeItems: "center",
          fontSize: 10,
          fontWeight: 700,
        }}
      >
        {done ? "✓" : n}
      </div>
      <span
        style={{
          fontSize: 12,
          color: active ? C.ink : done ? C.inkSub : C.inkMute,
          fontWeight: active ? 700 : 500,
          textDecoration: done ? "line-through" : "none",
        }}
      >
        {label}
      </span>
    </div>
  );
}

function Select({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div
        style={{
          fontSize: 10,
          fontWeight: 700,
          color: C.inkSub,
          letterSpacing: "0.06em",
          marginBottom: 4,
        }}
      >
        {label.toUpperCase()}
      </div>
      <div
        style={{
          padding: "8px 10px",
          background: "#fff",
          border: `1px solid ${C.line}`,
          borderRadius: 4,
          fontSize: 12,
          color: C.ink,
          fontWeight: 500,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <span>{value}</span>
        <span style={{ color: C.inkMute, fontSize: 10 }}>▾</span>
      </div>
    </div>
  );
}
