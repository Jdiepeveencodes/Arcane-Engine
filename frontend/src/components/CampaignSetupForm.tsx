import React, { useState } from "react";
import "./CampaignSetupForm.css";

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

type Props = {
  onSubmit: (formData: FormData) => Promise<void>;
  onCancel?: () => void;
  isLoading?: boolean;
};

const STORY_TYPES = [
  "heroic",
  "dark",
  "whimsical",
  "epic",
  "political",
  "mythic",
  "mystery",
  "survival",
];

const CAMPAIGN_LENGTHS = [
  { value: "one_shot", label: "One-shot (single session)" },
  { value: "short_3_5", label: "Short (3-5 sessions)" },
  { value: "medium_10_20", label: "Medium (10-20 sessions)" },
  { value: "long_20_plus", label: "Long (20+ sessions)" },
  { value: "ongoing", label: "Ongoing (open-ended)" },
];

const STORY_STRUCTURES = [
  { value: "linear", label: "Linear (fixed plot path)" },
  { value: "branching", label: "Branching (multiple paths)" },
  { value: "sandbox", label: "Sandbox (player-driven)" },
  { value: "hybrid", label: "Hybrid (mix of both)" },
];

const COMBAT_TONES = [
  { value: "cinematic", label: "Cinematic (heroic, dramatic)" },
  { value: "tactical", label: "Tactical (positioning matters)" },
  { value: "deadly", label: "Deadly (death is real)" },
  { value: "forgiving", label: "Forgiving (difficulty adjusts)" },
  { value: "lethal_but_fair", label: "Lethal but Fair (hard but predictable)" },
];

const ACTIVITY_BALANCES = [
  { value: "roleplay_heavy", label: "Roleplay Heavy (70% RP, 30% other)" },
  { value: "balanced", label: "Balanced (33% each)" },
  { value: "combat_heavy", label: "Combat Heavy (70% combat, 30% other)" },
  { value: "exploration_heavy", label: "Exploration Heavy (70% exploration, 30% other)" },
];

const BACKSTORY_INTEGRATIONS = [
  { value: "minimal", label: "Minimal (loose connection)" },
  { value: "moderate", label: "Moderate (some plot hooks)" },
  { value: "deep", label: "Deep (central to plot)" },
];

const ENDING_TYPES = [
  { value: "clear_victory", label: "Clear Victory" },
  { value: "bittersweet", label: "Bittersweet" },
  { value: "moral_choice", label: "Moral Choice" },
  { value: "open_ending", label: "Open Ending" },
  { value: "multiple", label: "Multiple Endings" },
];

