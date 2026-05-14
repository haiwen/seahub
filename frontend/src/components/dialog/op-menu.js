import React from 'react';
import PropTypes from 'prop-types';
import { gettext } from '../../utils/constants';
import Icon from '../icon';
import CustomDropdown from '../dropdown';

const propTypes = {
  onFreezedItem: PropTypes.func.isRequired,
  onUnfreezedItem: PropTypes.func.isRequired,
  onMenuItemClick: PropTypes.func.isRequired,
  operations: PropTypes.array.isRequired,
  translateOperations: PropTypes.func.isRequired
};

class OpMenu extends React.Component {
  render() {
    const { operations, translateOperations } = this.props;
    const menuItems = operations.map((item) => ({ key: item, label: translateOperations(item) }));
    return (
      <CustomDropdown
        items={menuItems}
        className="lh-1"
        trigger={<Icon symbol="more-level" />}
        triggerClassName="op-icon"
        toggleProps={{ tag: 'span', 'aria-label': gettext('More operations'), title: gettext('More operations') }}
        menuPortal={false}
        freezeItem={this.props.onFreezedItem}
        unfreezeItem={this.props.onUnfreezedItem}
        onItemClick={(selectedItem) => this.props.onMenuItemClick(selectedItem.key)}
      />
    );
  }
}

OpMenu.propTypes = propTypes;

export default OpMenu;
