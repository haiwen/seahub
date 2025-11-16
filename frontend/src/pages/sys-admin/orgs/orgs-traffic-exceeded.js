import React, { Component, Fragment } from 'react';
import { navigate } from '@gatsbyjs/reach-router';
import { Utils } from '../../../utils/utils';
import { systemAdminAPI } from '../../../utils/system-admin-api';
import { siteRoot, gettext } from '../../../utils/constants';
import toaster from '../../../components/toast';
import MainPanelTopbar from '../main-panel-topbar';
import Search from '../search';
import Content from './orgs-content';
import OrgsNav from '../orgs/orgs-nav';


class OrgsTrafficExceeded extends Component {

  constructor(props) {
    super(props);
    this.state = {
      loading: true,
      errorMsg: '',
      orgList: [],
      currentPage: 1,
      perPage: 100,
      hasNextPage: false,
    };
  }

  componentDidMount() {
    let urlParams = (new URL(window.location)).searchParams;
    const { currentPage, perPage } = this.state;
    this.setState({
      perPage: parseInt(urlParams.get('per_page') || perPage),
      currentPage: parseInt(urlParams.get('page') || currentPage)
    }, () => {
      this.getItemsByPage(this.state.currentPage);
    });
  }

  getItemsByPage = (page) => {
    const { perPage } = this.state;
    systemAdminAPI.sysAdminListTrafficExceedOrgs(page, perPage).then((res) => {
      this.setState({
        loading: false,
        orgList: res.data.organizations,
        currentPage: page,
        hasNextPage: Utils.hasNextPage(page, perPage, res.data.total_count)
      });
    }).catch((error) => {
      this.setState({
        loading: false,
        errorMsg: Utils.getErrorMsg(error, true) // true: show login tip if 403
      });
    });
  };

  resetPerPage = (perPage) => {
    this.setState({
      perPage: perPage
    }, () => {
      this.getItemsByPage(1);
    });
  };

  updateStatus = (orgID, isActive) => {
    let orgInfo = {};
    orgInfo.isActive = isActive;
    systemAdminAPI.sysAdminUpdateOrg(orgID, orgInfo).then(res => {
      let newOrgList = this.state.orgList.map(org => {
        if (org.org_id == orgID) {
          org.is_active = isActive;
        }
        return org;
      });
      this.setState({ orgList: newOrgList });
      toaster.success(gettext('Edit succeeded'));
    }).catch((error) => {
      let errMessage = Utils.getErrorMsg(error);
      toaster.danger(errMessage);
    });
  };

  updateRole = (orgID, role) => {
    let orgInfo = {};
    orgInfo.role = role;
    systemAdminAPI.sysAdminUpdateOrg(orgID, orgInfo).then(res => {
      let newOrgList = this.state.orgList.map(org => {
        if (org.org_id == orgID) {
          org.role = role;
        }
        return org;
      });
      this.setState({ orgList: newOrgList });
      toaster.success(gettext('Edit succeeded'));
    }).catch((error) => {
      let errMessage = Utils.getErrorMsg(error);
      toaster.danger(errMessage);
    });
  };

  getSearch = () => {
    return <Search
      placeholder={gettext('Search organizations')}
      submit={this.searchItems}
    />;
  };

  searchItems = (keyword) => {
    navigate(`${siteRoot}sys/search-organizations/?query=${encodeURIComponent(keyword)}`);
  };

  render() {
    return (
      <Fragment>
        <MainPanelTopbar search={this.getSearch()} {...this.props}>
        </MainPanelTopbar>
        <div className="main-panel-center flex-row">
          <div className="cur-view-container">
            <OrgsNav currentItem="traffic-exceeded" />
            <div className="cur-view-content">
              <Content
                loading={this.state.loading}
                errorMsg={this.state.errorMsg}
                items={this.state.orgList}
                currentPage={this.state.currentPage}
                hasNextPage={this.state.hasNextPage}
                curPerPage={this.state.perPage}
                resetPerPage={this.resetPerPage}
                getListByPage={this.getItemsByPage}
                updateRole={this.updateRole}
                updateStatus={this.updateStatus}

              />
            </div>
          </div>
        </div>
      </Fragment>
    );
  }
}

export default OrgsTrafficExceeded;
