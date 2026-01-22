import React, { useState, useCallback } from "react";

type Props = {
  connected: boolean;
  isDM: boolean;
  onGenerateNarration: (description: string, context: string, tone: string) => void;
  onGenerateMap: (description: string, style: string) => void;
};

type AISocialTone = "epic" | "mysterious" | "comedic" | "dark" | "hopeful";
type AIMapStyle = "fantasy dungeon" | "tavern" | "wilderness" | "city" | "cave" | "forest";

export default function AIPanel({
  connected,
  isDM,
  onGenerateNarration,
  onGenerateMap,
}: Props) {
  // Narration state
  const [sceneDesc, setSceneDesc] = useState("");
  const [sceneContext, setSceneContext] = useState("");
  const [narrativeTone, setNarrativeTone] = useState<AISocialTone>("epic");
  const [narrationLoading, setNarrationLoading] = useState(false);

  // Map generation state
  const [mapDesc, setMapDesc] = useState("");
  const [mapStyle, setMapStyle] = useState<AIMapStyle>("fantasy dungeon");
  const [mapLoading, setMapLoading] = useState(false);

  // Callbacks (must be before early return)
  const handleGenerateNarration = useCallback(() => {
    if (!sceneDesc.trim()) return;
    setNarrationLoading(true);
    onGenerateNarration(sceneDesc.trim(), sceneContext.trim(), narrativeTone);
    setTimeout(() => setNarrationLoading(false), 5000); // Reset after 5 seconds
  }, [sceneDesc, sceneContext, narrativeTone, onGenerateNarration]);

  const handleGenerateMap = useCallback(() => {
    if (!mapDesc.trim()) return;
    setMapLoading(true);
    onGenerateMap(mapDesc.trim(), mapStyle);
    setTimeout(() => setMapLoading(false), 10000); // Reset after 10 seconds
  }, [mapDesc, mapStyle, onGenerateMap]);

  if (!isDM || !connected) {
    return (
      <section className="panel aiPanel">
        <div style={{ fontSize: "12px", opacity: 0.7, marginTop: "10px" }}>
          {!connected ? "Connect to room to use AI" : "DM only feature"}
        </div>
      </section>
    );
  }

  return (
    <section className="panel aiPanel" style={{ marginBottom: 12 }}>
      <div style={{ fontSize: "14px", fontWeight: 600, marginBottom: "12px" }}>🤖 AI Dungeon Master</div>

      {/* Narration Section */}
      <div style={{ marginBottom: "16px", paddingBottom: "12px", borderBottom: "1px solid rgba(255,255,255,0.1)" }}>
        <div style={{ fontSize: "12px", fontWeight: 600, opacity: 0.9, marginBottom: "8px" }}>Scene Narration</div>

        <textarea
          value={sceneDesc}
          onChange={(e) => setSceneDesc(e.target.value)}
          placeholder="Describe the scene..."
          style={{
            width: "100%",
            height: "60px",
            padding: "8px",
            fontSize: "12px",
            marginBottom: "8px",
            resize: "vertical",
            backgroundColor: "rgba(0,0,0,0.3)",
            border: "1px solid rgba(255,255,255,0.2)",
            color: "#fff",
            fontFamily: "monospace",
          }}
        />

        <textarea
          value={sceneContext}
          onChange={(e) => setSceneContext(e.target.value)}
          placeholder="Optional context (lore, campaign notes)..."
          style={{
            width: "100%",
            height: "40px",
            padding: "8px",
            fontSize: "11px",
            marginBottom: "8px",
            resize: "vertical",
            backgroundColor: "rgba(0,0,0,0.3)",
            border: "1px solid rgba(255,255,255,0.1)",
            color: "#aaa",
            fontFamily: "monospace",
          }}
        />

        <div style={{ display: "flex", gap: "8px", alignItems: "center", marginBottom: "8px" }}>
          <label style={{ fontSize: "11px", opacity: 0.8 }}>
            Tone:
            <select
              value={narrativeTone}
              onChange={(e) => setNarrativeTone(e.target.value as AISocialTone)}
              style={{
                marginLeft: "4px",
                padding: "4px 6px",
                fontSize: "11px",
                backgroundColor: "rgba(0,0,0,0.4)",
                border: "1px solid rgba(255,255,255,0.2)",
                color: "#fff",
                cursor: "pointer",
              }}
            >
              <option value="epic">Epic</option>
              <option value="mysterious">Mysterious</option>
              <option value="comedic">Comedic</option>
              <option value="dark">Dark</option>
              <option value="hopeful">Hopeful</option>
            </select>
          </label>
        </div>

        <button
          onClick={handleGenerateNarration}
          disabled={narrationLoading || !sceneDesc.trim()}
          style={{
            width: "100%",
            padding: "8px",
            fontSize: "12px",
            fontWeight: 600,
            backgroundColor: narrationLoading ? "rgba(100,100,100,0.5)" : "rgba(74,172,128,0.7)",
            border: "1px solid rgba(74,172,128,0.9)",
            color: "#fff",
            cursor: narrationLoading ? "wait" : "pointer",
            borderRadius: "4px",
            transition: "all 0.2s",
          }}
        >
          {narrationLoading ? "✨ Generating..." : "✨ Generate Narration"}
        </button>
      </div>

      {/* Map Generation Section */}
      <div>
        <div style={{ fontSize: "12px", fontWeight: 600, opacity: 0.9, marginBottom: "8px" }}>Map Generation</div>

        <textarea
          value={mapDesc}
          onChange={(e) => setMapDesc(e.target.value)}
          placeholder="Describe the location..."
          style={{
            width: "100%",
            height: "60px",
            padding: "8px",
            fontSize: "12px",
            marginBottom: "8px",
            resize: "vertical",
            backgroundColor: "rgba(0,0,0,0.3)",
            border: "1px solid rgba(255,255,255,0.2)",
            color: "#fff",
            fontFamily: "monospace",
          }}
        />

        <div style={{ display: "flex", gap: "8px", alignItems: "center", marginBottom: "8px" }}>
          <label style={{ fontSize: "11px", opacity: 0.8 }}>
            Style:
            <select
              value={mapStyle}
              onChange={(e) => setMapStyle(e.target.value as AIMapStyle)}
              style={{
                marginLeft: "4px",
                padding: "4px 6px",
                fontSize: "11px",
                backgroundColor: "rgba(0,0,0,0.4)",
                border: "1px solid rgba(255,255,255,0.2)",
                color: "#fff",
                cursor: "pointer",
              }}
            >
              <option value="fantasy dungeon">Fantasy Dungeon</option>
              <option value="tavern">Tavern</option>
              <option value="wilderness">Wilderness</option>
              <option value="city">City</option>
              <option value="cave">Cave</option>
              <option value="forest">Forest</option>
            </select>
          </label>
        </div>

        <button
          onClick={handleGenerateMap}
          disabled={mapLoading || !mapDesc.trim()}
          style={{
            width: "100%",
            padding: "8px",
            fontSize: "12px",
            fontWeight: 600,
            backgroundColor: mapLoading ? "rgba(100,100,100,0.5)" : "rgba(74,160,172,0.7)",
            border: "1px solid rgba(74,160,172,0.9)",
            color: "#fff",
            cursor: mapLoading ? "wait" : "pointer",
            borderRadius: "4px",
            transition: "all 0.2s",
          }}
        >
          {mapLoading ? "🗺️ Generating..." : "🗺️ Generate Map"}
        </button>
      </div>

      <div style={{ fontSize: "10px", opacity: 0.6, marginTop: "12px", fontStyle: "italic" }}>
        💡 Requires OpenAI API key (ARCANE_OPENAI_API_KEY) configured on backend
      </div>
    </section>
  );
}
