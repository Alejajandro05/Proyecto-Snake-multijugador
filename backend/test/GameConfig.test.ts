import assert from "assert";
import { resolveGameRuntimeConfig } from "../../shared/src/domain/GameConfig.js";

describe("GameConfig responsiveness presets", () => {
  it("keeps gameplay ticks responsive while preserving clear difficulty tiers", () => {
    const easy = resolveGameRuntimeConfig({ difficulty: "easy" });
    const normal = resolveGameRuntimeConfig({ difficulty: "normal" });
    const hard = resolveGameRuntimeConfig({ difficulty: "hard" });

    assert.ok(easy.tickMs > normal.tickMs, `easy should be slower than normal: easy=${easy.tickMs} normal=${normal.tickMs}`);
    assert.ok(normal.tickMs > hard.tickMs, `normal should be slower than hard: normal=${normal.tickMs} hard=${hard.tickMs}`);

    assert.ok(easy.tickMs >= 130 && easy.tickMs <= 145, `easy should stay slow but responsive: ${easy.tickMs}ms`);
    assert.ok(normal.tickMs >= 105 && normal.tickMs <= 120, `normal should feel balanced: ${normal.tickMs}ms`);
    assert.ok(hard.tickMs >= 80 && hard.tickMs <= 95, `hard should stay fast: ${hard.tickMs}ms`);
  });
});
