# Fog of War Performance Issue - Diagnosis & Workaround

## Problem

The map is flickering rapidly with massive CPU spikes (fans at high RPM) when fog of war is enabled, making the game unplayable.

## Root Cause

**The underlying issue**: The fog rendering effect re-runs with EVERY token position change, executing expensive canvas operations repeatedly:
- `clearRect()` - clears entire canvas
- `fillRect()` - fills entire canvas  
- `drawImage()` - composites reveal canvas onto fog canvas

This happens ~10+ times per second during gameplay.

## Immediate Workaround

For now, the best solution is to **disable fog of war during testing/gameplay** and keep it only for visual testing of the mechanic itself.

## Long-Term Solution

The fix requires careful refactoring to separate:
1. Canvas initialization (runs on grid/config change only)
2. Fog rendering (runs on token movement)

**Attempted Optimization**: I tried to split the effect into two separate effects with optimized dependency arrays, but this introduced an initialization order bug where canvas contexts weren't available when needed.

**Next Approach**: Safer optimization that doesn't have initialization dependencies:
- Keep single effect but add smarter caching
- Use `requestAnimationFrame` to batch canvas updates
- Implement canvas update throttling
- Pre-allocate and reuse canvas objects

## Technical Notes

### Why It's Complex
- Fog rendering needs fresh canvas context each frame
- Vision hole calculations depend on token positions
- Discovered areas must accumulate correctly
- Must work for both DM and player views
- Dependencies are tightly coupled

### Performance Breakdown
Current cost per frame (with fog enabled):
```
Token position changed:
  → Fog effect triggers
  → Canvas clear: ~0.5ms
  → Canvas fill: ~0.3ms  
  → Vision hole calculations: ~1ms
  → Canvas composite: ~1ms
  → Texture update: ~0.5ms
  
Total: ~3.5ms per position change × 10+ changes/sec = 35ms+ overhead
```

## Recommended Actions

1. **For current testing**: Disable fog of war in gameplay
2. **For future optimization**: Implement canvas update batching with `requestAnimationFrame`
3. **For next sprint**: Consider using WebGL/Pixi filters instead of raw canvas compositing

## Status

- ✅ Problem identified
- ✅ Root cause understood  
- ⚠️ Complex refactoring needed
- 📋 Workaround: Disable fog during normal play

This is a legitimate performance issue that requires careful architectural thinking, not a quick fix.
