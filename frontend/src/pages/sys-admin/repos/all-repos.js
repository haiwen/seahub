import React, { Component, Fragment } from 'react';
import { navigate } from '@reach/router';
import { Button } from 'reactstrap';
import { Utils } from '../../../utils/utils';
import { seafileAPI } from '../../../utils/seafile-api';
import { loginUrl, gettext, siteRoot } from '../../../utils/constants';
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
      isCreateRepoDialogOpen: false
    };
  }

  componentDidMount () {
    this.getReposByPage(1);
  }

  toggleCreateRepoDialog = () => {
    this.setState({isCreateRepoDialogOpen: !this.state.isCreateRepoDialogOpen});
  }

  getReposByPage = (page) => {
    seafileAPI.sysAdminListAllRepos(page, this.state.perPage).then((res) => {
      this.setState({
        loading: false,
        repos: res.data.repos,
        pageInfo: res.data.page_info
      });
    }).catch((error) => {
      if (error.response) {
        if (error.response.status == 403) {
          this.setState({
            loading: false,
            errorMsg: gettext('Permission denied')
          }); 
        } else {
          this.setState({
            loading: false,
            errorMsg: gettext('Error')
          }); 
        }   
      } else {
        this.setState({
          loading: false,
          errorMsg: gettext('Please check the network.')
        }); 
      }   
    });
  }

  createRepo = (repoName, Owner) => {
    seafileAPI.sysAdminCreateRepo(repoName, Owner).then(res => {
      this.state.repos.unshift(res.data);
      this.setState({
        repos: this.state.repos
      });
    }).catch(error => {
      let errMessage = Utils.getErrorMsg(error);
      toaster.danger(errMessage);
    });
  }

  onDeleteRepo = (targetRepo) => {
    let repos = this.state.repos.filter(repo => {
      return repo.id != targetRepo.id;
    });
    this.setState({
      repos: repos
    });
  }

  onTransferRepo = (targetRepo) => {
    let repos = this.state.repos.map((item) => {
      return item.id == targetRepo.id ? targetRepo : item;
    });
    this.setState({
      repos: repos
    });
  }

  getSearch = () => {
    return <Search
      placeholder={gettext('Search libraries by name')}
      submit={this.searchRepos}
    />;
  }

  searchRepos = (repoName) => {
    navigate(`${siteRoot}sys/search-libraries/?name=${encodeURIComponent(repoName)}`);
  }

  render() {
    let { isCreateRepoDialogOpen } = this.state;
    return (
      <Fragment>
        <MainPanelTopbar search={this.getSearch()}>
          <Button className="btn btn-secondary operation-item" onClick={this.toggleCreateRepoDialog}>
            <i className="fas fa-plus-square text-secondary mr-1"></i>{gettext('New Library')}
          </Button>          
        </MainPanelTopbar>
        <div className="main-panel-center flex-row">
          <div className="cur-view-container">
            <ReposNav currentItem="all" />
            <div className="cur-view-content">
              <Content
                loading={this.state.loading}
                errorMsg={this.state.errorMsg}
                items={this.state.repos}
                pageInfo={this.state.pageInfo}
                getListByPage={this.getReposByPage}
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
