import React from 'react';
import PropTypes from 'prop-types';
import CommonToolbar from './common-toolbar';
import { Button } from 'reactstrap';
import { gettext } from '../../utils/constants';
import { Utils } from '../../utils/utils';

const propTypes = {
  onShowSidePanel: PropTypes.func.isRequired,
  onSearchedClick: PropTypes.func.isRequired,
  toggleInvitePeopleDialog: PropTypes.func.isRequired,
};

class InvitationsToolbar extends React.Component {

  constructor(props) {
    super(props);
  }

  render() {
    let { onShowSidePanel, onSearchedClick, toggleInvitePeopleDialog } = this.props;
    return (
      <div className="main-panel-north border-left-show">
        <div className="cur-view-toolbar">
          <span title="Side Nav Menu" onClick={onShowSidePanel} className="sf2-icon-menu side-nav-toggle hidden-md-up d-md-none">
          </span>
          {Utils.isDesktop() ? (
            <div className="operation">
              <Button color="btn btn-secondary operation-item" onClick={toggleInvitePeopleDialog}>
                <i className="fas fa-plus-square text-secondary mr-1"></i>{gettext('Invite Guest')}
              </Button>
            </div>
          ) : (
            <span className="sf2-icon-plus mobile-toolbar-icon" title={gettext('Invite Guest')} onClick={toggleInvitePeopleDialog}></span>
          )}
        </div>
        <CommonToolbar searchPlaceholder={this.props.searchPlaceholder} onSearchedClick={onSearchedClick}/>
      </div>
    );
  }
}

InvitationsToolbar.propTypes = propTypes;

export default InvitationsToolbar;
