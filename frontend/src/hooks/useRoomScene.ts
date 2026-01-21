import { useCallback, useState } from "react";

export type Scene = { title: string; text: string };
export type GridState = { cols: number; rows: number; cell: number };
export type LightingState = { fog_enabled: boolean; ambient_radius: number; darkness: boolean };

export type Token = {
  id: string;
  label?: string;
  kind: string;
  x: number;
  y: number;
  owner_user_id?: string | null;
  size: number;
  color?: number | null;
  hp?: number | null;
  ac?: number | null;
  initiative?: number | null;
  vision_radius?: number | null;
  darkvision?: boolean | null;
};

export type UseRoomSceneReturn = {
  scene: Scene;
  setScene: (scene: Scene) => void;
  
  grid: GridState;
  setGrid: (grid: GridState) => void;
  setGridState: (grid: GridState) => void;
  
  mapImageUrl: string;
  setMapImageUrl: (url: string) => void;
  setMapImageState: (url: string) => void;
  
  lighting: LightingState;
  setLighting: (lighting: LightingState) => void;
  setLightingState: (next: LightingState) => boolean;
  
  updateGrid: (patch: Partial<GridState>) => boolean;
  setMapImage: (url: string) => boolean;
  
  handleMapSnapshot: (msg: any) => void;
};

export function useRoomScene(send: (payload: any) => boolean): UseRoomSceneReturn {
  const [scene, setScene] = useState<Scene>({ title: "—", text: "—" });
  const [grid, setGrid] = useState<GridState>({ cols: 20, rows: 20, cell: 32 });
  const [mapImageUrl, setMapImageUrl] = useState("");
  const [lighting, setLighting] = useState<LightingState>({ fog_enabled: false, ambient_radius: 0, darkness: false });

  const setGridState = useCallback((g: GridState) => setGrid(g), []);
  const setMapImageState = useCallback((url: string) => setMapImageUrl(url), []);

  const updateGrid = useCallback(
    (patch: Partial<GridState>) => {
      const next = {
        cols: patch.cols ?? grid.cols,
        rows: patch.rows ?? grid.rows,
        cell: patch.cell ?? grid.cell,
      };
      const ok = send({ type: "grid.set", ...next });
      if (ok) setGrid(next);
      return ok;
    },
    [send, grid]
  );

  const setMapImage = useCallback((url: string) => send({ type: "map.set_url", url }), [send]);

  const setLightingState = useCallback(
    (next: LightingState) => {
      const ok = send({ type: "map.lighting.set", lighting: next });
      if (ok) setLighting(next);
      return ok;
    },
    [send]
  );

  const handleMapSnapshot = useCallback((msg: any) => {
    setGrid(msg.grid);
    setMapImageUrl(msg.map_image_url || "");
    if (msg.lighting) setLighting(msg.lighting);
  }, []);

  return {
    scene,
    setScene,
    grid,
    setGrid,
    setGridState,
    mapImageUrl,
    setMapImageUrl,
    setMapImageState,
    lighting,
    setLighting,
    setLightingState,
    updateGrid,
    setMapImage,
    handleMapSnapshot,
  };
}
