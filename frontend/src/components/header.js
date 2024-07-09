import React from 'react';
import PropTypes from 'prop-types';
import Logo from './logo';
import CommonToolbar from './toolbar/common-toolbar';

const propTypes = {
  isSidePanelClosed: PropTypes.bool,
  onCloseSidePanel: PropTypes.func,
  onShowSidePanel: PropTypes.func,
  onSearchedClick: PropTypes.func,
  searchPlaceholder: PropTypes.string,
  showSearch: PropTypes.bool
};

class Header extends React.Component {

  render() {
    const { onShowSidePanel, onSearchedClick, showSearch } = this.props;
    return (
      <div id="header" className="d-flex justify-content-between py-2 px-4">
        <div className={'flex-shrink-0 d-none d-md-flex'}>
          <Logo onCloseSidePanel={this.props.onCloseSidePanel} />
        </div>
        <div className="flex-shrink-0 d-flex flex-fill">
          <div className="cur-view-toolbar">
            <span title="Side Nav Menu" onClick={onShowSidePanel} className="sf2-icon-menu side-nav-toggle hidden-md-up d-md-none">
            </span>
          </div>
          <CommonToolbar
            showSearch={showSearch}
            searchPlaceholder={this.props.searchPlaceholder}
            onSearchedClick={onSearchedClick}
          />
        </div>
      </div>
    );
  }
}

Header.propTypes = propTypes;

export default Header;