export default function CampaignSetupForm({
  onSubmit,
  onCancel,
  isLoading = false,
}: Props) {
  const [formData, setFormData] = useState<FormData>({
    campaign_name: "",
    story_type: "heroic",
    campaign_length: "medium_10_20",
    estimated_sessions: 12,
    session_duration_hours: 4,
    core_conflict: "",
    main_antagonist_name: "",
    antagonist_description: "",
    antagonist_goal: "",
    player_freedom: "hybrid",
    freedom_description: "",
    combat_tone: "lethal_but_fair",
    activity_balance: "balanced",
    backstory_integration: "moderate",
    safety_boundaries: "",
    good_ending: "",
    ending_type: "clear_victory",
    custom_notes: "",
  });

  const [currentStep, setCurrentStep] = useState(0);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [generatingStep3, setGeneratingStep3] = useState(false);

  const steps = [
    {
      title: "Campaign Identity",
      questions: [
        {
          id: "campaign_name",
          label: "Campaign Name",
          type: "text",
          placeholder: "e.g., Dragon's Hoard",
          required: true,
        },
        {
          id: "story_type",
          label: "What kind of story do you want to tell?",
          type: "select",
          options: STORY_TYPES,
          required: true,
        },
      ],
    },
    {
      title: "Campaign Duration",
      questions: [
        {
          id: "campaign_length",
          label: "Campaign Length",
          type: "select",
          options: CAMPAIGN_LENGTHS,
          required: true,
        },
        {
          id: "estimated_sessions",
          label: "Estimated Number of Sessions",
          type: "number",
          min: 1,
          max: 100,
          required: true,
        },
        {
          id: "session_duration_hours",
          label: "Average Session Duration (hours)",
          type: "number",
          min: 1,
          max: 12,
          step: 0.5,
          required: true,
        },
      ],
    },
    {
      title: "Core Plot",
      questions: [
        {
          id: "core_conflict",
          label: "What is the core conflict or mystery driving the campaign?",
          type: "textarea",
          placeholder: "Describe the central plot hook...",
          required: true,
        },
        {
          id: "main_antagonist_name",
          label: "Main Antagonist Name",
          type: "text",
          placeholder: "e.g., The Crimson Plague",
          required: true,
        },
        {
          id: "antagonist_description",
          label: "Who or what is the main antagonist?",
          type: "textarea",
          placeholder: "Describe their nature and background...",
          required: true,
        },
        {
          id: "antagonist_goal",
          label: "What do they want? (Their goal)",
          type: "textarea",
          placeholder: "Describe their end goal and motivation...",
          required: true,
        },
      ],
    },
    {
      title: "Player Agency",
      questions: [
        {
          id: "player_freedom",
          label: "How much freedom should players have to change the story?",
          type: "select",
          options: STORY_STRUCTURES,
          required: true,
        },
        {
          id: "freedom_description",
          label: "Describe the player freedom level (optional)",
          type: "textarea",
          placeholder: "e.g., Main plot is fixed but side quests are flexible...",
        },
      ],
    },
    {
      title: "Combat & Balance",
      questions: [
        {
          id: "combat_tone",
          label: "What tone should combat and danger have?",
          type: "select",
          options: COMBAT_TONES,
          required: true,
        },
        {
          id: "activity_balance",
          label: "How important is roleplay versus combat and exploration?",
          type: "select",
          options: ACTIVITY_BALANCES,
          required: true,
        },
      ],
    },
    {
      title: "Characters & Safety",
      questions: [
        {
          id: "backstory_integration",
          label: "How tightly should character backstories connect to the main plot?",
          type: "select",
          options: BACKSTORY_INTEGRATIONS,
          required: true,
        },
        {
          id: "safety_boundaries",
          label: "What themes or topics should be avoided or handled lightly?",
          type: "textarea",
          placeholder: "e.g., Avoid: graphic violence. Handle lightly: mental illness.",
          required: true,
        },
      ],
    },
    {
      title: "Campaign Vision",
      questions: [
        {
          id: "good_ending",
          label: "What does a 'good ending' look like to you?",
          type: "textarea",
          placeholder: "Describe your vision for the campaign conclusion...",
          required: true,
        },
        {
          id: "ending_type",
          label: "What type of ending do you envision?",
          type: "select",
          options: ENDING_TYPES,
          required: true,
        },
      ],
    },
    {
      title: "Additional Notes",
      questions: [
        {
          id: "custom_notes",
          label: "Any additional notes or special instructions? (optional)",
          type: "textarea",
          placeholder: "Anything else the AI DM should know about your campaign...",
        },
      ],
    },
  ];

  const currentStepData = steps[currentStep];
  const progressPercent = ((currentStep + 1) / steps.length) * 100;

  const handleChange = (field: string, value: any) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
    // Clear error for this field
    if (errors[field]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  const validateStep = (): boolean => {
    const newErrors: Record<string, string> = {};

    for (const question of currentStepData.questions) {
      if (question.required) {
        const value = formData[question.id as keyof FormData];
        if (!value || (typeof value === "string" && value.trim() === "")) {
          newErrors[question.id] = "This field is required";
        }
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (validateStep()) {
      setCurrentStep((prev) => Math.min(prev + 1, steps.length - 1));
      window.scrollTo(0, 0);
    }
  };

  const handlePrev = () => {
    setCurrentStep((prev) => Math.max(prev - 1, 0));
    window.scrollTo(0, 0);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (validateStep()) {
      try {
        await onSubmit(formData);
      } catch (error) {
        console.error("Error submitting campaign setup:", error);
        setErrors({ submit: "Failed to submit campaign setup. Please try again." });
      }
    }
  };

  // Suggestion generator for Step 3 (Core Plot)
  const generateStep3Suggestions = async () => {
    setGeneratingStep3(true);
    try {
      // Curated suggestions based on story type selected in Step 1
      const storyType = formData.story_type || "heroic";
      
      const suggestionsByType: Record<string, { conflict: string; antagonist: string; description: string; goal: string }[]> = {
        heroic: [
          {
            conflict: "An ancient evil awakens and threatens the realm. The party must gather allies and artifacts to prevent catastrophe.",
            antagonist: "Malachar the Lich King",
            description: "A powerful undead sorcerer who was sealed away centuries ago, now breaking free from mystical bindings. Commands legions of undead and seeks to drain all life force to restore his mortal form.",
            goal: "To achieve immortality by absorbing the life force of an entire city during a celestial alignment."
          },
          {
            conflict: "A tyrannical warlord is conquering neighboring kingdoms. The party must rally the resistance and face them in an epic final battle.",
            antagonist: "General Korgath the Unstoppable",
            description: "A ruthless military commander with an undefeated army, enhanced by dark magic. Believes conquering the world will bring order and peace through iron rule.",
            goal: "To unite the realm under his absolute rule and establish a new empire."
          }
        ],
        dark: [
          {
            conflict: "A plague of shadows spreads through the land, turning people into twisted creatures. The party must uncover its source.",
            antagonist: "The Void Mother",
            description: "An elder entity from beyond reality, appearing as a mass of writhing shadows with many eyes. Feeds on despair and corruption.",
            goal: "To open a permanent rift between worlds and consume reality itself."
          },
          {
            conflict: "Betrayal cuts deep as someone close to the party orchestrates their downfall. Survival means uncovering a conspiracy.",
            antagonist: "Lord Nathaniel Vale",
            description: "A seemingly noble patron who has been manipulating events from the shadows. Charismatic but deeply cruel, with a network of spies.",
            goal: "To eliminate all who know of his dark secrets and claim absolute power."
          }
        ],
        whimsical: [
          {
            conflict: "The Feywild and the mortal world are merging! Reality is becoming wonderfully weird, and someone must stabilize it.",
            antagonist: "Prince Thistlebottom the Chaotic",
            description: "A mischievous fey noble who finds the blending of worlds hilarious. Speaks in riddles and contradictions, more prankster than villain.",
            goal: "To keep the worlds merged forever so his pranks can affect both realities."
          },
          {
            conflict: "A bard has cursed the local festival with endless celebration! Everyone is trapped in magical merriment.",
            antagonist: "The Mysterious Bard",
            description: "A enigmatic musician who is angry about being rejected from the festival showcase. Uses magic to force others into perpetual joy.",
            goal: "To become famous as a legendary performer, even if people would rather be anywhere else."
          }
        ],
        epic: [
          {
            conflict: "An ancient prophecy foretells the end of an age. The party must navigate political intrigue and cosmic forces.",
            antagonist: "The Devouring Star",
            description: "A cosmic entity of immense power approaching the world. Not evil, simply hungry and indifferent to mortal concerns.",
            goal: "To consume the world as it has countless others, continuing its eternal hunger."
          },
          {
            conflict: "Dimensional rifts are tearing reality apart, and the party discovers they're the only ones who can seal them.",
            antagonist: "Lord Xanathar of the Void",
            description: "An interdimensional being using the rifts to invade. Intelligent, ancient, and utterly alien in its motivations.",
            goal: "To expand its empire into this dimension and harvest its resources."
          }
        ],
        political: [
          {
            conflict: "The kingdom is on the brink of civil war as three factions vie for control. The party's choices will determine the realm's fate.",
            antagonist: "Duke Vex the Manipulator",
            description: "A charismatic nobleman who sees others as pawns. Brilliant strategist and passionate about establishing a new order.",
            goal: "To become king and reshape the kingdom according to his vision of perfection."
          },
          {
            conflict: "Corruption runs deep in the capital. The party must navigate lies, secret societies, and power plays to expose the truth.",
            antagonist: "The Inner Council",
            description: "A hidden cabal of nobles and merchants who control the kingdom from the shadows. Each has their own agenda.",
            goal: "To maintain their power and eliminate anyone who threatens to expose them."
          }
        ],
        mythic: [
          {
            conflict: "The gods themselves are at war, and mortals caught in the middle must choose which deity to serve or find a third path.",
            antagonist: "Void-Touched Oracle",
            description: "A being touched by powers beyond the gods, seeking to remake existence. Serves neither light nor darkness.",
            goal: "To transcend the current cosmology and create a new reality where they hold absolute power."
          },
          {
            conflict: "An ancient dragon awakens, reshaping the world according to its will. The party must discover if it's good or evil.",
            antagonist: "Bahamuthar the Eternal",
            description: "A dragon older than civilization itself, with ambitions to reshape the world and return it to an age before mortals.",
            goal: "To restore the world to a time of pure draconic rule and destroy the age of mortals."
          }
        ],
        mystery: [
          {
            conflict: "Strange disappearances plague the city. Everyone is suspect, and the party must find the truth before more vanish.",
            antagonist: "The Collector",
            description: "A mysterious figure collecting rare and unique people for unknown purposes. Hides in plain sight among society.",
            goal: "To complete a collection of the most powerful individuals and unlock a secret from the ancient past."
          },
          {
            conflict: "A murder mystery spirals into something far darker as the party uncovers a hidden organization pulling strings.",
            antagonist: "The Masked Conductor",
            description: "Leader of a secret society whose true identity remains unknown. Orchestrates events like a symphony.",
            goal: "To remain hidden while using the party's investigation to eliminate rivals and consolidate power."
          }
        ],
        survival: [
          {
            conflict: "The world has become a harsh, unforgiving place. The party must survive against nature, monsters, and each other.",
            antagonist: "The Endless Winter",
            description: "A supernatural cold spreading across the land. May be a curse, an elemental force, or something worse.",
            goal: "To consume all warmth and life, turning the world into an eternal frozen wasteland."
          },
          {
            conflict: "A catastrophic event has destroyed civilization. The party must lead survivors and confront dangers lurking in the ruins.",
            antagonist: "The Scourge",
            description: "A horrific creature or curse born from the catastrophe itself. Hunts survivors and spreads corruption.",
            goal: "To ensure nothing ever builds civilization again, returning the world to primal chaos."
          }
        ]
      };

      const suggestions = suggestionsByType[storyType] || suggestionsByType.heroic;
      const suggestion = suggestions[Math.floor(Math.random() * suggestions.length)];

      // Fill in the fields with the suggestion
      setFormData((prev) => ({
        ...prev,
        core_conflict: suggestion.conflict,
        main_antagonist_name: suggestion.antagonist,
        antagonist_description: suggestion.description,
        antagonist_goal: suggestion.goal,
      }));

      // Clear errors
      setErrors({});
    } catch (error) {
      console.error("Error generating suggestions:", error);
    } finally {
      setGeneratingStep3(false);
    }
  };

  return (
    <div className="campaign-setup-form">
      <div className="form-header">
        <h1>⚔️ Create Your Campaign</h1>
        <p className="form-subtitle">Configure your D&D campaign for the AI Dungeon Master</p>
      </div>

      {errors.submit && (
        <div className="error-banner">
          <p>{errors.submit}</p>
        </div>
      )}

      <div className="progress-bar">
        <div className="progress-fill" style={{ width: `${progressPercent}%` }}></div>
      </div>
      <p className="progress-text">
        Step {currentStep + 1} of {steps.length}
      </p>

      <form onSubmit={handleSubmit}>
        <div className="form-section">
          <div className="section-header">
            <h2>{currentStepData.title}</h2>
            {currentStep === 2 && (
              <button
                type="button"
                onClick={generateStep3Suggestions}
                disabled={generatingStep3}
                className="btn-suggest"
                title="Generate AI suggestions for this step"
              >
                {generatingStep3 ? "✨ Generating..." : "✨ Suggest Ideas"}
              </button>
            )}
          </div>

          <div className="questions-container">
            {currentStepData.questions.map((question: any) => (
              <div key={question.id} className="form-group">
                <label htmlFor={question.id}>
                  {question.label}
                  {question.required && <span className="required">*</span>}
                </label>

                {question.type === "text" && (
                  <input
                    id={question.id}
                    type="text"
                    placeholder={question.placeholder}
                    value={formData[question.id as keyof FormData] as string}
                    onChange={(e) => handleChange(question.id, e.target.value)}
                    disabled={isLoading}
                    className={errors[question.id] ? "error" : ""}
                  />
                )}

                {question.type === "number" && (
                  <input
                    id={question.id}
                    type="number"
                    min={question.min}
                    max={question.max}
                    step={question.step || 1}
                    value={formData[question.id as keyof FormData] as number}
                    onChange={(e) => handleChange(question.id, parseFloat(e.target.value))}
                    disabled={isLoading}
                    className={errors[question.id] ? "error" : ""}
                  />
                )}

                {question.type === "textarea" && (
                  <textarea
                    id={question.id}
                    placeholder={question.placeholder}
                    value={formData[question.id as keyof FormData] as string}
                    onChange={(e) => handleChange(question.id, e.target.value)}
                    disabled={isLoading}
                    rows={4}
                    className={errors[question.id] ? "error" : ""}
                  />
                )}

                {question.type === "select" && (
                  <select
                    id={question.id}
                    value={formData[question.id as keyof FormData] as string}
                    onChange={(e) => handleChange(question.id, e.target.value)}
                    disabled={isLoading}
                    className={errors[question.id] ? "error" : ""}
                  >
                    {Array.isArray(question.options) ? (
                      question.options.map((opt: any) => (
                        <option key={typeof opt === "string" ? opt : opt.value} value={typeof opt === "string" ? opt : opt.value}>
                          {typeof opt === "string" ? opt.charAt(0).toUpperCase() + opt.slice(1) : opt.label}
                        </option>
                      ))
                    ) : (
                      <>
                        {question.options.map((opt: any) => (
                          <option key={opt.value} value={opt.value}>
                            {opt.label}
                          </option>
                        ))}
                      </>
                    )}
                  </select>
                )}

                {errors[question.id] && (
                  <p className="field-error">{errors[question.id]}</p>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="form-actions">
          <button
            type="button"
            onClick={handlePrev}
            disabled={currentStep === 0 || isLoading}
            className="btn-secondary"
          >
            ← Previous
          </button>

          {currentStep < steps.length - 1 ? (
            <button
              type="button"
              onClick={handleNext}
              disabled={isLoading}
              className="btn-primary"
            >
              Next →
            </button>
          ) : (
            <>
              <button
                type="button"
                onClick={handleNext}
                disabled={isLoading}
                className="btn-secondary"
              >
                ← Back
              </button>
              <button
                type="submit"
                disabled={isLoading}
                className="btn-success"
              >
                {isLoading ? "⏳ Creating Campaign..." : "✨ Create Campaign"}
              </button>
            </>
          )}

          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              disabled={isLoading}
              className="btn-cancel"
            >
              Cancel
            </button>
          )}
        </div>
      </form>
    </div>
  );
}
