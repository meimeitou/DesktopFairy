import { Button } from "animal-island-ui";
import { useState } from "react";
import type { KnowledgeCitation } from "../../shared/knowledge";
import "./KnowledgeCitations.css";

export function KnowledgeCitations({
  citations,
  onOpen,
}: {
  citations?: KnowledgeCitation[];
  onOpen?: (citation: KnowledgeCitation) => void;
}) {
  const [openId, setOpenId] = useState<string | null>(null);
  if (!citations?.length) return null;
  return (
    <div className="kb-citations">
      {citations.map((c, i) => {
        const key = `${c.itemId}-${i}`;
        return (
          <div key={key} className="kb-citation">
            <Button
              type="link"
              size="small"
              className="kb-citation-btn"
              onClick={() => setOpenId(openId === key ? null : key)}
              title={
                c.kind === "semi_structured"
                  ? "半结构化文件（全文注入）"
                  : "向量片段"
              }
            >
              {c.kind === "semi_structured" ? "📄 " : ""}
              {c.baseName} / {c.sourceName}
            </Button>
            {openId === key && (
              <div className="kb-citation-pop">
                {c.kind === "semi_structured" ? (
                  <>
                    <p style={{ fontSize: 11, opacity: 0.7 }}>
                      本次已整篇注入上下文。描述预览：
                    </p>
                    <pre>{c.text || "（无描述）"}</pre>
                  </>
                ) : (
                  <pre>{c.text}</pre>
                )}
                {onOpen && (
                  <Button type="text" onClick={() => onOpen(c)}>
                    在知识库中查看
                  </Button>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
