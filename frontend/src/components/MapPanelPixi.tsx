import React, { useEffect, useMemo, useRef, useState } from "react";
import * as PIXI from "pixi.js";

type Grid = { cols: number; rows: number; cell: number };

type Token = {
  id: string;
  label?: string;
  kind: "player" | "npc" | "object";
  x: number;
  y: number;
  size: number; // 1..6 (squares)
  owner_user_id?: string | null;
  color?: number | null;

  // optional fields (safe if your backend sends them)
  initiative?: number | null;
  vision_radius?: number | null;
  hp?: number | null;
  ac?: number | null;
};

type Props = {
  grid: Grid;
  mapImageUrl?: string;
  map_image_url?: string; // defensive
  tokens: Token[];
  members: any[];
  role: string;
  youUserId: string;
  onTokenMove: (tokenId: string, x: number, y: number) => void;
};

const clamp = (n: number, a: number, b: number) => Math.max(a, Math.min(b, n));

function fitWorldIntoView(
  world: PIXI.Container,
  viewW: number,
  viewH: number,
  worldW: number,
  worldH: number,
  pad = 24
) {
  const iw = Math.max(1, viewW - pad * 2);
  const ih = Math.max(1, viewH - pad * 2);

  const sx = iw / Math.max(1, worldW);
  const sy = ih / Math.max(1, worldH);
  const s = Math.max(0.05, Math.min(4, Math.min(sx, sy)));

  world.scale.set(s);
  world.x = (viewW - worldW * s) / 2;
  world.y = (viewH - worldH * s) / 2;
}

