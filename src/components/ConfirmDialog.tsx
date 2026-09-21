import { Button, Modal } from "animal-island-ui";

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  /** 确认按钮文案，默认"确定" */
  okText?: string;
  danger?: boolean;
  children?: React.ReactNode;
  onOk: () => void;
  onClose: () => void;
}

/** 库 Modal 版 window.confirm：标题 + 说明 + 确定/取消。 */
export default function ConfirmDialog({
  open,
  title,
  okText = "确定",
  danger = false,
  children,
  onOk,
  onClose,
}: ConfirmDialogProps) {
  return (
    <Modal
      open={open}
      title={title}
      onClose={onClose}
      typewriter={false}
      footer={
        <>
          <Button onClick={onClose}>取消</Button>
          <Button type="primary" danger={danger} onClick={onOk}>
            {okText}
          </Button>
        </>
      }
    >
      {children}
    </Modal>
  );
}
