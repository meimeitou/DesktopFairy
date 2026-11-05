import { Button, Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, Input } from "@cherrystudio/ui";
import { Form, FormItem, useForm } from "../Form";
import { Checkbox, Radio } from "../Choice";

import type { ProviderType } from "../../shared/providers";

interface Props {
  onClose: () => void;
  onConfirm: (name: string, type: ProviderType) => void;
}

export default function AddProviderModal({ onClose, onConfirm }: Props) {
  return (
    <Dialog open={true} onOpenChange={(next) => { if (!next) (onClose)(); }}>
      <DialogContent className={"provider-form-modal"} style={{ maxWidth: 420 }}>
        <DialogHeader><DialogTitle>{"添加服务商"}</DialogTitle></DialogHeader>
        
      <Form
        layout="vertical"
        colon={false}
        requiredMark
        initialValues={{ name: "", type: "openai" as ProviderType }}
        onFinish={(values) => {
          const name = String(values.name ?? "").trim();
          if (!name) return;
          onConfirm(name, values.type as ProviderType);
        }}
      >
        <FormItem
          label="名称"
          name="name"
          rules={[
            { required: true, whitespace: true, message: "请输入名称" },
          ]}
        >
          <Input type="text" placeholder="例如：DeepSeek、本地 Ollama" autoFocus />
        </FormItem>
        <FormItem
          label="类型"
          name="type"
          help="决定请求怎么拼、模型列表从哪拉。多数第三方选 OpenAI 兼容。"
        >
          <Radio
            direction="vertical"
            options={[
              { value: "openai", label: "OpenAI 兼容 API" },
              { value: "openai-response", label: "OpenAI Responses API" },
              { value: "anthropic", label: "Anthropic Messages API" },
              { value: "ollama", label: "Ollama" },
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
