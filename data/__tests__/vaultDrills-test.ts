import { VAULT_DRILLS, drillStepsForCourt } from '../vaultDrills';

describe('drillStepsForCourt', () => {
  const dims = {
    width: 400,
    height: 800,
    linesRect: { x: 30, y: 120, width: 340, height: 560 },
  };

  it('maps the reference net (y=0.5) onto the lines-rect center', () => {
    const [step] = drillStepsForCourt(VAULT_DRILLS[0].steps.slice(0, 1), dims);
    // First drill's opening shuttle is at reference (0.5, 0.5) = the net.
    expect(step.shuttle.x).toBeCloseTo((30 + 0.5 * 340) / 400, 5);
    expect(step.shuttle.y).toBeCloseTo((120 + 0.5 * 560) / 800, 5);
  });

  it('keeps every drill position inside the lines rect', () => {
    for (const drill of VAULT_DRILLS) {
      for (const step of drillStepsForCourt(drill.steps, dims)) {
        for (const pos of [...step.players.team1, ...step.players.team2, step.shuttle]) {
          expect(pos.x * dims.width).toBeGreaterThanOrEqual(dims.linesRect.x - 1);
          expect(pos.x * dims.width).toBeLessThanOrEqual(dims.linesRect.x + dims.linesRect.width + 1);
          expect(pos.y * dims.height).toBeGreaterThanOrEqual(dims.linesRect.y - 1);
          expect(pos.y * dims.height).toBeLessThanOrEqual(dims.linesRect.y + dims.linesRect.height + 1);
        }
      }
    }
  });

  it('returns steps unchanged when no lines rect is available', () => {
    expect(drillStepsForCourt(VAULT_DRILLS[0].steps, { width: 400, height: 800 })).toEqual(
      VAULT_DRILLS[0].steps
    );
  });
});

describe('vault drill data integrity', () => {
  it('has unique ids and at least one free drill', () => {
    const ids = VAULT_DRILLS.map((drill) => drill.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(VAULT_DRILLS.some((drill) => !drill.premium)).toBe(true);
    expect(VAULT_DRILLS.some((drill) => drill.premium)).toBe(true);
  });

  VAULT_DRILLS.forEach((drill) => {
    describe(drill.name, () => {
      const playersPerTeam = drill.isDoubles ? 2 : 1;

      it('has enough steps and correct team sizes', () => {
        expect(drill.steps.length).toBeGreaterThanOrEqual(2);
        for (const step of drill.steps) {
          expect(step.players.team1).toHaveLength(playersPerTeam);
          expect(step.players.team2).toHaveLength(playersPerTeam);
          expect(step.ghostPositions.team1).toHaveLength(playersPerTeam);
          expect(step.ghostPositions.team2).toHaveLength(playersPerTeam);
        }
      });

      it('keeps every coordinate on or near the court (0..1)', () => {
        for (const step of drill.steps) {
          const points = [
            ...step.players.team1,
            ...step.players.team2,
            step.shuttle,
            ...step.ghostPositions.team1,
            ...step.ghostPositions.team2,
            step.ghostPositions.shuttle,
          ];
          for (const { x, y } of points) {
            expect(x).toBeGreaterThanOrEqual(0);
            expect(x).toBeLessThanOrEqual(1);
            expect(y).toBeGreaterThanOrEqual(0);
            expect(y).toBeLessThanOrEqual(1);
          }
        }
      });

      it('chains ghosts to the previous step', () => {
        drill.steps.forEach((step, index) => {
          const prev = index > 0 ? drill.steps[index - 1] : step;
          expect(step.ghostPositions.team1).toEqual(prev.players.team1);
          expect(step.ghostPositions.team2).toEqual(prev.players.team2);
          expect(step.ghostPositions.shuttle).toEqual(prev.shuttle);
        });
      });

      it('keeps teams on their own side of the net', () => {
        for (const step of drill.steps) {
          for (const pos of step.players.team1) expect(pos.y).toBeLessThan(0.5);
          for (const pos of step.players.team2) expect(pos.y).toBeGreaterThan(0.5);
        }
      });
    });
  });
});
