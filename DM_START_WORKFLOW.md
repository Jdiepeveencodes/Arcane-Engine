# DM Start Workflow - Complete Integration Guide

## Overview

The DM Start Workflow provides a beautiful, seamless entry point for Dungeon Masters to either create a new campaign or load an existing one. The workflow consists of:

1. **DMStartScreen** - Landing page with "New Campaign" and "Load Game" buttons
2. **CampaignSetupForm** - 8-step questionnaire for new campaigns
3. **LoadCampaignModal** - Browse and load saved campaigns
4. **Backend Integration** - WebSocket handlers for persistence

---

## Components

### 1. DMStartScreen.tsx
**Purpose**: Landing page for DM workflow initiation

**Location**: `frontend/src/components/DMStartScreen.tsx`  
**Styles**: `frontend/src/components/DMStartScreen.css`

**Features**:
- Large hero section with Arcane Engine branding
- Two primary action buttons: "New Campaign" and "Load Game"
- Recent campaigns list (quick-load)
- Feature cards highlighting system capabilities
- Loading overlay during async operations
- Smooth animations and transitions

**Props**:
```typescript
type Props = {
  onNewCampaign: () => void;              // Navigate to campaign setup form
  onLoadCampaign: () => void;             // Open load campaign modal
  onRecentCampaign?: (campaignId: string) => void;  // Quick-load recent
  recentCampaigns?: Array<{
    id: string;
    name: string;
    story_type: string;
    last_played?: string;
  }>;
  isLoading?: boolean;
};
```

**Usage**:
```typescript
<DMStartScreen
  onNewCampaign={() => setShowCampaignSetup(true)}
  onLoadCampaign={() => setShowLoadModal(true)}
  onRecentCampaign={(id) => handleLoadCampaign(id)}
  recentCampaigns={recentCampaigns}
  isLoading={isLoading}
/>
```

### 2. CampaignSetupForm.tsx
**Purpose**: Step-by-step questionnaire for campaign configuration

**Location**: `frontend/src/components/CampaignSetupForm.tsx`  
**Styles**: `frontend/src/components/CampaignSetupForm.css`

**8 Steps**:
1. Campaign Identity (name, story type)
2. Campaign Duration (length, sessions, duration)
3. Core Plot (conflict, antagonist)
4. Player Agency (freedom level)
5. Combat & Balance (tone, activity mix)
6. Characters & Safety (backstory, boundaries)
7. Campaign Vision (ending type, description)
8. Additional Notes (custom instructions)

**Props**:
```typescript
type Props = {
  onSubmit: (formData: FormData) => Promise<void>;
  onCancel?: () => void;
  isLoading?: boolean;
};
```

**Already Implemented**: See `CAMPAIGN_SETUP_UI.md`

### 3. LoadCampaignModal.tsx
**Purpose**: Browse and load existing campaigns

**Location**: `frontend/src/components/LoadCampaignModal.tsx`  
**Styles**: `frontend/src/components/LoadCampaignModal.css`

**Features**:
- List all saved campaigns in grid layout
- Search/filter campaigns by name or type
- Display campaign metadata (type, length, conflict preview)
- Show creation and last-played dates
- Quick-delete campaigns
- Loading state while fetching
- Error handling

**Props**:
```typescript
type Props = {
  onSelectCampaign: (campaignId: string) => Promise<void>;
  onCancel: () => void;
  sendWebSocketMessage: (message: any) => Promise<any>;
};
```

**Usage**:
```typescript
<LoadCampaignModal
  onSelectCampaign={handleLoadCampaign}
  onCancel={() => setShowLoadModal(false)}
  sendWebSocketMessage={sendWebSocketMessage}
/>
```

---

## Backend Integration

### WebSocket Message Handlers

New handlers added to `message_handlers.py`:

#### 1. campaign.setup.list
**Purpose**: Get all saved campaigns

**Client Request**:
```json
{
  "type": "campaign.setup.list"
}
```

