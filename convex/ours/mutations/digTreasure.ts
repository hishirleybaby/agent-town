import { v } from 'convex/values';
import { mutation } from '../../_generated/server';

// digTreasure — checks whether a player is standing on a hidden
// treasure. If so, claims it for that player (first-come-first-served).
// Subsequent digs at the same tile return "already claimed".
//
// Reads player position from the serialized `worlds` document (read-only,
// no game-state mutation) and writes only to the `treasures` table.
//
// Dependencies mocked: reward is logged to console + stored in
// treasures.reward instead of granting real currency (#5) or inventory
// (#7) items.

export default mutation({
  args: {
    worldId: v.id('worlds'),
    playerId: v.string(),
  },
  handler: async (ctx, args) => {
    // 1. Read world document to get player position.
    const worldDoc = await ctx.db.get(args.worldId);
    if (!worldDoc) {
      throw new Error(`World ${args.worldId} not found`);
    }

    const players: Array<{ id: string; position: { x: number; y: number } }> =
      worldDoc.players as any;
    const player = players.find((p) => p.id === args.playerId);
    if (!player) {
      return {
        success: false,
        reason: `Player ${args.playerId} not found in world ${args.worldId}`,
      };
    }

    const px = Math.floor(player.position.x);
    const py = Math.floor(player.position.y);

    // 2. Find active (hidden) treasures at this position.
    const hiddenTreasures = await ctx.db
      .query('treasures')
      .withIndex('by_world_status', (q) =>
        q.eq('worldId', args.worldId).eq('status', 'hidden'),
      )
      .collect();

    const matched = hiddenTreasures.find((t) => t.x === px && t.y === py);

    if (!matched) {
      // Also check if there was a claimed treasure here (better error message).
      const claimedTreasures = await ctx.db
        .query('treasures')
        .withIndex('by_world_status', (q) =>
          q.eq('worldId', args.worldId).eq('status', 'claimed'),
        )
        .collect();
      const wasClaimed = claimedTreasures.find((t) => t.x === px && t.y === py);
      if (wasClaimed) {
        return {
          success: false,
          reason: `宝藏已被 ${wasClaimed.claimedBy} 挖走了！`,
        };
      }
      return {
        success: false,
        reason: `位置 (${px}, ${py}) 没有宝藏。`,
        playerPosition: { x: px, y: py },
      };
    }

    // 3. Claim the treasure.
    const now = Date.now();
    await ctx.db.patch(matched._id, {
      status: 'claimed',
      claimedBy: args.playerId,
      claimedAt: now,
    });

    // Mock reward delivery: log to console (replace with real currency/
    // inventory mutations when #5 / #7 land).
    console.log(
      `[digTreasure] 🎉 ${args.playerId} 挖到了宝藏！位置：(${matched.x}, ${matched.y}) 奖励：${matched.reward}`,
    );

    return {
      success: true,
      treasureId: matched._id,
      x: matched.x,
      y: matched.y,
      hint: matched.hint,
      reward: matched.reward,
      claimedBy: args.playerId,
      claimedAt: now,
    };
  },
});
