let pending = false;
export function openMcpSettings() {
  pending = true;
  window.dispatchEvent(new CustomEvent("settings:open-mcp"));
}
export function consumeMcpSettingsRequest() {
  const requested = pending;
  pending = false;
  return requested;
}
