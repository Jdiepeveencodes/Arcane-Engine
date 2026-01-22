import React, { useState, useEffect } from "react";
import "./LoadCampaignModal.css";

type Campaign = {
  id: string;
  name: string;
  story_type: string;
  campaign_length: string;
  core_conflict: string;
  last_played?: string;
  created_at?: string;
  estimated_sessions: number;
};

type Props = {
  onSelectCampaign: (campaignId: string) => Promise<void>;
  onCancel: () => void;
  sendWebSocketMessage: (message: any) => Promise<any>;
};

export default function LoadCampaignModal({
  onSelectCampaign,
  onCancel,
  sendWebSocketMessage,
}: Props) {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isSelecting, setIsSelecting] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    fetchCampaigns();
  }, []);

  const fetchCampaigns = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const response = await sendWebSocketMessage({
        type: "campaign.setup.list",
      });

      if (response && Array.isArray(response.campaigns)) {
        setCampaigns(response.campaigns);
        if (response.campaigns.length === 0) {
          setError("No saved campaigns found");
        }
      } else {
        setError("Failed to load campaigns");
      }
    } catch (err) {
      console.error("Error fetching campaigns:", err);
      setError("Error loading campaigns. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectCampaign = async (campaignId: string) => {
    setSelectedId(campaignId);
    setIsSelecting(true);

    try {
      await onSelectCampaign(campaignId);
    } catch (err) {
      console.error("Error selecting campaign:", err);
      setError("Failed to load campaign");
      setIsSelecting(false);
    }
  };

  const handleDeleteCampaign = async (campaignId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    
    if (!window.confirm("Are you sure you want to delete this campaign? This cannot be undone.")) {
      return;
    }

    try {
      await sendWebSocketMessage({
        type: "campaign.setup.delete",
        campaign_id: campaignId,
      });

      setCampaigns(campaigns.filter(c => c.id !== campaignId));
      setError(null);
    } catch (err) {
      console.error("Error deleting campaign:", err);
      setError("Failed to delete campaign");
    }
  };

  const filteredCampaigns = campaigns.filter(c =>
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.story_type.toLowerCase().includes(searchTerm.toLowerCase())
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

  return (
    <div className="load-campaign-modal-overlay">
      <div className="load-campaign-modal">
        <div className="modal-header">
          <h2>💾 Load Campaign</h2>
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
            {error.includes("No saved campaigns") && (
              <button className="btn-secondary" onClick={onCancel}>
                Go Back
              </button>
            )}
          </div>
        )}

        {isLoading ? (
          <div className="loading-state">
            <div className="spinner"></div>
            <p>Loading campaigns...</p>
          </div>
        ) : campaigns.length > 0 ? (
          <>
            <div className="search-box">
              <input
                type="text"
                placeholder="🔍 Search campaigns..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                disabled={isSelecting}
              />
              <p className="search-hint">
                {filteredCampaigns.length} of {campaigns.length} campaigns
              </p>
            </div>

            <div className="campaigns-grid">
              {filteredCampaigns.length > 0 ? (
                filteredCampaigns.map((campaign) => (
                  <button
                    key={campaign.id}
                    className={`campaign-card ${selectedId === campaign.id ? "selected" : ""}`}
                    onClick={() => handleSelectCampaign(campaign.id)}
                    disabled={isSelecting}
                  >
                    <div className="campaign-card-header">
                      <h3>{campaign.name}</h3>
                      <button
                        className="delete-btn"
                        onClick={(e) => handleDeleteCampaign(campaign.id, e)}
                        disabled={isSelecting}
                        title="Delete campaign"
                      >
                        🗑️
                      </button>
                    </div>

                    <div className="campaign-card-body">
                      <div className="campaign-detail">
                        <span className="label">Type:</span>
                        <span className="value">{campaign.story_type}</span>
                      </div>

                      <div className="campaign-detail">
                        <span className="label">Length:</span>
                        <span className="value">{campaign.campaign_length}</span>
                      </div>

                      <div className="campaign-detail">
                        <span className="label">Sessions:</span>
                        <span className="value">{campaign.estimated_sessions}</span>
                      </div>

                      <div className="campaign-conflict">
                        <span className="label">Conflict:</span>
                        <p className="conflict-text">
                          {campaign.core_conflict.substring(0, 150)}
                          {campaign.core_conflict.length > 150 ? "..." : ""}
                        </p>
                      </div>
                    </div>

                    <div className="campaign-card-footer">
                      <p className="created-date">
                        Created: {formatDate(campaign.created_at)}
                      </p>
                      {campaign.last_played && (
                        <p className="last-played">
                          Played: {formatDate(campaign.last_played)}
                        </p>
                      )}
                    </div>

                    {selectedId === campaign.id && (
                      <div className="selection-indicator">
                        <span>⏳ Loading...</span>
                      </div>
                    )}
                  </button>
                ))
              ) : (
                <div className="no-results">
                  <p>No campaigns match your search</p>
                </div>
              )}
            </div>
          </>
        ) : null}

        <div className="modal-footer">
          <button className="btn-secondary" onClick={onCancel} disabled={isSelecting}>
            Cancel
          </button>
          {campaigns.length > 0 && (
            <button
              className="btn-secondary"
              onClick={fetchCampaigns}
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
