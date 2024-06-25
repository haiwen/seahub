import React from 'react';
import PropTypes from 'prop-types';
import CommonToolbar from './common-toolbar';

const propTypes = {
  onShowSidePanel: PropTypes.func,
  onSearchedClick: PropTypes.func,
  searchPlaceholder: PropTypes.string,
  children: PropTypes.object,
  showSearch: PropTypes.bool
};

class TopToolbar extends React.Component {

  render() {
    const { onShowSidePanel, onSearchedClick, children, showSearch } = this.props;
    return (
      <div className={`main-panel-north ${children ? 'border-left-show' : ''}`}>
        <div className="cur-view-toolbar">
          <span title="Side Nav Menu" onClick={onShowSidePanel} className="sf2-icon-menu side-nav-toggle hidden-md-up d-md-none">
          </span>
          {this.props.children}
        </div>
        <CommonToolbar
          showSearch={showSearch}
          searchPlaceholder={this.props.searchPlaceholder}
          onSearchedClick={onSearchedClick}
        />
      </div>
    );
  }
}

TopToolbar.propTypes = propTypes;

export default TopToolbar;
