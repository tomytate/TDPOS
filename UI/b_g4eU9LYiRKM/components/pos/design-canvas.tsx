"use client";

import React, { useRef, useState, useEffect, useCallback } from "react";
import {
  ChevronLeft,
  ChevronRight,
  X,
  GripVertical,
  MoreHorizontal,
  Download,
  Maximize2,
  Menu,
  ZoomIn,
  ZoomOut,
  Maximize,
  Play,
  Pause,
} from "lucide-react";

// ─────────────────────────────────────────────────────────────
// Design Canvas Colors
// ─────────────────────────────────────────────────────────────
const DC = {
  bg: "#f8f6f3",
  grid: "rgba(0, 0, 0, 0.04)",
  title: "#1a1917",
  subtitle: "#78716c",
  label: "#57534e",
  font: "ui-sans-serif, system-ui, -apple-system, sans-serif",
};

// ─────────────────────────────────────────────────────────────
// Tier metadata — shared by nav, section headers, and tour
// ─────────────────────────────────────────────────────────────
export interface TierInfo {
  id: string;
  sectionId: string;
  letter: string;
  name: string;
  segment: string;
  color: string;
  bandFrom: string;
  bandTo: string;
  description: string;
  anchorArtboardId: string;
}

export const TIERS: TierInfo[] = [
  {
    id: "lite",
    sectionId: "tier-a-lite",
    letter: "A",
    name: "Lite",
    segment: "Sari-sari, Micro-stall",
    color: "#0d9488",
    bandFrom: "#0d9488",
    bandTo: "#f59e0b",
    description: "Warm teal + amber, photo tiles, phone-only",
    anchorArtboardId: "lite-sale",
  },
  {
    id: "pro",
    sectionId: "tier-b-pro",
    letter: "B",
    name: "Pro",
    segment: "Mini-mart (Alfamart-scale)",
    color: "#0f766e",
    bandFrom: "#0f766e",
    bandTo: "#475569",
    description: "Warm + slate, 2-pane tablet layouts",
    anchorArtboardId: "pro-tablet",
  },
  {
    id: "plus",
    sectionId: "tier-c-plus",
    letter: "C",
    name: "Plus",
    segment: "Convenience (7-11-scale)",
    color: "#475569",
    bandFrom: "#475569",
    bandTo: "#0f766e",
    description: "Cool pivot · slate primary, teal accent only",
    anchorArtboardId: "plus-handoff",
  },
  {
    id: "premium",
    sectionId: "tier-d-premium",
    letter: "D",
    name: "Premium",
    segment: "Supermarket",
    color: "#334155",
    bandFrom: "#334155",
    bandTo: "#0369a1",
    description: "Cool corporate · single accent · tabular",
    anchorArtboardId: "premium-counter",
  },
  {
    id: "enterprise",
    sectionId: "tier-e-enterprise",
    letter: "E",
    name: "Enterprise",
    segment: "Mall / Dept-store chain",
    color: "#1e293b",
    bandFrom: "#1e293b",
    bandTo: "#2563eb",
    description: "White, charcoal, sapphire accent · chart-heavy",
    anchorArtboardId: "enterprise-hq",
  },
];

// ─────────────────────────────────────────────────────────────
// Context for Canvas State
// ─────────────────────────────────────────────────────────────
interface CanvasContextType {
  zoom: number;
  setZoom: (z: number) => void;
  focusedArtboard: string | null;
  setFocusedArtboard: (id: string | null) => void;
  jumpToSection: (sectionId: string) => void;
  setJumpToSection: (fn: (sectionId: string) => void) => void;
  zoomIn: () => void;
  zoomOut: () => void;
  fitAll: () => void;
  resetView: () => void;
  setZoomCommands: (cmds: { zoomIn: () => void; zoomOut: () => void; fitAll: () => void; resetView: () => void }) => void;
}

const CanvasContext = React.createContext<CanvasContextType | null>(null);