**Server Response**:
```json
{
  "type": "campaign.setup.list_response",
  "campaigns": [
    {
      "id": "uuid-123",
      "name": "Dragon's Hoard",
      "story_type": "epic",
      "campaign_length": "long_20_plus",
      "core_conflict": "Ancient dragon awakens...",
      "estimated_sessions": 24,
      "created_at": "2026-01-22T10:30:00",
      "last_played": "2026-01-22T15:45:00"
    },
    // ... more campaigns
  ]
}
```

#### 2. campaign.setup.load
**Purpose**: Load a specific campaign

**Client Request**:
```json
{
  "type": "campaign.setup.load",
  "campaign_id": "uuid-123"
}
```

**Server Response**:
```json
{
  "type": "campaign.setup.loaded",
  "campaign_id": "uuid-123",
  "campaign_name": "Dragon's Hoard",
  "ai_prompt": "You are an AI Dungeon Master...",
  "message": "Campaign 'Dragon's Hoard' loaded successfully."
}
```

**Broadcast to All Players**:
```json
{
  "type": "campaign.loaded",
  "campaign_name": "Dragon's Hoard",
  "message": "DM loaded campaign: Dragon's Hoard"
}
```

#### 3. campaign.setup.delete
**Purpose**: Delete a saved campaign

**Client Request**:
```json
{
  "type": "campaign.setup.delete",
  "campaign_id": "uuid-123"
}
```

**Server Response**:
```json
{
  "type": "campaign.setup.deleted",
  "campaign_id": "uuid-123",
  "message": "Campaign deleted successfully."
}
```

### Backend Functions (campaign_setup.py)

#### save_campaign(campaign: CampaignSetup) → str
- **Purpose**: Persist a campaign to disk
- **Returns**: campaign_id
- **File Storage**: `saved_campaigns/{campaign_id}.json`

#### load_campaign(campaign_id: str) → Optional[CampaignSetup]
- **Purpose**: Load campaign from disk
- **Updates**: last_played timestamp
- **Returns**: CampaignSetup object or None

#### delete_campaign(campaign_id: str) → bool
- **Purpose**: Remove campaign from disk
- **Returns**: True if successful

#### list_campaigns() → List[Dict[str, Any]]
- **Purpose**: Get all saved campaigns
- **Returns**: Sorted list by last_played, then created_at
- **Sorting**: Most recent first

---

## Integration Steps

### Step 1: Update App.tsx

Add imports and state:

```typescript
import DMStartScreen from "./components/DMStartScreen";
import CampaignSetupModal from "./components/CampaignSetupModal";
import LoadCampaignModal from "./components/LoadCampaignModal";

function App() {
  const [currentScreen, setCurrentScreen] = useState<"start" | "room">("start");
  const [showCampaignSetup, setShowCampaignSetup] = useState(false);
  const [showLoadModal, setShowLoadModal] = useState(false);
  const [recentCampaigns, setRecentCampaigns] = useState([]);
  const [isTransitioning, setIsTransitioning] = useState(false);

  // ... existing code ...

  // Show start screen if no room selected
  if (currentScreen === "start" || !room.id) {
    return (
      <>
        <DMStartScreen
          onNewCampaign={() => setShowCampaignSetup(true)}
          onLoadCampaign={() => setShowLoadModal(true)}
          onRecentCampaign={(id) => loadCampaign(id)}
          recentCampaigns={recentCampaigns}
          isLoading={isTransitioning}
        />

        {showCampaignSetup && (
          <CampaignSetupModal
            onCampaignCreated={handleCampaignCreated}
            onCancel={() => setShowCampaignSetup(false)}
            sendWebSocketMessage={sendWebSocketMessage}
          />
        )}

        {showLoadModal && (
          <LoadCampaignModal
            onSelectCampaign={handleLoadCampaign}
            onCancel={() => setShowLoadModal(false)}
            sendWebSocketMessage={sendWebSocketMessage}
          />
        )}
      </>
    );
  }

  // ... rest of app (existing room interface) ...
}
```

### Step 2: Add Campaign Loading Functions

