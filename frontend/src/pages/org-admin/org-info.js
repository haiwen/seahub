import React, { Component, Fragment } from 'react';
import { seafileAPI } from '../../utils/seafile-api';
import { gettext, orgMemberQuotaEnabled} from '../../utils/constants';
import { Utils } from '../../utils/utils';
import MainPanelTopbar from './main-panel-topbar';

class OrgInfo extends Component {

  constructor(props) {
    super(props);
    this.state = {
      org_name: '',
      storage_quota: 0,
      storage_usage: 0,
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
        member_quota: res.data.member_quota,
        member_usage: res.data.member_usage,
        active_members: res.data.active_members
      });
    });
  }

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

                {orgMemberQuotaEnabled ? <dt>{gettext('Active Users')} / {gettext('Total Users')} / {gettext('Limits')}</dt> : <dt>{gettext('Active Users')} / {gettext('Total Users')}</dt>}

                {orgMemberQuotaEnabled ? <dd>{(this.state.active_members > 0) ? this.state.active_members : '--'} / {(this.state.member_usage > 0) ? this.state.member_usage : '--'} / {(this.state.member_quota > 0) ? this.state.member_quota : '--'}</dd> : <dd>{this.state.active_members > 0 ? this.state.active_members : '--'} / {this.state.member_usage > 0 ? this.state.member_usage : '--'}</dd>}

              </dl>
            </div>
          </div>
        </div>
      </Fragment>
    );
  }
}

export default OrgInfo;