// ─────────────────────────────────────────────────────────────
// Design Canvas Provider
// ─────────────────────────────────────────────────────────────
export function DesignCanvasProvider({ children }: { children: React.ReactNode }) {
  const [zoom, setZoom] = useState(1);
  const [focusedArtboard, setFocusedArtboard] = useState<string | null>(null);
  const jumpFnRef = useRef<(sectionId: string) => void>(() => {});
  const cmdsRef = useRef<{
    zoomIn: () => void;
    zoomOut: () => void;
    fitAll: () => void;
    resetView: () => void;
  }>({
    zoomIn: () => {},
    zoomOut: () => {},
    fitAll: () => {},
    resetView: () => {},
  });

  const value: CanvasContextType = {
    zoom,
    setZoom,
    focusedArtboard,
    setFocusedArtboard,
    jumpToSection: (id) => jumpFnRef.current(id),
    setJumpToSection: (fn) => {
      jumpFnRef.current = fn;
    },
    zoomIn: () => cmdsRef.current.zoomIn(),
    zoomOut: () => cmdsRef.current.zoomOut(),
    fitAll: () => cmdsRef.current.fitAll(),
    resetView: () => cmdsRef.current.resetView(),
    setZoomCommands: (cmds) => {
      cmdsRef.current = cmds;
    },
  };

  return <CanvasContext.Provider value={value}>{children}</CanvasContext.Provider>;
}

