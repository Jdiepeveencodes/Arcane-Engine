import { useEffect, useRef, useState } from "react";
import "./App.css";
import "./layout.css";

import TopBar from "./components/TopBar";
import ScenePanel from "./components/ScenePanel";
import DiceDock from "./components/DiceDock";
import ChannelChat from "./components/ChannelChat";
import MapPanelPixi from "./components/MapPanelPixi";
import MapDMControls from "./components/MapDMControls";
import InventoryPanel from "./components/InventoryPanel";

import { useRoomSocket } from "./hooks/useRoomSocket";

const EMPTY_DICE = { d4: 0, d6: 0, d8: 0, d10: 0, d12: 0, d20: 0, d100: 0 } as const;
type DieKey = keyof typeof EMPTY_DICE;

export default function App(){
  const room = useRoomSocket();

  const [roomName, setRoomName] = useState("");
  const [tableInput, setTableInput] = useState("");
  const [narrInput, setNarrInput] = useState("");

  const [diceCounts, setDiceCounts] = useState<Record<DieKey, number>>({ ...EMPTY_DICE });
  const [diceExprText, setDiceExprText] = useState("");
  const [diceMode, setDiceMode] = useState("");
  const [diceMod, setDiceMod] = useState("0");

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

  async function createRoom(){
    const res = await fetch("/api/rooms", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: roomName || "New Room" }),
    });
    const data = await res.json();
    room.setRoomId(data.room_id);
  }

  function sendChannel(channel: "table" | "narration", text: string){
    room.sendChat(text, channel);
  }

  function clearDice(){
    setDiceCounts({ ...EMPTY_DICE });
    setDiceExprText("");
    setDiceMod("0");
  }

  function rollOne(expr: string, mode: string){
    pendingBatchRef.current.active = false;
    pendingBatchRef.current.expectedResults = 0;
    room.rollDice(expr, mode);
  }

  function rollBatch(exprs: string[], mode: string){
    if (exprs.length <= 1) {
      rollOne(exprs[0] || "", mode);
      return;
    }
    pendingBatchRef.current.active = true;
    pendingBatchRef.current.expectedResults = exprs.length;
    exprs.forEach((ex) => room.rollDice(ex, mode));
  }

  const isDM = room.role === "dm";

  return (
    <>
      <TopBar
        status={room.status}
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
          <ScenePanel scene={room.scene} members={room.members} />

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
            chatLog={room.chatLog}
            input={narrInput}
            setInput={setNarrInput}
            onSend={sendChannel}
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
            <div className="mapCanvasWrap">
              <MapPanelPixi
                grid={room.grid}
                mapImageUrl={room.mapImageUrl}
                tokens={room.tokens}
                members={room.members}
                role={room.role}
                youUserId={room.you?.user_id || ""}
                onTokenMove={room.moveToken}
              />
            </div>

            <div className="mapDMWrap">
              {isDM && (
                <MapDMControls
                  isDM={isDM}
                  roomId={room.roomId}
                  members={room.members}
                  grid={room.grid}
                  mapImageUrl={room.mapImageUrl}
                  tokens={room.tokens}
                  updateGrid={room.updateGrid}
                  setMapImage={room.setMapImage}
                  addToken={room.addToken}
                  removeToken={room.removeToken}
                  updateToken={room.updateToken}
                />
              )}
            </div>

            {!isDM && (
              <div className="invOverlay">
                <InventoryPanel
                  role={room.role}
                  youUserId={room.you?.user_id || ""}
                  inventories={room.inventories}
                  equipItem={room.equipItem}
                  unequipSlot={room.unequipSlot}
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
