import React, { useEffect, useMemo, useRef, useState } from "react";
import * as PIXI from "pixi.js";

type Grid = { cols: number; rows: number; cell: number };
type Lighting = { fog_enabled: boolean; ambient_radius: number; darkness: boolean };

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
  darkvision?: boolean | null;
  hp?: number | null;
  ac?: number | null;
};

type Props = {
  grid: Grid;
  lighting?: Lighting;
  mapImageUrl?: string;
  map_image_url?: string; // defensive
  tokens: Token[];
  members: any[];
  role: string;
  youUserId: string;
  onTokenMove: (tokenId: string, x: number, y: number) => void;
};

const clamp = (n: number, a: number, b: number) => Math.max(a, Math.min(b, n));

export default function MapPanelPixi({
  grid,
  tokens,
  members,
  role,
  youUserId,
  onTokenMove,
  mapImageUrl,
  map_image_url,
  lighting,
}: Props) {
  const hostRef = useRef<HTMLDivElement | null>(null);

  const appRef = useRef<PIXI.Application | null>(null);
  const worldRef = useRef<PIXI.Container | null>(null);
  const bgRef = useRef<PIXI.Sprite | null>(null);
  const gridRef = useRef<PIXI.Graphics | null>(null);
  const npcLayerRef = useRef<PIXI.Container | null>(null);
  const playerLayerRef = useRef<PIXI.Container | null>(null);
  const fogLayerRef = useRef<PIXI.Container | null>(null);
  const fogSpriteRef = useRef<PIXI.Sprite | null>(null);
  const fogCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const fogCtxRef = useRef<CanvasRenderingContext2D | null>(null);
  const revealCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const revealCtxRef = useRef<CanvasRenderingContext2D | null>(null);
  const discoveredCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const discoveredCtxRef = useRef<CanvasRenderingContext2D | null>(null);
  const fogKeyRef = useRef<string>("");
  const onTokenMoveRef = useRef(onTokenMove);
  const tokensRef = useRef(tokens);
  const tokenPosHashRef = useRef<string>("");
  const youUserIdRef = useRef(youUserId);
  const roleRef = useRef(role);
  const sizeHashRef = useRef<string>("");
  const fogConfigHashRef = useRef<string>("");
  const [, setTokenPosChanged] = useState(0);

  const [imgStatus, setImgStatus] = useState<"idle" | "loading" | "ok" | "error">("idle");
  const [showPlayerView, setShowPlayerView] = useState(false);
  const [posChangeCount, setPosChangeCount] = useState(0);
  const [sizeChangeCount, setSizeChangeCount] = useState(0);
  const [fogConfigChangeCount, setFogConfigChangeCount] = useState(0);
  
  // Keep the refs up to date
  useEffect(() => {
    onTokenMoveRef.current = onTokenMove;
    tokensRef.current = tokens;
    youUserIdRef.current = youUserId;
    roleRef.current = role;
  }, [onTokenMove, tokens, youUserId, role]);

  // Detect actual token position changes (not just array reference changes)
  useEffect(() => {
    if (!lighting?.fog_enabled) return;
    const newHash = tokens?.map(t => `${t.id}:${Math.round(t.x)},${Math.round(t.y)}`).join('|') || '';
    if (newHash !== tokenPosHashRef.current) {
      tokenPosHashRef.current = newHash;
      setPosChangeCount(c => c + 1);
    }
  }, [tokens, lighting?.fog_enabled]);

  const mapUrl = (mapImageUrl || map_image_url || "").trim();

  const safeGrid = useMemo(() => {
    return {
      cols: clamp(Math.floor(grid?.cols ?? 100), 1, 256),
      rows: clamp(Math.floor(grid?.rows ?? 100), 1, 256),
      cell: clamp(Math.floor(grid?.cell ?? 20), 12, 128),
    };
  }, [grid]);
  const worldW = safeGrid.cols * safeGrid.cell;
  const worldH = safeGrid.rows * safeGrid.cell;

  // Detect actual size changes (not just recalculations)
  useEffect(() => {
    const newSizeHash = `${worldW}x${worldH}`;
    if (newSizeHash !== sizeHashRef.current) {
      sizeHashRef.current = newSizeHash;
      setSizeChangeCount(c => c + 1);
    }
  }, [worldW, worldH]);

  // Detect actual fog config changes (not just object reference changes)
  useEffect(() => {
    const newFogHash = `${lighting?.fog_enabled}:${lighting?.darkness}:${lighting?.ambient_radius}`;
    if (newFogHash !== fogConfigHashRef.current) {
      fogConfigHashRef.current = newFogHash;
      setFogConfigChangeCount(c => c + 1);
    }
  }, [lighting?.fog_enabled, lighting?.darkness, lighting?.ambient_radius]);

  const ownerNameById = useMemo(() => {
    const m = new Map<string, string>();
    for (const mem of members || []) {
      const id = (mem?.user_id || "").trim();
      const name = (mem?.name || "").trim();
      if (id) m.set(id, name || id);
    }
    return m;
  }, [members]);

  const canDrag = (t: Token) => {
    const isDM = roleRef.current === "dm";
    const isOwner = (t.owner_user_id || "").trim() === youUserIdRef.current;
    return isDM || isOwner;
  };

  // ---------- INIT PIXI ONCE ----------
  useEffect(() => {
    let cancelled = false;
    let appLocal: PIXI.Application | null = null;

    (async () => {
      const host = hostRef.current;
      if (!host) return;

      const app = new PIXI.Application();
      appLocal = app;

      // Pixi v8 init
      await app.init({
        backgroundAlpha: 0,
        antialias: true,
        width: worldW,
        height: worldH,
      });

      if (cancelled) {
        app.destroy(true);
        return;
      }

      appRef.current = app;
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

      // token layers (order matters: NPCs at bottom, fog in middle, players on top so always visible)
      const npcLayer = new PIXI.Container();
      npcLayerRef.current = npcLayer;
      world.addChild(npcLayer);

      const fogLayer = new PIXI.Container();
      fogLayer.eventMode = "none";
      fogLayerRef.current = fogLayer;
      world.addChild(fogLayer);

      const playerLayer = new PIXI.Container();
      playerLayerRef.current = playerLayer;
      world.addChild(playerLayer);

      const fogCanvas = document.createElement("canvas");
      fogCanvas.width = Math.max(1, worldW);
      fogCanvas.height = Math.max(1, worldH);
      const fogCtx = fogCanvas.getContext("2d");

      const revealCanvas = document.createElement("canvas");
      revealCanvas.width = fogCanvas.width;
      revealCanvas.height = fogCanvas.height;
      const revealCtx = revealCanvas.getContext("2d");

      const discoveredCanvas = document.createElement("canvas");
      discoveredCanvas.width = fogCanvas.width;
      discoveredCanvas.height = fogCanvas.height;
      const discoveredCtx = discoveredCanvas.getContext("2d");

      fogCanvasRef.current = fogCanvas;
      fogCtxRef.current = fogCtx;
      revealCanvasRef.current = revealCanvas;
      revealCtxRef.current = revealCtx;
      discoveredCanvasRef.current = discoveredCanvas;
      discoveredCtxRef.current = discoveredCtx;

      const fogSprite = new PIXI.Sprite(PIXI.Texture.from(fogCanvas));
      fogSprite.eventMode = "none";
      fogSprite.alpha = 1;
      fogSpriteRef.current = fogSprite;
      fogLayer.addChild(fogSprite);
    })();

    return () => {
      cancelled = true;
      try {
        const app = appRef.current || appLocal;
        if (app) {
          const host = hostRef.current;
          if (host && app.canvas?.parentNode === host) host.removeChild(app.canvas);
          app.destroy(true);
        }
      } catch {}
      appRef.current = null;
      worldRef.current = null;
      bgRef.current = null;
      gridRef.current = null;
      npcLayerRef.current = null;
      playerLayerRef.current = null;
      fogLayerRef.current = null;
      fogSpriteRef.current = null;
      fogCanvasRef.current = null;
      fogCtxRef.current = null;
      revealCanvasRef.current = null;
      revealCtxRef.current = null;
      discoveredCanvasRef.current = null;
      discoveredCtxRef.current = null;
      fogKeyRef.current = "";
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const app = appRef.current;
    if (!app || !app.renderer) return;
    app.renderer.resize(Math.max(1, worldW), Math.max(1, worldH));
  }, [sizeChangeCount]);

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
    const npcLayer = npcLayerRef.current;
    const playerLayer = playerLayerRef.current;
    if (!npcLayer || !playerLayer) return;

    npcLayer.removeChildren();
    playerLayer.removeChildren();

    const { cols, rows, cell } = safeGrid;
    const tokenList = tokensRef.current || [];

    // stack tokens on same square slightly offset so you can see them
    const buildStacks = (list: Token[]) => {
      const stacks = new Map<string, Token[]>();
      for (const t of list) {
        const key = `${t.x},${t.y}`;
        const arr = stacks.get(key) || [];
        arr.push(t);
        stacks.set(key, arr);
      }
      return stacks;
    };

    const fanOffset = (i: number) => ({ dx: 6 * i, dy: 4 * i });
    const snap = (px: number) => Math.round(px / cell);

    const makeToken = (layer: PIXI.Container, t: Token, stackIndex: number, stackSize: number) => {
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

        if (moved) onTokenMoveRef.current(t.id, gx, gy);
      };

      container.on("pointerup", finalize);
      container.on("pointerupoutside", finalize);

      return container;
    };

    const npcTokens = (tokenList || []).filter((t) => t.kind !== "player");
    const playerTokens = (tokenList || []).filter((t) => t.kind === "player");

    const npcStacks = buildStacks(npcTokens);
    for (const arr of npcStacks.values()) {
      arr.forEach((t, idx) => npcLayer.addChild(makeToken(npcLayer, t, idx, arr.length)));
    }

    const playerStacks = buildStacks(playerTokens);
    for (const arr of playerStacks.values()) {
      arr.forEach((t, idx) => playerLayer.addChild(makeToken(playerLayer, t, idx, arr.length)));
    }
  }, [safeGrid, tokens.length, posChangeCount]);

  // ---------- FOG OF WAR - VISIBILITY TOGGLE ----------
  useEffect(() => {
    const fogLayer = fogLayerRef.current as PIXI.Container | null;
    if (!fogLayer) return;

    const fogEnabled = !!lighting?.fog_enabled;
    fogLayer.visible = fogEnabled;
  }, [lighting?.fog_enabled]);

  // ---------- FOG OF WAR - VISIBILITY TOGGLE ----------
  useEffect(() => {
    const fogLayer = fogLayerRef.current as PIXI.Container | null;
    if (!fogLayer) return;

    const fogEnabled = !!lighting?.fog_enabled;
    fogLayer.visible = fogEnabled;
  }, [lighting?.fog_enabled]);

  // ---------- FOG OF WAR - RENDER ON TOKEN MOVEMENT ----------
  useEffect(() => {
    const fogLayer = fogLayerRef.current as PIXI.Container | null;
    const fogSprite = fogSpriteRef.current as PIXI.Sprite | null;
    const fogCanvas = fogCanvasRef.current;
    const fogCtx = fogCtxRef.current;
    const revealCanvas = revealCanvasRef.current;
    const revealCtx = revealCtxRef.current;
    if (!fogLayer || !fogSprite || !fogCanvas || !fogCtx || !revealCanvas || !revealCtx) return;

    const fogEnabled = !!lighting?.fog_enabled;
    if (!fogEnabled) return;

    const { cols, rows, cell } = safeGrid;
    const w = cols * cell;
    const h = rows * cell;

    const fogKey = `${w}x${h}:${mapUrl}`;
    if (fogCanvas.width !== w || fogCanvas.height !== h || fogKeyRef.current !== fogKey) {
      fogCanvas.width = Math.max(1, w);
      fogCanvas.height = Math.max(1, h);
      revealCanvas.width = fogCanvas.width;
      revealCanvas.height = fogCanvas.height;
      if (discoveredCanvasRef.current) {
        discoveredCanvasRef.current.width = fogCanvas.width;
        discoveredCanvasRef.current.height = fogCanvas.height;
      }
      fogKeyRef.current = fogKey;
      fogSprite.width = w;
      fogSprite.height = h;
      revealCtx.clearRect(0, 0, w, h);
      if (discoveredCtxRef.current) discoveredCtxRef.current.clearRect(0, 0, w, h);
    }

    const fogAlpha = 0.95;

    const ambient = Math.max(0, Math.floor(lighting?.ambient_radius ?? 0));

    const holes: Array<{ x: number; y: number; r: number }> = [];
    // Only player tokens carve vision holes in fog; NPCs and objects stay hidden under fog
    for (const t of tokensRef.current || []) {
      if (t.kind !== "player") continue;

      const baseVision = Math.max(1, Math.floor(t.vision_radius ?? 6));
      const hasDarkvision = !!t.darkvision;
      let radiusCells = baseVision;
      if (ambient > 0) {
        if (lighting?.darkness) {
          radiusCells = hasDarkvision ? Math.max(baseVision, ambient) : Math.min(baseVision, ambient);
        } else {
          radiusCells = Math.max(baseVision, ambient);
        }
      } else if (lighting?.darkness && !hasDarkvision) {
        radiusCells = Math.max(1, Math.floor(baseVision / 2));
      }
      radiusCells = Math.max(1, Math.floor(radiusCells * 0.4));

      const sizeSquares = clamp(Math.floor(t.size || 1), 1, 6);
      const pxSize = sizeSquares * cell;
      const cx = clamp(t.x, 0, cols - 1) * cell + pxSize / 2;
      const cy = clamp(t.y, 0, rows - 1) * cell + pxSize / 2;
      const r = radiusCells * cell;

      holes.push({ x: cx, y: cy, r });
    }

    revealCtx.globalCompositeOperation = "source-over";
    revealCtx.fillStyle = "rgba(255,255,255,1)";
    revealCtx.clearRect(0, 0, w, h);
    for (const hole of holes) {
      revealCtx.beginPath();
      revealCtx.arc(hole.x, hole.y, hole.r, 0, Math.PI * 2);
      revealCtx.fill();
    }

    // Accumulate discovered areas in discovered canvas
    const discoveredCtx = discoveredCtxRef.current;
    if (discoveredCtx) {
      discoveredCtx.globalCompositeOperation = "source-over";
      discoveredCtx.fillStyle = "rgba(255,255,255,1)";
      for (const hole of holes) {
        discoveredCtx.beginPath();
        discoveredCtx.arc(hole.x, hole.y, hole.r, 0, Math.PI * 2);
        discoveredCtx.fill();
      }
    }

    // Render fog based on view mode
    const revealToUse = showPlayerView && discoveredCanvasRef.current ? discoveredCanvasRef.current : revealCanvas;

    fogCtx.globalCompositeOperation = "source-over";
    fogCtx.clearRect(0, 0, w, h);
    fogCtx.fillStyle = `rgba(5,7,11,${fogAlpha})`;
    fogCtx.fillRect(0, 0, w, h);
    fogCtx.globalCompositeOperation = "destination-out";
    fogCtx.drawImage(revealToUse, 0, 0);
    fogCtx.globalCompositeOperation = "source-over";

    const tex: any = fogSprite.texture;
    const source: any = tex?.source;
    if (!tex || !source || source.resource !== fogCanvas) {
      fogSprite.texture = PIXI.Texture.from(fogCanvas);
    } else if (typeof source.update === "function") {
      source.update();
    }
  }, [posChangeCount, fogConfigChangeCount, safeGrid, mapUrl, showPlayerView]);

  const showPlaceholder = !mapUrl;
  const showError = !!mapUrl && imgStatus === "error";

  return (
    <div
      ref={hostRef}
      style={{
        width: worldW,
        height: worldH,
        position: "relative",
        background: "#0b0f17",
        overflow: "auto",
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

      {role === "dm" && lighting?.fog_enabled ? (
        <div
          style={{
            position: "absolute",
            bottom: 16,
            right: 16,
            zIndex: 10,
            background: "rgba(0,0,0,0.7)",
            padding: "8px 12px",
            borderRadius: "6px",
            cursor: "pointer",
            userSelect: "none",
            fontSize: 12,
            fontWeight: 600,
            border: `2px solid ${showPlayerView ? "#4ade80" : "#888"}`,
            color: showPlayerView ? "#4ade80" : "#aaa",
          }}
          onClick={() => setShowPlayerView(!showPlayerView)}
          title="Toggle between full map and discovered areas only"
        >
          {showPlayerView ? "👁️ Player View" : "🗺️ Full Map"}
        </div>
      ) : null}
    </div>
  );
}
