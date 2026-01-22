import { useEffect, useRef, useState, useCallback, memo } from "react";
import "./App.css";
import "./layout.css";

import TopBar from "./components/TopBar";
import ScenePanel from "./components/ScenePanel";
import DiceDock from "./components/DiceDock";
import ChannelChat from "./components/ChannelChat";
import MapPanelPixi from "./components/MapPanelPixi";
import MapDMControls from "./components/MapDMControls";
// import AIPanel from "./components/AIPanel"; // Temporarily disabled
import InventoryPanel from "./components/InventoryPanel";
import DMLootPanel from "./components/DMLootPanel";
import LootBagPanel from "./components/LootBagPanel";
import CharacterPanel from "./components/CharacterPanel";
import DMStartScreen from "./components/DMStartScreen";
import CampaignSetupModal from "./components/CampaignSetupModal";
import LoadCampaignModal from "./components/LoadCampaignModal";
import PlayerStartScreen from "./components/PlayerStartScreen";
import CharacterCreationForm from "./components/CharacterCreationForm";
import CharacterSelectionModal from "./components/CharacterSelectionModal";

import { useRoomSocket } from "./hooks/useRoomSocket";

const EMPTY_DICE = { d4: 0, d6: 0, d8: 0, d10: 0, d12: 0, d20: 0, d100: 0 } as const;
type DieKey = keyof typeof EMPTY_DICE;

