import React, { Component, Fragment } from 'react';
import { orgAdminAPI } from '../../utils/org-admin-api';
import { mediaUrl, gettext, orgMemberQuotaEnabled } from '../../utils/constants';
import { Utils } from '../../utils/utils';
import MainPanelTopbar from './main-panel-topbar';
import '../../css/org-admin-info-page.css';


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
    orgAdminAPI.orgAdminGetOrgInfo().then(res => {
      const {
        org_id, org_name,
        member_quota, member_usage, active_members,
        storage_quota, storage_usage
      } = res.data;
      this.setState({
        org_id, org_name,
        member_quota, member_usage, active_members,
        storage_quota, storage_usage
      });
    });
  }

  render() {
    const {
      org_id, org_name,
      member_quota, member_usage, active_members,
      storage_quota, storage_usage
    } = this.state;
    return (
      <Fragment>
        <MainPanelTopbar/>
        <div className="main-panel-center flex-row">
          <div className="cur-view-container">
            <div className="cur-view-path">
              <h3 className="sf-heading">{gettext('Info')}</h3>
            </div>
            <div className="cur-view-content org-admin-info-content py-4">
              <div className="d-flex flex-row flex-wrap justify-content-between">
                <div className="info-content-item d-flex">
                  <img src={`${mediaUrl}img/info-organization.png`} alt="" width="46" height="46" className="info-content-item-img" />
                  <div>
                    <h4 className="info-content-item-heading">{gettext('Team name')}</h4>
                    <p className="info-content-name-text">{org_name}</p>
                  </div>
                </div>

                <div className="info-content-item d-flex">
                  <img src={`${mediaUrl}img/info-id.png`} alt="" width="46" height="46" className="info-content-item-img" />
                  <div>
                    <h4 className="info-content-item-heading">{gettext('ID')}</h4>
                    <p className="info-content-name-text">{org_id}</p>
                  </div>
                </div>

                <div className="info-content-item w-100 d-flex justify-content-around">

                  <div>
                    <h4 className="info-content-item-heading">{gettext('Active users')}</h4>
                    <p className="info-content-user-text">{active_members}</p>
                  </div>

                  <div>
                    <h4 className="info-content-item-heading">{gettext('Total users')}</h4>
                    <p className="info-content-user-text">{member_usage}</p>
                  </div>

                  {orgMemberQuotaEnabled &&
                  <div>
                    <h4 className="info-content-item-heading">{gettext('User number limit')}</h4>
                    <p className="info-content-user-text">{member_quota > 0 ? member_quota : '--'}</p>
                  </div>
                  }

                </div>

                <div className="info-content-item">
                  <h4 className="info-content-item-heading">{gettext('Space used')}</h4>
                  {storage_quota > 0 ? (
                    <>
                      <p className="info-content-space-text">{`${(storage_usage / storage_quota * 100).toFixed(2)}%`}</p>
                      <div className="progress-container">
                        <div className="progress">
                          <div className="progress-bar" role="progressbar" style={{ width: `${storage_usage / storage_quota * 100}%` }} aria-valuenow={storage_usage / storage_quota * 100} aria-valuemin="0" aria-valuemax="100"></div>
                        </div>
                        <p className="progress-text m-0">{`${Utils.bytesToSize(storage_usage)} / ${Utils.bytesToSize(storage_quota)}`}</p>
                      </div>
                    </>
                  ) : (
                    <p>{Utils.bytesToSize(storage_usage)}</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </Fragment>
    );
  }
}

export default OrgInfo;
