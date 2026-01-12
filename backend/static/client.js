// dnd-console MVP client.js (drop-in)
// - Realtime chat + dice
// - DM control panel: lock, clear chat, kick, AI mode
// - AI narrator: auto-publish or DM preview with publish/discard
// - DM Scene Editor: templates + AI draft + save, broadcasts scene.update to all clients

let ws = null;
let locked = false;
let myRole = "player";
let pendingAiId = null;
let membersCache = [];

const $ = (id) => document.getElementById(id);
const DICE = ["d4","d6","d8","d10","d12","d20"];
const diceCounts = { d4:0, d6:0, d8:0, d10:0, d12:0, d20:0 };
const SCENE_TEMPLATES = [
  {
    id: "tavern",
    label: "Tavern: Warm but Watchful",
    title: "The Gilded Tankard",
    text:
      "A low ceiling traps the scent of spilled ale and woodsmoke. Lanternlight pools across scarred tables, and a fiddler’s tune stutters whenever the door opens. Behind the bar, a one-eyed proprietor polishes the same mug too carefully.\n\n" +
      "A cloaked courier keeps glancing at the party’s hands—counting rings, scars, and weapons. Near the hearth, dice clatter over a map inked with fresh red circles. Outside, rain taps the windows like impatient fingers.\n\n" +
      "Interactables: a sealed letter on the bar, the courier’s satchel, the marked map by the hearth.\n" +
      "Hook: someone here recognizes a party member… and isn’t happy about it."
  },
  {
    id: "forest",
    label: "Wilderness: Moonlit Forest Trail",
    title: "The Whispering Pines",
    text:
      "The forest breathes with you—needles sighing underfoot, distant owls calling in wary intervals. Moonlight threads through the pines, painting the path in silver bars. The air tastes faintly of sap and something metallic.\n\n" +
      "A broken wagon wheel lies half-buried in moss, and nearby, boot prints vanish as if the earth swallowed them. Farther ahead, a small stone cairn stands where no cairn should be, wrapped in twine and tiny bone charms.\n\n" +
      "Interactables: the wagon wreckage, the boot prints, the cairn with charms.\n" +
      "Hook: the party hears their names spoken softly from deeper in the trees."
  },
  {
    id: "dungeon",
    label: "Dungeon: Trapped Hallway",
    title: "The Hall of Quiet Teeth",
    text:
      "Stone walls sweat with cold damp. Your torchlight reveals narrow grooves in the floor—too deliberate to be age. The corridor is silent in the way a mouth becomes silent right before it bites.\n\n" +
      "Halfway down, a carved relief shows warriors celebrating… but their faces have been scratched away. The air is warmer near the far door, as if something alive is breathing on the other side.\n\n" +
      "Interactables: the floor grooves, the defaced relief, the warm door.\n" +
      "Hook: a faint click echoes behind the party—something just armed itself."
  },
  {
    id: "city",
    label: "City: Night Market Intrigue",
    title: "The Lantern Market",
    text:
      "Lanterns sway over crowded stalls, painting faces in shifting gold and crimson. Spices sting your nose. A street performer’s laughter masks a whispered argument nearby. Coins change hands quickly—and not always for goods.\n\n" +
      "A masked vendor offers a velvet box that seems heavier than it should be. Across the way, a constable pretends not to watch the party while watching them very closely. Overhead, a rooftop silhouette moves—then freezes when you look up.\n\n" +
      "Interactables: the velvet box, the constable’s attention, the rooftop silhouette.\n" +
      "Hook: a child slips a note into someone’s pocket and vanishes into the crowd."
  }
];

function setStatus(s) {
  $("status").textContent = s;
}

