import { memo } from "react";
import type { ChatMsg } from "../../shared/chatMessages";
import AgentToolRenderer from "./agentTools/AgentToolRenderer";

/** Tool history is read-only; pending actions live in AgentInteractionPanel. */
function ToolCallBubble({ msg }: { msg: ChatMsg }) {
  return <div className="msg msg-tool"><AgentToolRenderer msg={msg} /></div>;
}

export default memo(ToolCallBubble);
