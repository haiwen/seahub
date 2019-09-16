import React from 'react';
import ReactDOM from 'react-dom';
import { Router } from '@reach/router';
import { siteRoot, gettext } from '../../../utils/constants';
import MainPanel from '../main-panel';
import { seafileAPI } from '../../../utils/seafile-api';
import OrgLeftSide from './org-left-side';
import toaster from '../../../components/toast';
import { Utils } from '../../../utils/utils';
import OrgUsers from './org-users';
import OrgGroups from './org-groups';
import OrgRepos from './org-repos';
import OrgSettings from './org-settgins';

import '../../../assets/css/fa-solid.css';
import '../../../assets/css/fa-regular.css';
import '../../../assets/css/fontawesome.css';
import '../../../css/layout.css';
import '../../../css/toolbar.css';

const { org_id } = window.sysAdminOrg.pageOptions;

class SysAdminOrg extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      loading: true,
      errorMsg: '',
      orgInfo: {}
    };
  }

  componentDidMount() {
    seafileAPI.sysAdminGetOrgInfo(org_id).then(res => {
      this.setState({
        orgInfo: res.data,
        loading: false
      });
    }).catch((error) => {
      let errMessage = Utils.getErrorMsg(error);
      toaster.danger(errMessage);
    });
  }

  updateQuota = (quotaTotal) => {
    let orgInfo = {quota: quotaTotal};
    seafileAPI.sysAdminUpdateOrgInfo(org_id, orgInfo).then(res => {
      this.setState({orgInfo: res.data});
      toaster.success(gettext('Success'));
    }).catch((error) => {
      let errMessage = Utils.getErrorMsg(error);
      toaster.danger(errMessage);
    });
  }

  updateOrgName = (orgName) => {
    let orgInfo = {orgName: orgName};
    seafileAPI.sysAdminUpdateOrgInfo(org_id, orgInfo).then(res => {
      this.setState({orgInfo: res.data});
      toaster.success(gettext('Success'));
    }).catch((error) => {
      let errMessage = Utils.getErrorMsg(error);
      toaster.danger(errMessage);
    });
  }

  render() {
    let { orgInfo, loading } = this.state;

    return (
      <div id="main">
        <OrgLeftSide
          orgInfo={orgInfo}
          updateQuota={this.updateQuota}
        />
        <MainPanel>
          <Router className="reach-router">
            <OrgUsers path={siteRoot + 'sys/organization/:orgID/users'} />
            <OrgGroups path={siteRoot + 'sys/organization/:orgID/groups'} />
            <OrgRepos path={siteRoot + 'sys/organization/:orgID/libraries'} />
            {!loading &&
            <OrgSettings
              path={siteRoot + 'sys/organization/:orgID/settings'}
              orgName={orgInfo.org_name}
              updateOrgName={this.updateOrgName}
            />
            }
          </Router>
        </MainPanel>
      </div>
    );
  }
}

ReactDOM.render(
  <SysAdminOrg />,
  document.getElementById('wrapper')
);