function escapeHtml(s) {
  return (s ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function enableControls(on) {
  $("sendBtn").disabled = !on;
  $("rollBtn").disabled = !on;
  $("narrateBtn").disabled = !on;
  

  const dmOn = on && myRole === "dm";

  if ($("lockBtn")) $("lockBtn").disabled = !dmOn;
  if ($("clearChatBtn")) $("clearChatBtn").disabled = !dmOn;
  if ($("setAiModeBtn")) $("setAiModeBtn").disabled = !dmOn;
  if ($("kickBtn")) $("kickBtn").disabled = !dmOn;
  if ($("saveSceneBtn")) $("saveSceneBtn").disabled = !dmOn;

  // Scene editor extras
  if ($("applyTemplateBtn")) $("applyTemplateBtn").disabled = !dmOn;
  if ($("aiDraftSceneBtn")) $("aiDraftSceneBtn").disabled = !dmOn;

  if ($("publishAiBtn")) $("publishAiBtn").disabled = !dmOn;
  if ($("discardAiBtn")) $("discardAiBtn").disabled = !dmOn;
  // Dice tray buttons
  if ($("rollSelectedBtn")) $("rollSelectedBtn").disabled = !on;
  if ($("clearDiceBtn")) $("clearDiceBtn").disabled = !on;
  // Dice dock
  if ($("rollBtn")) $("rollBtn").disabled = !on;
  if ($("diceDockClearBtn")) $("diceDockClearBtn").disabled = !on;
  updateDiceDock();

}

function appendLog(html) {
  const el = document.createElement("div");
  el.className = "msg";
  el.innerHTML = html;
  $("log").appendChild(el);
  $("log").scrollTop = $("log").scrollHeight;
}

function renderMembers(members) {
  membersCache = members || [];

  $("members").innerHTML = "";
  for (const m of membersCache) {
    const li = document.createElement("li");
    li.textContent = `${m.name} (${m.role})`;
    $("members").appendChild(li);
  }

  const kickSel = $("kickSelect");
  if (kickSel) {
    kickSel.innerHTML = "";
    for (const m of membersCache) {
      if (m.role === "player") {
        const opt = document.createElement("option");
        opt.value = m.user_id;
        opt.textContent = m.name;
        kickSel.appendChild(opt);
      }
    }
  }
}

function showAiPreview(pending) {
  pendingAiId = pending?.id ?? null;
  const payload = pending?.payload ?? null;
  if (!payload) return;

  const preview = $("aiPreview");
  if (preview) preview.style.display = "block";

  if ($("aiPreviewText")) {
    $("aiPreviewText").innerHTML = escapeHtml(payload.narration || "").replaceAll("\n", "<br>");
  }

  if ($("aiPreviewNotes")) {
    $("aiPreviewNotes").innerHTML = escapeHtml(payload.dm_notes || "").replaceAll("\n", "<br>");
  }

  const choices = payload.choices || [];
  if ($("aiPreviewChoices")) {
    $("aiPreviewChoices").innerHTML = choices.length
      ? `<b>Choices:</b><ul>${choices.map((c) => `<li>${escapeHtml(c)}</li>`).join("")}</ul>`
      : "";
  }
}

function clearAiPreview() {
  pendingAiId = null;
  const preview = $("aiPreview");
  if (preview) preview.style.display = "none";
}

function fillTemplateDropdown() {
  const sel = $("sceneTemplate");
  if (!sel) return;

  // Clear except the first placeholder option
  sel.innerHTML = `<option value="">Choose a template…</option>`;
  for (const t of SCENE_TEMPLATES) {
    const opt = document.createElement("option");
    opt.value = t.id;
    opt.textContent = t.label;
    sel.appendChild(opt);
  }
}

function applySelectedTemplate() {
  const sel = $("sceneTemplate");
  if (!sel) return;

  const id = sel.value;
  if (!id) return;

  const t = SCENE_TEMPLATES.find((x) => x.id === id);
  if (!t) return;

  if ($("sceneEditTitle")) $("sceneEditTitle").value = t.title;
  if ($("sceneEditText")) $("sceneEditText").value = t.text;
  if ($("sceneDmNotes")) $("sceneDmNotes").innerHTML = "";

  appendLog(`<span class="sys">• Template applied: ${escapeHtml(t.label)}</span>`);
}

function replay(msg) {
  if (msg.type === "chat.message") {
    appendLog(`<b>${escapeHtml(msg.name)}</b>: ${escapeHtml(msg.text)}`);
  } else if (msg.type === "system.notice") {
    appendLog(`<span class="sys">• ${escapeHtml(msg.message)}</span>`);
  } else if (msg.type === "dice.result") {
    appendLog(
      `<span class="dice">🎲 <b>${escapeHtml(msg.name)}</b> rolled <code>${escapeHtml(
        msg.expr
      )}</code> → <b>${msg.total}</b> <small>(${escapeHtml(msg.detail)})</small></span>`
    );
  } else if (msg.type === "ai.narration") {
    appendLog(
      `<div class="ai">
        <div class="aiTitle">🧙 Narrator</div>
        <div class="aiText">${escapeHtml(msg.narration).replaceAll("\n", "<br>")}</div>
        ${
          msg.choices?.length
            ? `<div class="aiChoices"><b>Choices:</b><ul>${msg.choices
                .map((c) => `<li>${escapeHtml(c)}</li>`)
                .join("")}</ul></div>`
            : ""
        }
        ${
          msg.dm_notes
            ? `<details><summary>DM notes</summary><div>${escapeHtml(msg.dm_notes).replaceAll(
                "\n",
                "<br>"
              )}</div></details>`
            : ""
        }
      </div>`
    );
  } else if (msg.type === "members.update") {
    renderMembers(msg.members || []);
  } else if (msg.type === "room.locked") {
    locked = !!msg.locked;
    appendLog(`<span class="sys">• Room is now ${locked ? "LOCKED" : "UNLOCKED"}</span>`);
  } else if (msg.type === "dm.chat_cleared") {
    $("log").innerHTML = "";
    appendLog(`<span class="sys">• Chat was cleared by the DM.</span>`);
  } else if (msg.type === "dm.ai_mode") {
    if ($("aiMode")) $("aiMode").value = msg.mode;
    appendLog(`<span class="sys">• AI mode set to ${escapeHtml(msg.mode)}</span>`);
  } else if (msg.type === "dm.ai_preview") {
    showAiPreview(msg.pending);
    appendLog(`<span class="sys">• AI narration ready for DM preview.</span>`);
  } else if (msg.type === "dm.ai_preview_cleared") {
    clearAiPreview();
  } else if (msg.type === "scene.update") {
    $("sceneTitle").textContent = msg.scene?.title ?? "—";
    $("sceneText").textContent = msg.scene?.text ?? "—";

    // Keep DM editor in sync (simple MVP behavior)
    if (myRole === "dm") {
      if ($("sceneEditTitle")) $("sceneEditTitle").value = msg.scene?.title ?? "";
      if ($("sceneEditText")) $("sceneEditText").value = msg.scene?.text ?? "";
    }

    appendLog(`<span class="sys">• Scene updated.</span>`);
  } else if (msg.type === "dm.scene_saved") {
    if ($("sceneSavedMsg")) {
      $("sceneSavedMsg").textContent = "Saved!";
      setTimeout(() => {
        if ($("sceneSavedMsg")) $("sceneSavedMsg").textContent = "";
      }, 1200);
    }
  } else if (msg.type === "dm.scene_ai_draft") {
    // DM-only: fill editor with draft, do NOT broadcast until Save Scene is clicked
    const d = msg.draft || {};
    if ($("sceneEditTitle")) $("sceneEditTitle").value = d.title ?? "";
    if ($("sceneEditText")) $("sceneEditText").value = d.text ?? "";
    if ($("sceneDmNotes")) {
      $("sceneDmNotes").innerHTML = escapeHtml(d.dm_notes || "").replaceAll("\n", "<br>");
    }
    appendLog(`<span class="sys">• AI drafted a scene. Review and click “Save Scene” to publish.</span>`);
  } else if (msg.type === "error") {
    appendLog(`<span class="err">⚠ ${escapeHtml(msg.message)}</span>`);
  }
}

async function createRoom() {
  const name = $("roomName").value || "New Room";
  const resp = await fetch("/api/rooms", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name })
  });
  const data = await resp.json();
  $("roomId").value = data.room_id;
  setStatus(`Room created: ${data.room_id}`);
}