// ─────────────────────────────────────────────────────────────
// Design Canvas
// ─────────────────────────────────────────────────────────────
export function DesignCanvas({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: React.CSSProperties;
}) {
  const vpRef = useRef<HTMLDivElement>(null);
  const worldRef = useRef<HTMLDivElement>(null);
  const ctx = React.useContext(CanvasContext);

  const [transform, setTransform] = useState({ x: 60, y: 60, scale: 0.7 });
  const [isDragging, setIsDragging] = useState(false);
  const transformRef = useRef(transform);

  const apply = useCallback(
    (t: typeof transform) => {
      transformRef.current = t;
      setTransform(t);
      if (ctx) ctx.setZoom(t.scale);
      if (worldRef.current) {
        worldRef.current.style.transform = `translate(${t.x}px, ${t.y}px) scale(${t.scale})`;
        document.documentElement.style.setProperty("--dc-inv-zoom", String(1 / t.scale));
      }
    },
    [ctx],
  );

  // Mouse wheel zoom + pan
  useEffect(() => {
    const vp = vpRef.current;
    if (!vp) return;

    const onWheel = (e: WheelEvent) => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        const rect = vp.getBoundingClientRect();
        const mx = e.clientX - rect.left;
        const my = e.clientY - rect.top;

        const delta = e.deltaY > 0 ? 0.9 : 1.1;
        const t = transformRef.current;
        const newScale = Math.max(0.1, Math.min(3, t.scale * delta));

        const newX = mx - (mx - t.x) * (newScale / t.scale);
        const newY = my - (my - t.y) * (newScale / t.scale);

        apply({ x: newX, y: newY, scale: newScale });
      } else {
        const t = transformRef.current;
        apply({
          x: t.x - e.deltaX,
          y: t.y - e.deltaY,
          scale: t.scale,
        });
      }
    };

    vp.addEventListener("wheel", onWheel, { passive: false });
    return () => vp.removeEventListener("wheel", onWheel);
  }, [apply]);

  // Mouse drag pan
  const onPointerDown = (e: React.PointerEvent) => {
    if (e.target !== vpRef.current && e.target !== worldRef.current) return;

    setIsDragging(true);
    const startX = e.clientX;
    const startY = e.clientY;
    const startTx = transformRef.current.x;
    const startTy = transformRef.current.y;

    const onMove = (ev: PointerEvent) => {
      apply({
        x: startTx + (ev.clientX - startX),
        y: startTy + (ev.clientY - startY),
        scale: transformRef.current.scale,
      });
    };

    const onUp = () => {
      setIsDragging(false);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  };

  // ── Programmatic commands wired to Provider ───────────────
  const animateTo = useCallback(
    (target: { x: number; y: number; scale: number }, duration = 450) => {
      const start = { ...transformRef.current };
      const t0 = performance.now();
      const tick = (now: number) => {
        const k = Math.min(1, (now - t0) / duration);
        const e = 1 - Math.pow(1 - k, 3); // easeOutCubic
        apply({
          x: start.x + (target.x - start.x) * e,
          y: start.y + (target.y - start.y) * e,
          scale: start.scale + (target.scale - start.scale) * e,
        });
        if (k < 1) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    },
    [apply],
  );

  const jumpToSection = useCallback(
    (sectionId: string) => {
      const vp = vpRef.current;
      const world = worldRef.current;
      if (!vp || !world) return;

      const sec = world.querySelector<HTMLElement>(`[data-dc-section="${sectionId}"]`);
      if (!sec) return;

      const vpRect = vp.getBoundingClientRect();
      const secRect = sec.getBoundingClientRect();
      const t = transformRef.current;

      // Compute world-space top-left of the section
      const secWorldX = (secRect.left - vpRect.left - t.x) / t.scale;
      const secWorldY = (secRect.top - vpRect.top - t.y) / t.scale;

      // Pick a target scale that fits the section width nicely
      const desiredScale = Math.min(0.55, (vpRect.width - 160) / sec.offsetWidth);
      const finalScale = Math.max(0.25, desiredScale);

      const newX = vpRect.width * 0.5 - (secWorldX + sec.offsetWidth / 2) * finalScale;
      const newY = 80 - secWorldY * finalScale;

      animateTo({ x: newX, y: newY, scale: finalScale });
    },
    [animateTo],
  );

  const zoomIn = useCallback(() => {
    const vp = vpRef.current;
    if (!vp) return;
    const rect = vp.getBoundingClientRect();
    const cx = rect.width / 2;
    const cy = rect.height / 2;
    const t = transformRef.current;
    const ns = Math.min(3, t.scale * 1.2);
    const nx = cx - (cx - t.x) * (ns / t.scale);
    const ny = cy - (cy - t.y) * (ns / t.scale);
    animateTo({ x: nx, y: ny, scale: ns }, 200);
  }, [animateTo]);

  const zoomOut = useCallback(() => {
    const vp = vpRef.current;
    if (!vp) return;
    const rect = vp.getBoundingClientRect();
    const cx = rect.width / 2;
    const cy = rect.height / 2;
    const t = transformRef.current;
    const ns = Math.max(0.1, t.scale / 1.2);
    const nx = cx - (cx - t.x) * (ns / t.scale);
    const ny = cy - (cy - t.y) * (ns / t.scale);
    animateTo({ x: nx, y: ny, scale: ns }, 200);
  }, [animateTo]);

  const fitAll = useCallback(() => {
    const vp = vpRef.current;
    const world = worldRef.current;
    if (!vp || !world) return;
    const vpRect = vp.getBoundingClientRect();
    const w = world.scrollWidth;
    const h = world.scrollHeight;
    const scale = Math.min((vpRect.width - 80) / w, (vpRect.height - 80) / h, 1);
    const finalScale = Math.max(0.05, scale);
    animateTo({
      x: (vpRect.width - w * finalScale) / 2,
      y: 40,
      scale: finalScale,
    });
  }, [animateTo]);

  const resetView = useCallback(() => {
    animateTo({ x: 60, y: 60, scale: 0.7 });
  }, [animateTo]);

  // Register commands with provider + sync initial zoom display
  useEffect(() => {
    if (!ctx) return;
    ctx.setJumpToSection(jumpToSection);
    ctx.setZoomCommands({ zoomIn, zoomOut, fitAll, resetView });
    ctx.setZoom(transformRef.current.scale);
    document.documentElement.style.setProperty(
      "--dc-inv-zoom",
      String(1 / transformRef.current.scale),
    );
  }, [ctx, jumpToSection, zoomIn, zoomOut, fitAll, resetView]);

  const gridSvg = `url("data:image/svg+xml,%3Csvg width='120' height='120' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M120 0H0v120' fill='none' stroke='${encodeURIComponent(DC.grid)}' stroke-width='1'/%3E%3C/svg%3E")`;

  return (
    <div
      ref={vpRef}
      className="design-canvas"
      onPointerDown={onPointerDown}
      style={{
        height: "100vh",
        width: "100vw",
        background: DC.bg,
        overflow: "hidden",
        overscrollBehavior: "none",
        touchAction: "none",
        position: "relative",
        fontFamily: DC.font,
        boxSizing: "border-box",
        cursor: isDragging ? "grabbing" : "grab",
        ...style,
      }}
    >
      <div
        ref={worldRef}
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          transformOrigin: "0 0",
          willChange: "transform",
          width: "max-content",
          minWidth: "100%",
          minHeight: "100%",
          padding: "60px 0 80px",
          transform: `translate(${transform.x}px, ${transform.y}px) scale(${transform.scale})`,
        }}
      >
        <div
          style={{
            position: "absolute",
            inset: -6000,
            backgroundImage: gridSvg,
            backgroundSize: "120px 120px",
            pointerEvents: "none",
            zIndex: -1,
          }}
        />
        {children}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Cover Slide — Branded title at the start of the canvas
// ─────────────────────────────────────────────────────────────
export function DCCover() {
  return (
    <div
      data-dc-section="cover"
      style={{
        marginBottom: "calc(80px * var(--dc-inv-zoom, 1))",
        padding: "0 60px",
      }}
    >
      <div
        style={{
          width: 1280,
          height: 640,
          background: "#fff",
          borderRadius: 4,
          boxShadow: "0 1px 3px rgba(0,0,0,.08), 0 4px 16px rgba(0,0,0,.06)",
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
          position: "relative",
        }}
      >
        {/* Gradient band — the visual gradient from warm → cool */}
        <div
          style={{
            height: 6,
            background:
              "linear-gradient(90deg, #f59e0b 0%, #0d9488 22%, #475569 50%, #334155 75%, #2563eb 100%)",
          }}
        />

        <div style={{ flex: 1, display: "flex", padding: "56px 64px 48px" }}>
          {/* LEFT — Title */}
          <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
            <div>
              <div
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  letterSpacing: "0.18em",
                  color: "#78716c",
                  marginBottom: 28,
                }}
              >
                SUKI POS · DESIGN SYSTEM · 2025
              </div>
              <div
                style={{
                  fontSize: 64,
                  fontWeight: 700,
                  letterSpacing: -1.6,
                  lineHeight: 1.02,
                  color: "#0f172a",
                  marginBottom: 24,
                }}
              >
                One product family.
                <br />
                Five retail scales.
              </div>
              <div
                style={{
                  fontSize: 18,
                  lineHeight: 1.55,
                  color: "#57534e",
                  maxWidth: 560,
                }}
              >
                A point-of-sale ladder for Filipino retail — from the corner sari-sari to the mall
                department store. Same product DNA, visual mood that ramps from warm and cozy to cool
                corporate as the form factor grows.
              </div>
            </div>

            <div style={{ display: "flex", gap: 12, fontSize: 12, color: "#78716c" }}>
              <span>17 screens</span>
              <span style={{ opacity: 0.4 }}>·</span>
              <span>5 tiers</span>
              <span style={{ opacity: 0.4 }}>·</span>
              <span>Phone · Tablet · Counter · Kiosk · Desktop</span>
            </div>
          </div>

          {/* RIGHT — Tier ladder visual */}
          <div style={{ width: 480, paddingLeft: 56, display: "flex", flexDirection: "column", gap: 12 }}>
            {TIERS.map((t) => (
              <div
                key={t.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 16,
                  padding: 16,
                  borderRadius: 6,
                  background: "#fafaf9",
                  border: "1px solid rgba(0,0,0,0.04)",
                }}
              >
                <div
                  style={{
                    width: 4,
                    alignSelf: "stretch",
                    borderRadius: 2,
                    background: `linear-gradient(180deg, ${t.bandFrom} 0%, ${t.bandTo} 100%)`,
                  }}
                />
                <div
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 8,
                    background: t.color,
                    color: "#fff",
                    display: "grid",
                    placeItems: "center",
                    fontWeight: 800,
                    fontSize: 15,
                    flexShrink: 0,
                  }}
                >
                  {t.letter}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 15, fontWeight: 700, color: "#0f172a" }}>{t.name}</div>
                  <div style={{ fontSize: 12, color: "#78716c", marginTop: 2 }}>{t.segment}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Section
