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
// TIER B — SUKI PRO (Mini-mart / Alfamart-scale)
// Warm carries + slate, 2-pane tablet layouts
// ═══════════════════════════════════════════════════════════════════

// Tablet Shell
function TabletShell({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: React.CSSProperties;
}) {
  return (
    <div
      style={{
        width: 1920,
        height: 1200,
        background: "#fff",
        display: "flex",
        flexDirection: "column",
        fontFamily: "var(--font-sans)",
        overflow: "hidden",
        position: "relative",
        borderRadius: 8,
        ...style,
      }}
    >
      {/* Status Bar */}
      <div
        style={{
          height: 32,
          padding: "0 16px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          fontSize: 12,
          fontWeight: 600,
          color: "var(--ink-700)",
          background: "var(--ink-50)",
          borderBottom: "1px solid var(--border)",
          flexShrink: 0,
        }}
      >
        <span>9:41 AM · Tue, Mar 14</span>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ fontSize: 11, color: "var(--teal-700)", fontWeight: 700 }}>● Online</span>
          <span>Lane 2 · Maria C.</span>
        </div>
      </div>
      {children}
    </div>
  );
}

export function ProTabletPOS({ lang = "en" }: { lang?: string }) {
  const cart = [
    { ...CATALOG[14], qty: 6 }, // Pandesal
    { ...CATALOG[0], qty: 3 },  // Bear Brand
    { ...CATALOG[4], qty: 2 },  // Coke
    { ...CATALOG[7], qty: 5 },  // Marlboro
  ];
  const total = cart.reduce((s, i) => s + i.qty * i.price, 0);
  const shortcuts = CATALOG.slice(0, 12);

  return (
    <TabletShell>
      <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
        {/* Left Pane - Product Grid */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", borderRight: "1px solid var(--border)" }}>
          {/* Search */}
          <div style={{ padding: 12, borderBottom: "1px solid var(--border)" }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "10px 14px",
                background: "var(--ink-100)",
                borderRadius: "var(--r-md)",
              }}
            >
              <Icon name="search" size={18} style={{ color: "var(--ink-400)" }} />
              <span style={{ color: "var(--ink-500)", fontSize: 14 }}>
                {T("Search or scan...", "Hanapin o i-scan...", lang)}
              </span>
              <div style={{ marginLeft: "auto", display: "flex", gap: 6 }}>
                <button
                  style={{
                    padding: "6px 12px",
                    borderRadius: "var(--r-md)",
                    border: "1px solid var(--teal-600)",
                    background: "var(--teal-50)",
                    color: "var(--teal-700)",
                    fontSize: 12,
                    fontWeight: 700,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: 4,
                    fontFamily: "inherit",
                  }}
                >
                  <Icon name="scan" size={14} /> Scan
                </button>
              </div>
            </div>
          </div>

          {/* Category Tabs */}
          <div
            style={{
              display: "flex",
              gap: 4,
              padding: "8px 12px",
              borderBottom: "1px solid var(--border)",
              overflowX: "auto",
            }}
          >
            {["All", "Beverage", "Sachet", "Snacks", "Tobacco", "Load", "Promo"].map((cat, i) => (
              <button
                key={cat}
                style={{
                  padding: "8px 16px",
                  borderRadius: "var(--r-md)",
                  border: i === 0 ? "none" : "1px solid var(--border)",
                  background: i === 0 ? "var(--teal-700)" : "transparent",
                  color: i === 0 ? "#fff" : "var(--ink-600)",
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: "pointer",
                  whiteSpace: "nowrap",
                  fontFamily: "inherit",
                }}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Product Grid */}
          <div
            style={{
              flex: 1,
              overflowY: "auto",
              padding: 12,
              display: "grid",
              gridTemplateColumns: "repeat(4, 1fr)",
              gap: 10,
              alignContent: "start",
            }}
          >
            {shortcuts.map((p) => (
              <button
                key={p.id}
                style={{
                  aspectRatio: "1",
                  borderRadius: "var(--r-lg)",
                  border: "1px solid var(--border)",
                  background: tileBg(p),
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  padding: 8,
                  cursor: "pointer",
                  position: "relative",
                }}
              >
                <ProductGlyph p={p} size={44} />
                <div
                  style={{
                    fontSize: 11,
                    fontWeight: 600,
                    color: "var(--ink-700)",
                    marginTop: 6,
                    textAlign: "center",
                    lineHeight: 1.2,
                  }}
                >
                  {p.name}
                </div>
                <div
                  className="tabular"
                  style={{
                    position: "absolute",
                    top: 6,
                    right: 6,
                    fontSize: 10,
                    fontWeight: 700,
                    color: "var(--teal-700)",
                    background: "rgba(255, 255, 255, 0.9)",
                    padding: "2px 6px",
                    borderRadius: "var(--r-sm)",
                  }}
                >
                  {PHP(p.price)}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Right Pane - Cart */}
        <div style={{ width: 320, display: "flex", flexDirection: "column", background: "var(--ink-50)" }}>
          <div
            style={{
              padding: "12px 16px",
              borderBottom: "1px solid var(--border)",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <div>
              <div style={{ fontSize: 16, fontWeight: 700, color: "var(--ink-900)" }}>
                {T("Current Sale", "Kasalukuyang Benta", lang)}
              </div>
              <div style={{ fontSize: 12, color: "var(--ink-500)" }}>
                TXN #00184 · {cart.length} {T("items", "item", lang)}
              </div>
            </div>
            <button
              style={{
                padding: "6px 10px",
                borderRadius: "var(--r-md)",
                border: "1px solid var(--red-500)",
                background: "transparent",
                color: "var(--red-500)",
                fontSize: 11,
                fontWeight: 700,
                cursor: "pointer",
                fontFamily: "inherit",
              }}
            >
              Clear
            </button>
          </div>

          {/* Cart Items */}
          <div style={{ flex: 1, overflowY: "auto" }}>
            {cart.map((item, i) => (
              <div
                key={item.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  padding: "12px 16px",
                  borderBottom: "1px solid var(--border)",
                  background: "#fff",
                }}
              >
                <div
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: "var(--r-md)",
                    background: tileBg(item),
                    display: "grid",
                    placeItems: "center",
                    flexShrink: 0,
                  }}
                >
                  <ProductGlyph p={item} size={28} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: "var(--ink-900)" }}>{item.name}</div>
                  <div style={{ fontSize: 11, color: "var(--ink-500)" }}>
                    {PHP(item.price)} × {item.qty}
                  </div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <button
                    style={{
                      width: 28,
                      height: 28,
                      borderRadius: "var(--r-sm)",
                      border: "1px solid var(--border-strong)",
                      background: "#fff",
                      display: "grid",
                      placeItems: "center",
                      cursor: "pointer",
                    }}
                  >
                    <Icon name="minus" size={14} />
                  </button>
                  <span className="tabular" style={{ fontSize: 14, fontWeight: 700, minWidth: 20, textAlign: "center" }}>
                    {item.qty}
                  </span>
                  <button
                    style={{
                      width: 28,
                      height: 28,
                      borderRadius: "var(--r-sm)",
                      border: 0,
                      background: "var(--teal-600)",
                      color: "#fff",
                      display: "grid",
                      placeItems: "center",
                      cursor: "pointer",
                    }}
                  >
                    <Icon name="plus" size={14} />
                  </button>
                </div>
                <Money value={item.qty * item.price} size={14} weight={700} />
              </div>
            ))}
          </div>

          {/* Cart Footer */}
          <div style={{ padding: 16, borderTop: "1px solid var(--border)", background: "#fff" }}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "baseline",
                marginBottom: 12,
              }}
            >
              <span style={{ fontSize: 14, color: "var(--ink-600)" }}>{T("Subtotal", "Subtotal", lang)}</span>
              <Money value={total} size={24} weight={800} color="var(--ink-900)" />
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button
                style={{
                  flex: 1,
                  height: 48,
                  borderRadius: "var(--r-md)",
                  border: "1.5px solid var(--border-strong)",
                  background: "#fff",
                  color: "var(--ink-700)",
                  fontSize: 13,
                  fontWeight: 700,
                  cursor: "pointer",
                  fontFamily: "inherit",
                }}
              >
                {T("Park", "Park", lang)}
              </button>
              <button
                style={{
                  flex: 2,
                  height: 48,
                  borderRadius: "var(--r-md)",
                  border: 0,
                  background: "linear-gradient(180deg, var(--teal-600) 0%, var(--teal-700) 100%)",
                  color: "#fff",
                  fontSize: 14,
                  fontWeight: 800,
                  cursor: "pointer",
                  fontFamily: "inherit",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 8,
                  boxShadow: "0 4px 12px rgba(13, 122, 114, 0.3)",
                }}
              >
                {T("Charge", "Bayad", lang)} · {PHP(total)}
              </button>
            </div>
          </div>
        </div>
      </div>
    </TabletShell>
  );
}