function joinRoom() {
  const roomId = ($("roomId").value || "").trim();
  const name = ($("displayName").value || "").trim() || "Player";
  const role = $("role").value;

  if (!roomId) {
    setStatus("Enter a room ID.");
    return;
  }

  myRole = role;

  const qs = new URLSearchParams({ name, role }).toString();
  const wsProto = location.protocol === "https:" ? "wss" : "ws";
  const url = `${wsProto}://${location.host}/ws/${roomId}?${qs}`;

  ws = new WebSocket(url);

  ws.onopen = () => {
    setStatus(`Connected to ${roomId} as ${name} (${role})`);
  };

  ws.onmessage = (ev) => {
    const msg = JSON.parse(ev.data);

    if (msg.type === "state.init") {
      enableControls(true);
      updateDiceUI();
      locked = !!msg.room.locked;

      // Scene display
      $("sceneTitle").textContent = msg.room.scene?.title ?? "—";
      $("sceneText").textContent = msg.room.scene?.text ?? "—";

      // DM panel visibility
      const dmPanel = $("dmPanel");
      if (dmPanel) dmPanel.style.display = msg.you.role === "dm" ? "block" : "none";

      // Sync AI mode selector
      if ($("aiMode") && msg.room.ai_mode) $("aiMode").value = msg.room.ai_mode;

      // Prefill DM editor
      if (msg.you.role === "dm") {
        if ($("sceneEditTitle")) $("sceneEditTitle").value = msg.room.scene?.title ?? "";
        if ($("sceneEditText")) $("sceneEditText").value = msg.room.scene?.text ?? "";
        if ($("sceneDmNotes")) $("sceneDmNotes").innerHTML = "";
        fillTemplateDropdown();
      }

      // Members + chat log
      renderMembers(msg.members || []);
      for (const m of msg.chat_log || []) replay(m);

      // Pending AI preview on join
      if (msg.room.pending_ai && msg.you.role === "dm") showAiPreview(msg.room.pending_ai);

      enableControls(true);
      return;
    }

    replay(msg);
  };

  ws.onclose = () => {
    enableControls(false);
    setStatus("Disconnected.");
  };

  ws.onerror = () => setStatus("WebSocket error.");
}

