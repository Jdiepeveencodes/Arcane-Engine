import React, { useState } from "react";
import CampaignSetupForm from "./CampaignSetupForm";
import "./CampaignSetupModal.css";

type Props = {
  onCampaignCreated?: (campaign: any) => void;
  onCancel?: () => void;
  sendWebSocketMessage: (message: any) => Promise<void>;
};

type FormData = {
  campaign_name: string;
  story_type: string;
  campaign_length: string;
  estimated_sessions: number;
  session_duration_hours: number;
  core_conflict: string;
  main_antagonist_name: string;
  antagonist_description: string;
  antagonist_goal: string;
  player_freedom: string;
  freedom_description: string;
  combat_tone: string;
  activity_balance: string;
  backstory_integration: string;
  safety_boundaries: string;
  good_ending: string;
  ending_type: string;
  custom_notes: string;
};

export default function CampaignSetupModal({
  onCampaignCreated,
  onCancel,
  sendWebSocketMessage,
}: Props) {
  const [isLoading, setIsLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [aiPrompt, setAiPrompt] = useState<string | null>(null);

  const handleSubmit = async (formData: FormData) => {
    setIsLoading(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      // Send form data to backend
      const response = await sendWebSocketMessage({
        type: "campaign.setup.submit",
        responses: formData,
      });

      setSuccessMessage("Campaign created successfully!");
      
      // Wait a moment for user to see success message
      setTimeout(() => {
        if (onCampaignCreated) {
          onCampaignCreated(formData);
        }
      }, 1500);
    } catch (error) {
      console.error("Error creating campaign:", error);
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Failed to create campaign. Please try again."
      );
      setIsLoading(false);
    }
  };

  return (
    <div className="campaign-setup-modal-overlay">
      <div className="campaign-setup-modal">
        {successMessage && (
          <div className="success-message">
            <p>✨ {successMessage}</p>
          </div>
        )}

        {errorMessage && (
          <div className="error-message">
            <p>❌ {errorMessage}</p>
          </div>
        )}

        {!successMessage && (
          <CampaignSetupForm
            onSubmit={handleSubmit}
            onCancel={onCancel}
            isLoading={isLoading}
          />
        )}

        {aiPrompt && (
          <div className="ai-prompt-display">
            <h3>🤖 AI DM Configuration</h3>
            <pre>{aiPrompt}</pre>
          </div>
        )}
      </div>
    </div>
  );
}
