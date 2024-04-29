import React, { Component, Fragment } from 'react';
import { navigate } from '@gatsbyjs/reach-router';
import { Utils } from '../../utils/utils';
import OrgAdminRepo from '../../models/org-admin-repo';
import { seafileAPI } from '../../utils/seafile-api';
import { gettext, siteRoot, orgID } from '../../utils/constants';
import toaster from '../../components/toast';
import MainPanelTopbar from './main-panel-topbar';
import Content from './org-repos';
import ReposNav from './org-repo-nav';


class OrgAllRepos extends Component {

  constructor(props) {
    super(props);
    this.state = {
      loading: true,
      errorMsg: '',
      repos: [],
      pageInfo: {},
      perPage: 25,
      sortBy: '',
    };
  }

  componentDidMount () {
    let urlParams = (new URL(window.location)).searchParams;
    const { currentPage = 1, perPage, sortBy } = this.state;
    this.setState({
      sortBy: urlParams.get('order_by') || sortBy,
      perPage: parseInt(urlParams.get('per_page') || perPage),
      currentPage: parseInt(urlParams.get('page') || currentPage)
    }, () => {
      this.getReposByPage(this.state.currentPage);
    });
  }

  getReposByPage = (page) => {
    seafileAPI.orgAdminListOrgRepos(orgID, page, this.state.sortBy).then((res) => {
      let orgRepos = res.data.repo_list.map(item => {
        return new OrgAdminRepo(item);
      });
      let page_info = {};
      if(res.data.page_info==undefined){
        let page = res.data.page;
        let has_next_page = res.data.page_next;
        page_info = {
          'current_page': page,
          'has_next_page': has_next_page
        };
      }else{
        page_info = res.data.page_info;
      }
      this.setState({
        loading: false,
        repos: orgRepos,
        pageInfo: page_info
      });
    }).catch((error) => {
      this.setState({
        loading: false,
        errorMsg: Utils.getErrorMsg(error, true) // true: show login tip if 403
      });
    });
  };

  sortItems = (sortBy) => {
    this.setState({
      currentPage: 1,
      sortBy: sortBy
    }, () => {
      let url = new URL(location.href);
      let searchParams = new URLSearchParams(url.search);
      const { currentPage, sortBy } = this.state;
      searchParams.set('page', currentPage);
      searchParams.set('order_by', sortBy);
      url.search = searchParams.toString();
      navigate(url.toString());
      this.getReposByPage(currentPage);
    });
  };

  resetPerPage = (perPage) => {
    this.setState({
      perPage: perPage
    }, () => {
      this.getReposByPage(1);
    });
  };


  deleteRepoItem = (repo) => {
    seafileAPI.orgAdminDeleteOrgRepo(orgID, repo.repoID).then(res => {
      this.setState({
        repos: this.state.repos.filter(item => item.repoID != repo.repoID)
      });
      let msg = gettext('Successfully deleted {name}');
      msg = msg.replace('{name}', repo.repoName);
      toaster.success(msg);
    }).catch(error => {
      let errMessage = Utils.getErrorMsg(error);
      toaster.danger(errMessage);
    });
  };

  transferRepoItem = (repoID, user) => {
    this.setState({
      repos: this.state.repos.map(item =>{
        if (item.repoID == repoID) {
          item.ownerEmail = user.email;
          item.ownerName = user.value;
        }
        return item;
      })
    });
  };


  searchRepos = (repoNameOrID) => {
    if (this.getValueLength(repoNameOrID) < 3) {
      toaster.notify(gettext('Required at least three letters.'));
      return;
    }
    navigate(`${siteRoot}sys/search-libraries/?name_or_id=${encodeURIComponent(repoNameOrID)}`);
  };

  getValueLength(str) {
    let code, len = 0;
    for (let i = 0, length = str.length; i < length; i++) {
      code = str.charCodeAt(i);
      if (code === 10) { //solve enter problem
        len += 2;
      } else if (code < 0x007f) {
        len += 1;
      } else if (code >= 0x0080 && code <= 0x07ff) {
        len += 2;
      } else if (code >= 0x0800 && code <= 0xffff) {
        len += 3;
      }
    }
    return len;
  }

  render() {
    return (
      <Fragment>
        <MainPanelTopbar />
        <div className="main-panel-center flex-row">
          <div className="cur-view-container">
            <ReposNav currentItem="all" />
            <div className="cur-view-content">
              <Content
                loading={this.state.loading}
                errorMsg={this.state.errorMsg}
                items={this.state.repos}
                sortBy={this.state.sortBy}
                sortItems={this.sortItems}
                pageInfo={this.state.pageInfo}
                curPerPage={this.state.perPage}
                getListByPage={this.getReposByPage}
                resetPerPage={this.resetPerPage}
                onDeleteRepo={this.deleteRepoItem}
                transferRepoItem={this.transferRepoItem}
              />
            </div>
          </div>
        </div>
      </Fragment>
    );
  }
}

export default OrgAllRepos;
