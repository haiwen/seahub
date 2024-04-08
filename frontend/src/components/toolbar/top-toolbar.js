import React from 'react';
import PropTypes from 'prop-types';
import CommonToolbar from './common-toolbar';

const propTypes = {
  onShowSidePanel: PropTypes.func.isRequired,
  onSearchedClick: PropTypes.func.isRequired,
  searchPlaceholder: PropTypes.string,
  children: PropTypes.object
};

class TopToolbar extends React.Component {

  render() {
    const { onShowSidePanel, onSearchedClick } = this.props;
    return (
      <div className="main-panel-north border-left-show">
        <div className="cur-view-toolbar">
          <span title="Side Nav Menu" onClick={onShowSidePanel} className="sf2-icon-menu side-nav-toggle hidden-md-up d-md-none">
          </span>
          {this.props.children}
        </div>
        <CommonToolbar searchPlaceholder={this.props.searchPlaceholder} onSearchedClick={onSearchedClick} />
      </div>
    );
  }
}

TopToolbar.propTypes = propTypes;

export default TopToolbar;
