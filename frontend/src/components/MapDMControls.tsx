import { useMemo, useState } from "react";
import type { GridState, Member, Token, TokenKind } from "../hooks/useRoomSocket";

type Props = {
  isDM: boolean;
  roomId: string;

  members: Member[];
  grid: GridState;
  mapImageUrl: string;
  tokens: Token[];

  updateGrid: (g: Partial<GridState>) => void;
  setMapImage: (url: string) => void;
  addToken: (t: Partial<Token>) => void;
  removeToken: (id: string) => void;
  updateToken: (id: string, patch: Partial<Token>) => void;
};

const kindOptions: TokenKind[] = ["player", "npc", "object"];

export default function MapDMControls(props: Props) {
  const { isDM, roomId, members, grid, mapImageUrl, tokens, updateGrid, setMapImage, addToken, removeToken, updateToken } = props;

  const players = useMemo(() => members.filter((m) => m.role === "player"), [members]);

  const [cols, setCols] = useState(String(grid.cols));
  const [rows, setRows] = useState(String(grid.rows));
  const [cell, setCell] = useState(String(grid.cell));

  const [img, setImg] = useState(mapImageUrl || "");

  // “AI Map Generator” (currently placeholder backend)
  const [prompt, setPrompt] = useState("Small cave entrance with a winding tunnel and a chamber.");
  const [theme, setTheme] = useState("Fantasy");
  const [genStatus, setGenStatus] = useState<string>("");

  // Token form
  const [newLabel, setNewLabel] = useState("Token");
  const [newKind, setNewKind] = useState<TokenKind>("npc");
  const [newOwner, setNewOwner] = useState<string>("");
  const [newX, setNewX] = useState("1");
  const [newY, setNewY] = useState("1");
  const [newSize, setNewSize] = useState("1");
  const [newColor, setNewColor] = useState("0x4da3ff");
  const [newHP, setNewHP] = useState("10");
  const [newAC, setNewAC] = useState("10");
  const [newInit, setNewInit] = useState("");
  const [newVision, setNewVision] = useState("6");

  if (!isDM) return null;

  const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n));
  const toInt = (s: string, d: number) => {
    const n = parseInt(String(s || ""), 10);
    return Number.isFinite(n) ? n : d;
  };
  const parseColor = (s: string) => {
    const v = (s || "").trim().toLowerCase();
    if (v.startsWith("0x")) return Number(v);
    if (v.startsWith("#")) return Number("0x" + v.slice(1));
    const n = Number(v);
    return Number.isFinite(n) ? n : 0x4da3ff;
  };

  const applyGrid = () => {
    updateGrid({
      cols: clamp(toInt(cols, grid.cols), 1, 50),
      rows: clamp(toInt(rows, grid.rows), 1, 50),
      cell: clamp(toInt(cell, grid.cell), 12, 128),
    });
  };

  const doSetMap = () => {
    const url = img.trim();
    setMapImage(url);
    // keep local input in sync
    setImg(url);
  };

  const doClearMap = () => {
    setImg("");
    setMapImage("");
  };

  const doGenerate = async () => {
    const rid = (roomId || "").trim();
    if (!rid) {
      setGenStatus("⚠ No roomId set.");
      return;
    }

    setGenStatus("Generating…");
    try {
      const res = await fetch(`/api/rooms/${encodeURIComponent(rid)}/map/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: (prompt || "").slice(0, 800),
          theme: (theme || "Fantasy").slice(0, 40),
          cols: clamp(toInt(cols, grid.cols), 1, 50),
          rows: clamp(toInt(rows, grid.rows), 1, 50),
          cell: clamp(toInt(cell, grid.cell), 12, 128),
        }),
      });

      if (!res.ok) {
        const text = await res.text().catch(() => "");
        setGenStatus(`⚠ ${res.status} ${res.statusText}${text ? ` — ${text}` : ""}`);
        return;
      }

      const data = await res.json();
      const url = (data?.image_url || data?.imageUrl || "").trim();

      if (!url) {
        setGenStatus("⚠ Server returned no image_url.");
        return;
      }

      // Setting the map image via WS keeps everyone in sync
      setImg(url);
      setMapImage(url);

      setGenStatus("✅ Map placeholder set.");
    } catch (e: any) {
      setGenStatus(`⚠ ${e?.message || String(e)}`);
    }
  };

  const doAdd = () => {
    const x = clamp(toInt(newX, 1), 0, grid.cols - 1);
    const y = clamp(toInt(newY, 1), 0, grid.rows - 1);
    const size = clamp(toInt(newSize, 1), 1, 6);

    const kind = newKind;
    addToken({
      label: (newLabel || "Token").slice(0, 16),
      kind,
      owner_user_id: newOwner || null,
      x,
      y,
      size,
      color: parseColor(newColor),
      initiative: newInit.trim() ? toInt(newInit, 0) : null,
      vision_radius: newVision.trim() ? toInt(newVision, 6) : null,
      hp: kind === "player" ? toInt(newHP, 10) : null,
      ac: kind === "player" ? toInt(newAC, 10) : null,
    });
  };

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        background: "rgba(11,15,23,0.92)",
        border: "1px solid #222",
        borderRadius: 12,
        padding: 12,
        overflow: "auto",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
        <b>DM Map Controls</b>
        <span style={{ fontSize: 12, opacity: 0.7 }}>Tokens: {tokens.length}</span>
      </div>

      {/* Grid */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginBottom: 10 }}>
        <label style={{ fontSize: 12, opacity: 0.8 }}>
          Cols (≤50)
          <input value={cols} onChange={(e) => setCols(e.target.value)} style={{ width: "100%" }} />
        </label>
        <label style={{ fontSize: 12, opacity: 0.8 }}>
          Rows (≤50)
          <input value={rows} onChange={(e) => setRows(e.target.value)} style={{ width: "100%" }} />
        </label>
        <label style={{ fontSize: 12, opacity: 0.8 }}>
          Cell
          <input value={cell} onChange={(e) => setCell(e.target.value)} style={{ width: "100%" }} />
        </label>
      </div>
      <button onClick={applyGrid} style={{ width: "100%", marginBottom: 12 }}>
        Apply Grid
      </button>

      {/* AI Map Generator (placeholder backend) */}
      <div style={{ marginBottom: 6 }}>
        <b>AI Map Generator</b>
      </div>
      <textarea
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        rows={3}
        style={{ width: "100%", resize: "vertical", marginBottom: 8 }}
      />
      <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
        <select value={theme} onChange={(e) => setTheme(e.target.value)} style={{ width: 120 }}>
          <option>Fantasy</option>
          <option>Dungeon</option>
          <option>City</option>
          <option>Forest</option>
          <option>Desert</option>
        </select>
        <button onClick={doGenerate} style={{ flex: 1 }}>
          Generate Map
        </button>
      </div>
      {genStatus ? <div style={{ fontSize: 12, opacity: 0.85, marginBottom: 12 }}>{genStatus}</div> : <div style={{ marginBottom: 12 }} />}

      {/* Map Image URL */}
      <div style={{ fontSize: 12, opacity: 0.8, marginBottom: 6 }}>Map Image URL</div>
      <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
        <input value={img} onChange={(e) => setImg(e.target.value)} placeholder="https://..." style={{ flex: 1 }} />
        <button onClick={doSetMap}>Set</button>
        <button onClick={doClearMap}>Clear</button>
      </div>

      {/* Add Token */}
      <div style={{ marginBottom: 6 }}>
        <b>Add Token</b>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
        <label style={{ fontSize: 12, opacity: 0.8 }}>
          Label
          <input value={newLabel} onChange={(e) => setNewLabel(e.target.value)} />
        </label>

        <label style={{ fontSize: 12, opacity: 0.8 }}>
          Kind
          <select value={newKind} onChange={(e) => setNewKind(e.target.value as any)}>
            {kindOptions.map((k) => (
              <option key={k} value={k}>
                {k}
              </option>
            ))}
          </select>
        </label>

        <label style={{ fontSize: 12, opacity: 0.8 }}>
          Owner (player)
          <select value={newOwner} onChange={(e) => setNewOwner(e.target.value)}>
            <option value="">(none)</option>
            {players.map((p) => (
              <option key={p.user_id} value={p.user_id}>
                {p.name}
              </option>
            ))}
          </select>
        </label>

        <label style={{ fontSize: 12, opacity: 0.8 }}>
          Size (1–6)
          <input value={newSize} onChange={(e) => setNewSize(e.target.value)} />
        </label>

        <label style={{ fontSize: 12, opacity: 0.8 }}>
          X
          <input value={newX} onChange={(e) => setNewX(e.target.value)} />
        </label>

        <label style={{ fontSize: 12, opacity: 0.8 }}>
          Y
          <input value={newY} onChange={(e) => setNewY(e.target.value)} />
        </label>

        <label style={{ fontSize: 12, opacity: 0.8 }}>
          Color (#RRGGBB or 0xRRGGBB)
          <input value={newColor} onChange={(e) => setNewColor(e.target.value)} />
        </label>

        <label style={{ fontSize: 12, opacity: 0.8 }}>
          Initiative
          <input value={newInit} onChange={(e) => setNewInit(e.target.value)} placeholder="(optional)" />
        </label>

        <label style={{ fontSize: 12, opacity: 0.8 }}>
          Vision radius
          <input value={newVision} onChange={(e) => setNewVision(e.target.value)} />
        </label>

        {newKind === "player" ? (
          <>
            <label style={{ fontSize: 12, opacity: 0.8 }}>
              HP
              <input value={newHP} onChange={(e) => setNewHP(e.target.value)} />
            </label>
            <label style={{ fontSize: 12, opacity: 0.8 }}>
              AC
              <input value={newAC} onChange={(e) => setNewAC(e.target.value)} />
            </label>
          </>
        ) : null}
      </div>

      <button onClick={doAdd} style={{ width: "100%", marginTop: 10, marginBottom: 12 }}>
        Add Token
      </button>

      <div style={{ marginBottom: 6 }}>
        <b>Tokens</b>
      </div>

      <div style={{ maxHeight: 280, overflow: "auto", display: "grid", gap: 8 }}>
        {tokens.map((t) => (
          <div key={t.id} style={{ border: "1px solid #222", borderRadius: 10, padding: 8 }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 8, alignItems: "center" }}>
              <input value={t.label || ""} onChange={(e) => updateToken(t.id, { label: e.target.value })} />
              <button onClick={() => removeToken(t.id)}>Remove</button>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginTop: 8 }}>
              <label style={{ fontSize: 12, opacity: 0.8 }}>
                Owner
                <select value={t.owner_user_id || ""} onChange={(e) => updateToken(t.id, { owner_user_id: e.target.value || null })}>
                  <option value="">(none)</option>
                  {players.map((p) => (
                    <option key={p.user_id} value={p.user_id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </label>

              <label style={{ fontSize: 12, opacity: 0.8 }}>
                Kind
                <select value={t.kind} onChange={(e) => updateToken(t.id, { kind: e.target.value as any, hp: null, ac: null })}>
                  {kindOptions.map((k) => (
                    <option key={k} value={k}>
                      {k}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <div style={{ fontSize: 11, opacity: 0.65, marginTop: 6 }}>
              id: {t.id} • pos: ({t.x},{t.y})
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