export function ProOwnerDashboard({ lang = "en" }: { lang?: string }) {
  const lanes = [
    { id: 1, cashier: "Maria C.", status: "active", txn: 184, total: 1247.5 },
    { id: 2, cashier: "Juan D.", status: "active", txn: 92, total: 842.0 },
    { id: 3, cashier: null, status: "idle", txn: 0, total: 0 },
  ];

  return (
    <PhoneShell statusBar="light">
      <AppBar variant="dark" title={T("Owner View", "Owner View", lang)} subtitle="Aling Nena Mini-Mart">
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 6, marginTop: 12 }}>
          <Kpi label={T("Today", "Ngayon", lang)} value="₱4,847" delta="↑ 12%" />
          <Kpi label={T("Active lanes", "Aktibong lane", lang)} value="2/3" accent="var(--green-500)" />
          <Kpi label={T("Transactions", "Transaksyon", lang)} value="276" />
        </div>
      </AppBar>

      <div style={{ flex: 1, overflowY: "auto", background: "var(--ink-100)", padding: 12 }}>
        <Eyebrow style={{ marginBottom: 10 }}>{T("Active Lanes", "Mga Lane", lang)}</Eyebrow>
        {lanes.map((lane) => (
          <div
            key={lane.id}
            className="wp-card"
            style={{
              padding: 14,
              marginBottom: 10,
              display: "flex",
              alignItems: "center",
              gap: 12,
            }}
          >
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: "var(--r-md)",
                background: lane.status === "active" ? "var(--teal-100)" : "var(--ink-100)",
                color: lane.status === "active" ? "var(--teal-700)" : "var(--ink-400)",
                display: "grid",
                placeItems: "center",
                fontSize: 18,
                fontWeight: 800,
              }}
            >
              {lane.id}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: 14, fontWeight: 700, color: "var(--ink-900)" }}>
                  Lane {lane.id}
                </span>
                <span
                  style={{
                    fontSize: 10,
                    fontWeight: 700,
                    padding: "2px 6px",
                    borderRadius: "var(--r-pill)",
                    background: lane.status === "active" ? "rgba(34, 197, 94, 0.15)" : "var(--ink-100)",
                    color: lane.status === "active" ? "var(--green-600)" : "var(--ink-400)",
                  }}
                >
                  {lane.status === "active" ? "ACTIVE" : "IDLE"}
                </span>
              </div>
              <div style={{ fontSize: 12, color: "var(--ink-500)", marginTop: 2 }}>
                {lane.cashier || "No cashier"}
                {lane.txn > 0 && ` · ${lane.txn} TXN`}
              </div>
            </div>
            {lane.total > 0 && <Money value={lane.total} size={16} weight={700} />}
          </div>
        ))}

        <Eyebrow style={{ marginTop: 16, marginBottom: 10 }}>{T("Quick Actions", "Mabilisang Aksyon", lang)}</Eyebrow>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          {[
            { icon: "box", label: T("Inventory", "Inventory", lang), color: "var(--amber-500)" },
            { icon: "trend", label: T("Reports", "Ulat", lang), color: "var(--blue-500)" },
            { icon: "utang", label: T("Credit/Utang", "Utang", lang), color: "var(--teal-500)" },
            { icon: "cash", label: T("Cash count", "Bilang ng cash", lang), color: "var(--green-500)" },
          ].map((action) => (
            <button
              key={action.label}
              className="wp-card"
              style={{
                padding: 16,
                display: "flex",
                alignItems: "center",
                gap: 12,
                cursor: "pointer",
                border: 0,
                fontFamily: "inherit",
                textAlign: "left",
              }}
            >
              <div
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: "var(--r-md)",
                  background: action.color,
                  color: "#fff",
                  display: "grid",
                  placeItems: "center",
                }}
              >
                <Icon name={action.icon} size={20} />
              </div>
              <span style={{ fontSize: 13, fontWeight: 600, color: "var(--ink-700)" }}>{action.label}</span>
            </button>
          ))}
        </div>
      </div>

      <BottomTabs
        active="home"
        onChange={() => {}}
        tabs={[
          { id: "home", icon: "trend", label: T("Dashboard", "Dashboard", lang) },
          { id: "lanes", icon: "cart", label: "Lanes" },
          { id: "stock", icon: "box", label: "Stock" },
          { id: "more", icon: "menu", label: T("More", "Iba pa", lang) },
        ]}
      />
    </PhoneShell>
  );
}