export default function MapPanelPixi({
  grid,
  tokens,
  members,
  role,
  youUserId,
  onTokenMove,
  mapImageUrl,
  map_image_url,
}: Props) {
  const wrapRef = useRef<HTMLDivElement | null>(null);

  const appRef = useRef<PIXI.Application | null>(null);
  const worldRef = useRef<PIXI.Container | null>(null);
  const bgRef = useRef<PIXI.Sprite | null>(null);
  const gridRef = useRef<PIXI.Graphics | null>(null);
  const tokenLayerRef = useRef<PIXI.Container | null>(null);

  const [imgStatus, setImgStatus] = useState<"idle" | "loading" | "ok" | "error">("idle");

  const mapUrl = (mapImageUrl || map_image_url || "").trim();

  const safeGrid = useMemo(() => {
    return {
      cols: clamp(Math.floor(grid?.cols ?? 20), 1, 50),
      rows: clamp(Math.floor(grid?.rows ?? 20), 1, 50),
      cell: clamp(Math.floor(grid?.cell ?? 32), 12, 128),
    };
  }, [grid]);

  const ownerNameById = useMemo(() => {
    const m = new Map<string, string>();
    for (const mem of members || []) {
      const id = (mem?.user_id || "").trim();
      const name = (mem?.name || "").trim();
      if (id) m.set(id, name || id);
    }
    return m;
  }, [members]);

  const canDrag = (t: Token) =>
    role === "dm" || ((t.owner_user_id || "").trim() && (t.owner_user_id || "").trim() === youUserId);

  // ---------- INIT PIXI ONCE ----------
  useEffect(() => {
    let cancelled = false;

    (async () => {
      const host = wrapRef.current;
      if (!host) return;

      const app = new PIXI.Application();
      appRef.current = app;

      // Pixi v8 init
      await app.init({
        backgroundAlpha: 0,
        antialias: true,
        resizeTo: host,
      });

      if (cancelled) return;

      host.appendChild(app.canvas);

      // world root
      const world = new PIXI.Container();
      worldRef.current = world;
      app.stage.addChild(world);

      // bg sprite
      const bg = new PIXI.Sprite(PIXI.Texture.EMPTY);
      bgRef.current = bg;
      world.addChild(bg);

      // grid graphics
      const gg = new PIXI.Graphics();
      gridRef.current = gg;
      world.addChild(gg);

      // token layer
      const tl = new PIXI.Container();
      tokenLayerRef.current = tl;
      world.addChild(tl);

      // initial fit (once)
      const worldW = safeGrid.cols * safeGrid.cell;
      const worldH = safeGrid.rows * safeGrid.cell;
      fitWorldIntoView(world, app.screen.width, app.screen.height, worldW, worldH, 24);

      // refit on resize (pixi resizeTo handles renderer size; we re-center world)
      const onTick = () => {
        if (!appRef.current || !worldRef.current) return;
        const w = safeGrid.cols * safeGrid.cell;
        const h = safeGrid.rows * safeGrid.cell;
        fitWorldIntoView(worldRef.current, app.screen.width, app.screen.height, w, h, 24);
      };
      app.ticker.add(onTick);

      return () => {
        app.ticker.remove(onTick);
      };
    })();

    return () => {
      cancelled = true;
      try {
        const app = appRef.current;
        if (app) {
          const host = wrapRef.current;
          if (host && app.canvas?.parentNode === host) host.removeChild(app.canvas);
          app.destroy(true);
        }
      } catch {}
      appRef.current = null;
      worldRef.current = null;
      bgRef.current = null;
      gridRef.current = null;
      tokenLayerRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---------- LOAD MAP IMAGE ----------
  useEffect(() => {
    const app = appRef.current;
    const world = worldRef.current;
    const bg = bgRef.current;
    if (!app || !world || !bg) return;

    const url = mapUrl;
    if (!url) {
      bg.texture = PIXI.Texture.EMPTY;
      setImgStatus("idle");
      return;
    }

    let cancelled = false;
    setImgStatus("loading");

    (async () => {
      try {
        const tex = await PIXI.Assets.load(url);
        if (cancelled) return;

        bg.texture = tex;
        bg.x = 0;
        bg.y = 0;
        bg.width = safeGrid.cols * safeGrid.cell;
        bg.height = safeGrid.rows * safeGrid.cell;
        bg.alpha = 0.95;

        setImgStatus("ok");

        fitWorldIntoView(
          world,
          app.screen.width,
          app.screen.height,
          safeGrid.cols * safeGrid.cell,
          safeGrid.rows * safeGrid.cell,
          24
        );
      } catch {
        if (cancelled) return;
        bg.texture = PIXI.Texture.EMPTY;
        setImgStatus("error");
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [mapUrl, safeGrid]);

  // ---------- DRAW GRID ----------
  useEffect(() => {
    const g = gridRef.current;
    if (!g) return;

    const { cols, rows, cell } = safeGrid;
    const w = cols * cell;
    const h = rows * cell;

    g.clear();

    const hasImg = !!mapUrl && imgStatus === "ok";
    g.rect(0, 0, w, h).fill({ color: 0x0b0f17, alpha: hasImg ? 0.18 : 0.7 });

    const line = 0x243244;
    const strong = 0x2e415c;

    for (let x = 0; x <= cols; x++) {
      const px = x * cell;
      const isStrong = x % 5 === 0;
      g.moveTo(px, 0);
      g.lineTo(px, h);
      g.stroke({ width: 1, color: isStrong ? strong : line, alpha: isStrong ? 0.55 : 0.35 });
    }

    for (let y = 0; y <= rows; y++) {
      const py = y * cell;
      const isStrong = y % 5 === 0;
      g.moveTo(0, py);
      g.lineTo(w, py);
      g.stroke({ width: 1, color: isStrong ? strong : line, alpha: isStrong ? 0.55 : 0.35 });
    }
  }, [safeGrid, mapUrl, imgStatus]);

  // ---------- TOKENS (render + drag) ----------
  useEffect(() => {
    const layer = tokenLayerRef.current;
    if (!layer) return;

    layer.removeChildren();

    const { cols, rows, cell } = safeGrid;

    // stack tokens on same square slightly offset so you can see them
    const stacks = new Map<string, Token[]>();
    for (const t of tokens || []) {
      const key = `${t.x},${t.y}`;
      const arr = stacks.get(key) || [];
      arr.push(t);
      stacks.set(key, arr);
    }

    const fanOffset = (i: number) => ({ dx: 6 * i, dy: 4 * i });
    const snap = (px: number) => Math.round(px / cell);

    const makeToken = (t: Token, stackIndex: number, stackSize: number) => {
      const sizeSquares = clamp(Math.floor(t.size || 1), 1, 6);
      const pxSize = sizeSquares * cell;

      const container = new PIXI.Container();

      const color = typeof t.color === "number" ? t.color : 0x4da3ff;
      const gfx = new PIXI.Graphics();
      gfx.roundRect(0, 0, pxSize, pxSize, 8);
      gfx.fill({ color, alpha: 0.9 });

      const label = new PIXI.Text({
        text: (t.label || t.id).slice(0, 10),
        style: new PIXI.TextStyle({ fontSize: 12, fill: 0xffffff, fontWeight: "600" }),
      });
      label.x = 8;
      label.y = 6;

      container.addChild(gfx);
      container.addChild(label);

      if (stackSize > 1 && stackIndex === stackSize - 1) {
        const badge = new PIXI.Graphics();
        badge.circle(pxSize - 10, 10, 9);
        badge.fill({ color: 0x000000, alpha: 0.55 });

        const txt = new PIXI.Text({
          text: `${stackSize}`,
          style: new PIXI.TextStyle({ fontSize: 12, fill: 0xffffff, fontWeight: "800" }),
        });
        txt.x = pxSize - 15;
        txt.y = 2;

        container.addChild(badge);
        container.addChild(txt);
      }

      const { dx, dy } = fanOffset(stackIndex);
      container.x = clamp(t.x, 0, cols - 1) * cell + dx;
      container.y = clamp(t.y, 0, rows - 1) * cell + dy;

      const draggable = canDrag(t);
      container.eventMode = "static";
      container.cursor = draggable ? "grab" : "default";

      if (!draggable) return container;

      let dragging = false;
      let offX = 0;
      let offY = 0;
      let moved = false;

      container.on("pointerdown", (e: PIXI.FederatedPointerEvent) => {
        dragging = true;
        moved = false;
        container.cursor = "grabbing";

        // keep dragged token on top
        layer.addChild(container);

        // IMPORTANT: use `layer` (never null) instead of container.parent (can be null)
        const p = e.getLocalPosition(layer);
        offX = p.x - container.x;
        offY = p.y - container.y;
      });

      container.on("pointermove", (e: PIXI.FederatedPointerEvent) => {
        if (!dragging) return;
        moved = true;
        const p = e.getLocalPosition(layer);
        container.x = p.x - offX;
        container.y = p.y - offY;
      });

      const finalize = () => {
        if (!dragging) return;
        dragging = false;
        container.cursor = "grab";

        const gx = clamp(snap(container.x), 0, cols - 1);
        const gy = clamp(snap(container.y), 0, rows - 1);

        const { dx: ndx, dy: ndy } = fanOffset(stackIndex);
        container.x = gx * cell + ndx;
        container.y = gy * cell + ndy;

        if (moved) onTokenMove(t.id, gx, gy);
      };

      container.on("pointerup", finalize);
      container.on("pointerupoutside", finalize);

      return container;
    };

    for (const arr of stacks.values()) {
      arr.forEach((t, idx) => layer.addChild(makeToken(t, idx, arr.length)));
    }
  }, [tokens, safeGrid, role, youUserId, onTokenMove]);

  const showPlaceholder = !mapUrl;
  const showError = !!mapUrl && imgStatus === "error";

  return (
    <div
      ref={wrapRef}
      className="mapCanvasWrap"
      style={{
        width: "100%",
        height: "100%",
        position: "relative",
        background: "#0b0f17",
        overflow: "hidden",
      }}
    >
      {showPlaceholder ? (
        <div
          style={{
            position: "absolute",
            inset: 0,
            zIndex: 5,
            display: "grid",
            placeContent: "center",
            textAlign: "center",
            pointerEvents: "none",
            background: "rgba(0,0,0,0.18)",
          }}
        >
          <div style={{ fontSize: 18, fontWeight: 800, opacity: 0.95 }}>Map Area</div>
          <div style={{ marginTop: 6, fontSize: 12, opacity: 0.72, maxWidth: 420, lineHeight: 1.35 }}>
            No map image loaded. DM can set a map image URL in controls (AI generation can be added later).
          </div>
        </div>
      ) : null}

      {showError ? (
        <div
          style={{
            position: "absolute",
            inset: 0,
            zIndex: 6,
            display: "grid",
            placeContent: "center",
            textAlign: "center",
            pointerEvents: "none",
            background: "rgba(0,0,0,0.3)",
          }}
        >
          <div style={{ fontSize: 16, fontWeight: 800, opacity: 0.95 }}>Map image failed to load</div>
          <div style={{ marginTop: 6, fontSize: 12, opacity: 0.75, maxWidth: 420, lineHeight: 1.35 }}>
            Try a direct image URL ending in .png or .jpg (some hosts block via CORS).
          </div>
        </div>
      ) : null}
    </div>
  );
}
