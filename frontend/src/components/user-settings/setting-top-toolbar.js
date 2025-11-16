import React from 'react';
import PropTypes from 'prop-types';
import CommonToolbar from '../toolbar/common-toolbar';
import Icon from '../icon';

const propTypes = {
  onShowSidePanel: PropTypes.func,
  onSearchedClick: PropTypes.func,
  searchPlaceholder: PropTypes.string,
  children: PropTypes.object,
  showSearch: PropTypes.bool
};

class SettingTopToolbar extends React.Component {

  render() {
    const { onShowSidePanel, onSearchedClick, children, showSearch } = this.props;
    return (
      <div className={`main-panel-north ${children ? 'border-left-show' : ''}`}>
        <div className="cur-view-toolbar">
          <span title="Side Nav Menu" onClick={onShowSidePanel} className="side-nav-toggle hidden-md-up d-md-none d-flex align-items-center">
            <Icon symbol="menu" />
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

SettingTopToolbar.propTypes = propTypes;

export default SettingTopToolbar;
