import type { SVGProps } from "react";

function Frame({
  children,
  strokeWidth = 3.5,
  ...props
}: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 48 48"
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      stroke="#2A2A2A"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      {children}
    </svg>
  );
}

export function SendIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <Frame {...props}>
      <path d="M8 25 L40 10 L27 40 L21 27 Z" fill="#E9C46A" stroke="#2A2A2A" strokeWidth={3.5} />
      <path d="M21 27 L40 10" fill="none" stroke="#2A2A2A" strokeWidth={3.5} />
    </Frame>
  );
}

export function StopIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <Frame {...props}>
      <rect x="12" y="12" width="24" height="24" rx="6" fill="#E76F51" stroke="#2A2A2A" strokeWidth={3.5} />
    </Frame>
  );
}

export function CopyIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <Frame {...props}>
      <rect x="16" y="14" width="22" height="26" rx="4" fill="#2A9D8F" stroke="#2A2A2A" strokeWidth={3.5} />
      <rect x="10" y="8" width="22" height="26" rx="4" fill="#E9C46A" stroke="#2A2A2A" strokeWidth={3.5} />
    </Frame>
  );
}

export function ForkIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <Frame {...props}>
      <path d="M24 42 V26" stroke="#2A2A2A" strokeWidth={3.5} />
      <path d="M24 26 C24 20, 14 20, 14 13" stroke="#2A2A2A" strokeWidth={3.5} />
      <path d="M24 26 C24 20, 34 20, 34 13" stroke="#2A2A2A" strokeWidth={3.5} />
      <circle cx="14" cy="10" r="4.5" fill="#E9C46A" stroke="#2A2A2A" strokeWidth={3} />
      <circle cx="34" cy="10" r="4.5" fill="#2A9D8F" stroke="#2A2A2A" strokeWidth={3} />
    </Frame>
  );
}

export function UploadIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <Frame {...props}>
      <path d="M24 6 L35 18 H29 V26 H19 V18 H13 Z" fill="#E9C46A" stroke="#2A2A2A" strokeWidth={3.5} />
      <path d="M10 32 V42 H38 V32" fill="none" stroke="#2A2A2A" strokeWidth={3.5} />
    </Frame>
  );
}

export function EraserIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <Frame {...props}>
      <g transform="rotate(-28 24 24)">
        <rect x="8" y="18" width="32" height="14" rx="3" fill="#F4A6A4" stroke="#2A2A2A" strokeWidth={3.5} />
        <path d="M28 18 V32" fill="none" stroke="#2A9D8F" strokeWidth={3.5} />
      </g>
    </Frame>
  );
}

export function CompactIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <Frame {...props}>
      <path d="M10 8 L24 18 L38 8" />
      <path d="M10 40 L24 30 L38 40" />
      <rect x="16" y="21" width="16" height="6" rx="2" fill="#E9C46A" stroke="#2A2A2A" strokeWidth={3} />
    </Frame>
  );
}

export function KeyboardIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <Frame {...props}>
      <rect x="4" y="10" width="40" height="28" rx="6" fill="#264653" stroke="#2A2A2A" strokeWidth={3.5} />
      <rect x="10" y="16" width="10" height="6" rx={1.5} fill="#FAEDCD" stroke="none" />
      <rect x="24" y="16" width="10" height="6" rx={1.5} fill="#FAEDCD" stroke="none" />
      <rect x="12" y="26" width="24" height="6" rx={1.5} fill="#FAEDCD" stroke="none" />
    </Frame>
  );
}

export function InfoIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <Frame {...props}>
      <circle cx="24" cy="24" r="15" fill="#2A9D8F" stroke="#2A2A2A" strokeWidth={3.5} />
      <circle cx="24" cy="17" r="2.2" fill="#FAEDCD" stroke="none" />
      <path d="M24 23 V33" fill="none" stroke="#FAEDCD" strokeWidth={4} strokeLinecap="round" />
    </Frame>
  );
}

export function ChevronDown(props: SVGProps<SVGSVGElement>) {
  return (
    <Frame strokeWidth={4.5} {...props}>
      <path d="M12 18 L24 30 L36 18" />
    </Frame>
  );
}

export function ChevronUp(props: SVGProps<SVGSVGElement>) {
  return (
    <Frame strokeWidth={4.5} {...props}>
      <path d="M12 30 L24 18 L36 30" />
    </Frame>
  );
}

export function ChevronLeft(props: SVGProps<SVGSVGElement>) {
  return (
    <Frame strokeWidth={4.5} {...props}>
      <path d="M30 12 L18 24 L30 36" />
    </Frame>
  );
}

export function ChevronRight(props: SVGProps<SVGSVGElement>) {
  return (
    <Frame strokeWidth={4.5} {...props}>
      <path d="M18 12 L30 24 L18 36" />
    </Frame>
  );
}

/* 侧栏折叠/展开（cherry-studio 式面板图标） */
export function SidebarCollapseIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <Frame strokeWidth={3} {...props}>
      <rect x="7" y="10" width="34" height="28" rx="7" />
      <path d="M16 10 V38" />
    </Frame>
  );
}

export function SidebarExpandIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <Frame strokeWidth={3} {...props}>
      <rect x="7" y="10" width="34" height="28" rx="7" />
      <path d="M19 10 V38" />
    </Frame>
  );
}
