import React, { Component, Fragment } from 'react';
import PropTypes from 'prop-types';
import Subscription from '../../../components/subscription';
import MainPanelTopbar from '../main-panel-topbar';

const propTypes = {
  toggleSidePanel: PropTypes.func,
};

class OrgSubscription extends Component {
  render() {
    return (
      <Fragment>
        <MainPanelTopbar {...this.props} />
        <div className="main-panel-center flex-row">
          <div className="cur-view-container">
            <div className="cur-view-path">
              <h2 className="sf-heading">{'付费管理'}</h2>
            </div>
            <div className="pt-2 h-100 o-auto">
              <Subscription isOrgContext={true} />
            </div>
          </div>
        </div>
      </Fragment>
    );
  }
}

OrgSubscription.propTypes = propTypes;

export default OrgSubscription;
