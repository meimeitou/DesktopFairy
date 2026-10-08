/**
 * Merge committed React topic states back into the ref map without
 * clobbering live stream progress.
 *
 * Stream patches are ref-first: they write topicStatesRef synchronously and
 * let React state catch up asynchronously. A commit's passive effect must
 * therefore never copy committed state over a topic whose ref entry is still
 * streaming — committed state can lag behind the ref (chunks landed between
 * render and effect), and rolling the ref back would permanently drop those
 * deltas: the next patch rebuilds from the stale ref.
 */
export function mergeRefTopicStates<T extends { streaming: boolean }>(
  refStates: Record<string, T>,
  committedStates: Record<string, T>,
): Record<string, T> {
  const next = { ...refStates };
  for (const [id, state] of Object.entries(committedStates)) {
    // Live accumulation truth — keep the ref entry. Skip when either side
    // still reports streaming: the ref may lead a pending commit, and an
    // older pre-done commit (streaming: true) must never roll the ref back
    // after done already landed (ref streaming already false).
    if (next[id]?.streaming || state.streaming) continue;
    next[id] = state;
  }
  for (const id of Object.keys(next)) {
    if (!(id in committedStates)) delete next[id];
  }
  return next;
}
