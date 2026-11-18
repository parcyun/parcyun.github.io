export function createMusicRotation(tracks, random = Math.random) {
  let cycle = [];
  let previous;
  return () => {
    if (!cycle.length) {
      cycle = [...tracks];
      for (let index = cycle.length - 1; index > 0; index--) {
        const swap = Math.floor(random() * (index + 1));
        [cycle[index], cycle[swap]] = [cycle[swap], cycle[index]];
      }
      if (cycle.length > 1 && cycle[0] === previous) {
        const swap = 1 + Math.floor(random() * (cycle.length - 1));
        [cycle[0], cycle[swap]] = [cycle[swap], cycle[0]];
      }
    }
    previous = cycle.shift();
    return previous;
  };
}
