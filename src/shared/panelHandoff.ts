/**
 * Commands that must survive the target panel not being mounted yet.
 * Chat keeps terminal / knowledge unmounted until the first visit, so a
 * window event fired in the same turn can arrive before the listener exists.
 * The producer stashes the payload, then dispatches the event as a wake-up.
 * The consumer takes the queue both from that listener and on mount.
 */

export type KnowledgeReveal = {
  baseId?: string;
  itemId?: string;
};

const terminalCommands: string[] = [];
const knowledgeReveals: KnowledgeReveal[] = [];

export function stashTerminalCommand(command: string) {
  if (!command) return;
  terminalCommands.push(command);
}

export function takeTerminalCommands(): string[] {
  return terminalCommands.splice(0);
}

export function stashKnowledgeReveal(reveal: KnowledgeReveal) {
  knowledgeReveals.push(reveal);
}

export function takeKnowledgeReveals(): KnowledgeReveal[] {
  return knowledgeReveals.splice(0);
}
