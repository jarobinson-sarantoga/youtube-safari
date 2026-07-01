import { isHideRelatedEnabled } from "./preferences";

export function buildPanelPrefsPayload(): {
  hideRelated: boolean;
} {
  return {
    hideRelated: isHideRelatedEnabled(),
  };
}
