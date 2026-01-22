import React, { useState, useEffect } from "react";
import "./DMStartScreen.css";

type Props = {
  onNewCampaign: () => void;
  onLoadCampaign: () => void;
  onRecentCampaign?: (campaignId: string) => void;
  recentCampaigns?: Array<{
    id: string;
    name: string;
    story_type: string;
    last_played?: string;
  }>;
  isLoading?: boolean;
};

export default function DMStartScreen({
  onNewCampaign,
  onLoadCampaign,
  onRecentCampaign,
  recentCampaigns = [],
  isLoading = false,
}: Props) {
  const formatDate = (dateStr: string | undefined) => {
    if (!dateStr) return "Never";
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

  return (
    <div className="dm-start-screen">
      {/* Background Effect */}
      <div className="background-effect"></div>

      {/* Header */}
      <div className="screen-header">
        <h1 className="title">⚔️ Arcane Engine</h1>
        <p className="subtitle">D&D 5e Campaign Management & AI Dungeon Master</p>
      </div>

      {/* Main Action Buttons */}
      <div className="main-actions">
        <button
          className="action-button new-campaign-btn"
          onClick={onNewCampaign}
          disabled={isLoading}
          title="Start a brand new campaign with the AI DM questionnaire"
        >
          <div className="button-icon">📝</div>
          <div className="button-content">
            <h3>New Campaign</h3>
            <p>Create a new campaign with the AI questionnaire</p>
          </div>
          <div className="button-arrow">→</div>
        </button>

        <button
          className="action-button load-game-btn"
          onClick={onLoadCampaign}
          disabled={isLoading}
          title="Load a previously saved campaign"
        >
          <div className="button-icon">💾</div>
          <div className="button-content">
            <h3>Load Game</h3>
            <p>Resume a saved campaign</p>
          </div>
          <div className="button-arrow">→</div>
        </button>
      </div>

      {/* Recent Campaigns */}
      {recentCampaigns.length > 0 && (
        <div className="recent-campaigns">
          <h2>Recent Campaigns</h2>
          <div className="campaigns-list">
            {recentCampaigns.slice(0, 3).map((campaign) => (
              <button
                key={campaign.id}
                className="recent-campaign-item"
                onClick={() => onRecentCampaign?.(campaign.id)}
                disabled={isLoading}
                title={`Quick load: ${campaign.name}`}
              >
                <div className="campaign-info">
                  <h4>{campaign.name}</h4>
                  <p className="campaign-type">{campaign.story_type}</p>
                  <p className="campaign-date">
                    Last played: {formatDate(campaign.last_played)}
                  </p>
                </div>
                <div className="campaign-arrow">→</div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Quick Stats */}
      <div className="quick-stats">
        <div className="stat-card">
          <div className="stat-icon">📊</div>
          <div className="stat-content">
            <h4>Campaign Manager</h4>
            <p>Create and manage your adventures</p>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">🤖</div>
          <div className="stat-content">
            <h4>AI Dungeon Master</h4>
            <p>Dynamic narration and adjudication</p>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">🗺️</div>
          <div className="stat-content">
            <h4>100x100 Grid Maps</h4>
            <p>Expansive battle and exploration areas</p>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">👥</div>
          <div className="stat-content">
            <h4>Multiplayer Ready</h4>
            <p>Play with friends in real-time</p>
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
