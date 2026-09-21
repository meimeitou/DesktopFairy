import { Form, FormItem, Button, Input, Modal, Radio } from "animal-island-ui";
import type { CuratedModelKind } from "../../shared/modelKind";
import { MODEL_KIND_LABELS } from "../../shared/modelKind";

interface Props {
  providerName: string;
  onClose: () => void;
  onConfirm: (modelId: string, kind: CuratedModelKind) => void;
}

export default function AddModelModal({ providerName, onClose, onConfirm }: Props) {
  return (
    <Modal
      open
      title="添加模型"
      onClose={onClose}
      width={420}
      className="provider-form-modal"
      footer={null}
      typewriter={false}
    >
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
          <Input
            type="text"
            shadow
            placeholder="gpt-4o-mini / text-embedding-3-small"
            autoFocus
          />
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
          <Button type="primary" htmlType="button" onClick={onClose}>
            取消
          </Button>
          <Button type="primary" htmlType="submit">
            添加
          </Button>
        </div>
      </Form>
    </Modal>
  );
}