export function ProShiftLogin({ lang = "en" }: { lang?: string }) {
  const cashiers = [
    { id: 1, name: "Maria C.", avatar: "MC", active: true },
    { id: 2, name: "Juan D.", avatar: "JD", active: false },
    { id: 3, name: "Ana S.", avatar: "AS", active: false },
  ];

  return (
    <TabletShell>
      <div
        style={{
          flex: 1,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(135deg, var(--teal-800) 0%, var(--teal-900) 100%)",
        }}
      >
        <div
          style={{
            width: 400,
            background: "#fff",
            borderRadius: "var(--r-xl)",
            padding: 32,
            boxShadow: "0 20px 60px rgba(0, 0, 0, 0.3)",
          }}
        >
          <div style={{ textAlign: "center", marginBottom: 24 }}>
            <div
              style={{
                width: 64,
                height: 64,
                margin: "0 auto 16px",
                borderRadius: "var(--r-lg)",
                background: "var(--teal-100)",
                display: "grid",
                placeItems: "center",
              }}
            >
              <span style={{ fontSize: 28, fontWeight: 800, color: "var(--teal-700)" }}>S</span>
            </div>
            <h2 style={{ fontSize: 22, fontWeight: 700, color: "var(--ink-900)", margin: 0 }}>
              {T("Start Shift", "Simulan ang Shift", lang)}
            </h2>
            <p style={{ fontSize: 14, color: "var(--ink-500)", marginTop: 4 }}>Lane 2 · Aling Nena Mini-Mart</p>
          </div>

          <Eyebrow style={{ marginBottom: 12 }}>{T("Select Cashier", "Piliin ang Cashier", lang)}</Eyebrow>
          <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 24 }}>
            {cashiers.map((c) => (
              <button
                key={c.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  padding: "12px 16px",
                  borderRadius: "var(--r-md)",
                  border: c.active ? "2px solid var(--teal-600)" : "1px solid var(--border-strong)",
                  background: c.active ? "var(--teal-50)" : "#fff",
                  cursor: "pointer",
                  fontFamily: "inherit",
                }}
              >
                <div
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 20,
                    background: c.active ? "var(--teal-600)" : "var(--ink-200)",
                    color: c.active ? "#fff" : "var(--ink-600)",
                    display: "grid",
                    placeItems: "center",
                    fontSize: 14,
                    fontWeight: 700,
                  }}
                >
                  {c.avatar}
                </div>
                <span style={{ flex: 1, textAlign: "left", fontSize: 15, fontWeight: 600, color: "var(--ink-900)" }}>
                  {c.name}
                </span>
                {c.active && (
                  <div
                    style={{
                      width: 20,
                      height: 20,
                      borderRadius: 10,
                      background: "var(--teal-600)",
                      color: "#fff",
                      display: "grid",
                      placeItems: "center",
                    }}
                  >
                    <Icon name="check" size={12} stroke={3} />
                  </div>
                )}
              </button>
            ))}
          </div>

          <Eyebrow style={{ marginBottom: 12 }}>{T("Enter PIN", "I-type ang PIN", lang)}</Eyebrow>
          <div
            style={{
              display: "flex",
              justifyContent: "center",
              gap: 12,
              marginBottom: 24,
            }}
          >
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                style={{
                  width: 48,
                  height: 56,
                  borderRadius: "var(--r-md)",
                  border: "2px solid var(--border-strong)",
                  background: i <= 2 ? "var(--ink-100)" : "#fff",
                  display: "grid",
                  placeItems: "center",
                  fontSize: 24,
                  fontWeight: 700,
                  color: "var(--ink-900)",
                }}
              >
                {i <= 2 ? "●" : ""}
              </div>
            ))}
          </div>

          <button
            style={{
              width: "100%",
              height: 52,
              borderRadius: "var(--r-md)",
              border: 0,
              background: "linear-gradient(180deg, var(--teal-600) 0%, var(--teal-700) 100%)",
              color: "#fff",
              fontSize: 16,
              fontWeight: 800,
              cursor: "pointer",
              fontFamily: "inherit",
              boxShadow: "0 4px 12px rgba(13, 122, 114, 0.3)",
            }}
          >
            {T("Start Shift", "Simulan", lang)} →
          </button>
        </div>
      </div>
    </TabletShell>
  );
}

