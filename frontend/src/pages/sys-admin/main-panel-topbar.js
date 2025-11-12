import React, { Component } from 'react';
import PropTypes from 'prop-types';
import Account from '../../components/common/account';
import Icon from '../../components/icon';
import { gettext } from '../../utils/constants';

const propTypes = {
  children: PropTypes.any,
  search: PropTypes.any,
  toggleSidePanel: PropTypes.func
};

class MainPanelTopbar extends Component {

  render() {
    return (
      <div className={`main-panel-north ${this.props.children ? 'border-left-show' : ''}`}>
        <div className="cur-view-toolbar">
          <span
            className="side-nav-toggle hidden-md-up d-md-none"
            title={gettext('Side Nav Menu')}
            onClick={this.props.toggleSidePanel}
          >
            <Icon symbol="menu" />
          </span>
          <div className="operation">
            {this.props.children}
          </div>
        </div>
        <div className="common-toolbar">
          {this.props.search && this.props.search}
          <Account isAdminPanel={true} />
        </div>
      </div>
    );
  }
}

MainPanelTopbar.propTypes = propTypes;

export default MainPanelTopbar;
