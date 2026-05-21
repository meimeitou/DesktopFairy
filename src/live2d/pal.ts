// Platform abstraction: delta-time tracking (equivalent to LAppPal).

let s_currentFrame = 0.0;
let s_lastFrame = 0.0;
let s_deltaTime = 0.0;

/** Call once per frame at the start of the render loop to advance the clock. */
export function updateTime(): void {
  s_currentFrame = Date.now() / 1000.0;
  s_deltaTime = s_currentFrame - s_lastFrame;
  s_lastFrame = s_currentFrame;
}

/** Seconds elapsed since the last updateTime() call. */
export function getDeltaTime(): number {
  return s_deltaTime;
}

export function printMessage(message: string): void {
  console.log(message);
}
