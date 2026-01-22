import React, { useState } from "react";
import "./CharacterCreationForm.css";

type FormData = {
  character_name: string;
  player_name: string;
  race: string;
  class: string;
  background: string;
  alignment: string;
  level: number;
  ability_scores: {
    strength: number;
    dexterity: number;
    constitution: number;
    intelligence: number;
    wisdom: number;
    charisma: number;
  };
  skills: string[];
  background_story: string;
  personality_traits: string;
  ideals: string;
  bonds: string;
  flaws: string;
  equipment_notes: string;
};

type Props = {
  onSubmit: (formData: FormData) => Promise<void>;
  onCancel?: () => void;
  isLoading?: boolean;
};

const RACES = [
  "Dragonborn",
  "Dwarf",
  "Elf",
  "Gnome",
  "Half-Elf",
  "Half-Orc",
  "Halfling",
  "Human",
  "Tiefling",
];

const CLASSES = [
  "Barbarian",
  "Bard",
  "Cleric",
  "Druid",
  "Fighter",
  "Monk",
  "Paladin",
  "Ranger",
  "Rogue",
  "Sorcerer",
  "Warlock",
  "Wizard",
];

const BACKGROUNDS = [
  "Acolyte",
  "Charlatan",
  "Criminal",
  "Entertainer",
  "Folk Hero",
  "Guild Artisan",
  "Hermit",
  "Noble",
  "Outlander",
  "Sage",
  "Sailor",
  "Soldier",
  "Urchin",
];

const ALIGNMENTS = [
  "Lawful Good",
  "Neutral Good",
  "Chaotic Good",
  "Lawful Neutral",
  "True Neutral",
  "Chaotic Neutral",
  "Lawful Evil",
  "Neutral Evil",
  "Chaotic Evil",
];

const SKILLS = [
  "Acrobatics",
  "Animal Handling",
  "Arcana",
  "Athletics",
  "Deception",
  "History",
  "Insight",
  "Intimidation",
  "Investigation",
  "Medicine",
  "Nature",
  "Perception",
  "Performance",
  "Persuasion",
  "Religion",
  "Sleight of Hand",
  "Stealth",
  "Survival",
];