```typescript
const handleCampaignCreated = (formData: any) => {
  setShowCampaignSetup(false);
  setCurrentScreen("room");
  // Campaign is now in room state from WebSocket
};

const handleLoadCampaign = async (campaignId: string) => {
  setIsTransitioning(true);
  try {
    const response = await sendWebSocketMessage({
      type: "campaign.setup.load",
      campaign_id: campaignId,
    });
    
    setShowLoadModal(false);
    setCurrentScreen("room");
    // Campaign is now loaded in room state
  } catch (error) {
    console.error("Error loading campaign:", error);
    setIsTransitioning(false);
  }
};

const loadRecentCampaigns = async () => {
  try {
    const response = await sendWebSocketMessage({
      type: "campaign.setup.list",
    });
    
    if (response && response.campaigns) {
      setRecentCampaigns(response.campaigns.slice(0, 3));
    }
  } catch (error) {
    console.error("Error loading recent campaigns:", error);
  }
};
```

### Step 3: Update useRoomSocket

Add message handlers for campaign responses:

```typescript
// In useRoomSocket.ts
case "campaign.setup.list_response":
  // Campaigns list received from backend
  if (callback) callback(data);
  break;

case "campaign.setup.loaded":
  // Campaign loaded successfully
  setRoom((prev) => ({
    ...prev,
    campaign_setup: data.campaign || {}
  }));
  if (callback) callback(data);
  break;

case "campaign.setup.deleted":
  // Campaign deleted
  if (callback) callback(data);
  break;

case "campaign.loaded":
  // Broadcast: DM loaded a campaign
  console.log(data.message);
  break;
```

---

## File Structure

```
frontend/src/components/
├── DMStartScreen.tsx           (new)
├── DMStartScreen.css           (new)
├── CampaignSetupForm.tsx       (existing)
├── CampaignSetupForm.css       (existing)
├── CampaignSetupModal.tsx      (existing)
├── CampaignSetupModal.css      (existing)
├── LoadCampaignModal.tsx       (new)
└── LoadCampaignModal.css       (new)

backend/app/
├── message_handlers.py         (updated: +3 handlers, HANDLERS dict updated)
├── campaign_setup.py           (updated: +5 functions)
└── saved_campaigns/            (auto-created, stores campaign JSON files)
```

---

## User Flow

### New Campaign Flow
1. User sees DMStartScreen
2. Clicks "New Campaign" button
3. CampaignSetupForm appears with Step 1
4. User completes all 8 steps
5. Clicks "Create Campaign"
6. Form submits to backend: `campaign.setup.submit`
7. Backend creates CampaignSetup and generates AI prompt
8. Backend calls `save_campaign()` to persist
9. Frontend transitions to room with campaign loaded

### Load Campaign Flow
1. User sees DMStartScreen
2. Clicks "Load Game" button
3. LoadCampaignModal appears
4. Modal requests campaigns: `campaign.setup.list`
5. Backend returns sorted list
6. User sees all campaigns with metadata
7. User clicks campaign card (or quick-loads from recent)
8. Modal requests campaign: `campaign.setup.load`
9. Backend loads campaign from disk, updates last_played
10. Frontend transitions to room with campaign loaded

### Delete Campaign Flow
1. User in LoadCampaignModal
2. Clicks delete (🗑️) on campaign card
3. Confirmation dialog appears
4. If confirmed, sends: `campaign.setup.delete`
5. Backend removes file
6. Modal refreshes campaign list

---

## Data Persistence

### Campaign Storage
- **Location**: `saved_campaigns/` directory (relative to backend)
- **Format**: JSON files named `{campaign_id}.json`
- **Size**: ~5-15 KB per campaign

### Campaign Data Structure
```json
{
  "campaign_id": "uuid-123",
  "campaign_name": "Dragon's Hoard",
  "story_type": "epic",
  "campaign_length": "long_20_plus",
  "estimated_sessions": 24,
  "session_duration_hours": 4,
  "core_conflict": "An ancient dragon awakens from millennia of sleep...",
  "main_antagonist_name": "Thessalodan the Endless",
  "antagonist_description": "A massive red dragon...",
  "antagonist_goal": "Rebuild his draconic empire...",
  "player_freedom": "branching",
  "freedom_description": "...",
  "combat_tone": "lethal_but_fair",
  "activity_balance": "balanced",
  "backstory_integration": "deep",
  "safety_boundaries": "Avoid graphic violence, handle politics lightly",
  "good_ending": "Players forge an uneasy alliance...",
  "ending_type": "multiple",
  "custom_notes": "Use epic music during major story beats",
  "created_at": "2026-01-22T10:30:00",
  "last_played": "2026-01-22T15:45:00"
}
```

