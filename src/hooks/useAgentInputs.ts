import { useEffect, useRef, useState } from 'react';
import { warning } from '@cherrystudio/ui';
import type { AgentInputSnapshot, AgentInputItem, AgentInputPayload } from '../shared/agentInputs';
import type { ChatMsg } from '../shared/chatMessages';

const api = window.electronAPI;
export function useAgentInputs(topicId: string | null) {
  const [snapshot, setSnapshot] = useState<AgentInputSnapshot>({ topicId: '', items: [] });
  const generation = useRef(0);
  useEffect(() => {
    if (!topicId) return;
    let active = true;
    const ticket = ++generation.current;
    let receivedPush = false;
    const off = api.onAgentInputUpdated?.((next) => {
      if (next.topicId !== topicId || !active) return;
      receivedPush = true;
      setSnapshot(next);
    });
    void api.invoke('ai:stream_inputs', { topicId }).then((next: AgentInputSnapshot) => {
      if (active && generation.current === ticket && !receivedPush) setSnapshot(next);
    }).catch((e) => { if (active) warning(`读取补充消息失败：${String(e)}`); });
    return () => { active = false; off?.(); };
  }, [topicId]);
  const pending: AgentInputItem[] = snapshot.topicId === topicId ? snapshot.items.filter((item) => item.status === 'pending') : [];
  return {
    pending,
    async enqueue(requestId: string, input: AgentInputPayload) {
      const result = await api.invoke('ai:stream_enqueue', { topicId, requestId, input }) as AgentInputSnapshot & { mode: string };
      // A push may already contain a newer consumption state; never overwrite it with this response.
      return result.mode === 'queued';
    },
    async withdraw(messageId: string): Promise<ChatMsg | null> {
      const result = await api.invoke('ai:stream_withdraw', { topicId, messageId }) as { message: ChatMsg | null };
      return result.message;
    },
  };
}
