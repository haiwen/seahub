import React from 'react';
import PropTypes from 'prop-types';
import { Dropdown, DropdownToggle, DropdownMenu, DropdownItem } from 'reactstrap';
import { gettext } from '../../utils/constants';

const propTypes = {
  userPerm: PropTypes.string.isRequired,
  openFileInput: PropTypes.func.isRequired
};

class LastPathItemWrapper extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      isDesktopMenuOpen: false
    };
  }

  toggleDesktopOpMenu = () => {
    this.setState({ isDesktopMenuOpen: !this.state.isDesktopMenuOpen });
  };

  onDropdownToggleKeyDown = (e) => {
    if (e.key == 'Enter' || e.key == 'Space') {
      this.toggleDesktopOpMenu();
    }
  };

  onMenuItemKeyDown = (item, e) => {
    if (e.key == 'Enter' || e.key == 'Space') {
      item.onClick();
    }
  };

  render() {
    const { userPerm } = this.props;
    let dropdownMenu = null;
    if (userPerm == 'rw') {
      const opList = [
        {
          'icon': 'upload-files',
          'text': gettext('Upload File'),
          'onClick': this.props.openFileInput
        }
      ];

      dropdownMenu = (
        <Dropdown isOpen={this.state.isDesktopMenuOpen} toggle={this.toggleDesktopOpMenu}>
          <DropdownToggle
            tag="div"
            role="button"
            className="path-item"
            onClick={this.toggleDesktopOpMenu}
            onKeyDown={this.onDropdownToggleKeyDown}
            data-toggle="dropdown"
          >
            <i className="sf3-font-new sf3-font"></i>
            <i className="sf3-font-down sf3-font path-item-dropdown-toggle"></i>
          </DropdownToggle>
          <DropdownMenu positionFixed={true}>
            {opList.map((item, index) => {
              return (
                <DropdownItem key={index} onClick={item.onClick} onKeyDown={this.onMenuItemKeyDown.bind(this, item)}>
                  <i className={`sf3-font-${item.icon} sf3-font mr-2 dropdown-item-icon`}></i>
                  {item.text}
                </DropdownItem>
              );
            })}
          </DropdownMenu>
        </Dropdown>
      );
    }


    return (
      <div className="dir-operation">
        {this.props.children}
        {userPerm == 'rw' && dropdownMenu}
      </div>
    );
  }
}

LastPathItemWrapper.propTypes = propTypes;

export default LastPathItemWrapper;