function sendChat() {
  const text = ($("chatInput").value || "").trim();
  if (!text || !ws) return;
  ws.send(JSON.stringify({ type: "chat.message", text }));
  $("chatInput").value = "";
}
function clampInt(n, min, max) {
  n = parseInt(n, 10);
  if (Number.isNaN(n)) n = 0;
  return Math.max(min, Math.min(max, n));
}

function buildDiceExpr() {
  const parts = [];

  for (const die of DICE) {
    const c = diceCounts[die] || 0;
    if (c > 0) parts.push(`${c}${die}`);
  }

  let expr = parts.join("+") || "";

  // modifier
  const mod = clampInt($("diceMod")?.value ?? "0", -999, 999);
  if (expr && mod !== 0) {
    expr += mod > 0 ? `+${mod}` : `${mod}`;
  } else if (!expr && mod !== 0) {
    // allow rolling just a flat mod? We'll treat as 1d20+mod? No—keep empty until dice selected.
  }

  return expr || "—";
}

function updateDiceUI() {
  for (const die of DICE) {
    const el = $(die + "_cnt");
    if (el) el.textContent = String(diceCounts[die] || 0);
  }
  if ($("diceExprPreview")) $("diceExprPreview").textContent = buildDiceExpr();

  const anyDice = DICE.some(d => (diceCounts[d] || 0) > 0);
  if ($("rollSelectedBtn")) $("rollSelectedBtn").disabled = !ws || !anyDice;
  if ($("clearDiceBtn")) $("clearDiceBtn").disabled = !ws || !anyDice;
}

function incDie(die, delta) {
  diceCounts[die] = clampInt((diceCounts[die] || 0) + delta, 0, 99);
  updateDiceUI();
}

function clearDice() {
  for (const die of DICE) diceCounts[die] = 0;
  if ($("diceMod")) $("diceMod").value = "0";
  updateDiceUI();
}

function rollSelectedDice() {
  if (!ws) return;

  const expr = buildDiceExpr();
  if (expr === "—") return;

  // Only applies to d20 in our backend dice mode logic
  const mode = $("diceMode")?.value || "";

  ws.send(JSON.stringify({ type: "dice.roll", expr, mode }));
}


function narrate() {
  if (!ws) return;
  ws.send(JSON.stringify({ type: "ai.narrate" }));
}

function toggleLock() {
  if (!ws) return;
  ws.send(JSON.stringify({ type: "room.lock", locked: !locked }));
}

function clearChat() {
  if (!ws) return;
  ws.send(JSON.stringify({ type: "dm.clear_chat" }));
}

function setAiMode() {
  if (!ws) return;
  const mode = $("aiMode").value;
  ws.send(JSON.stringify({ type: "dm.set_ai_mode", mode }));
}

function kickSelected() {
  if (!ws) return;
  const user_id = $("kickSelect") ? $("kickSelect").value : "";
  if (!user_id) return;
  ws.send(JSON.stringify({ type: "dm.kick", user_id }));
}

function publishAi() {
  if (!ws || !pendingAiId) return;
  ws.send(JSON.stringify({ type: "dm.publish_ai", id: pendingAiId }));
}

function discardAi() {
  if (!ws) return;
  ws.send(JSON.stringify({ type: "dm.discard_ai" }));
}

function saveScene() {
  if (!ws) return;
  const title = ($("sceneEditTitle")?.value || "").trim();
  const text = ($("sceneEditText")?.value || "").trim();

  ws.send(JSON.stringify({ type: "dm.scene_update", title, text }));
}

function draftSceneFromAI() {
  if (!ws) return;
  const hint = ($("aiSceneHint")?.value || "").trim() || "Fantasy D&D scene with strong atmosphere";
  ws.send(JSON.stringify({ type: "dm.scene_from_ai", style_hint: hint }));
}
function clampInt(n, min, max) {
  n = parseInt(n, 10);
  if (Number.isNaN(n)) n = 0;
  return Math.max(min, Math.min(max, n));
}

