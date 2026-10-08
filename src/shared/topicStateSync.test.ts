import { describe, it, expect } from 'vitest'
import { mergeRefTopicStates } from './topicStateSync'

type St = { streaming: boolean; messages: { content: string }[] }

const st = (streaming: boolean, content: string): St => ({
  streaming,
  messages: [{ content }],
})

describe('mergeRefTopicStates', () => {
  it('keeps the ref entry for a streaming topic when committed state lags behind', () => {
    // Regression: chunks landed in the ref between render and passive effect.
    // The old merge took committed state for the active topic unconditionally,
    // rolling the ref back and permanently dropping the landed deltas.
    const ref = { t1: st(true, 'AB C') }
    const committed = { t1: st(true, 'AB') }
    const merged = mergeRefTopicStates(ref, committed)
    expect(merged.t1.messages[0].content).toBe('AB C')
  })

  it('takes committed state for idle topics (user edits win)', () => {
    const ref = { t1: st(false, 'old') }
    const committed = { t1: st(false, 'new') }
    expect(mergeRefTopicStates(ref, committed).t1.messages[0].content).toBe(
      'new',
    )
  })

  it('adds topics missing from the ref', () => {
    const committed = { t2: st(false, 'x') }
    expect(mergeRefTopicStates({}, committed)).toEqual(committed)
  })

  it('keeps the ref entry when a stale pre-done commit (streaming) arrives after done landed', () => {
    // Race: done flipped ref.streaming to false; a delayed effect for an
    // older commit still says streaming. It must not roll the ref back.
    const ref = { t1: st(false, 'final') }
    const staleCommit = { t1: st(true, 'partial') }
    expect(mergeRefTopicStates(ref, staleCommit).t1.messages[0].content).toBe(
      'final',
    )
  })

  it('removes topics deleted from committed state even while streaming', () => {
    const ref = { t1: st(true, 'x'), t2: st(false, 'y') }
    const committed = { t2: st(false, 'y') }
    expect(mergeRefTopicStates(ref, committed)).toEqual({ t2: committed.t2 })
  })
})
