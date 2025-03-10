/* this component works only as an operation menu for an item(such as a library item, a folder/file item) in mobile */
import React from 'react';
import PropTypes from 'prop-types';
import { Dropdown, DropdownToggle, DropdownMenu } from 'reactstrap';
import { gettext } from '../utils/constants';

const propTypes = {
  isOpen: PropTypes.bool,
  toggle: PropTypes.func,
  children: PropTypes.oneOfType([PropTypes.object, PropTypes.array]).isRequired
};

class MobileItemMenu extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      isOpMenuOpen: false
    };
  }

  toggleOpMenu = () => {
    this.setState({ isOpMenuOpen: !this.state.isOpMenuOpen });
  };

  render() {
    const { isOpen, toggle, children } = this.props;
    const { isOpMenuOpen } = this.state;
    const isMenuOpen = isOpen != undefined ? isOpen : isOpMenuOpen;
    const toggleMenu = toggle || this.toggleOpMenu;
    return (
      <Dropdown isOpen={isMenuOpen} toggle={toggleMenu}>
        <DropdownToggle
          tag="i"
          className="sf-dropdown-toggle sf3-font sf3-font-more-vertical ml-0"
          title={gettext('More operations')}
          aria-label={gettext('More operations')}
          data-toggle="dropdown"
          aria-expanded={isMenuOpen}
        />
        <DropdownMenu
          container={document.body}
          className="mobile-dropdown-menu"
        >
          <div className="mobile-operation-menu-bg-layer" onClick={toggleMenu}></div>
          <div className="mobile-operation-menu">
            {children}
          </div>
        </DropdownMenu>
      </Dropdown>
    );
  }
}

MobileItemMenu.propTypes = propTypes;

export default MobileItemMenu;
