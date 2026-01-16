# Item Icon Taxonomy

This folder holds item icon images served via `/static/items/...`.

Naming rules:
- Filename must match the **item id** in `Item-database/ItemsDB.xml`.
- Item ids are generated as `{baseId}_t{tier}` (ex: `longsword_t2`).
- Use `.png` with transparency.

Path scheme:
```
/static/items/{category}/{slot}/{itemId}.png
```

Examples:
- `/static/items/weapons/mainhand/longsword_t2.png`
- `/static/items/armor/chest/chainShirt_t1.png`
- `/static/items/jewelry/ring/signetRing_t3.png`

Categories:
- `weapons`
- `armor`
- `jewelry`
- `misc`

Slots (current UI):
- `mainhand`
- `offhand`
- `head`
- `shoulders`
- `chest`
- `bracers`
- `gloves`
- `belt`
- `legs`
- `boots`
- `ring`
- `necklace`
- `bag`

Suggested icon size:
- 256x256 (PNG with transparency)
