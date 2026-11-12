import { Button, warning } from '@cherrystudio/ui';
import type { AgentInputItem } from '../../shared/agentInputs';
import type { ChatMsg } from '../../shared/chatMessages';

export default function AgentPendingInputs({ pending, streaming, withdraw, onRestore, onContinue }: {
  pending: AgentInputItem[];
  streaming: boolean;
  withdraw: (id: string) => Promise<ChatMsg | null>;
  onRestore: (message: ChatMsg) => void;
  onContinue: () => void;
}) {
  if (!pending.length) return null;
  return <div className="agent-pending-inputs" aria-label="待处理补充消息" aria-live="polite">
    {pending.map(({ message }) => <div className="agent-pending-input" key={message.id}>
      <div className="agent-pending-input-heading"><span>待处理 · {streaming ? '下一步生效' : '等待继续'}</span>
        <Button variant="ghost" size="sm" onClick={() => {
          void withdraw(message.id).then((restored) => {
            if (restored) onRestore(restored);
            else warning('该消息已交给模型，无法撤回。');
          }).catch((e) => warning(`撤回失败：${String(e)}`));
        }}>撤回修改</Button>
      </div>
      <p>{message.content}</p>
      {!!message.attachments?.length && <small>{message.attachments.map((a) => a.name).join('、')}</small>}
    </div>)}
    {!streaming && <Button variant="outline" size="sm" onClick={onContinue}>继续处理补充</Button>}
  </div>;
}
