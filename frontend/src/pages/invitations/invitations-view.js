import React, { Fragment } from 'react';
import PropTypes from 'prop-types';
import { gettext } from '../../utils/constants';
import InvitationsToolbar from '../../components/toolbar/invitations-toolbar';

class InvitationsView extends React.Component {
  
  render() {
    return (
      <Fragment>
        <InvitationsToolbar
          onShowSidePanel={this.props.onShowSidePanel}
          onSearchedClick={this.props.onSearchedClick}
        />
        <div className="main-panel-center flex-row">
          <div className="cur-view-container">
            <div className="cur-view-path">
              <h3 className="sf-heading">{gettext('Invite People')}</h3>
            </div>
            <div className="message empty-tip">
              <h2>{gettext('You have not invited any people.')}</h2>
            </div>
          </div>
        </div>
      </Fragment>
    );
  }
}

export default InvitationsView;
