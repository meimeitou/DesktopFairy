import { ConfirmDialog as CherryConfirmDialog } from "@cherrystudio/ui";
import type { ReactNode } from "react";

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  /** 确认按钮文案，默认"确定" */
  okText?: string;
  danger?: boolean;
  children?: ReactNode;
  onOk: () => void;
  onClose: () => void;
}

/** Cherry confirm dialog: title, explanation, confirm and cancel. */
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
    <CherryConfirmDialog
      open={open}
      title={title}
      onOpenChange={(next) => {
        if (!next) onClose();
      }}
      confirmText={okText}
      cancelText="取消"
      destructive={danger}
      onConfirm={onOk}
      content={children}
    />
  );
}