// ─────────────────────────────────────────────────────────────
export function DCSection({
  id,
  title,
  subtitle,
  tier,
  children,
  gap = 48,
}: {
  id?: string;
  title: string;
  subtitle?: string;
  tier?: string; // tier id for color band
  children: React.ReactNode;
  gap?: number;
}) {
  const tierInfo = TIERS.find((t) => t.id === tier);

  return (
    <div
      data-dc-section={id ?? title}
      style={{
        marginBottom: "calc(80px * var(--dc-inv-zoom, 1))",
        position: "relative",
      }}
    >
      <div style={{ padding: "0 60px" }}>
        <div className="dc-sectionhead" style={{ paddingBottom: 64, display: "flex", alignItems: "flex-start", gap: 18 }}>
          {tierInfo && (
            <div
              style={{
                width: 4,
                height: 64,
                marginTop: 4,
                borderRadius: 2,
                background: `linear-gradient(180deg, ${tierInfo.bandFrom} 0%, ${tierInfo.bandTo} 100%)`,
                flexShrink: 0,
              }}
            />
          )}
          <div>
            <div style={{ display: "flex", alignItems: "baseline", gap: 14 }}>
              {tierInfo && (
                <div
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    letterSpacing: "0.16em",
                    color: tierInfo.color,
                    background: `${tierInfo.color}10`,
                    padding: "4px 10px",
                    borderRadius: 4,
                  }}
                >
                  TIER {tierInfo.letter}
                </div>
              )}
              <div
                style={{
                  fontSize: 28,
                  fontWeight: 600,
                  color: DC.title,
                  letterSpacing: -0.4,
                }}
              >
                {title}
              </div>
            </div>
            {subtitle && (
              <div style={{ fontSize: 16, color: DC.subtitle, marginTop: 8 }}>{subtitle}</div>
            )}
          </div>
        </div>
      </div>
      <div
        style={{
          display: "flex",
          gap,
          padding: "0 60px",
          alignItems: "flex-start",
          width: "max-content",
        }}
      >
        {children}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Artboard
