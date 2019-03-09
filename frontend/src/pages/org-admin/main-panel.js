import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { gettext } from '../../utils/constants';
import Account from '../../components/common/account';

const propTypes = {
  currentTab: PropTypes.string.isRequired,
  children: PropTypes.object.isRequired,
};

class MainPanel extends Component {

  toggleAddOrgUser = () => {
    this.props.toggleAddOrgUser();
  }

  toggleAddOrgAdmin = () => {
    this.props.toggleAddOrgAdmin();
  }

  render() {
    return (
      <div className="main-panel o-hidden">
        <div className="main-panel-north border-left-show">
          <div className="cur-view-toolbar">
            <span className="sf2-icon-menu side-nav-toggle hidden-md-up d-md-none" title="Side Nav Menu"></span>
            <div className="operation mt-1">
              {this.props.currentTab === 'users' &&
              <button className="btn btn-secondary operation-item" title={gettext('Add user')} onClick={this.toggleAddOrgUser}>
                <i className="fas fa-plus-square text-secondary mr-1"></i>{gettext('Add user')}
              </button>
              }
              {this.props.currentTab === 'admins' &&
              <button className="btn btn-secondary operation-item" title={gettext('Add admin')} onClick={this.toggleAddOrgAdmin}>
                <i className="fas fa-plus-square text-secondary mr-1"></i>{gettext('Add admin')}
              </button>
              }
            </div>
          </div>
          <div className="common-toolbar">
            <Account />
          </div>
        </div>
        {this.props.children}
      </div>
    );
  }
}

MainPanel.propTypes = propTypes;

export default MainPanel;