export default function App() {
  const room = useRoomSocket();

  const [roomName, setRoomName] = useState("");
  const [tableInput, setTableInput] = useState("");
  const [narrInput, setNarrInput] = useState("");

  const [diceCounts, setDiceCounts] = useState<Record<DieKey, number>>({ ...EMPTY_DICE });
  const [diceExprText, setDiceExprText] = useState("");
  const [diceMode, setDiceMode] = useState("");
  const [diceMod, setDiceMod] = useState("0");
  const [dmPlayerView, setDmPlayerView] = useState(false);
  const [mapTab, setMapTab] = useState<"map" | "sheet" | "sheet2" | "spells">("map");
  const [rulesHasUpdate, setRulesHasUpdate] = useState(false);
  const [rulesSyncing, setRulesSyncing] = useState(false);

  // DM Workflow state
  const [currentScreen, setCurrentScreen] = useState<"start" | "room">(
    room.roomId ? "room" : "start"
  );
  const [showCampaignSetup, setShowCampaignSetup] = useState(false);
  const [showLoadModal, setShowLoadModal] = useState(false);
  const [recentCampaigns, setRecentCampaigns] = useState<any[]>([]);
  const [isTransitioning, setIsTransitioning] = useState(false);

  // Player Workflow state
  const [playerCurrentScreen, setPlayerCurrentScreen] = useState<"start" | "room">(
    room.roomId ? "room" : "start"
  );
  const [showCharacterCreation, setShowCharacterCreation] = useState(false);
  const [showCharacterSelection, setShowCharacterSelection] = useState(false);
  const [recentCharacters, setRecentCharacters] = useState<any[]>([]);
  const [playerIsTransitioning, setPlayerIsTransitioning] = useState(false);

  const pendingBatchRef = useRef<{ active: boolean; expectedResults: number }>({
    active: false,
    expectedResults: 0,
  });

  useEffect(() => {
    const pending = pendingBatchRef.current;
    if (!pending.active) return;

    let count = 0;
    let sum = 0;

    for (let i = room.chatLog.length - 1; i >= 0; i--) {
      const m: any = room.chatLog[i];
      if (m?.type === "dice.result") {
        count++;
        sum += Number(m.total) || 0;
        if (count >= pending.expectedResults) break;
      }
    }

    if (count < pending.expectedResults) return;

    pending.active = false;
    pending.expectedResults = 0;
    room.addLocalSystem(`TOTAL → ${sum}`);
  }, [room.chatLog, room]);

  useEffect(() => {
    // Simply show the update button on mount; user can click to sync if needed
    setRulesHasUpdate(true);
  }, []);

  const handleRulesSync = useCallback(async () => {
    setRulesSyncing(true);
    try {
      const resp = await fetch("/api/rules/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kinds: ["races", "feats", "skills", "weapons", "attacks"] }),
      });
      if (!resp.ok) throw new Error("Sync failed");
      setRulesHasUpdate(false);
    } catch (err) {
      console.error("Rules sync failed:", err);
    } finally {
      setRulesSyncing(false);
    }
  }, []);

  async function createRoom() {
    const res = await fetch("/api/rooms", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: roomName || "New Room" }),
    });
    const data = await res.json();
    room.setRoomId(data.room_id);
  }

  function sendChannel(channel: "table" | "narration", text: string) {
    room.sendChat(channel, text);
  }

  function clearDice() {
    setDiceCounts({ ...EMPTY_DICE });
    setDiceExprText("");
    setDiceMod("0");
  }

  function rollOne(expr: string, mode: string) {
    pendingBatchRef.current.active = false;
    pendingBatchRef.current.expectedResults = 0;
    room.rollDice(expr, mode);
  }

  function rollBatch(exprs: string[], mode: string) {
    if (exprs.length <= 1) {
      rollOne(exprs[0] || "", mode);
      return;
    }
    pendingBatchRef.current.active = true;
    pendingBatchRef.current.expectedResults = exprs.length;
    exprs.forEach((ex) => room.rollDice(ex, mode));
  }

  const isDM = room.role === "dm";

  // DM Workflow handlers
  const handleCampaignCreated = (formData: any) => {
    setShowCampaignSetup(false);
    setCurrentScreen("room");
  };

  const handleLoadCampaign = async (campaignId: string) => {
    setIsTransitioning(true);
    try {
      await room.send({
        type: "campaign.setup.load",
        campaign_id: campaignId,
      });
      setShowLoadModal(false);
      setCurrentScreen("room");
    } catch (error) {
      console.error("Error loading campaign:", error);
      setIsTransitioning(false);
    }
  };

  const loadRecentCampaigns = useCallback(async () => {
    try {
      const response = await room.send({
        type: "campaign.setup.list",
      });
      if (response?.campaigns) {
        setRecentCampaigns(response.campaigns.slice(0, 3));
      }
    } catch (error) {
      console.error("Error loading recent campaigns:", error);
    }
  }, [room]);

  // Load recent campaigns on mount and when room changes
  useEffect(() => {
    if (isDM && room.connected) {
      loadRecentCampaigns();
    }
  }, [isDM, room.connected, loadRecentCampaigns]);

  // Update currentScreen when room is created/loaded
  useEffect(() => {
    if (room.roomId && currentScreen === "start") {
      setCurrentScreen("room");
    }
  }, [room.roomId, currentScreen]);

  // Player Workflow handlers
  const handleCharacterCreated = (characterData: any) => {
    setShowCharacterCreation(false);
    setPlayerCurrentScreen("room");
  };

  const handleLoadCharacter = async (characterId: string) => {
    setPlayerIsTransitioning(true);
    try {
      await room.send({
        type: "character.load",
        character_id: characterId,
      });
      setShowCharacterSelection(false);
      setPlayerCurrentScreen("room");
    } catch (error) {
      console.error("Error loading character:", error);
      setPlayerIsTransitioning(false);
    }
  };

  const loadRecentCharacters = useCallback(async () => {
    try {
      const response = await room.send({
        type: "character.list",
      });
      if (response?.characters) {
        setRecentCharacters(response.characters.slice(0, 3));
      }
    } catch (error) {
      console.error("Error loading recent characters:", error);
    }
  }, [room]);

  // Load recent characters on mount and when room changes
  useEffect(() => {
    if (!isDM && room.connected) {
      loadRecentCharacters();
    }
  }, [isDM, room.connected, loadRecentCharacters]);

  // Update playerCurrentScreen when room is created/loaded
  useEffect(() => {
    if (room.roomId && playerCurrentScreen === "start") {
      setPlayerCurrentScreen("room");
    }
  }, [room.roomId, playerCurrentScreen]);

  // Memoize grid to prevent MapPanelPixi from flickering on every render
  const memoizedGrid = useCallback(() => room.grid, [room.grid.cols, room.grid.rows, room.grid.cell])();

  // Show DM start screen if DM and no room selected
  if (isDM && currentScreen === "start" && !room.roomId) {
    return (
      <>
        <TopBar
          status={room.status}
          rulesHasUpdate={rulesHasUpdate}
          onRulesSync={handleRulesSync}
          rulesSyncing={rulesSyncing}
          roomName={roomName}
          setRoomName={setRoomName}
          onCreateRoom={createRoom}
          roomId={room.roomId}
          setRoomId={room.setRoomId}
          name={room.name}
          setName={room.setName}
          role={room.role}
          setRole={room.setRole}
          connected={room.connected}
          onJoin={room.connect}
          onDisconnect={room.disconnect}
        />
        <DMStartScreen
          onNewCampaign={() => setShowCampaignSetup(true)}
          onLoadCampaign={() => setShowLoadModal(true)}
          onRecentCampaign={handleLoadCampaign}
          recentCampaigns={recentCampaigns}
          isLoading={isTransitioning}
        />

        {showCampaignSetup && (
          <CampaignSetupModal
            onCampaignCreated={handleCampaignCreated}
            onCancel={() => setShowCampaignSetup(false)}
            sendWebSocketMessage={room.send}
          />
        )}

        {showLoadModal && (
          <LoadCampaignModal
            onSelectCampaign={handleLoadCampaign}
            onCancel={() => setShowLoadModal(false)}
            sendWebSocketMessage={room.send}
          />
        )}
      </>
    );
  }

  // Show Player start screen if Player and no room selected
  if (!isDM && playerCurrentScreen === "start" && !room.roomId) {
    return (
      <>
        <TopBar
          status={room.status}
          rulesHasUpdate={rulesHasUpdate}
          onRulesSync={handleRulesSync}
          rulesSyncing={rulesSyncing}
          roomName={roomName}
          setRoomName={setRoomName}
          onCreateRoom={createRoom}
          roomId={room.roomId}
          setRoomId={room.setRoomId}
          name={room.name}
          setName={room.setName}
          role={room.role}
          setRole={room.setRole}
          connected={room.connected}
          onJoin={room.connect}
          onDisconnect={room.disconnect}
        />
        <PlayerStartScreen
          onCreateCharacter={() => setShowCharacterCreation(true)}
          onLoadCharacter={() => setShowCharacterSelection(true)}
          onQuickLoadCharacter={handleLoadCharacter}
          recentCharacters={recentCharacters}
          playerName={room.name}
          isLoading={playerIsTransitioning}
        />

        {showCharacterCreation && (
          <CharacterCreationForm
            onSubmit={async (formData) => {
              try {
                await room.send({
                  type: "character.create",
                  character_data: formData,
                });
                handleCharacterCreated(formData);
              } catch (error) {
                console.error("Error creating character:", error);
              }
            }}
            onCancel={() => setShowCharacterCreation(false)}
          />
        )}

        {showCharacterSelection && (
          <CharacterSelectionModal
            onSelectCharacter={handleLoadCharacter}
            onCancel={() => setShowCharacterSelection(false)}
            sendWebSocketMessage={room.send}
          />
        )}
      </>
    );
  }

  return (
    <>
      <TopBar
        status={room.status}
        rulesHasUpdate={rulesHasUpdate}
        onRulesSync={handleRulesSync}
        rulesSyncing={rulesSyncing}
        roomName={roomName}
        setRoomName={setRoomName}
        onCreateRoom={createRoom}
        roomId={room.roomId}
        setRoomId={room.setRoomId}
        name={room.name}
        setName={room.setName}
        role={room.role}
        setRole={room.setRole}
        connected={room.connected}
        onJoin={room.connect}
        onDisconnect={room.disconnect}
      />

      <main className="layout2">
        <div className="leftCol">
          <ScenePanel
            scene={room.scene ?? { title: "—", text: "—" }}
            members={room.members ?? []}
            roomId={room.roomId}
          />

          {isDM && (
            <>
              <DMLootPanel
                connected={room.connected}
                isDM={isDM}
                members={room.members}
                lootStatus={room.lootStatus}
                onGenerateLoot={room.dmGenerateLoot}
              />
              {/* <AIPanel
                connected={room.connected}
                isDM={isDM}
                onGenerateNarration={room.generateNarration}
                onGenerateMap={room.generateMap}
              /> */}
              <LootBagPanel
                lootBags={room.lootBags}
                members={room.members}
                isDM
                onDistribute={room.distributeLoot}
                onDiscard={room.discardLoot}
                onToggleVisibility={room.setLootVisibility}
              />
            </>
          )}
          {!isDM && (
            <LootBagPanel
              lootBags={room.lootBags}
              members={room.members}
              isDM={false}
            />
          )}

          <div className="diceDockWrap">
            <DiceDock
              connected={room.connected}
              diceCounts={diceCounts as any}
              setDiceCounts={setDiceCounts as any}
              diceExprText={diceExprText}
              setDiceExprText={setDiceExprText}
              diceMode={diceMode}
              setDiceMode={setDiceMode}
              diceMod={diceMod}
              setDiceMod={setDiceMod}
              onClear={clearDice}
              onRollOne={rollOne as any}
              onRollBatch={rollBatch as any}
            />
          </div>
        </div>

        <div className="narrCol">
          <ChannelChat
              title="Narration"
              channel="narration"
              connected={room.connected}
              role={room.role}
              chatLog={room.chatLog ?? []}
              input={narrInput}
              setInput={setNarrInput}
              onSend={sendChannel}
              readOnly
          />
        </div>

        <div className="tableCol">
          <ChannelChat
            title="Table Chat"
            channel="table"
            connected={room.connected}
            role={room.role}
            chatLog={room.chatLog}
            input={tableInput}
            setInput={setTableInput}
            onSend={sendChannel}
          />
        </div>

        <div className="mapRow">
          <section className={`panel mapShell ${isDM ? "dmRail" : "noRail"}`}>
            <div className="mapMain">
              <div className="mapTabs">
                <button
                  type="button"
                  className={`mapTab ${mapTab === "map" ? "active" : ""}`}
                  onClick={() => setMapTab("map")}
                >
                  Map
                </button>
                <button
                  type="button"
                  className={`mapTab ${mapTab === "sheet" ? "active" : ""}`}
                  onClick={() => setMapTab("sheet")}
                >
                  Character sheet
                </button>
                <button
                  type="button"
                  className={`mapTab ${mapTab === "sheet2" ? "active" : ""}`}
                  onClick={() => setMapTab("sheet2")}
                >
                  Character sheet P.2
                </button>
                <button
                  type="button"
                  className={`mapTab ${mapTab === "spells" ? "active" : ""}`}
                  onClick={() => setMapTab("spells")}
                >
                  Spells
                </button>
              </div>
              <div className="mapCanvasWrap">
                <div className={`mapPane ${mapTab === "map" ? "active" : ""}`}>
                  <MapPanelPixi
                    grid={memoizedGrid}
                    lighting={room.lighting}
                    mapImageUrl={room.mapImageUrl}
                    tokens={room.tokens}
                    members={room.members}
                    role={room.role}
                    youUserId={room.you?.user_id || ""}
                    onTokenMove={room.moveToken}
                  />
                </div>
                <div className={`mapPane ${mapTab === "map" ? "" : "active"}`}>
                  <CharacterPanel
                    roomId={room.roomId}
                    members={room.members}
                    role={room.role}
                    userId={room.you?.user_id || ""}
                    page={mapTab === "sheet" ? "sheet" : mapTab === "sheet2" ? "sheet2" : "spells"}
                    inventories={room.inventories}
                  />
                </div>
              </div>
            </div>

            {/* ✅ SECOND COLUMN: DM controls OR Player inventory (never both) */}
            {isDM ? (
              <div className="mapDMWrap">
                <MapDMControls
                  isDM={isDM}
                  roomId={room.roomId}
                  members={room.members}
                  grid={room.grid}
                  mapImageUrl={room.mapImageUrl}
                  tokens={room.tokens}
                  lighting={room.lighting}
                  playerView={dmPlayerView}
                  setPlayerView={setDmPlayerView}
                  updateGrid={room.updateGrid}
                  setMapImage={room.setMapImage}
                  onSendMessage={room.send}
                  addToken={room.addToken}
                  removeToken={room.removeToken}
                  updateToken={room.updateToken}
                />
              </div>
            ) : (
              <div className="invDock">
                <InventoryPanel
                  role={room.role}
                  youUserId={room.you?.user_id || ""}
                  inventories={room.inventories}
                  equipItem={room.equipItem}
                  unequipSlot={room.unequipSlot}
                  dropItem={room.dropItem}
                  addToBag={room.addToBag}
                />
              </div>
            )}
          </section>
        </div>
      </main>
    </>
  );
}
