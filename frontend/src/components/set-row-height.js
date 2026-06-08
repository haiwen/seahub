import React from 'react';
import PropTypes from 'prop-types';
import { gettext } from '../utils/constants';
import { ROW_HEIGHT } from '../metadata/constants';
import Icon from './icon';
import Tooltip from './tooltip';
import CustomDropdown from './dropdown';

const ROW_HEIGHT_OPTIONS = [
  { label: gettext('Default'), icon: 'default', value: ROW_HEIGHT },
  { label: gettext('Double'), icon: 'double', value: 56 },
  { label: gettext('Triple'), icon: 'triple', value: 88 },
  { label: gettext('Quadruple'), icon: 'quadruple', value: 128 },
];

const propTypes = {
  rowHeight: PropTypes.number,
  modifyRowHeight: PropTypes.func,
  iconClass: PropTypes.string,
  readOnly: PropTypes.bool,
};

class SetRowHeight extends React.Component {
  onChangeRowHeight = (value) => {
    const { readOnly = false, rowHeight = ROW_HEIGHT, modifyRowHeight } = this.props;
    if (readOnly || value === rowHeight) return;

    modifyRowHeight(value);
  };

  renderCustomTrigger = (isOpen) => {
    const currentOption = ROW_HEIGHT_OPTIONS.find(item => item.value === this.props.rowHeight) || ROW_HEIGHT_OPTIONS[0];
    return (
      <>
        <Icon symbol={`row-height-${currentOption.icon}`} />
        {!isOpen && <Tooltip target="set-row-height-toggle">{gettext('Set row height')}</Tooltip>}
      </>
    );
  };

  render() {
    const { rowHeight = ROW_HEIGHT, iconClass } = this.props;
    const menuItems = [{
      type: 'header',
      key: 'set-row-height-title',
      label: gettext('Select row height'),
    }, {
      type: 'divider',
      className: 'header-divider',
    }, ...ROW_HEIGHT_OPTIONS.map((item) => ({
      key: String(item.value),
      label: item.label,
      checked: rowHeight === item.value,
      icon_dom: <Icon symbol={`row-height-${item.icon}`} className="dropdown-item-icon" />,
      onClick: () => this.onChangeRowHeight(item.value),
    }))];

    return (
      <CustomDropdown
        target="set-row-height-toggle"
        items={menuItems}
        variant="control"
        trigger={this.renderCustomTrigger}
        triggerClassName={iconClass}
        toggleProps={{ 'aria-label': gettext('Set row height') }}
        menuClassName="set-row-height-dropdown-menu"
        menuPortal={false}
        onItemClick={(selectedItem) => selectedItem.onClick?.()}
      />
    );
  }
}

SetRowHeight.propTypes = propTypes;

export default SetRowHeight;
