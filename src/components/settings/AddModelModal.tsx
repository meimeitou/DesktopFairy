import { Button, Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, Input } from "@cherrystudio/ui";
import { Form, FormItem, useForm } from "../Form";
import { Checkbox, Radio } from "../Choice";

import type { CuratedModelKind } from "../../shared/modelKind";
import { MODEL_KIND_LABELS } from "../../shared/modelKind";

interface Props {
  providerName: string;
  onClose: () => void;
  onConfirm: (modelId: string, kind: CuratedModelKind) => void;
}

export default function AddModelModal({ providerName, onClose, onConfirm }: Props) {
  return (
    <Dialog open={true} onOpenChange={(next) => { if (!next) (onClose)(); }}>
      <DialogContent className={"provider-form-modal"} style={{ maxWidth: 420 }}>
        <DialogHeader><DialogTitle>{"添加模型"}</DialogTitle></DialogHeader>
        
      <Form
        layout="vertical"
        colon={false}
        requiredMark
        initialValues={{ modelId: "", kind: "chat" as CuratedModelKind }}
        onFinish={(values) => {
          const id = String(values.modelId ?? "").trim();
          if (!id) return;
          onConfirm(id, values.kind as CuratedModelKind);
        }}
      >
        <FormItem
          label="模型 ID"
          name="modelId"
          rules={[
            { required: true, whitespace: true, message: "请输入模型 ID" },
          ]}
        >
          <Input type="text" placeholder="gpt-4o-mini / text-embedding-3-small" autoFocus />
        </FormItem>
        <FormItem label="类型" name="kind">
          <Radio
            direction="vertical"
            options={[
              { value: "chat", label: MODEL_KIND_LABELS.chat },
              { value: "embedding", label: MODEL_KIND_LABELS.embedding },
              { value: "rerank", label: MODEL_KIND_LABELS.rerank },
            ]}
          />
        </FormItem>
        <div className="provider-modal-footer">
          <Button variant="default" type="button" onClick={onClose}>
            取消
          </Button>
          <Button variant="default" type="submit">
            添加
          </Button>
        </div>
      </Form>
    
        
      </DialogContent>
    </Dialog>
  );
}
