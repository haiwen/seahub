import React from 'react';
import PropTypes from 'prop-types';
import { Dropdown, DropdownMenu, DropdownToggle, DropdownItem } from 'reactstrap';
import { gettext } from '../../../utils/constants';
import { Utils } from '../../../utils/utils';

const propTypes = {
  isPC: PropTypes.bool,
  repo: PropTypes.object.isRequired,
  isStarred: PropTypes.bool,
  onFreezedItem: PropTypes.func.isRequired,
  onUnfreezedItem: PropTypes.func.isRequired,
  onMenuItemClick: PropTypes.func.isRequired,
};

class AdminRepoMenu extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      isItemMenuShow: false,
    };
  }

  onMenuItemClick = (e) => {
    let operation = Utils.getEventData(e, 'toggle');
    this.props.onMenuItemClick(operation);
  }

  onDropdownToggleClick = (e) => {
    this.toggleOperationMenu(e);
  }

  toggleOperationMenu = (e) => {
    let dataset = e.target ? e.target.dataset : null;
    if (dataset && dataset.toggle && dataset.toggle === 'Rename') {
      this.setState({isItemMenuShow: !this.state.isItemMenuShow});
      return;
    }
    
    this.setState(
      {isItemMenuShow: !this.state.isItemMenuShow},
      () => {
        if (this.state.isItemMenuShow) {
          this.props.onFreezedItem();
        } else {
          this.props.onUnfreezedItem();
        }
      }
    );
  }

  generatorOperations = () => {
    return ['Share', 'History Setting'];
  }

  translateOperations = (item) => {
    let translateResult = '';
    switch(item) {
      case 'Share':
        translateResult = gettext('Share');
        break;
      case 'Delete':
        translateResult = gettext('Delete');
        break;
      case 'Transfer':
        translateResult = gettext('Transfer');
        break;
      case 'History Setting':
        translateResult = gettext('History Setting');
        break;
      default:
        break;
    }

    return translateResult;
  }

  render() {
    let operations = this.generatorOperations();
    return (
      <Dropdown isOpen={this.state.isItemMenuShow} toggle={this.toggleOperationMenu}>
        <DropdownToggle 
          tag="i"
          className="sf-dropdown-toggle sf2-icon-caret-down"
          title={gettext('More Operations')}
          data-toggle="dropdown" 
          aria-expanded={this.state.isItemMenuShow}
        />
        <DropdownMenu>
          {operations.map((item, index )=> {
            return (<DropdownItem key={index} data-toggle={item} onClick={this.onMenuItemClick}>{this.translateOperations(item)}</DropdownItem>);
          })}
        </DropdownMenu>
      </Dropdown>
    );
  }
}

AdminRepoMenu.propTypes = propTypes;

export default AdminRepoMenu;