function buildDiceExprFromTray() {
  const parts = [];
  for (const die of DICE) {
    const c = diceCounts[die] || 0;
    if (c > 0) parts.push(`${c}${die}`);
  }
  let expr = parts.join("+");

  const mod = clampInt($("diceMod")?.value ?? "0", -999, 999);
  if (expr && mod !== 0) expr += mod > 0 ? `+${mod}` : `${mod}`;

  return expr || "";
}

function updateDiceDock() {
  for (const die of DICE) {
    const el = $(die + "_cnt");
    if (el) el.textContent = String(diceCounts[die] || 0);
  }

  const trayExpr = buildDiceExprFromTray();
  const preview = trayExpr || (($("diceExpr")?.value || "").trim()) || "—";
  if ($("diceExprPreview")) $("diceExprPreview").textContent = preview;

  const anyDice = DICE.some(d => (diceCounts[d] || 0) > 0);
  if ($("diceDockClearBtn")) $("diceDockClearBtn").disabled = !ws || (!anyDice && !(($("diceExpr")?.value||"").trim()));
  if ($("rollBtn")) $("rollBtn").disabled = !ws;
}

function incDie(die, delta) {
  diceCounts[die] = clampInt((diceCounts[die] || 0) + delta, 0, 99);
  updateDiceDock();
}

function clearDiceDock() {
  for (const die of DICE) diceCounts[die] = 0;
  if ($("diceMod")) $("diceMod").value = "0";
  if ($("diceExpr")) $("diceExpr").value = "";
  updateDiceDock();
}

function rollDice() {
  if (!ws) return;

  // Prefer text expression if provided; otherwise build from tray
  const textExpr = (($("diceExpr")?.value || "").trim());
  const trayExpr = buildDiceExprFromTray();
  const expr = textExpr || trayExpr;

  if (!expr) return;

  const mode = $("diceMode")?.value || "";
  ws.send(JSON.stringify({ type: "dice.roll", expr, mode }));
}

// Wire buttons
$("createRoomBtn").onclick = createRoom;
$("joinBtn").onclick = joinRoom;

$("sendBtn").onclick = sendChat;
$("rollBtn").onclick = rollDice;
$("narrateBtn").onclick = narrate;

if ($("lockBtn")) $("lockBtn").onclick = toggleLock;
if ($("clearChatBtn")) $("clearChatBtn").onclick = clearChat;
if ($("setAiModeBtn")) $("setAiModeBtn").onclick = setAiMode;
if ($("kickBtn")) $("kickBtn").onclick = kickSelected;
if ($("publishAiBtn")) $("publishAiBtn").onclick = publishAi;
if ($("discardAiBtn")) $("discardAiBtn").onclick = discardAi;

if ($("saveSceneBtn")) $("saveSceneBtn").onclick = saveScene;
if ($("applyTemplateBtn")) $("applyTemplateBtn").onclick = applySelectedTemplate;
if ($("aiDraftSceneBtn")) $("aiDraftSceneBtn").onclick = draftSceneFromAI;
if ($("rollSelectedBtn")) $("rollSelectedBtn").onclick = rollSelectedDice;
if ($("clearDiceBtn")) $("clearDiceBtn").onclick = clearDice;
// Dice dock wiring
if ($("rollBtn")) $("rollBtn").onclick = rollDice;
if ($("diceDockClearBtn")) $("diceDockClearBtn").onclick = clearDiceDock;

for (const die of DICE) {
  const plus = $(die + "_plus");
  const minus = $(die + "_minus");
  const big = $("die_" + die);

  if (plus) plus.onclick = () => incDie(die, +1);
  if (minus) minus.onclick = () => incDie(die, -1);
  if (big) big.onclick = () => incDie(die, +1);
}

if ($("diceExpr")) $("diceExpr").addEventListener("input", updateDiceDock);
if ($("diceMod")) $("diceMod").addEventListener("input", updateDiceDock);

for (const die of DICE) {
  const plus = $(die + "_plus");
  const minus = $(die + "_minus");
  const big = $("die_" + die);

  if (plus) plus.onclick = () => incDie(die, +1);
  if (minus) minus.onclick = () => incDie(die, -1);

  // Clicking the big die increments by 1 (fast UX)
  if (big) big.onclick = () => incDie(die, +1);
}

if ($("diceMod")) {
  $("diceMod").addEventListener("input", () => updateDiceUI());
}

// Enter-to-send / enter-to-roll
$("chatInput").addEventListener("keydown", (e) => {
  if (e.key === "Enter") sendChat();
});

$("diceExpr").addEventListener("keydown", (e) => {
  if (e.key === "Enter") rollDice();
});
