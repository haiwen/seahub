import React, { Component, Fragment } from 'react';
import { seafileAPI } from '../../utils/seafile-api';
import { gettext, loginUrl} from '../../utils/constants';
import CommonToolbar from '../../components/toolbar/common-toolbar';
import RepoViewToolbar from '../../components/toolbar/repo-view-toobar';
import Content from '../../components/mylib-repo-list-view/content';
import LibDetail from '../../components/dirent-detail/lib-details';

class MyLibraries extends Component {
  constructor(props) {
    super(props);
    this.state = {
      isShowDetails: false,
      loading: true,
      errorMsg: '',
      items: [],
    };
  }

  componentDidMount() {
    seafileAPI.listRepos({type:'mine'}).then((res) => {
      // res: {data: {...}, status: 200, statusText: "OK", headers: {…}, config: {…}, …}
      this.setState({
        loading: false,
        items: res.data.repos
      });
    }).catch((error) => {
      if (error.response) {
        if (error.response.status == 403) {
          this.setState({
            loading: false,
            errorMsg: gettext("Permission denied")
          });
          location.href = `${loginUrl}?next=${encodeURIComponent(location.href)}`;
        } else {
          this.setState({
            loading: false,
            errorMsg: gettext("Error")
          });
        }
      } else {
        this.setState({
          loading: false,
          errorMsg: gettext("Please check the network.")
        });
      }
    });
  }

  onCreateRepo = (repo) => {
    seafileAPI.createMineRepo(repo).then((res) => {
      let repo = res.data;
      this.state.items.push(repo);
      this.setState({items: this.state.items});
    });
  }

  onTransferRepo = (repoID) => {
    let items = this.state.items.filter(item => {
      return item.repo_id !== repoID;
    })
    this.setState({items: items});
  }

  onRenameRepo = (repo, newName) => {
    let items = this.state.items.map(item => {
      if (item.repo_id === repo.repo_id) {
        item.repo_name = newName;
      }
      return item;
    });
    this.setState({items: items});
  }
  
  onDeleteRepo = (repo) => {
    let items = this.state.items.map(item => {
      return item.repo_id !== repo.repo_id;
    });
    this.setState({items: items});
  }

  onRepoDetails = (repo) => {
    this.setState({
      isShowDetails: true,
      currentRepo: repo
    })
  }

  closeDetails = () => {
    this.setState({
      isShowDetails: !this.state.isShowDetails
    });
  }

  render() {
    return (
      <Fragment>
        <div className="main-panel-north">
          <RepoViewToolbar onShowSidePanel={this.props.onShowSidePanel} onCreateRepo={this.onCreateRepo} libraryType={'mine'}/>
          <CommonToolbar onSearchedClick={this.props.onSearchedClick} />
        </div>
        <div className="main-panel-center flex-row">
          <div className="cur-view-container">
            <div className="cur-view-path">
              <h3 className="sf-heading">{gettext("My Libraries")}</h3>
            </div>
            <div className="cur-view-content">
              <Content 
                loading={this.state.loading}
                errorMsg={this.state.errorMsg}
                items={this.state.items}
                onDeleteRepo={this.onDeleteRepo}
                onRenameRepo={this.onRenameRepo}
                onTransferRepo={this.onTransferRepo}
                onRepoDetails={this.onRepoDetails}
              />
            </div>
          </div>
          {this.state.isShowDetails && (
            <div className="cur-view-detail">
              <LibDetail 
                currentRepo={this.state.currentRepo}
                closeDetails={this.closeDetails}
              />
            </div>
          )}
        </div>
      </Fragment>
    );
  }
}

export default MyLibraries;
