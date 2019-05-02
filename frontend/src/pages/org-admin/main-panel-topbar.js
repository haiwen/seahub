import React, { Component, Fragment } from 'react';
import PropTypes from 'prop-types';
import { gettext, invitationLink } from '../../utils/constants';
import Account from '../../components/common/account';

const propTypes = {
  currentTab: PropTypes.string,
  toggleAddOrgUser: PropTypes.func,
  toggleAddOrgAdmin: PropTypes.func,
  toggleInviteUserDialog: PropTypes.func,
  toggleAddDepartDialog: PropTypes.func,
  toggleAddMemberDialog: PropTypes.func,
  toggleAddRepoDialog: PropTypes.func,
};

class MainPanelTopbar extends Component {

  render() {
    const topBtn = 'btn btn-secondary operation-item';
    const groupID = this.props.groupID;
    return (
      <div className="main-panel-north border-left-show">
        <div className="cur-view-toolbar">
          <span className="sf2-icon-menu side-nav-toggle hidden-md-up d-md-none" title="Side Nav Menu"></span>
          <div className="operation">
            {this.props.currentTab === 'users' &&
              <Fragment>
                <button className={topBtn} title={gettext('Add user')} onClick={this.props.toggleAddOrgUser}>
                  <i className="fas fa-plus-square text-secondary mr-1"></i>{gettext('Add user')}
                </button>
                {invitationLink &&
                  <button className={topBtn} title={gettext('Invite user')} onClick={this.props.toggleInviteUserDialog}>
                    <i className="fas fa-plus-square text-secondary mr-1"></i>{gettext('Invite user')}</button>
                }
              </Fragment>
            }
            {this.props.currentTab === 'admins' &&
              <button className={topBtn} title={gettext('Add admin')} onClick={this.props.toggleAddOrgAdmin}>
                <i className="fas fa-plus-square text-secondary mr-1"></i>{gettext('Add admin')}
              </button>
            }
            {this.props.currentTab === 'departmentadmin' && 
              <Fragment>
                {!groupID && <button className={topBtn} title={gettext('New Department')}
                  onClick={this.props.toggleAddDepartDialog}>{gettext('New Department')}</button>
                }
                {groupID && <button className={topBtn} title={gettext('New Sub-department')}
                  onClick={this.props.toggleAddDepartDialog}>{gettext('New Sub-department')}</button>
                }
                {groupID && <button className={topBtn} title={gettext('Add Member')}
                  onClick={this.props.toggleAddMemberDialog}>{gettext('Add Member')}</button>
                }
                {groupID && <button className={topBtn} onClick={this.props.toggleAddRepoDialog}
                  title={gettext('New Library')}>{gettext('New Library')}</button>
                }
              </Fragment>
            }
          </div>
        </div>
        <div className="common-toolbar">
          <Account isAdminPanel={true}/>
        </div>
      </div>
    );
  }
}

MainPanelTopbar.propTypes = propTypes;

export default MainPanelTopbar;
