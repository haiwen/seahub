import React, { Component, Fragment } from 'react';
import { navigate } from '@gatsbyjs/reach-router';
import { Button } from 'reactstrap';
import { Utils } from '../../../utils/utils';
import { seafileAPI } from '../../../utils/seafile-api';
import { siteRoot, gettext } from '../../../utils/constants';
import toaster from '../../../components/toast';
import SysAdminAddOrgDialog from '../../../components/dialog/sysadmin-dialog/sysadmin-add-org-dialog';
import MainPanelTopbar from '../main-panel-topbar';
import Search from '../search';
import Content from './orgs-content';


class Orgs extends Component {

  constructor(props) {
    super(props);
    this.state = {
      loading: true,
      errorMsg: '',
      orgList: [],
      currentPage: 1,
      perPage: 25,
      hasNextPage: false,
      isAddOrgDialogOpen: false
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
    seafileAPI.sysAdminListOrgs(page, perPage).then((res) => {
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
  }

  resetPerPage = (perPage) => {
    this.setState({
      perPage: perPage
    }, () => {
      this.getItemsByPage(1);
    });
  }

  toggleAddOrgDialog = () => {
    this.setState({isAddOrgDialogOpen: !this.state.isAddOrgDialogOpen});
  }

  updateRole = (orgID, role) => {
    let orgInfo = {};
    orgInfo.role = role;
    seafileAPI.sysAdminUpdateOrg(orgID, orgInfo).then(res => {
      let newOrgList = this.state.orgList.map(org => {
        if (org.org_id == orgID) {
          org.role = role;
        }
        return org;
      });
      this.setState({orgList: newOrgList});
      toaster.success(gettext('Edit succeeded'));
    }).catch((error) => {
      let errMessage = Utils.getErrorMsg(error);
      toaster.danger(errMessage);
    });
  }

  addOrg = (data) => {
    const { orgName, ownerEmail, password } = data;
    seafileAPI.sysAdminAddOrg(orgName, ownerEmail, password).then(res => {
      let orgList = this.state.orgList;
      orgList.unshift(res.data);
      this.setState({orgList: orgList});
    }).catch((error) => {
      let errMessage = Utils.getErrorMsg(error);
      toaster.danger(errMessage);
    });
  }

  deleteOrg = (orgID) => {
    seafileAPI.sysAdminDeleteOrg(orgID).then(res => {
      let orgList = this.state.orgList.filter(org => {
        return org.org_id != orgID;
      });
      this.setState({orgList: orgList});
      toaster.success(gettext('Successfully deleted 1 item.'));
    }).catch((error) => {
      let errMessage = Utils.getErrorMsg(error);
      toaster.danger(errMessage);
    });
  }

  getSearch = () => {
    return <Search
      placeholder={gettext('Search organizations')}
      submit={this.searchItems}
    />;
  }

  searchItems = (keyword) => {
    navigate(`${siteRoot}sys/search-organizations/?query=${encodeURIComponent(keyword)}`);
  }

  render() {
    const { isAddOrgDialogOpen } = this.state;
    return (
      <Fragment>
        <MainPanelTopbar search={this.getSearch()} {...this.props}>
          <Button className="btn btn-secondary operation-item" onClick={this.toggleAddOrgDialog}>{gettext('Add Organization')}</Button>
        </MainPanelTopbar>
        <div className="main-panel-center flex-row">
          <div className="cur-view-container">
            <div className="cur-view-path">
              <h3 className="sf-heading">{gettext('Organizations')}</h3>
            </div>
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
                deleteOrg={this.deleteOrg}
              />
            </div>
          </div>
        </div>
        {isAddOrgDialogOpen &&
          <SysAdminAddOrgDialog
            addOrg={this.addOrg}
            toggleDialog={this.toggleAddOrgDialog}
          />
        }
      </Fragment>
    );
  }
}

export default Orgs;
