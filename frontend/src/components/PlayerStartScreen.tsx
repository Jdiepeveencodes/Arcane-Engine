import React, { useState, useEffect } from "react";
import "./PlayerStartScreen.css";

type PlayerCharacter = {
  id: string;
  name: string;
  class: string;
  race: string;
  level: number;
  last_played?: string;
};

type Props = {
  onCreateCharacter: () => void;
  onLoadCharacter: () => void;
  onQuickLoadCharacter?: (characterId: string) => void;
  recentCharacters?: PlayerCharacter[];
  playerName?: string;
  isLoading?: boolean;
};

export default function PlayerStartScreen({
  onCreateCharacter,
  onLoadCharacter,
  onQuickLoadCharacter,
  recentCharacters = [],
  playerName = "Adventurer",
  isLoading = false,
}: Props) {
  const formatDate = (dateStr: string | undefined) => {
    if (!dateStr) return "Never played";
    try {
      const date = new Date(dateStr);
      const now = new Date();
      const diff = now.getTime() - date.getTime();

      const minutes = Math.floor(diff / 60000);
      const hours = Math.floor(diff / 3600000);
      const days = Math.floor(diff / 86400000);

      if (minutes < 60) return `${minutes}m ago`;
      if (hours < 24) return `${hours}h ago`;
      if (days < 7) return `${days}d ago`;

      return date.toLocaleDateString();
    } catch {
      return "Unknown";
    }
  };

  const getClassColor = (classStr: string): string => {
    const colors: Record<string, string> = {
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
    return colors[classStr.toLowerCase()] || "#95a5a6";
  };

  return (
    <div className="player-start-screen">
      {/* Background Effect */}
      <div className="background-effect"></div>

      {/* Header */}
      <div className="screen-header">
        <h1 className="title">🗡️ Character Creation</h1>
        <p className="subtitle">Welcome, {playerName}</p>
        <p className="tagline">Create your legend or continue your adventure</p>
      </div>

      {/* Main Action Buttons */}
      <div className="main-actions">
        <button
          className="action-button create-character-btn"
          onClick={onCreateCharacter}
          disabled={isLoading}
          title="Create a new character from scratch"
        >
          <div className="button-icon">✨</div>
          <div className="button-content">
            <h3>Create New Character</h3>
            <p>Build your character step by step</p>
          </div>
          <div className="button-arrow">→</div>
        </button>

        <button
          className="action-button load-character-btn"
          onClick={onLoadCharacter}
          disabled={isLoading}
          title="Load an existing character"
        >
          <div className="button-icon">📖</div>
          <div className="button-content">
            <h3>Load Character</h3>
            <p>Resume playing with your hero</p>
          </div>
          <div className="button-arrow">→</div>
        </button>
      </div>

      {/* Recent Characters */}
      {recentCharacters.length > 0 && (
        <div className="recent-characters">
          <h2>Your Recent Heroes</h2>
          <div className="characters-list">
            {recentCharacters.slice(0, 4).map((character) => (
              <button
                key={character.id}
                className="recent-character-item"
                onClick={() => onQuickLoadCharacter?.(character.id)}
                disabled={isLoading}
                title={`Quick load: ${character.name}`}
              >
                <div className="character-class-badge">
                  <span
                    className="class-indicator"
                    style={{ backgroundColor: getClassColor(character.class) }}
                  >
                    {character.class.charAt(0).toUpperCase()}
                  </span>
                </div>

                <div className="character-info">
                  <h4>{character.name}</h4>
                  <p className="character-details">
                    Level {character.level} {character.race} {character.class}
                  </p>
                  <p className="character-date">
                    Last played: {formatDate(character.last_played)}
                  </p>
                </div>

                <div className="character-arrow">→</div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Character Tips */}
      <div className="character-tips">
        <h3>⚡ Pro Tips</h3>
        <ul>
          <li>
            <strong>Race & Class:</strong> Your choices define your capabilities
          </li>
          <li>
            <strong>Ability Scores:</strong> Roll or use standard array for balance
          </li>
          <li>
            <strong>Background:</strong> Add depth with a personal story
          </li>
          <li>
            <strong>Equipment:</strong> Your starting gear depends on your class
          </li>
        </ul>
      </div>

      {/* D&D Info Cards */}
      <div className="character-stats">
        <div className="stat-card">
          <div className="stat-icon">🎯</div>
          <div className="stat-content">
            <h4>Character Levels</h4>
            <p>Progress from Level 1 to 20</p>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">🏆</div>
          <div className="stat-content">
            <h4>12 Classes</h4>
            <p>Barbarian, Bard, Cleric, and more</p>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">🌍</div>
          <div className="stat-content">
            <h4>10+ Races</h4>
            <p>Human, Elf, Dwarf, and beyond</p>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">🎁</div>
          <div className="stat-content">
            <h4>Skills & Feats</h4>
            <p>Customize your abilities</p>
          </div>
        </div>
      </div>

      {/* Loading Overlay */}
      {isLoading && (
        <div className="loading-overlay">
          <div className="spinner"></div>
          <p>Loading...</p>
        </div>
      )}
    </div>
  );
}
