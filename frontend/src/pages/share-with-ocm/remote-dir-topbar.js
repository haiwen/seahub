import React, { Component } from 'react';
import PropTypes from 'prop-types';
import Account from '../../components/common/account';

const propTypes = {
  children: PropTypes.object
};

class MainPanelTopbar extends Component {

  render() {
    return (
      <div className={`main-panel-north ${this.props.children ? 'border-left-show' : ''}`}>
        <div className="cur-view-toolbar">
          <span className="sf2-icon-menu side-nav-toggle hidden-md-up d-md-none" title="Side Nav Menu"></span>
          <div className="operation">
            {this.props.children}
          </div>
        </div>
        <div className="common-toolbar">
          <Account isAdminPanel={false} />
        </div>
      </div>
    );
  }
}

MainPanelTopbar.propTypes = propTypes;

export default MainPanelTopbar;
