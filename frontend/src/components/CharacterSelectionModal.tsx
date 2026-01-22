import React, { useState, useEffect } from "react";
import "./CharacterSelectionModal.css";

type Character = {
  id: string;
  character_name: string;
  player_name: string;
  race: string;
  class: string;
  level: number;
  background: string;
  last_played?: string;
  created_at?: string;
};

type Props = {
  onSelectCharacter: (characterId: string) => Promise<void>;
  onCancel: () => void;
  sendWebSocketMessage: (message: any) => Promise<any>;
};

const CLASS_COLORS: Record<string, string> = {
  barbarian: "#e74c3c",
  bard: "#9b59b6",
  cleric: "#f39c12",
  druid: "#27ae60",
  fighter: "#34495e",
  monk: "#16a085",
  paladin: "#f1c40f",
  ranger: "#2ecc71",
  rogue: "#2c3e50",
  sorcerer: "#e91e63",
  warlock: "#8e44ad",
  wizard: "#3498db",
};

export default function CharacterSelectionModal({
  onSelectCharacter,
  onCancel,
  sendWebSocketMessage,
}: Props) {
  const [characters, setCharacters] = useState<Character[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isSelecting, setIsSelecting] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    fetchCharacters();
  }, []);

  const fetchCharacters = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await sendWebSocketMessage({
        type: "character.list",
      });

      if (response && Array.isArray(response.characters)) {
        setCharacters(response.characters);
        if (response.characters.length === 0) {
          setError("No characters found. Create one to get started!");
        }
      } else {
        setError("Failed to load characters");
      }
    } catch (err) {
      console.error("Error fetching characters:", err);
      setError("Error loading characters. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectCharacter = async (characterId: string) => {
    setSelectedId(characterId);
    setIsSelecting(true);

    try {
      await onSelectCharacter(characterId);
    } catch (err) {
      console.error("Error selecting character:", err);
      setError("Failed to load character");
      setIsSelecting(false);
    }
  };

  const handleDeleteCharacter = async (characterId: string, e: React.MouseEvent) => {
    e.stopPropagation();

    if (!window.confirm("Are you sure you want to delete this character? This cannot be undone.")) {
      return;
    }

    try {
      await sendWebSocketMessage({
        type: "character.delete",
        character_id: characterId,
      });

      setCharacters(characters.filter((c) => c.id !== characterId));
      setError(null);
    } catch (err) {
      console.error("Error deleting character:", err);
      setError("Failed to delete character");
    }
  };

  const filteredCharacters = characters.filter((c) =>
    c.character_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.class.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.race.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const formatDate = (dateStr: string | undefined) => {
    if (!dateStr) return "Unknown";
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString(undefined, {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return "Unknown";
    }
  };

  const getClassColor = (classStr: string): string => {
    return CLASS_COLORS[classStr.toLowerCase()] || "#95a5a6";
  };

  return (
    <div className="character-selection-modal-overlay">
      <div className="character-selection-modal">
        <div className="modal-header">
          <h2>📖 Load Character</h2>
          <button
            className="close-btn"
            onClick={onCancel}
            disabled={isSelecting}
            title="Close"
          >
            ✕
          </button>
        </div>

        {error && (
          <div className="error-message">
            <p>{error}</p>
          </div>
        )}

        {isLoading ? (
          <div className="loading-state">
            <div className="spinner"></div>
            <p>Loading characters...</p>
          </div>
        ) : characters.length > 0 ? (
          <>
            <div className="search-box">
              <input
                type="text"
                placeholder="🔍 Search characters..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                disabled={isSelecting}
              />
              <p className="search-hint">
                {filteredCharacters.length} of {characters.length} characters
              </p>
            </div>

            <div className="characters-grid">
              {filteredCharacters.length > 0 ? (
                filteredCharacters.map((character) => (
                  <button
                    key={character.id}
                    className={`character-card ${selectedId === character.id ? "selected" : ""}`}
                    onClick={() => handleSelectCharacter(character.id)}
                    disabled={isSelecting}
                  >
                    <div className="character-card-header">
                      <div
                        className="class-badge"
                        style={{ backgroundColor: getClassColor(character.class) }}
                      >
                        <span className="class-letter">
                          {character.class.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <h3>{character.character_name}</h3>
                      <button
                        className="delete-btn"
                        onClick={(e) => handleDeleteCharacter(character.id, e)}
                        disabled={isSelecting}
                        title="Delete character"
                      >
                        🗑️
                      </button>
                    </div>

                    <div className="character-card-body">
                      <div className="character-detail">
                        <span className="label">Player:</span>
                        <span className="value">{character.player_name}</span>
                      </div>

                      <div className="character-detail">
                        <span className="label">Race:</span>
                        <span className="value">{character.race}</span>
                      </div>

                      <div className="character-detail">
                        <span className="label">Class:</span>
                        <span className="value">{character.class}</span>
                      </div>

                      <div className="character-detail">
                        <span className="label">Level:</span>
                        <span className="value">{character.level}</span>
                      </div>

                      <div className="character-detail">
                        <span className="label">Background:</span>
                        <span className="value">{character.background}</span>
                      </div>
                    </div>

                    <div className="character-card-footer">
                      <p className="created-date">
                        Created: {formatDate(character.created_at)}
                      </p>
                      {character.last_played && (
                        <p className="last-played">
                          Last played: {formatDate(character.last_played)}
                        </p>
                      )}
                    </div>

                    {selectedId === character.id && (
                      <div className="selection-indicator">
                        <span>⏳ Loading...</span>
                      </div>
                    )}
                  </button>
                ))
              ) : (
                <div className="no-results">
                  <p>No characters match your search</p>
                </div>
              )}
            </div>
          </>
        ) : null}

        <div className="modal-footer">
          <button className="btn-secondary" onClick={onCancel} disabled={isSelecting}>
            Cancel
          </button>
          {characters.length > 0 && (
            <button
              className="btn-secondary"
              onClick={fetchCharacters}
              disabled={isSelecting || isLoading}
            >
              🔄 Refresh
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
