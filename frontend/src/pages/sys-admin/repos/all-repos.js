import React, { Component, Fragment } from 'react';
import { navigate } from '@gatsbyjs/reach-router';
import { Button } from 'reactstrap';
import { Utils } from '../../../utils/utils';
import { systemAdminAPI } from '../../../utils/system-admin-api';
import { gettext, siteRoot } from '../../../utils/constants';
import toaster from '../../../components/toast';
import SysAdminCreateRepoDialog from '../../../components/dialog/sysadmin-dialog/sysadmin-create-repo-dialog';
import MainPanelTopbar from '../main-panel-topbar';
import Search from '../search';
import ReposNav from './repos-nav';
import Content from './repos';

class AllRepos extends Component {

  constructor(props) {
    super(props);
    this.state = {
      loading: true,
      errorMsg: '',
      repos: [],
      pageInfo: {},
      perPage: 100,
      sortBy: '',
      isCreateRepoDialogOpen: false
    };
  }

  componentDidMount() {
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

  toggleCreateRepoDialog = () => {
    this.setState({ isCreateRepoDialogOpen: !this.state.isCreateRepoDialogOpen });
  };

  getReposByPage = (page) => {
    const { perPage, sortBy } = this.state;
    systemAdminAPI.sysAdminListAllRepos(page, perPage, sortBy).then((res) => {
      this.setState({
        loading: false,
        repos: res.data.repos,
        pageInfo: res.data.page_info
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

  createRepo = (repoName, Owner) => {
    systemAdminAPI.sysAdminCreateRepo(repoName, Owner).then(res => {
      this.state.repos.unshift(res.data);
      this.setState({
        repos: this.state.repos
      });
    }).catch(error => {
      let errMessage = Utils.getErrorMsg(error);
      toaster.danger(errMessage);
    });
  };

  onDeleteRepo = (targetRepo) => {
    let repos = this.state.repos.filter(repo => {
      return repo.id != targetRepo.id;
    });
    this.setState({
      repos: repos
    });
  };

  onTransferRepo = (targetRepo) => {
    let repos = this.state.repos.map((item) => {
      return item.id == targetRepo.id ? targetRepo : item;
    });
    this.setState({
      repos: repos
    });
  };

  getSearch = () => {
    return <Search
      placeholder={gettext('Search libraries by name or ID')}
      submit={this.searchRepos}
    />;
  };

  searchRepos = (repoNameOrID) => {
    if (this.getValueLength(repoNameOrID) < 3) {
      toaster.notify(gettext('Required at least three letters.'));
      return;
    }
    navigate(`${siteRoot}sys/search-libraries/?name_or_id=${encodeURIComponent(repoNameOrID)}`);
  };

  getValueLength(str) {
    let code; let len = 0;
    for (let i = 0, length = str.length; i < length; i++) {
      code = str.charCodeAt(i);
      if (code === 10) { // solve enter problem
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
    let { isCreateRepoDialogOpen } = this.state;
    return (
      <Fragment>
        <MainPanelTopbar search={this.getSearch()} {...this.props}>
          <Button className="btn btn-secondary operation-item" onClick={this.toggleCreateRepoDialog}>
            <i className="sf3-font sf3-font-enlarge text-secondary mr-1"></i>{gettext('New Library')}
          </Button>
        </MainPanelTopbar>
        <div className="main-panel-center flex-row">
          <div className="cur-view-container">
            <ReposNav
              currentItem="all"
              sortBy={this.state.sortBy}
              sortItems={this.sortItems}
            />
            <div className="cur-view-content">
              <Content
                loading={this.state.loading}
                errorMsg={this.state.errorMsg}
                items={this.state.repos}
                pageInfo={this.state.pageInfo}
                curPerPage={this.state.perPage}
                getListByPage={this.getReposByPage}
                resetPerPage={this.resetPerPage}
                onDeleteRepo={this.onDeleteRepo}
                onTransferRepo={this.onTransferRepo}
              />
            </div>
          </div>
        </div>
        {isCreateRepoDialogOpen &&
        <SysAdminCreateRepoDialog
          createRepo={this.createRepo}
          toggleDialog={this.toggleCreateRepoDialog}
        />
        }
      </Fragment>
    );
  }
}

export default AllRepos;