// ─────────────────────────────────────────────────────────────
export function DCArtboard({
  id,
  label,
  width = 360,
  height = 740,
  children,
  style,
}: {
  id?: string;
  label: string;
  width?: number;
  height?: number;
  children?: React.ReactNode;
  style?: React.CSSProperties;
}) {
  const ctx = React.useContext(CanvasContext);
  const artboardId = id ?? label;
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    const off = (e: PointerEvent) => {
      if (!menuRef.current?.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("pointerdown", off, true);
    return () => document.removeEventListener("pointerdown", off, true);
  }, [menuOpen]);

  return (
    <div data-dc-slot={artboardId} style={{ position: "relative", flexShrink: 0 }}>
      <div
        className="dc-header"
        style={{ color: DC.label }}
        onPointerDown={(e) => e.stopPropagation()}
      >
        <div className="dc-labelrow">
          <div className="dc-grip" title="Drag to reorder">
            <GripVertical size={13} />
          </div>
          <div
            className="dc-labeltext"
            onClick={() => ctx?.setFocusedArtboard(artboardId)}
            title="Click to focus"
          >
            <span style={{ fontSize: 15, fontWeight: 500, color: DC.label, lineHeight: 1 }}>
              {label}
            </span>
            <span style={{ fontSize: 11, color: "#a8a29e", marginLeft: 8 }}>
              {width} × {height}
            </span>
          </div>
        </div>
        <div className="dc-btns">
          <div ref={menuRef} style={{ position: "relative" }}>
            <button
              className="dc-kebab"
              title="More"
              onClick={() => setMenuOpen((o) => !o)}
            >
              <MoreHorizontal size={14} />
            </button>
            {menuOpen && (
              <div className="dc-menu" onPointerDown={(e) => e.stopPropagation()}>
                <button onClick={() => setMenuOpen(false)}>
                  <Download size={12} style={{ marginRight: 8 }} />
                  Download PNG
                </button>
                <button onClick={() => setMenuOpen(false)}>
                  <Download size={12} style={{ marginRight: 8 }} />
                  Download HTML
                </button>
              </div>
            )}
          </div>
          <button
            className="dc-expand"
            onClick={() => ctx?.setFocusedArtboard(artboardId)}
            title="Focus"
          >
            <Maximize2 size={12} />
          </button>
        </div>
      </div>
      <div
        className="dc-card"
        style={{
          borderRadius: 2,
          boxShadow: "0 1px 3px rgba(0,0,0,.08), 0 4px 16px rgba(0,0,0,.06)",
          overflow: "hidden",
          width,
          height,
          background: "#fff",
          ...style,
        }}
      >
        {children || (
          <div
            style={{
              height: "100%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#bbb",
              fontSize: 13,
              fontFamily: DC.font,
            }}
          >
            {artboardId}
          </div>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Focus Overlay
// ─────────────────────────────────────────────────────────────
export function DCFocusOverlay({
  artboards,
  children,
}: {
  artboards: { id: string; label: string; component: React.ReactNode }[];
  children: React.ReactNode;
}) {
  const ctx = React.useContext(CanvasContext);
  const focusedId = ctx?.focusedArtboard;
  const focusedIndex = artboards.findIndex((a) => a.id === focusedId);
  const focused = focusedIndex >= 0 ? artboards[focusedIndex] : null;

  useEffect(() => {
    if (!focused) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        ctx?.setFocusedArtboard(null);
      } else if (e.key === "ArrowLeft") {
        const prev = focusedIndex > 0 ? artboards[focusedIndex - 1] : artboards[artboards.length - 1];
        ctx?.setFocusedArtboard(prev.id);
      } else if (e.key === "ArrowRight") {
        const next = focusedIndex < artboards.length - 1 ? artboards[focusedIndex + 1] : artboards[0];
        ctx?.setFocusedArtboard(next.id);
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [focused, focusedIndex, artboards, ctx]);

  return (
    <>
      {children}
      {focused && (
        <div className="focus-overlay" onClick={() => ctx?.setFocusedArtboard(null)}>
          <div
            className="focus-card"
            onClick={(e) => e.stopPropagation()}
            style={{ position: "relative" }}
          >
            <button
              onClick={() => {
                const prev = focusedIndex > 0 ? artboards[focusedIndex - 1] : artboards[artboards.length - 1];
                ctx?.setFocusedArtboard(prev.id);
              }}
              style={{
                position: "absolute",
                left: -60,
                top: "50%",
                transform: "translateY(-50%)",
                width: 44,
                height: 44,
                borderRadius: 22,
                border: 0,
                background: "rgba(255, 255, 255, 0.9)",
                cursor: "pointer",
                display: "grid",
                placeItems: "center",
              }}
            >
              <ChevronLeft size={24} />
            </button>

            <div
              style={{
                borderRadius: 4,
                overflow: "hidden",
                boxShadow: "0 20px 60px rgba(0, 0, 0, 0.4)",
              }}
            >
              {focused.component}
            </div>

            <button
              onClick={() => {
                const next = focusedIndex < artboards.length - 1 ? artboards[focusedIndex + 1] : artboards[0];
                ctx?.setFocusedArtboard(next.id);
              }}
              style={{
                position: "absolute",
                right: -60,
                top: "50%",
                transform: "translateY(-50%)",
                width: 44,
                height: 44,
                borderRadius: 22,
                border: 0,
                background: "rgba(255, 255, 255, 0.9)",
                cursor: "pointer",
                display: "grid",
                placeItems: "center",
              }}
            >
              <ChevronRight size={24} />
            </button>

            <button
              onClick={() => ctx?.setFocusedArtboard(null)}
              style={{
                position: "absolute",
                top: -50,
                right: 0,
                width: 40,
                height: 40,
                borderRadius: 20,
                border: 0,
                background: "rgba(255, 255, 255, 0.9)",
                cursor: "pointer",
                display: "grid",
                placeItems: "center",
              }}
            >
              <X size={20} />
            </button>

            <div
              style={{
                position: "absolute",
                bottom: -44,
                left: "50%",
                transform: "translateX(-50%)",
                color: "#fff",
                fontSize: 14,
                fontWeight: 500,
                whiteSpace: "nowrap",
              }}
            >
              {focused.label}
              <span style={{ opacity: 0.5, marginLeft: 8 }}>
                {focusedIndex + 1} / {artboards.length}
              </span>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// ─────────────────────────────────────────────────────────────
// Tier Navigation Sidebar
// ─────────────────────────────────────────────────────────────
export function TierNavigation({
  activeTier,
  onSelectTier,
  open,
  onToggle,
}: {
  activeTier: string;
  onSelectTier: (id: string) => void;
  open: boolean;
  onToggle: () => void;
}) {
  const ctx = React.useContext(CanvasContext);

  const handleSelect = (tier: TierInfo) => {
    onSelectTier(tier.id);
    ctx?.jumpToSection(tier.sectionId);
    onToggle();
  };

  return (
    <>
      <button
        onClick={onToggle}
        style={{
          position: "fixed",
          top: 16,
          left: 16,
          zIndex: 150,
          width: 44,
          height: 44,
          borderRadius: 22,
          border: 0,
          background: "rgba(255, 255, 255, 0.92)",
          backdropFilter: "blur(12px)",
          boxShadow: "0 2px 12px rgba(0, 0, 0, 0.12), 0 0 0 1px rgba(0,0,0,0.04)",
          cursor: "pointer",
          display: "grid",
          placeItems: "center",
        }}
        aria-label="Toggle tier navigation"
      >
        <Menu size={20} color="#1a1917" />
      </button>

      <div className={`tier-nav ${open ? "open" : ""}`}>
        <div style={{ padding: "20px 20px 14px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: 7,
                background:
                  "linear-gradient(135deg, #0d9488 0%, #475569 60%, #2563eb 100%)",
                display: "grid",
                placeItems: "center",
                color: "#fff",
                fontWeight: 800,
                fontSize: 14,
              }}
            >
              S
            </div>
            <div>
              <div style={{ fontSize: 16, fontWeight: 700, color: DC.title, lineHeight: 1.1 }}>
                Suki POS
              </div>
              <div style={{ fontSize: 11, color: DC.subtitle, marginTop: 2 }}>Design System</div>
            </div>
          </div>
          <div
            style={{
              height: 4,
              borderRadius: 2,
              background:
                "linear-gradient(90deg, #f59e0b 0%, #0d9488 22%, #475569 50%, #334155 75%, #2563eb 100%)",
            }}
          />
        </div>

        <div
          style={{
            padding: "8px 12px 4px",
            fontSize: 10,
            fontWeight: 700,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            color: DC.subtitle,
          }}
        >
          Tier Ladder
        </div>

        {TIERS.map((tier) => (
          <button
            key={tier.id}
            className={`tier-nav-item ${activeTier === tier.id ? "active" : ""}`}
            onClick={() => handleSelect(tier)}
            aria-label={`Tier ${tier.letter} ${tier.name} ${tier.segment}`}
          >
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: 8,
                background: tier.color,
                color: "#fff",
                display: "grid",
                placeItems: "center",
                fontSize: 14,
                fontWeight: 800,
                flexShrink: 0,
              }}
            >
              {tier.letter}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: DC.title }}>{tier.name}</div>
              <div
                style={{
                  fontSize: 11,
                  color: DC.subtitle,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {tier.segment}
              </div>
            </div>
          </button>
        ))}

        <div style={{ padding: 16, marginTop: "auto" }}>
          <button
            onClick={() => {
              ctx?.jumpToSection("cover");
              onToggle();
            }}
            style={{
              width: "100%",
              padding: "10px 12px",
              borderRadius: 8,
              border: "1px solid rgba(0,0,0,0.08)",
              background: "#fff",
              fontSize: 12,
              fontWeight: 600,
              color: DC.title,
              cursor: "pointer",
              marginBottom: 12,
            }}
          >
            Back to overview
          </button>

          <div
            style={{
              padding: 14,
              background: "rgba(0, 0, 0, 0.04)",
              borderRadius: 8,
              fontSize: 12,
              color: DC.subtitle,
              lineHeight: 1.5,
            }}
          >
            <strong style={{ color: DC.title }}>Visual Gradient:</strong>
            <br />
            Warm DNA (A/B) → Cool pivot (C) → Corporate polish (D/E)
          </div>
        </div>
      </div>

      {open && (
        <div
          onClick={onToggle}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0, 0, 0, 0.3)",
            zIndex: 99,
          }}
        />
      )}
    </>
  );
}

// ─────────────────────────────────────────────────────────────
// Tour — auto-walk through anchor screens
// ─────────────────────────────────────────────────────────────
export function TourButton({ artboardIds }: { artboardIds: string[] }) {
  const ctx = React.useContext(CanvasContext);
  const [running, setRunning] = useState(false);
  const [step, setStep] = useState(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!running) return;
    if (step >= artboardIds.length) {
      setRunning(false);
      ctx?.setFocusedArtboard(null);
      setStep(0);
      return;
    }
    ctx?.setFocusedArtboard(artboardIds[step]);
    timerRef.current = setTimeout(() => setStep((s) => s + 1), 4000);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [running, step, artboardIds, ctx]);

  const start = () => {
    setStep(0);
    setRunning(true);
  };

  const stop = () => {
    setRunning(false);
    if (timerRef.current) clearTimeout(timerRef.current);
    ctx?.setFocusedArtboard(null);
  };

  return (
    <button
      onClick={running ? stop : start}
      style={{
        position: "fixed",
        top: 16,
        right: 16,
        zIndex: 150,
        height: 44,
        padding: "0 16px 0 14px",
        borderRadius: 22,
        border: 0,
        background: running ? "#1a1917" : "rgba(255, 255, 255, 0.92)",
        color: running ? "#fff" : "#1a1917",
        backdropFilter: "blur(12px)",
        boxShadow: "0 2px 12px rgba(0, 0, 0, 0.12), 0 0 0 1px rgba(0,0,0,0.04)",
        cursor: "pointer",
        display: "flex",
        alignItems: "center",
        gap: 8,
        fontSize: 13,
        fontWeight: 600,
      }}
    >
      {running ? <Pause size={16} /> : <Play size={16} />}
      {running ? "Stop tour" : "Auto-tour"}
    </button>
  );
}

// ─────────────────────────────────────────────────────────────
// Zoom Controls — actual buttons
// ─────────────────────────────────────────────────────────────
export function ZoomControls() {
  const ctx = React.useContext(CanvasContext);
  const zoom = ctx?.zoom ?? 1;

  const btn: React.CSSProperties = {
    width: 32,
    height: 32,
    borderRadius: 6,
    border: 0,
    background: "transparent",
    cursor: "pointer",
    display: "grid",
    placeItems: "center",
    color: "#1a1917",
  };

  return (
    <div
      style={{
        position: "fixed",
        bottom: 16,
        right: 16,
        zIndex: 100,
        display: "flex",
        alignItems: "center",
        gap: 4,
        padding: 4,
        background: "rgba(255, 255, 255, 0.92)",
        backdropFilter: "blur(12px)",
        borderRadius: 10,
        boxShadow: "0 2px 12px rgba(0, 0, 0, 0.12), 0 0 0 1px rgba(0,0,0,0.04)",
        fontFamily: DC.font,
      }}
    >
      <button style={btn} onClick={() => ctx?.zoomOut()} title="Zoom out" aria-label="Zoom out">
        <ZoomOut size={16} />
      </button>
      <button
        style={{
          ...btn,
          width: "auto",
          padding: "0 10px",
          fontSize: 12,
          fontWeight: 600,
          fontVariantNumeric: "tabular-nums",
        }}
        onClick={() => ctx?.resetView()}
        title="Reset to 70%"
      >
        {Math.round(zoom * 100)}%
      </button>
      <button style={btn} onClick={() => ctx?.zoomIn()} title="Zoom in" aria-label="Zoom in">
        <ZoomIn size={16} />
      </button>
      <div style={{ width: 1, height: 22, background: "rgba(0,0,0,0.08)", margin: "0 2px" }} />
      <button style={btn} onClick={() => ctx?.fitAll()} title="Fit all" aria-label="Fit all">
        <Maximize size={16} />
      </button>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Hint chip — bottom left
// ─────────────────────────────────────────────────────────────
export function CanvasHint() {
  return (
    <div
      style={{
        position: "fixed",
        bottom: 16,
        left: 16,
        zIndex: 100,
        padding: "8px 12px",
        background: "rgba(255, 255, 255, 0.92)",
        backdropFilter: "blur(12px)",
        borderRadius: 10,
        boxShadow: "0 2px 12px rgba(0, 0, 0, 0.12), 0 0 0 1px rgba(0,0,0,0.04)",
        fontFamily: DC.font,
        fontSize: 11,
        color: "#78716c",
        display: "flex",
        gap: 12,
        alignItems: "center",
      }}
    >
      <span>
        <strong style={{ color: "#1a1917" }}>Drag</strong> to pan
      </span>
      <span style={{ opacity: 0.4 }}>·</span>
      <span>
        <strong style={{ color: "#1a1917" }}>Ctrl+Scroll</strong> to zoom
      </span>
      <span style={{ opacity: 0.4 }}>·</span>
      <span>
        <strong style={{ color: "#1a1917" }}>Click</strong> a screen to focus
      </span>
    </div>
  );
}
