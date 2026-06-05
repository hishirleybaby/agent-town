import { defineTable } from 'convex/server';
import { v } from 'convex/values';

// Treasure hunt (#16): treasure positions stored outside game state,
// checked by digTreasure mutation against player positions in the
// serialized world. Dependencies #5 (currency) and #7 (inventory) are
// mocked — reward is descriptive text + console.log.
export const treasures = defineTable({
  worldId: v.id('worlds'),
  x: v.number(),
  y: v.number(),
  status: v.union(v.literal('hidden'), v.literal('claimed')),
  hint: v.string(),
  reward: v.string(),
  hiddenAt: v.number(),
  claimedBy: v.optional(v.string()),
  claimedAt: v.optional(v.number()),
})
  .index('by_world_status', ['worldId', 'status'])
  .index('by_position', ['worldId', 'x', 'y']);
