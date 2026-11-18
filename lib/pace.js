const GAP_MS = 10_000;

let tail = Promise.resolve();
let lastFinished = 0;

// schedule.yale.edu asks crawlers to wait 10 seconds between requests.
export function pace(task) {
  const run = tail.then(async () => {
    const wait = lastFinished + GAP_MS - Date.now();
    if (wait > 0) await delay(wait);
    try {
      return await task();
    } finally {
      lastFinished = Date.now();
    }
  });
  tail = run.then(
    () => {},
    () => {},
  );
  return run;
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
