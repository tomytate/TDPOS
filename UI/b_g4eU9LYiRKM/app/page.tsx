"use client";

import React, { useState } from "react";
import {
  DesignCanvas,
  DesignCanvasProvider,
  DCSection,
  DCArtboard,
  DCFocusOverlay,
  DCCover,
  TierNavigation,
  TourButton,
  ZoomControls,
  CanvasHint,
} from "@/components/pos/design-canvas";

import {
  SukiProSale,
  SukiProCheckout,
  SukiProReceipt,
  SukiProInventory,
  SukiProEod,
} from "@/components/pos/tier-a-lite";

import {
  ProTabletPOS,
  ProOwnerDashboard,
  ProShiftLogin,
  ProInventoryManagement,
  ProReportsScreen,
} from "@/components/pos/tier-b-pro";

import {
  PlusShiftHandoff,
  PlusCounterTerminal,
  PlusManagerPhone,
} from "@/components/pos/tier-c-plus";

import {
  PremiumCounter,
  PremiumCFD,
  PremiumBackoffice,
} from "@/components/pos/tier-d-premium";

import {
  EnterpriseHQRollup,
  EnterpriseKiosk,
  EnterpriseReturns,
} from "@/components/pos/tier-e-enterprise";

export default function POSDesignCanvas() {
  const [activeTier, setActiveTier] = useState("lite");
  const [navOpen, setNavOpen] = useState(false);

  // All artboards for focus navigation (used by overlay arrow keys + tour)
  const allArtboards = [
    { id: "lite-sale", label: "Lite — Sale", component: <SukiProSale /> },
    { id: "lite-checkout", label: "Lite — Checkout", component: <SukiProCheckout /> },
    { id: "lite-receipt", label: "Lite — Receipt", component: <SukiProReceipt /> },
    { id: "lite-inventory", label: "Lite — Inventory", component: <SukiProInventory /> },
    { id: "lite-eod", label: "Lite — End of Day", component: <SukiProEod /> },

    { id: "pro-tablet", label: "Pro — Cashier Tablet", component: <ProTabletPOS /> },
    { id: "pro-owner", label: "Pro — Owner Dashboard", component: <ProOwnerDashboard /> },
    { id: "pro-login", label: "Pro — Shift Login", component: <ProShiftLogin /> },
    { id: "pro-inventory", label: "Pro — Inventory Management", component: <ProInventoryManagement /> },
    { id: "pro-reports", label: "Pro — Reports", component: <ProReportsScreen /> },

    { id: "plus-handoff", label: "Plus — Shift Handoff", component: <PlusShiftHandoff /> },
    { id: "plus-counter", label: "Plus — Counter Terminal", component: <PlusCounterTerminal /> },
    { id: "plus-mgr", label: "Plus — Manager Phone", component: <PlusManagerPhone /> },

    { id: "premium-counter", label: "Premium — Counter + Scale", component: <PremiumCounter /> },
    { id: "premium-cfd", label: "Premium — Customer Display", component: <PremiumCFD /> },
    { id: "premium-bo", label: "Premium — Backoffice", component: <PremiumBackoffice /> },

    { id: "enterprise-hq", label: "Enterprise — HQ Rollup", component: <EnterpriseHQRollup /> },
    { id: "enterprise-kiosk", label: "Enterprise — Self-Service Kiosk", component: <EnterpriseKiosk /> },
    { id: "enterprise-returns", label: "Enterprise — Returns Desk", component: <EnterpriseReturns /> },
  ];

  // The anchor moments per tier — used by Auto-tour
  const tourSequence = [
    "lite-sale",
    "pro-tablet",
    "plus-handoff",
    "premium-counter",
    "enterprise-hq",
  ];

  return (
    <DesignCanvasProvider>
      <TierNavigation
        activeTier={activeTier}
        onSelectTier={setActiveTier}
        open={navOpen}
        onToggle={() => setNavOpen(!navOpen)}
      />

      <TourButton artboardIds={tourSequence} />

      <DCFocusOverlay artboards={allArtboards}>
        <DesignCanvas>
          {/* Cover slide */}
          <DCCover />

          {/* TIER A — LITE */}
          <DCSection
            id="tier-a-lite"
            tier="lite"
            title="Lite (Suki Pro)"
            subtitle="Sari-sari / Micro-stall · Phone · Warm teal + amber, cozy photo tiles · Tingi shortcuts + utang ledger"
          >
            <DCArtboard id="lite-sale" label="Sale" width={1179} height={2665}>
              <SukiProSale />
            </DCArtboard>
            <DCArtboard id="lite-checkout" label="Checkout" width={1179} height={2665}>
              <SukiProCheckout />
            </DCArtboard>
            <DCArtboard id="lite-receipt" label="Receipt" width={1179} height={2665}>
              <SukiProReceipt />
            </DCArtboard>
            <DCArtboard id="lite-inventory" label="Inventory" width={1179} height={2665}>
              <SukiProInventory />
            </DCArtboard>
            <DCArtboard id="lite-eod" label="End of Day" width={1179} height={2665}>
              <SukiProEod />
            </DCArtboard>
          </DCSection>

          {/* TIER B — PRO */}
          <DCSection
            id="tier-b-pro"
            tier="pro"
            title="Pro"
            subtitle="Mini-mart (Alfamart-scale) · Phone (owner) + Tablet (cashier) · Multi-lane shift cashier login"
          >
            <DCArtboard id="pro-tablet" label="Cashier Tablet — 2-pane" width={1920} height={1200}>
              <ProTabletPOS />
            </DCArtboard>
            <DCArtboard id="pro-owner" label="Owner Phone Dashboard" width={1179} height={2665}>
              <ProOwnerDashboard />
            </DCArtboard>
            <DCArtboard id="pro-login" label="Shift Login (Tablet)" width={1920} height={1200}>
              <ProShiftLogin />
            </DCArtboard>
            <DCArtboard id="pro-inventory" label="Inventory Management (Tablet)" width={1920} height={1200}>
              <ProInventoryManagement />
            </DCArtboard>
            <DCArtboard id="pro-reports" label="Sales Reports (Tablet)" width={1920} height={1200}>
              <ProReportsScreen />
            </DCArtboard>
          </DCSection>

          {/* TIER C — PLUS · cool pivot */}
          <DCSection
            id="tier-c-plus"
            tier="plus"
            title="Plus  ·  cool pivot"
            subtitle="Convenience (7-11 scale) · Tablet + Counter Terminal · 24/7 shift handoff, hot-food expiry, bills/lottery"
          >
            <DCArtboard id="plus-handoff" label="24/7 Shift Handoff (Anchor)" width={1920} height={1200}>
              <PlusShiftHandoff />
            </DCArtboard>
            <DCArtboard id="plus-counter" label="Counter Terminal" width={1920} height={1200}>
              <PlusCounterTerminal />
            </DCArtboard>
            <DCArtboard id="plus-mgr" label="Manager Companion (Phone)" width={1179} height={2665}>
              <PlusManagerPhone />
            </DCArtboard>
          </DCSection>

          {/* TIER D — PREMIUM */}
          <DCSection
            id="tier-d-premium"
            tier="premium"
            title="Premium"
            subtitle="Supermarket · Counter + Scale + EMV + Customer-facing display · Weighted-PLU, deli, tabular everything"
          >
            <DCArtboard id="premium-counter" label="Counter + Scale + EMV (Anchor)" width={1920} height={1200}>
              <PremiumCounter />
            </DCArtboard>
            <DCArtboard id="premium-cfd" label="Customer-Facing Display" width={1920} height={1200}>
              <PremiumCFD />
            </DCArtboard>
            <DCArtboard id="premium-bo" label="Backoffice — Voids & Refunds" width={1920} height={1200}>
              <PremiumBackoffice />
            </DCArtboard>
          </DCSection>

          {/* TIER E — ENTERPRISE */}
          <DCSection
            id="tier-e-enterprise"
            tier="enterprise"
            title="Enterprise"
            subtitle="Mall / Dept-store chain · Cashier + Kiosk + Desktop + HQ Web · Multi-store rollup, returns/warranty, gift cards"
          >
            <DCArtboard id="enterprise-hq" label="HQ Multi-Store Rollup (Anchor)" width={1920} height={1200}>
              <EnterpriseHQRollup />
            </DCArtboard>
            <DCArtboard id="enterprise-kiosk" label="Self-Service Kiosk (Mall floor)" width={1179} height={2665}>
              <EnterpriseKiosk />
            </DCArtboard>
            <DCArtboard id="enterprise-returns" label="Returns / Warranty Desk" width={1920} height={1200}>
              <EnterpriseReturns />
            </DCArtboard>
          </DCSection>
        </DesignCanvas>
      </DCFocusOverlay>

      <ZoomControls />
      <CanvasHint />
    </DesignCanvasProvider>
  );
}
