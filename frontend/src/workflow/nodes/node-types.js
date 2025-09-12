import { gettext } from '../../utils/constants';
import { NODE_TYPE } from '../constants/node';

export const NODE_TYPE_CONFIG = {
  [NODE_TYPE.ADD_TRIGGER_PLACEHOLDER]: {
    label: gettext('Add node'),
    custom_icon: <i className="sf3-font-new sf3-font mr-2"></i>,
    border_classname: 'add-trigger-placeholder-node-border',
    classname: 'shadow-none',
  },
  [NODE_TYPE.FILE_UPLOAD]: {
    label: gettext('When a file is added'),
    icon_symbol: 'trigger',
  },
  [NODE_TYPE.IF_ELSE]: {
    label: gettext('If'),
    icon_symbol: 'judgment-condition',
  },
  [NODE_TYPE.SET_STATUS]: {
    label: gettext('Set file status'),
    icon_symbol: 'perform-action',
  }
};
