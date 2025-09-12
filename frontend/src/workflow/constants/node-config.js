import { gettext } from '../../utils/constants';
import { ACTION_NODE_TYPE, CONDITION_NODE_TYPE, TRIGGER_NODE_TYPE } from './node';

export const TYPE_TRIGGER_NODE_CONFIG = {
  [TRIGGER_NODE_TYPE.FILE_UPLOAD]: {
    label: gettext('When a file is added'),
    icon_symbol: 'trigger',
  }
};

export const TYPE_CONDITION_NODE_CONFIG = {
  [CONDITION_NODE_TYPE.IF_ELSE]: {
    label: gettext('If'),
    icon_symbol: 'judgment-condition',
  },
};

export const TYPE_ACTION_NODE_CONFIG = {
  [ACTION_NODE_TYPE.SET_STATUS]: {
    label: gettext('Set file status'),
    icon_symbol: 'perform-action',
  }
};
