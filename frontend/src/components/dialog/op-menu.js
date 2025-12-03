import React from 'react';
import PropTypes from 'prop-types';
import { Dropdown, DropdownMenu, DropdownToggle, DropdownItem } from 'reactstrap';
import { gettext } from '../../utils/constants';
import { Utils } from '../../utils/utils';
import Icon from '../icon';

const propTypes = {
  onFreezedItem: PropTypes.func.isRequired,
  onUnfreezedItem: PropTypes.func.isRequired,
  onMenuItemClick: PropTypes.func.isRequired,
  operations: PropTypes.array.isRequired,
  translateOperations: PropTypes.func.isRequired
};

class OpMenu extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      isItemMenuShow: false
    };
  }

  onMenuItemClick = (e) => {
    let operation = Utils.getEventData(e, 'op');
    this.props.onMenuItemClick(operation);
  };

  onDropdownToggleClick = (e) => {
    this.toggleOperationMenu(e);
  };

  toggleOperationMenu = (e) => {
    this.setState(
      { isItemMenuShow: !this.state.isItemMenuShow },
      () => {
        if (this.state.isItemMenuShow) {
          this.props.onFreezedItem();
        } else {
          this.props.onUnfreezedItem();
        }
      }
    );
  };

  render() {
    const { operations, translateOperations } = this.props;
    return (
      <Dropdown isOpen={this.state.isItemMenuShow} toggle={this.toggleOperationMenu}>
        <DropdownToggle
          tag="span"
          className="op-icon"
          title={gettext('More operations')}
          aria-label={gettext('More operations')}
          data-toggle="dropdown"
          aria-expanded={this.state.isItemMenuShow}
        >
          <Icon symbol="more-level" />
        </DropdownToggle>
        <DropdownMenu className="my-1 mr-2">
          {operations.map((item, index) => {
            return (<DropdownItem key={index} data-op={item} onClick={this.onMenuItemClick}>{translateOperations(item)}</DropdownItem>);
          })}
        </DropdownMenu>
      </Dropdown>
    );
  }
}

OpMenu.propTypes = propTypes;

export default OpMenu;