// ═══════════════════════════════════════════════════════════════════
// Pro Tablet Inventory Management
// ═══════════════════════════════════════════════════════════════════
export function ProInventoryManagement({ lang = "en" }: { lang?: string }) {
  const inventory = CATALOG.map((p, i) => ({
    ...p,
    lastRestock: ["2 days ago", "Today", "5 days ago", "1 week ago", "3 days ago", "Today", "Yesterday", "4 days ago"][i % 8],
    trend: ["up", "stable", "down", "up", "stable", "up", "down", "stable"][i % 8] as "up" | "stable" | "down",
    cost: p.price * 0.65,
  }));

  const lowStock = inventory.filter(p => p.stock <= p.low).length;
  const totalValue = inventory.reduce((s, p) => s + p.stock * p.cost, 0);

  return (
    <TabletShell>
      <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
        {/* Left Sidebar */}
        <div style={{ width: 240, background: "var(--ink-900)", color: "#fff", display: "flex", flexDirection: "column" }}>
          <div style={{ padding: 20 }}>
            <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 4 }}>Inventory</div>
            <div style={{ fontSize: 12, opacity: 0.7 }}>Aling Nena Mini-Mart</div>
          </div>
          
          <div style={{ padding: "0 12px" }}>
            {[
              { icon: "box", label: "All Items", count: inventory.length, active: true },
              { icon: "bell", label: "Low Stock", count: lowStock, active: false },
              { icon: "trend", label: "Fast Moving", count: 12, active: false },
              { icon: "scan", label: "Scan Item", count: null, active: false },
            ].map((item) => (
              <button
                key={item.label}
                style={{
                  width: "100%",
                  padding: "12px 14px",
                  marginBottom: 4,
                  borderRadius: "var(--r-md)",
                  border: 0,
                  background: item.active ? "rgba(255, 255, 255, 0.15)" : "transparent",
                  color: "#fff",
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  cursor: "pointer",
                  fontFamily: "inherit",
                  textAlign: "left",
                }}
              >
                <Icon name={item.icon} size={18} />
                <span style={{ flex: 1, fontSize: 14, fontWeight: item.active ? 600 : 500 }}>{item.label}</span>
                {item.count !== null && (
                  <span style={{ fontSize: 12, opacity: 0.7 }}>{item.count}</span>
                )}
              </button>
            ))}
          </div>

          <div style={{ flex: 1 }} />

          <div style={{ padding: 16, borderTop: "1px solid rgba(255, 255, 255, 0.1)" }}>
            <div style={{ padding: 14, background: "rgba(255, 255, 255, 0.08)", borderRadius: "var(--r-md)" }}>
              <div style={{ fontSize: 11, opacity: 0.6, marginBottom: 4 }}>Total Stock Value</div>
              <div style={{ fontSize: 22, fontWeight: 800 }}>{PHP(totalValue)}</div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", background: "var(--ink-50)" }}>
          {/* Header */}
          <div style={{ padding: "16px 20px", background: "#fff", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", gap: 16 }}>
            <div
              style={{
                flex: 1,
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "10px 14px",
                background: "var(--ink-100)",
                borderRadius: "var(--r-md)",
              }}
            >
              <Icon name="search" size={18} style={{ color: "var(--ink-400)" }} />
              <span style={{ color: "var(--ink-500)", fontSize: 14 }}>Search products...</span>
            </div>
            <button
              style={{
                padding: "10px 16px",
                borderRadius: "var(--r-md)",
                border: 0,
                background: "var(--teal-700)",
                color: "#fff",
                fontSize: 13,
                fontWeight: 700,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: 6,
                fontFamily: "inherit",
              }}
            >
              <Icon name="plus" size={16} /> Add Item
            </button>
            <button
              style={{
                padding: "10px 16px",
                borderRadius: "var(--r-md)",
                border: "1px solid var(--border-strong)",
                background: "#fff",
                color: "var(--ink-700)",
                fontSize: 13,
                fontWeight: 600,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: 6,
                fontFamily: "inherit",
              }}
            >
              <Icon name="scan" size={16} /> Restock
            </button>
          </div>

          {/* Stats Row */}
          <div style={{ display: "flex", gap: 12, padding: 16 }}>
            {[
              { label: "Total SKUs", value: inventory.length.toString(), color: "var(--teal-600)" },
              { label: "Low Stock", value: lowStock.toString(), color: "var(--amber-500)" },
              { label: "Out of Stock", value: "1", color: "var(--red-500)" },
              { label: "Categories", value: "8", color: "var(--blue-500)" },
            ].map((stat) => (
              <div
                key={stat.label}
                style={{
                  flex: 1,
                  padding: 16,
                  background: "#fff",
                  borderRadius: "var(--r-md)",
                  borderLeft: `4px solid ${stat.color}`,
                }}
              >
                <div style={{ fontSize: 11, color: "var(--ink-500)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em" }}>{stat.label}</div>
                <div style={{ fontSize: 28, fontWeight: 800, color: "var(--ink-900)", marginTop: 4 }}>{stat.value}</div>
              </div>
            ))}
          </div>

          {/* Table */}
          <div style={{ flex: 1, margin: "0 16px 16px", background: "#fff", borderRadius: "var(--r-md)", overflow: "hidden", display: "flex", flexDirection: "column" }}>
            {/* Table Header */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "2fr 1fr 1fr 1fr 1fr 80px",
                gap: 12,
                padding: "12px 16px",
                background: "var(--ink-50)",
                borderBottom: "1px solid var(--border)",
                fontSize: 11,
                fontWeight: 700,
                color: "var(--ink-500)",
                textTransform: "uppercase",
                letterSpacing: "0.04em",
              }}
            >
              <span>Product</span>
              <span>Stock</span>
              <span>Price</span>
              <span>Cost</span>
              <span>Last Restock</span>
              <span>Action</span>
            </div>

            {/* Table Body */}
            <div style={{ flex: 1, overflowY: "auto" }}>
              {inventory.slice(0, 10).map((item, i) => {
                const low = item.stock <= item.low && item.low > 0;
                return (
                  <div
                    key={item.id}
                    style={{
                      display: "grid",
                      gridTemplateColumns: "2fr 1fr 1fr 1fr 1fr 80px",
                      gap: 12,
                      padding: "14px 16px",
                      alignItems: "center",
                      borderBottom: i < 9 ? "1px solid var(--border)" : "none",
                      background: low ? "rgba(254, 243, 199, 0.3)" : "#fff",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                      <div
                        style={{
                          width: 40,
                          height: 40,
                          borderRadius: "var(--r-md)",
                          background: tileBg(item),
                          display: "grid",
                          placeItems: "center",
                          flexShrink: 0,
                        }}
                      >
                        <ProductGlyph p={item} size={28} />
                      </div>
                      <div>
                        <div style={{ fontSize: 14, fontWeight: 600, color: "var(--ink-900)" }}>{item.name}</div>
                        <div style={{ fontSize: 11, color: "var(--ink-500)" }}>{item.cat}</div>
                      </div>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span className="tabular" style={{ fontSize: 14, fontWeight: 700, color: low ? "var(--amber-600)" : "var(--ink-900)" }}>
                        {item.stock}
                      </span>
                      {low && (
                        <span style={{ fontSize: 9, fontWeight: 700, padding: "2px 6px", background: "var(--amber-500)", color: "#fff", borderRadius: 4 }}>LOW</span>
                      )}
                    </div>
                    <span className="tabular" style={{ fontSize: 14, fontWeight: 600 }}>{PHP(item.price)}</span>
                    <span className="tabular" style={{ fontSize: 14, color: "var(--ink-500)" }}>{PHP(item.cost)}</span>
                    <span style={{ fontSize: 12, color: "var(--ink-500)" }}>{item.lastRestock}</span>
                    <button
                      style={{
                        padding: "6px 12px",
                        borderRadius: "var(--r-sm)",
                        border: "1px solid var(--teal-600)",
                        background: "var(--teal-50)",
                        color: "var(--teal-700)",
                        fontSize: 11,
                        fontWeight: 700,
                        cursor: "pointer",
                        fontFamily: "inherit",
                      }}
                    >
                      Edit
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </TabletShell>
  );
}

// ═══════════════════════════════════════════════════════════════════
// Pro Tablet Reports/Analytics
// ═══════════════════════════════════════════════════════════════════
export function ProReportsScreen({ lang = "en" }: { lang?: string }) {
  const hourlyData = [15, 28, 42, 65, 78, 92, 85, 72, 88, 95, 75, 58, 45, 52, 68, 82, 70, 55, 40, 25];
  const maxHour = Math.max(...hourlyData);
  
  const topProducts = [
    { name: "Bear Brand sachet", qty: 48, revenue: 576 },
    { name: "Marlboro stick", qty: 42, revenue: 336 },
    { name: "Coke Mismo 300ml", qty: 35, revenue: 875 },
    { name: "Pandesal", qty: 120, revenue: 360 },
    { name: "GLOBE load", qty: 18, revenue: 1845 },
  ];

  const paymentMix = [
    { method: "Cash", amount: 4250, pct: 62, color: "var(--green-500)" },
    { method: "GCash", amount: 1890, pct: 28, color: "#0066cc" },
    { method: "Credit/Utang", amount: 680, pct: 10, color: "var(--amber-500)" },
  ];

  return (
    <TabletShell>
      <div style={{ flex: 1, display: "flex", flexDirection: "column", background: "var(--ink-50)" }}>
        {/* Header */}
        <div style={{ padding: "16px 20px", background: "#fff", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <div style={{ fontSize: 20, fontWeight: 700, color: "var(--ink-900)" }}>Sales Report</div>
            <div style={{ fontSize: 13, color: "var(--ink-500)", marginTop: 2 }}>Tuesday, March 14, 2026 · Aling Nena Mini-Mart</div>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            {["Today", "Week", "Month", "Custom"].map((period, i) => (
              <button
                key={period}
                style={{
                  padding: "8px 16px",
                  borderRadius: "var(--r-md)",
                  border: i === 0 ? "none" : "1px solid var(--border-strong)",
                  background: i === 0 ? "var(--teal-700)" : "#fff",
                  color: i === 0 ? "#fff" : "var(--ink-600)",
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: "pointer",
                  fontFamily: "inherit",
                }}
              >
                {period}
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div style={{ flex: 1, padding: 16, overflowY: "auto" }}>
          {/* KPI Row */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 16 }}>
            {[
              { label: "Gross Sales", value: "₱6,820", delta: "+18%", deltaColor: "var(--green-600)", icon: "cash" },
              { label: "Transactions", value: "84", delta: "+12", deltaColor: "var(--green-600)", icon: "cart" },
              { label: "Avg. Ticket", value: "₱81.19", delta: "-₱3.20", deltaColor: "var(--red-500)", icon: "trend" },
              { label: "Items Sold", value: "247", delta: "+32", deltaColor: "var(--green-600)", icon: "box" },
            ].map((kpi) => (
              <div
                key={kpi.label}
                style={{
                  padding: 20,
                  background: "#fff",
                  borderRadius: "var(--r-lg)",
                  boxShadow: "0 1px 3px rgba(0, 0, 0, 0.06)",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
                  <div
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: "var(--r-md)",
                      background: "var(--teal-100)",
                      color: "var(--teal-700)",
                      display: "grid",
                      placeItems: "center",
                    }}
                  >
                    <Icon name={kpi.icon} size={18} />
                  </div>
                  <span style={{ fontSize: 12, fontWeight: 600, color: "var(--ink-500)", textTransform: "uppercase", letterSpacing: "0.04em" }}>{kpi.label}</span>
                </div>
                <div style={{ fontSize: 28, fontWeight: 800, color: "var(--ink-900)" }}>{kpi.value}</div>
                <div style={{ fontSize: 12, fontWeight: 700, color: kpi.deltaColor, marginTop: 4 }}>{kpi.delta} vs yesterday</div>
              </div>
            ))}
          </div>

          {/* Charts Row */}
          <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 16, marginBottom: 16 }}>
            {/* Hourly Sales Chart */}
            <div style={{ padding: 20, background: "#fff", borderRadius: "var(--r-lg)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                <div style={{ fontSize: 15, fontWeight: 700, color: "var(--ink-900)" }}>Sales by Hour</div>
                <div style={{ fontSize: 12, color: "var(--ink-500)" }}>Peak: 10-11 AM</div>
              </div>
              <div style={{ display: "flex", alignItems: "flex-end", gap: 4, height: 140, paddingBottom: 24, position: "relative" }}>
                {hourlyData.map((value, i) => (
                  <div
                    key={i}
                    style={{
                      flex: 1,
                      height: `${(value / maxHour) * 100}%`,
                      background: value === maxHour 
                        ? "linear-gradient(180deg, var(--amber-400) 0%, var(--amber-500) 100%)"
                        : "linear-gradient(180deg, var(--teal-400) 0%, var(--teal-600) 100%)",
                      borderRadius: "4px 4px 0 0",
                      position: "relative",
                    }}
                  >
                    {value === maxHour && (
                      <div style={{ position: "absolute", top: -20, left: "50%", transform: "translateX(-50%)", fontSize: 10, fontWeight: 700, color: "var(--amber-600)" }}>PEAK</div>
                    )}
                  </div>
                ))}
                {/* X-axis labels */}
                <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, display: "flex", justifyContent: "space-between", fontSize: 10, color: "var(--ink-400)" }}>
                  <span>6a</span>
                  <span>9a</span>
                  <span>12p</span>
                  <span>3p</span>
                  <span>6p</span>
                  <span>9p</span>
                </div>
              </div>
            </div>

            {/* Payment Mix */}
            <div style={{ padding: 20, background: "#fff", borderRadius: "var(--r-lg)" }}>
              <div style={{ fontSize: 15, fontWeight: 700, color: "var(--ink-900)", marginBottom: 16 }}>Payment Mix</div>
              
              {/* Progress bar */}
              <div style={{ height: 12, borderRadius: 6, overflow: "hidden", display: "flex", marginBottom: 20 }}>
                {paymentMix.map((p) => (
                  <div key={p.method} style={{ width: `${p.pct}%`, background: p.color }} />
                ))}
              </div>

              {/* Legend */}
              {paymentMix.map((p) => (
                <div key={p.method} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 0", borderBottom: "1px solid var(--border)" }}>
                  <div style={{ width: 10, height: 10, borderRadius: 5, background: p.color }} />
                  <span style={{ flex: 1, fontSize: 14, fontWeight: 600, color: "var(--ink-700)" }}>{p.method}</span>
                  <span style={{ fontSize: 12, color: "var(--ink-500)" }}>{p.pct}%</span>
                  <span className="tabular" style={{ fontSize: 14, fontWeight: 700 }}>{PHP(p.amount)}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Top Products */}
          <div style={{ padding: 20, background: "#fff", borderRadius: "var(--r-lg)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <div style={{ fontSize: 15, fontWeight: 700, color: "var(--ink-900)" }}>Top Selling Products</div>
              <button style={{ fontSize: 12, color: "var(--teal-700)", fontWeight: 600, background: "none", border: "none", cursor: "pointer" }}>View All →</button>
            </div>
            
            <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 12 }}>
              {topProducts.map((product, i) => (
                <div
                  key={product.name}
                  style={{
                    padding: 16,
                    background: "var(--ink-50)",
                    borderRadius: "var(--r-md)",
                    textAlign: "center",
                  }}
                >
                  <div style={{ width: 48, height: 48, margin: "0 auto 12px", background: "#fff", borderRadius: "var(--r-md)", display: "grid", placeItems: "center", fontSize: 20, fontWeight: 800, color: "var(--teal-700)" }}>
                    #{i + 1}
                  </div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: "var(--ink-900)", marginBottom: 4, lineHeight: 1.3 }}>{product.name}</div>
                  <div style={{ fontSize: 12, color: "var(--ink-500)" }}>{product.qty} sold</div>
                  <div className="tabular" style={{ fontSize: 15, fontWeight: 700, color: "var(--teal-700)", marginTop: 8 }}>{PHP(product.revenue)}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </TabletShell>
  );
}
