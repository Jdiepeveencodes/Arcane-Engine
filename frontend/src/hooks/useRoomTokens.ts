import { useCallback, useState } from "react";

export type TokenKind = "player" | "npc" | "object";

export type Token = {
  id: string;
  label?: string;
  kind: TokenKind;
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

export type GridState = { cols: number; rows: number; cell: number };
export type LightingState = { fog_enabled: boolean; ambient_radius: number; darkness: boolean };

export type UseRoomTokensReturn = {
  tokens: Token[];
  setTokens: (tokens: Token[]) => void;
  setTokensState: (tokens: Token[]) => void;
  addTokenState: (token: Token) => void;
  updateTokenState: (token: Token) => void;
  removeTokenState: (token_id: string) => void;
  moveTokenState: (token_id: string, x: number, y: number) => void;
  
  moveToken: (token_id: string, x: number, y: number) => boolean;
  addToken: (token: Partial<Token>) => boolean;
  removeToken: (token_id: string) => boolean;
  updateToken: (token_id: string, patch: Partial<Token>) => boolean;
};

export function useRoomTokens(send: (payload: any) => boolean): UseRoomTokensReturn {
  const [tokens, setTokens] = useState<Token[]>([]);

  const setTokensState = useCallback((t: Token[]) => setTokens(t), []);
  
  const addTokenState = useCallback((token: Token) => {
    setTokens((prev) => [...prev, token]);
  }, []);

  const updateTokenState = useCallback((token: Token) => {
    setTokens((prev) => prev.map((t: any) => (t.id === token.id ? { ...t, ...token } : t)));
  }, []);

  const removeTokenState = useCallback((token_id: string) => {
    setTokens((prev) => prev.filter((t: any) => t.id !== token_id));
  }, []);

  const moveTokenState = useCallback((token_id: string, x: number, y: number) => {
    setTokens((prev) => prev.map((t: any) => (t.id === token_id ? { ...t, x, y } : t)));
  }, []);

  const moveToken = useCallback(
    (token_id: string, x: number, y: number) => send({ type: "token.move", token_id, x, y }),
    [send]
  );

  const addToken = useCallback((token: Partial<Token>) => send({ type: "token.add", token }), [send]);

  const removeToken = useCallback((token_id: string) => send({ type: "token.remove", token_id }), [send]);

  const updateToken = useCallback((token_id: string, patch: Partial<Token>) => send({ type: "token.update", token_id, patch }), [send]);

  return {
    tokens,
    setTokens,
    setTokensState,
    addTokenState,
    updateTokenState,
    removeTokenState,
    moveTokenState,
    moveToken,
    addToken,
    removeToken,
    updateToken,
  };
}
