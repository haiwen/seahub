import React from 'react';
import PropTypes from 'prop-types';
import Logo from './logo';
import CommonToolbar from './toolbar/common-toolbar';

import './header.css';

const propTypes = {
  children: PropTypes.object,
  eventBus: PropTypes.object.isRequired,
  isSidePanelClosed: PropTypes.bool,
  onCloseSidePanel: PropTypes.func,
  onShowSidePanel: PropTypes.func,
  onSearchedClick: PropTypes.func,
  searchPlaceholder: PropTypes.string,
  showSearch: PropTypes.bool
};

class Header extends React.Component {

  render() {
    const { onShowSidePanel, onSearchedClick, showSearch, children } = this.props;
    return (
      <div id="header" className="top-header d-flex justify-content-between flex-shrink-0">
        <div className={'flex-shrink-0 d-none d-md-flex'}>
          <Logo onCloseSidePanel={this.props.onCloseSidePanel} />
        </div>
        <div className={`flex-shrink-0 d-flex flex-fill ${children ? 'border-left-show' : ''}`}>
          <div className="cur-view-toolbar">
            <span title="Side Nav Menu" onClick={onShowSidePanel} className="sf2-icon-menu side-nav-toggle hidden-md-up d-md-none">
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
