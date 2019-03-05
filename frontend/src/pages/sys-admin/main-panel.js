import React, { Component } from 'react';
import PropTypes from 'prop-types';
import Account from '../../components/common/account';


const propTypes = {
  children: PropTypes.object.isRequired,
};

class MainPanel extends Component {

  render() {
    return (
      <div className="main-panel o-hidden">
        <div className="main-panel-north border-left-show">
          <div className="cur-view-toolbar">
            <span className="sf2-icon-menu side-nav-toggle hidden-md-up d-md-none" title="Side Nav Menu"></span>
          </div>
          <div className="common-toolbar">
            <Account isAdminPanel={true} />
          </div>
        </div>
        {this.props.children}
      </div>
    );
  }
}

MainPanel.propTypes = propTypes;

export default MainPanel;
