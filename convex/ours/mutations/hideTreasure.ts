import { v } from 'convex/values';
import { mutation } from '../../_generated/server';

// hideTreasure — instructor places a treasure at a random walkable
// tile on the map. The treasure stays hidden until an agent walks to
// that tile and calls digTreasure.
//
// Dependencies mocked: reward is descriptive text (e.g. "100金币")
// instead of actual currency (#5) or inventory (#7) changes.

const LANDMARK_HINTS = [
  '一棵巨大的老橡树下',
  '一块长满青苔的石头旁',
  '花丛中间',
  '废弃的水井旁边',
  '小木桥的尽头',
  '一片空地的中央',
];

function generateHint(x: number, y: number, width: number, height: number): string {
  // Pick direction based on quadrant
  let direction: string;
  if (x < width / 3 && y < height / 3) direction = '小镇的西北角，';
  else if (x > (width * 2) / 3 && y < height / 3) direction = '小镇的东北角，';
  else if (x < width / 3 && y > (height * 2) / 3) direction = '小镇的西南角，';
  else if (x > (width * 2) / 3 && y > (height * 2) / 3) direction = '小镇的东南角，';
  else if (x < width / 3) direction = '小镇的西侧，';
  else if (x > (width * 2) / 3) direction = '小镇的东侧，';
  else if (y < height / 3) direction = '小镇的北边，';
  else if (y > (height * 2) / 3) direction = '小镇的南边，';
  else direction = '小镇的中心区域，';

  const landmark = LANDMARK_HINTS[Math.floor(Math.random() * LANDMARK_HINTS.length)];
  return `${direction}${landmark}`;
}

function isTileWalkable(objectTiles: number[][][], x: number, y: number): boolean {
  const ix = Math.floor(x);
  const iy = Math.floor(y);
  for (const layer of objectTiles) {
    if (ix < 0 || iy < 0 || ix >= layer.length || iy >= layer[0]?.length) {
      return false;
    }
    if (layer[ix][iy] !== -1) {
      return false;
    }
  }
  return true;
}

export default mutation({
  args: {
    worldId: v.id('worlds'),
    reward: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // 1. Read map to get dimensions and walkable tiles.
    const mapDoc = await ctx.db
      .query('maps')
      .withIndex('worldId', (q) => q.eq('worldId', args.worldId))
      .unique();
    if (!mapDoc) {
      throw new Error(`No map found for world ${args.worldId}`);
    }
    const { width, height, objectTiles } = mapDoc;

    // 2. Pick a random walkable tile (retry up to 200 times).
    let x: number | null = null;
    let y: number | null = null;
    for (let attempt = 0; attempt < 200; attempt++) {
      const cx = Math.floor(Math.random() * width);
      const cy = Math.floor(Math.random() * height);
      if (isTileWalkable(objectTiles, cx, cy)) {
        x = cx;
        y = cy;
        break;
      }
    }
    if (x === null || y === null) {
      throw new Error('Failed to find a walkable tile after 200 attempts');
    }

    // 3. Generate hint and reward.
    const hint = generateHint(x, y, width, height);
    const reward = args.reward ?? '100金币 + 神秘宝箱 ✨';

    // 4. Insert treasure row.
    const now = Date.now();
    const treasureId = await ctx.db.insert('treasures', {
      worldId: args.worldId,
      x,
      y,
      status: 'hidden',
      hint,
      reward,
      hiddenAt: now,
    });

    console.log(
      `[hideTreasure] 宝藏已藏在 (${x}, ${y})！提示：${hint} 奖励：${reward}`,
    );

    return {
      treasureId,
      x,
      y,
      hint,
      reward,
    };
  },
});
