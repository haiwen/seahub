import React, { Component, Fragment } from 'react';
import { seafileAPI } from '../../utils/seafile-api';
import { gettext, orgMemberQuotaEnabled} from '../../utils/constants';
import { Utils } from '../../utils/utils';
import MainPanelTopbar from './main-panel-topbar';
import SetOrgUserDefaultQuota from '../../components/dialog/set-org-user-default-quota';

const { orgID } = window.org.pageOptions;

class OrgInfo extends Component {

  constructor(props) {
    super(props);
    this.state = {
      org_name: '',
      storage_quota: 0,
      storage_usage: 0,
      isSetUserDefaultQuotaDialogOpen: false,
      userDefaultQuota: 0,
      member_quota: 0,
      member_usage: 0,
      active_members: 0
    };
  }

  componentDidMount() {
    seafileAPI.orgAdminGetOrgInfo().then(res => {
      this.setState({
        org_name: res.data.org_name,
        storage_quota: res.data.storage_quota,
        storage_usage: res.data.storage_usage,
        userDefaultQuota: res.data.user_default_quota,
        member_quota: res.data.member_quota,
        member_usage: res.data.member_usage,
        active_members: res.data.active_members
      });
    });
  }

  toggleSetUserDefaultQuotaDialog = () => {
    this.setState({
      isSetUserDefaultQuotaDialogOpen: !this.state.isSetUserDefaultQuotaDialogOpen
    });
  };

  updateQuota = (quota) => {
    this.setState({
      userDefaultQuota: quota
    });
  };

  render() {
    return (
      <Fragment>
        <MainPanelTopbar/>
        <div className="main-panel-center flex-row">
          <div className="cur-view-container">
            <div className="cur-view-path">
              <h3 className="sf-heading">{gettext('Info')}</h3>
            </div>
            <div className="cur-view-content">
              <dl>
                <strong>{this.state.org_name}</strong>
                <dt>{gettext('Space Used')}</dt>

                {(this.state.storage_quota > 0) ? <dd>{Utils.bytesToSize(this.state.storage_usage)} / {Utils.bytesToSize(this.state.storage_quota)}</dd> : <dd>{Utils.bytesToSize(this.state.storage_usage)}</dd>}

                <dt>{gettext('User Default Quota')}</dt>
                <dd>
                  {`${this.state.userDefaultQuota > 0 ? Utils.bytesToSize(this.state.userDefaultQuota) : '--'}`}
                  <span title={gettext('Edit')} className="attr-action-icon fa fa-pencil-alt" onClick={this.toggleSetUserDefaultQuotaDialog}></span>
                </dd>

                {orgMemberQuotaEnabled ? <dt>{gettext('Active Users')} / {gettext('Total Users')} / {gettext('Limits')}</dt> : <dt>{gettext('Active Users')} / {gettext('Total Users')}</dt>}

                {orgMemberQuotaEnabled ? <dd>{(this.state.active_members > 0) ? this.state.active_members : '--'} / {(this.state.member_usage > 0) ? this.state.member_usage : '--'} / {(this.state.member_quota > 0) ? this.state.member_quota : '--'}</dd> : <dd>{this.state.active_members > 0 ? this.state.active_members : '--'} / {this.state.member_usage > 0 ? this.state.member_usage : '--'}</dd>}

              </dl>
            </div>
          </div>
        </div>
        {this.state.isSetUserDefaultQuotaDialogOpen &&
        <SetOrgUserDefaultQuota
          orgID={orgID}
          userDefaultQuota={this.state.userDefaultQuota}
          updateQuota={this.updateQuota}
          toggleDialog={this.toggleSetUserDefaultQuotaDialog}
        />
        }
      </Fragment>
    );
  }
}

export default OrgInfo;
