import React from 'react';
import PropTypes from 'prop-types';
import Logo from './logo';
import CommonToolbar from './toolbar/common-toolbar';
import Icon from './icon';

import '../css/header.css';

const propTypes = {
  children: PropTypes.object,
  eventBus: PropTypes.object.isRequired,
  isSidePanelClosed: PropTypes.bool,
  onCloseSidePanel: PropTypes.func,
  onShowSidePanel: PropTypes.func,
  onSearchedClick: PropTypes.func,
  searchPlaceholder: PropTypes.string,
  showSearch: PropTypes.bool,
  isSidePanelFolded: PropTypes.bool,
};
class Header extends React.Component {

  onMouseEnter = () => {
    if (this.props.isSidePanelFolded) {
      this.props.eventBus.dispatch('top-header-mouse-enter');
    }
  };

  render() {
    const { onShowSidePanel, onSearchedClick, showSearch, children } = this.props;
    return (
      <div id="header" className="top-header d-flex justify-content-between flex-shrink-0" onMouseEnter={this.onMouseEnter}>
        <div className={'flex-shrink-0 d-none d-md-flex'}>
          <Logo onCloseSidePanel={this.props.onCloseSidePanel} />
        </div>
        <div className={`flex-shrink-0 d-flex flex-fill ${children ? 'border-left-show' : ''}`}>
          <div className="cur-view-toolbar">
            <span title="Side Nav Menu" onClick={onShowSidePanel} className="side-nav-toggle hidden-md-up d-md-none d-flex align-items-center">
              <Icon symbol="menu" />
            </span>
            {children}
          </div>
          <CommonToolbar
            showSearch={showSearch}
            searchPlaceholder={this.props.searchPlaceholder}
            onSearchedClick={onSearchedClick}
            eventBus={this.props.eventBus}
          />
        </div>
      </div>
    );
  }
}

Header.propTypes = propTypes;

export default Header;
