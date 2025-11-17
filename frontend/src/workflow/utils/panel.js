import { isNumber } from '../../utils/number';
import { WORKFLOW_INIT_SIDE_PANEL_RATE, WORKFLOW_MAX_SIDE_PANEL_RATE, WORKFLOW_MIN_SIDE_PANEL_RATE } from '../constants/panel';

export const normalizeSidePanelRate = (sidePanelRate) => {
  if (!isNumber(sidePanelRate)) return WORKFLOW_INIT_SIDE_PANEL_RATE;
  if (sidePanelRate < WORKFLOW_MIN_SIDE_PANEL_RATE) return WORKFLOW_MIN_SIDE_PANEL_RATE;
  if (sidePanelRate > WORKFLOW_MAX_SIDE_PANEL_RATE) return WORKFLOW_MAX_SIDE_PANEL_RATE;
  return sidePanelRate;
};
