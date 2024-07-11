import React, { Fragment, createRef } from 'react';
import PropTypes from 'prop-types';
import { Dropdown, DropdownToggle, DropdownMenu } from 'reactstrap';
import { ModalPortal } from '@seafile/sf-metadata-ui-component';
import { isMobile, gettext } from '../../../../../../utils';
import { isFrozen } from '../../../../../../utils/column-utils';

class HeaderDropdownMenu extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      top: 0,
      left: 0,
    };
    this.headerDropDownMenuRef = createRef();
  }

  toggle = (event) => {
    event && event.preventDefault();
    event && event.stopPropagation();

    let { column, height, isMenuShow } = this.props;

    let top = height - 5; // height - container padding - menu margin
    let left = - (column.width - 30); // column width - container width - padding
    this.setState({ top, left });
    let targetDom = event.target;
    if (isMenuShow && typeof targetDom.className === 'string' && targetDom.className.includes('disabled')) {
      return;
    }
    this.props.toggleHeaderDropDownMenu();
  };

  hideSubMenu = () => {};

  onDownloadAllFiles = () => {
    const { column } = this.props;
    this.props.downloadColumnAllFiles(column);
  };

  getMenuStyle = () => {
    if (isFrozen(this.props.column)) {
      return { transform: 'none' };
    }
    let { top, left } = this.state;

    return {
      top,
      left,
      transform: 'none',
    };
  };

  renderUpperMenu = () => {
    let upperMenu = [];
    return upperMenu;
  };

  renderDropdownMenu = () => {
    const menuStyle = this.getMenuStyle();

    return (
      <DropdownMenu style={menuStyle} ref={this.headerDropDownMenuRef} className="header-drop-down-menu">
        <div ref={ref => this.dropdownDom = ref}>
          {this.renderUpperMenu().map((item, index) => {
            return <Fragment key={index}>{item}</Fragment>;
          })}
        </div>
      </DropdownMenu>
    );
  };

  render() {
    const { isMenuShow } = this.props;

    return (
      <Dropdown className="sf-metadata-dropdown-menu" isOpen={isMenuShow} toggle={this.toggle}>
        <DropdownToggle
          tag="span"
          role="button"
          data-toggle="dropdown"
          aria-expanded={isMenuShow}
          title={gettext('More operations')}
          aria-label={gettext('More operations')}
          tabIndex={0}
        >
          <i className="toggle-icon small sf-metadata-font sf-metadata-icon-drop-down"></i>
        </DropdownToggle>
        {isMenuShow && !isMobile &&
          <ModalPortal>
            <div className="sf-metadata-dropdown-menu large">{this.renderDropdownMenu()}</div>
          </ModalPortal>
        }
      </Dropdown>
    );
  }
}

HeaderDropdownMenu.propTypes = {
  isMenuShow: PropTypes.bool,
  column: PropTypes.object,
  height: PropTypes.number,
  toggleHeaderDropDownMenu: PropTypes.func,
  downloadColumnAllFiles: PropTypes.func,
};

export default HeaderDropdownMenu;