export default function CharacterCreationForm({
  onSubmit,
  onCancel,
  isLoading = false,
}: Props) {
  const [formData, setFormData] = useState<FormData>({
    character_name: "",
    player_name: "",
    race: "Human",
    class: "Fighter",
    background: "Soldier",
    alignment: "Neutral Good",
    level: 1,
    ability_scores: {
      strength: 10,
      dexterity: 10,
      constitution: 10,
      intelligence: 10,
      wisdom: 10,
      charisma: 10,
    },
    skills: [],
    background_story: "",
    personality_traits: "",
    ideals: "",
    bonds: "",
    flaws: "",
    equipment_notes: "",
  });

  const [currentStep, setCurrentStep] = useState(0);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const steps = [
    {
      title: "Basic Information",
      questions: [
        {
          id: "character_name",
          label: "Character Name",
          type: "text",
          placeholder: "e.g., Grommash the Fearless",
          required: true,
        },
        {
          id: "player_name",
          label: "Your Name (Player)",
          type: "text",
          placeholder: "Your name",
          required: true,
        },
      ],
    },
    {
      title: "Race & Class",
      questions: [
        {
          id: "race",
          label: "Choose Your Race",
          type: "select",
          options: RACES,
          required: true,
        },
        {
          id: "class",
          label: "Choose Your Class",
          type: "select",
          options: CLASSES,
          required: true,
        },
      ],
    },
    {
      title: "Background & Personality",
      questions: [
        {
          id: "background",
          label: "Background",
          type: "select",
          options: BACKGROUNDS,
          required: true,
        },
        {
          id: "alignment",
          label: "Alignment",
          type: "select",
          options: ALIGNMENTS,
          required: true,
        },
      ],
    },
    {
      title: "Ability Scores",
      questions: [
        {
          id: "ability_scores",
          label: "Set Your Ability Scores (3-18)",
          type: "abilities",
          required: true,
        },
      ],
    },
    {
      title: "Skills & Proficiencies",
      questions: [
        {
          id: "skills",
          label: "Choose 3-5 Skills",
          type: "multiselect",
          options: SKILLS,
          required: false,
        },
      ],
    },
    {
      title: "Character Background",
      questions: [
        {
          id: "background_story",
          label: "Character Background Story",
          type: "textarea",
          placeholder: "Tell us your character's history and motivations...",
          required: true,
        },
        {
          id: "personality_traits",
          label: "Personality Traits",
          type: "textarea",
          placeholder: "e.g., I'm an optimist. I always believe that the best is yet to come.",
          required: false,
        },
      ],
    },
    {
      title: "Character Details",
      questions: [
        {
          id: "ideals",
          label: "Ideals",
          type: "textarea",
          placeholder: "What principles do you follow?",
          required: false,
        },
        {
          id: "bonds",
          label: "Bonds",
          type: "textarea",
          placeholder: "What drives you? Who are you connected to?",
          required: false,
        },
        {
          id: "flaws",
          label: "Flaws",
          type: "textarea",
          placeholder: "What is your greatest weakness?",
          required: false,
        },
      ],
    },
    {
      title: "Equipment & Final Notes",
      questions: [
        {
          id: "equipment_notes",
          label: "Equipment Notes",
          type: "textarea",
          placeholder: "Any special equipment or final notes?",
          required: false,
        },
      ],
    },
  ];

  const currentStepData = steps[currentStep];
  const progressPercent = ((currentStep + 1) / steps.length) * 100;

  const handleChange = (field: string, value: any) => {
    if (field === "ability_scores") {
      setFormData((prev) => ({
        ...prev,
        ability_scores: { ...prev.ability_scores, ...value },
      }));
    } else {
      setFormData((prev) => ({
        ...prev,
        [field]: value,
      }));
    }

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
        console.error("Error submitting character:", error);
        setErrors({ submit: "Failed to create character. Please try again." });
      }
    }
  };

  return (
    <div className="character-creation-form">
      <div className="form-header">
        <h1>🗡️ Create Your Character</h1>
        <p className="form-subtitle">Build your D&D 5e hero</p>
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
          <h2>{currentStepData.title}</h2>

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
                    {question.options.map((opt: string) => (
                      <option key={opt} value={opt}>
                        {opt}
                      </option>
                    ))}
                  </select>
                )}

                {question.type === "multiselect" && (
                  <div className="multiselect-grid">
                    {question.options.map((skill: string) => (
                      <label key={skill} className="checkbox-label">
                        <input
                          type="checkbox"
                          checked={
                            (formData.skills as string[]).includes(skill)
                          }
                          onChange={(e) => {
                            const skills = formData.skills as string[];
                            if (e.target.checked) {
                              handleChange("skills", [...skills, skill]);
                            } else {
                              handleChange(
                                "skills",
                                skills.filter((s) => s !== skill)
                              );
                            }
                          }}
                          disabled={isLoading}
                        />
                        <span>{skill}</span>
                      </label>
                    ))}
                  </div>
                )}

                {question.type === "abilities" && (
                  <div className="abilities-grid">
                    {Object.entries(formData.ability_scores).map(
                      ([ability, value]) => (
                        <div key={ability} className="ability-input">
                          <label htmlFor={ability}>
                            {ability.charAt(0).toUpperCase() +
                              ability.slice(1)}
                          </label>
                          <input
                            id={ability}
                            type="number"
                            min={3}
                            max={18}
                            value={value}
                            onChange={(e) =>
                              handleChange("ability_scores", {
                                [ability]: parseInt(e.target.value),
                              })
                            }
                            disabled={isLoading}
                          />
                        </div>
                      )
                    )}
                  </div>
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
                onClick={handlePrev}
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
                {isLoading ? "⏳ Creating Character..." : "✨ Create Character"}
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
