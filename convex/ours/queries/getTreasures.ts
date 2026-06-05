import { v } from 'convex/values';
import { query } from '../../_generated/server';

// Public query — returns all treasures for a world, newest first.
// The instructor dashboard and/or any UI can subscribe to this to
// show treasure status.
export default query({
  args: {
    worldId: v.id('worlds'),
    status: v.optional(v.union(v.literal('hidden'), v.literal('claimed'))),
  },
  handler: async (ctx, args) => {
    let q = ctx.db
      .query('treasures')
      .withIndex('by_world_status', (q) => {
        if (args.status) {
          return q.eq('worldId', args.worldId).eq('status', args.status);
        }
        return q.eq('worldId', args.worldId);
      });

    const treasures = await q.order('desc').collect();

    return treasures.map((t) => ({
      _id: t._id,
      x: t.x,
      y: t.y,
      status: t.status,
      hint: t.hint,
      reward: t.reward,
      hiddenAt: t.hiddenAt,
      claimedBy: t.claimedBy,
      claimedAt: t.claimedAt,
    }));
  },
});
