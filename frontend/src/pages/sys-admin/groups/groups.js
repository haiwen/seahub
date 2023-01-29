import React, { Component, Fragment } from 'react';
import { navigate } from '@gatsbyjs/reach-router';
import { Button } from 'reactstrap';
import { Utils } from '../../../utils/utils';
import { seafileAPI } from '../../../utils/seafile-api';
import { siteRoot, gettext } from '../../../utils/constants';
import toaster from '../../../components/toast';
import SysAdminCreateGroupDialog from '../../../components/dialog/sysadmin-dialog/sysadmin-create-group-dialog';
import MainPanelTopbar from '../main-panel-topbar';
import Search from '../search';
import Content from './groups-content';

class Groups extends Component {

  constructor(props) {
    super(props);
    this.state = {
      loading: true,
      errorMsg: '',
      groupList: [],
      pageInfo: {},
      perPage: 25,
      isCreateGroupDialogOpen: false
    };
  }

  componentDidMount () {
    let urlParams = (new URL(window.location)).searchParams;
    const { currentPage = 1, perPage } = this.state;
    this.setState({
      perPage: parseInt(urlParams.get('per_page') || perPage),
      currentPage: parseInt(urlParams.get('page') || currentPage)
    }, () => {
      this.getGroupListByPage(this.state.currentPage);
    });
  }

  toggleCreateGroupDialog = () => {
    this.setState({isCreateGroupDialogOpen: !this.state.isCreateGroupDialogOpen});
  }

  getGroupListByPage = (page) => {
    seafileAPI.sysAdminListAllGroups(page, this.state.perPage).then((res) => {
      this.setState({
        loading: false,
        groupList: res.data.groups,
        pageInfo: res.data.page_info
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
      this.getGroupListByPage(1);
    });
  }

  createGroup = (groupName, OnwerEmail) => {
    seafileAPI.sysAdminCreateNewGroup(groupName, OnwerEmail).then(res => {
      let newGroupList = this.state.groupList;
      newGroupList.unshift(res.data);
      this.setState({
        groupList: newGroupList
      });
      this.toggleCreateGroupDialog();
    }).catch((error) => {
      let errMessage = Utils.getErrorMsg(error);
      toaster.danger(errMessage);
    });
  }

  deleteGroup = (groupID) => {
    seafileAPI.sysAdminDismissGroupByID(groupID).then(res => {
      let newGroupList = this.state.groupList.filter(item => {
        return item.id != groupID;
      });
      this.setState({
        groupList: newGroupList
      });
      toaster.success(gettext('Successfully deleted 1 item.'));
    }).catch((error) => {
      let errMessage = Utils.getErrorMsg(error);
      toaster.danger(errMessage);
    });
  }

  transferGroup = (groupID, receiverEmail) => {
    seafileAPI.sysAdminTransferGroup(receiverEmail, groupID).then(res => {
      let newGroupList = this.state.groupList.map(item => {
        if (item.id == groupID) {
          item = res.data;
        }
        return item;
      });
      this.setState({
        groupList: newGroupList
      });
      toaster.success(gettext('Successfully transferred the group.'));
    }).catch((error) => {
      let errMessage = Utils.getErrorMsg(error);
      toaster.danger(errMessage);
    });
  }

  getSearch = () => {
    return <Search
      placeholder={gettext('Search groups by name')}
      submit={this.searchGroups}
    />;
  }

  searchGroups = (name) => {
    navigate(`${siteRoot}sys/search-groups/?name=${encodeURIComponent(name)}`);
  }

  render() {
    let { isCreateGroupDialogOpen } = this.state;

    return (
      <Fragment>
        <MainPanelTopbar search={this.getSearch()} {...this.props}>
          <Fragment>
            <Button className="operation-item" onClick={this.toggleCreateGroupDialog}>{gettext('New Group')}</Button>
            <a className="btn btn-secondary operation-item" href={`${siteRoot}sys/groupadmin/export-excel/`}>{gettext('Export Excel')}</a>
          </Fragment>
        </MainPanelTopbar>
        <div className="main-panel-center flex-row">
          <div className="cur-view-container">
            <div className="cur-view-path">
              <h3 className="sf-heading">{gettext('Groups')}</h3>
            </div>
            <div className="cur-view-content">
              <Content
                loading={this.state.loading}
                errorMsg={this.state.errorMsg}
                items={this.state.groupList}
                pageInfo={this.state.pageInfo}
                deleteGroup={this.deleteGroup}
                transferGroup={this.transferGroup}
                getListByPage={this.getGroupListByPage}
                resetPerPage={this.resetPerPage}
                curPerPage={this.state.perPage}
              />
            </div>
          </div>
        </div>
        {isCreateGroupDialogOpen &&
          <SysAdminCreateGroupDialog
            createGroup={this.createGroup}
            toggleDialog={this.toggleCreateGroupDialog}
          />
        }
      </Fragment>
    );
  }
}

export default Groups;
