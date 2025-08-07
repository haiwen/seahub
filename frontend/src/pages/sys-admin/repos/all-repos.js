import React, { Component } from 'react';
import { Utils } from '../../../utils/utils';
import { systemAdminAPI } from '../../../utils/system-admin-api';
import toaster from '../../../components/toast';
import SysAdminCreateRepoDialog from '../../../components/dialog/sysadmin-dialog/sysadmin-create-repo-dialog';
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
    };
  }

  componentDidMount() {
    this.getReposByPage(this.props.currentPage);
  }

  componentDidUpdate(prevProps, prevState) {
    if (prevProps.currentPage !== this.props.currentPage ||
      prevProps.sortBy !== this.props.sortBy
    ) {
      this.getReposByPage(this.props.currentPage);
    }
  }

  getReposByPage = (page) => {
    const { perPage, sortBy } = this.props;
    if (!this.isValidSortBy(sortBy)) return;

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

  isValidSortBy = (sortBy) => {
    return ['file_count-desc', 'size-desc', ''].includes(sortBy);
  };

  resetPerPage = (perPage) => {
    this.props.onResetPerPage(perPage, () => { this.getReposByPage(1); });
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

  render() {
    const { isCreateRepoDialogOpen } = this.props;
    return (
      <>
        <div className="main-panel-center flex-row">
          <div className="cur-view-container">
            <div className="cur-view-content">
              <Content
                loading={this.state.loading}
                errorMsg={this.state.errorMsg}
                items={this.state.repos}
                pageInfo={this.state.pageInfo}
                curPerPage={this.props.perPage}
                getListByPage={this.getReposByPage}
                resetPerPage={this.resetPerPage}
                onDeleteRepo={this.onDeleteRepo}
                onTransferRepo={this.onTransferRepo}
              />
            </div>
          </div>
        </div>
        {isCreateRepoDialogOpen && (
          <SysAdminCreateRepoDialog
            createRepo={this.createRepo}
            toggleDialog={this.props.toggleCreateRepoDialog}
          />
        )}
      </>
    );
  }
}

export default AllRepos;
