# Quick Start - DM Workflow Integration

## TL;DR - 5 Minutes to Integration

### Files to Add/Update

**New Frontend Files** ✅ DONE:
- `frontend/src/components/DMStartScreen.tsx`
- `frontend/src/components/DMStartScreen.css`
- `frontend/src/components/LoadCampaignModal.tsx`
- `frontend/src/components/LoadCampaignModal.css`

**Existing Frontend Files** ✅ ALREADY BUILT:
- `frontend/src/components/CampaignSetupForm.tsx`
- `frontend/src/components/CampaignSetupModal.tsx`

**Backend Files** ✅ DONE:
- `backend/app/message_handlers.py` (updated with 3 new handlers)
- `backend/app/campaign_setup.py` (updated with 5 new functions)

---

## Integration Steps

### Step 1: Update App.tsx (Top of file)

Add imports:
```typescript
import DMStartScreen from "./components/DMStartScreen";
import CampaignSetupModal from "./components/CampaignSetupModal";
import LoadCampaignModal from "./components/LoadCampaignModal";
```

### Step 2: Add State

```typescript
const [currentScreen, setCurrentScreen] = useState<"start" | "room">("start");
const [showCampaignSetup, setShowCampaignSetup] = useState(false);
const [showLoadModal, setShowLoadModal] = useState(false);
const [recentCampaigns, setRecentCampaigns] = useState([]);
const [isTransitioning, setIsTransitioning] = useState(false);
```

### Step 3: Add Functions

```typescript
const handleCampaignCreated = (formData: any) => {
  setShowCampaignSetup(false);
  setCurrentScreen("room");
};

const handleLoadCampaign = async (campaignId: string) => {
  setIsTransitioning(true);
  try {
    await sendWebSocketMessage({
      type: "campaign.setup.load",
      campaign_id: campaignId,
    });
    setShowLoadModal(false);
    setCurrentScreen("room");
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
    if (response?.campaigns) {
      setRecentCampaigns(response.campaigns.slice(0, 3));
    }
  } catch (error) {
    console.error("Error loading recent campaigns:", error);
  }
};
```

### Step 4: Use Effect to Load Recent Campaigns

```typescript
useEffect(() => {
  loadRecentCampaigns();
}, []);
```

### Step 5: Conditional Render

Wrap main app rendering:

```typescript
return (
  <>
    {currentScreen === "start" || !room.id ? (
      <>
        <DMStartScreen
          onNewCampaign={() => setShowCampaignSetup(true)}
          onLoadCampaign={() => setShowLoadModal(true)}
          onRecentCampaign={handleLoadCampaign}
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
    ) : (
      <>
        {/* Existing app content */}
        <TopBar /* ... */ />
        <RoomInterface /* ... */ />
      </>
    )}
  </>
);
```

---

## Key Flows

### New Campaign
```
Start Screen → Click "New Campaign" → CampaignSetupForm (8 steps)
→ Submit → Backend: campaign.setup.submit → save_campaign() 
→ Room loads with campaign
```

### Load Campaign
```
Start Screen → Click "Load Game" → LoadCampaignModal
→ Backend: campaign.setup.list → Display campaigns
→ Click campaign → Backend: campaign.setup.load → load_campaign()
→ Room loads with campaign
```

### Delete Campaign
```
LoadCampaignModal → Click delete on campaign
→ Confirmation → Backend: campaign.setup.delete → delete_campaign()
→ List refreshes
```

---

## WebSocket Messages

### Submit New Campaign
```json
{
  "type": "campaign.setup.submit",
  "responses": {
    "campaign_name": "...",
    "story_type": "...",
    // ... all form fields
  }
}
```

### List Campaigns
```json
{
  "type": "campaign.setup.list"
}
→ Response: { "type": "campaign.setup.list_response", "campaigns": [...] }
```

### Load Campaign
```json
{
  "type": "campaign.setup.load",
  "campaign_id": "uuid-123"
}
→ Response: { "type": "campaign.setup.loaded", "campaign_id": "...", "ai_prompt": "..." }
```

### Delete Campaign
```json
{
  "type": "campaign.setup.delete",
  "campaign_id": "uuid-123"
}
→ Response: { "type": "campaign.setup.deleted", "campaign_id": "..." }
```

---

## Backend Changes

### message_handlers.py
- Added `handle_campaign_setup_list`
- Added `handle_campaign_setup_load`
- Added `handle_campaign_setup_delete`
- Updated HANDLERS dict with 3 new entries

### campaign_setup.py
- Added `save_campaign()`
- Added `load_campaign()`
- Added `delete_campaign()`
- Added `list_campaigns()`
- Added helper functions

---

## File Locations

```
saved_campaigns/
├── uuid-1.json        (Dragon's Hoard campaign)
├── uuid-2.json        (Dark Tower campaign)
└── uuid-3.json        (Lost City campaign)
```

Each file contains full campaign data as JSON.

---

## Testing Checklist

- [ ] DMStartScreen renders on app load
- [ ] "New Campaign" button works
- [ ] "Load Game" button works  
- [ ] Recent campaigns display
- [ ] CampaignSetupForm appears with Step 1
- [ ] Form validates and navigates steps
- [ ] Submit creates campaign file
- [ ] LoadCampaignModal lists campaigns
- [ ] Search/filter works
- [ ] Delete campaign works
- [ ] Load campaign transitions to room
- [ ] Campaign data persists after refresh
- [ ] Works on mobile

---

## Files to Check

If you get errors:

1. **Backend won't start**
   - Check: `backend/app/message_handlers.py` line ~1050-1180 (new handlers)
   - Check: `backend/app/campaign_setup.py` line ~520-680 (new functions)
   - Make sure HANDLERS dict has all 3 new entries

2. **Campaign not saving**
   - Check: `backend/` directory has `saved_campaigns/` created
   - Check: File permissions allow write access
   - Check: `campaign_setup.py` has `save_campaign()` function

3. **Components not showing**
   - Check: All imports in `App.tsx` are correct
   - Check: All 4 component files exist
   - Check: No TypeScript errors in components

4. **WebSocket errors**
   - Check: Message type matches handler name in HANDLERS dict
   - Check: `useRoomSocket` handles new message types
   - Check: Backend router properly dispatches messages

---

## Quick Debugging

### Backend Issues
```bash
cd backend
python -m py_compile app/message_handlers.py
python -m py_compile app/campaign_setup.py
```

### Frontend Issues
```bash
cd frontend
npm run lint -- src/components/DMStartScreen.tsx
npm run lint -- src/components/LoadCampaignModal.tsx
```

### File Not Found
```bash
ls -la backend/app/message_handlers.py
ls -la backend/app/campaign_setup.py
```

---

## Rollback Plan

If something breaks:

1. Revert `App.tsx` to show room interface (remove screen check)
2. Comment out new HANDLERS entries in `message_handlers.py`
3. Remove new functions from `campaign_setup.py`
4. Delete `DMStartScreen.tsx`, `LoadCampaignModal.tsx`
5. Restart backend and frontend

---

## Support

For detailed information, see:
- **DM_START_WORKFLOW.md** - Complete integration guide
- **DM_WORKFLOW_SUMMARY.md** - Build summary
- **CAMPAIGN_SETUP_UI.md** - Campaign form documentation

---

**Status**: ✅ READY TO INTEGRATE

Time to integrate: **15-20 minutes**  
Time to test: **20-30 minutes**

Let's go! 🎲✨