---

## Error Handling

### Frontend Error Handling
- LoadCampaignModal shows error messages
- Form validation prevents invalid submissions
- Network errors caught and displayed
- Loading states prevent accidental re-submission

### Backend Error Handling
- Missing campaign_id: "No campaign ID provided"
- Campaign not found: "Campaign not found"
- File I/O errors: "Failed to load/delete campaign"
- Invalid JSON: Skipped in list, error logged

---

## UI/UX Considerations

### Design Principles
- **Progressive Disclosure**: Show only relevant options
- **Beautiful Defaults**: Pre-filled sensible values
- **Clear Feedback**: Status messages for all actions
- **Dark Fantasy Theme**: Consistent with Arcane Engine
- **Smooth Animations**: Fade-in, slide-up transitions
- **Responsive**: Works on mobile, tablet, desktop

### Accessibility
- Semantic HTML (buttons, forms, labels)
- Keyboard navigation (Tab, Enter, Esc)
- Color contrast (AA compliant)
- Loading indicators for async operations
- Clear error messages

---

## Testing Checklist

### DMStartScreen
- [ ] Renders with correct title and subtitle
- [ ] "New Campaign" button works
- [ ] "Load Game" button works
- [ ] Recent campaigns list displays correctly
- [ ] Quick-load recent campaign works
- [ ] Loading overlay appears during transitions
- [ ] Responsive on mobile/tablet

### LoadCampaignModal
- [ ] Lists all campaigns on open
- [ ] Search filters by name and type
- [ ] Campaign metadata displays correctly
- [ ] Delete button removes campaign
- [ ] Delete confirmation dialog works
- [ ] Loading spinner shows during fetch
- [ ] Error message displays if no campaigns
- [ ] Refresh button re-fetches campaigns

### Backend Integration
- [ ] `campaign.setup.list` returns correct data
- [ ] `campaign.setup.load` loads campaign
- [ ] `campaign.setup.delete` removes campaign
- [ ] `last_played` timestamp updates
- [ ] Files created in `saved_campaigns/` directory
- [ ] Campaigns sort by most recent

### End-to-End
- [ ] Create new campaign → appears in list
- [ ] Load campaign → room displays with campaign data
- [ ] Load another campaign → switches campaigns
- [ ] Delete campaign → removed from list
- [ ] Page refresh → start screen persists data

---

## Performance Considerations

- Campaign JSON files: ~5-15 KB each
- List endpoint: O(n) where n = number of campaigns
- Load endpoint: O(1) file read
- Delete endpoint: O(1) file delete
- Frontend: No performance issues with <100 campaigns

---

## Future Enhancements

1. **Campaign Sharing**: Export/import campaigns between systems
2. **Cloud Sync**: Save campaigns to cloud storage
3. **Campaign Versioning**: Track changes over time
4. **Collaborative Editing**: Multiple DMs edit same campaign
5. **Campaign Templates**: Pre-built campaign configurations
6. **DM Notes**: Session notes and changes per campaign
7. **Player Feedback**: Integrated feedback system

---

## Status

✅ **Components Complete**:
- DMStartScreen.tsx/css
- LoadCampaignModal.tsx/css
- CampaignSetupForm.tsx/css (already built)
- CampaignSetupModal.tsx/css (already built)

✅ **Backend Complete**:
- message_handlers.py: +3 new handlers
- campaign_setup.py: +5 new functions
- Persistence implemented

⏳ **Integration Pending**:
- Update App.tsx with workflow
- Add state management for screens
- Test end-to-end

---

**Ready for Integration!** 🎲✨

Follow the integration steps above to bring the complete DM workflow into the Arcane Engine.
