import test from "node:test";
import assert from "node:assert/strict";
import { Battle as SpellBattle } from "../server/spell-battle/engine.mjs";
import { Battle as GeoBattle } from "../server/geoweb-battle/engine.mjs";

const cutoff = Date.parse("2026-11-18T17:00:00+09:00");
const host = { id: "host", subject: "browser:host", name: "진행자", kind: "browser" };

for (const [name, Engine] of [["Spell Drill", SpellBattle], ["GeoWeb", GeoBattle]]) {
  test(`${name} closes unfinished rooms at 17:00 Korean time`, () => {
    let now = cutoff - 1;
    const engine = new Engine({}, { now: () => now });
    const rooms = ["lobby", "starting", "playing", "between"].map(phase => {
      const room = engine.create(host);
      room.phase = phase;
      room.startsAt = room.deadline = room.nextAt = cutoff + 60000;
      return room;
    });
    assert.equal(engine.view(rooms[0], host.id).dailyClosed, false);
    now = cutoff;
    for (const room of rooms) {
      const view = engine.view(room, host.id);
      assert.equal(view.phase, "cancelled");
      assert.equal(view.dailyClosed, true);
      assert.equal(room.closedAt, cutoff);
      assert.throws(() => engine.join(room.code, host));
    }
    assert.equal(engine.view(engine.create(host), host.id).phase, "lobby");
  });

  test(`${name} preserves finished results and applies cutoff to rematches`, () => {
    let now = cutoff - 1;
    const engine = new Engine({}, { now: () => now });
    const room = engine.create(host);
    room.phase = "finished";
    now = cutoff;
    assert.equal(engine.view(room, host.id).phase, "finished");
    engine.rematch(room.code, host.id);
    assert.equal(engine.view(room, host.id).phase, "lobby");
    now += 24 * 60 * 60 * 1000;
    assert.equal(engine.view(room, host.id).dailyClosed, true);
  });
}
