import React from 'react';
import PropTypes from 'prop-types';
import { Dropdown, DropdownToggle, DropdownMenu, DropdownItem } from 'reactstrap';
import { gettext } from '../../utils/constants';
import Icon from '../../components/icon';

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
          'text': gettext('Upload'),
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
            aria-label={gettext('More operations')}
            aria-expanded={this.state.isDesktopMenuOpen}
          >
            <Icon symbol="new" />
            <Icon symbol="down" className="path-item-dropdown-toggle" />
          </DropdownToggle>
          <DropdownMenu className='position-fixed'>
            {opList.map((item, index) => {
              return (
                <DropdownItem key={index} onClick={item.onClick} onKeyDown={this.onMenuItemKeyDown.bind(this, item)}>
                  <i className={`sf3-font-${item.icon} sf3-font mr-2 dropdown-item-icon`} aria-hidden="true"></i>
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
