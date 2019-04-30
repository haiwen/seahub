import React, { Component, Fragment } from 'react';
import PropTypes from 'prop-types';
import { gettext, invitationLink } from '../../utils/constants';
import Account from '../../components/common/account';

const propTypes = {
  currentTab: PropTypes.string.isRequired,
  children: PropTypes.object.isRequired,
  isSubDepart: PropTypes.bool.isRequired,
  toggleAddOrgUser: PropTypes.func.isRequired,
  toggleAddOrgAdmin: PropTypes.func.isRequired,
  toggleInviteUserDialog: PropTypes.func.isRequired
};

class MainPanel extends Component {

  toggleAddOrgUser = () => {
    this.props.toggleAddOrgUser();
  }

  toggleAddOrgAdmin = () => {
    this.props.toggleAddOrgAdmin();
  }

  render() {
    const topBtn = 'btn btn-secondary operation-item';
    const isSubDepart = this.props.isSubDepart;
    return (
      <div className="main-panel o-hidden">
        <div className="main-panel-north border-left-show">
          <div className="cur-view-toolbar">
            <span className="sf2-icon-menu side-nav-toggle hidden-md-up d-md-none" title="Side Nav Menu"></span>
            <div className="operation">
              {this.props.currentTab === 'users' && (
                <Fragment>
                  <button className="btn btn-secondary operation-item" title={gettext('Add user')} onClick={this.toggleAddOrgUser}>
                    <i className="fas fa-plus-square text-secondary mr-1"></i>{gettext('Add user')}
                  </button>
                  {invitationLink &&
                  <button className="btn btn-secondary operation-item" title={gettext('Invite user')} onClick={this.props.toggleInviteUserDialog}>
                    <i className="fas fa-plus-square text-secondary mr-1"></i>{gettext('Invite user')}
                  </button>
                  }
                </Fragment>
              )}
              {this.props.currentTab === 'admins' &&
              <button className="btn btn-secondary operation-item" title={gettext('Add admin')} onClick={this.toggleAddOrgAdmin}>
                <i className="fas fa-plus-square text-secondary mr-1"></i>{gettext('Add admin')}
              </button>
              }
              {this.props.currentTab === 'departmentadmin' && 
                <Fragment>
                  {!isSubDepart && <button className={topBtn} title={gettext('New Department')}
                    onClick={this.props.toggleAddDepartDialog}>{gettext('New Department')}</button>}
                  {isSubDepart && <button className={topBtn} title={gettext('New Sub-department')}
                    onClick={this.props.toggleAddDepartDialog}>{gettext('New Sub-department')}</button>}
                  {isSubDepart && <button className={topBtn} title={gettext('Add Member')}
                    onClick={this.props.toggleAddMemberDialog}>{gettext('Add Member')}</button>}
                  {isSubDepart && <button className={topBtn} onClick={this.props.toggleAddRepoDialog}
                    title={gettext('New Library')}>{gettext('New Library')}</button>}
                </Fragment>
              }
            </div>
          </div>
          <div className="common-toolbar">
            <Account isAdminPanel={true}/>
          </div>
        </div>
        {this.props.children}
      </div>
    );
  }
}

MainPanel.propTypes = propTypes;

export default MainPanel;
