import React, { Component, Fragment } from 'react';
import PropTypes from 'prop-types';
import MainPanelTopbar from './main-panel-topbar';
import StripeSubscription from '../../components/stripe-subscription';

const propTypes = {
  onCloseSidePanel: PropTypes.func,
};

class OrgStripeSubscription extends Component {
  render() {
    return (
      <Fragment>
        <MainPanelTopbar onCloseSidePanel={this.props.onCloseSidePanel} />
        <div className="main-panel-center flex-row">
          <div className="cur-view-container">
            <div className="cur-view-path">
              <h2 className="sf-heading">Payment</h2>
            </div>
            <div className="pt-2 h-100 o-auto">
              <StripeSubscription isOrgContext={true} />
            </div>
          </div>
        </div>
      </Fragment>
    );
  }
}

OrgStripeSubscription.propTypes = propTypes;

export default OrgStripeSubscription;
