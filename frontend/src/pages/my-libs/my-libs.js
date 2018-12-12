import React, { Component, Fragment } from 'react';
import { seafileAPI } from '../../utils/seafile-api';
import { gettext, loginUrl} from '../../utils/constants';
import CommonToolbar from '../../components/toolbar/common-toolbar';
import RepoViewToolbar from '../../components/toolbar/repo-view-toobar';
import Content from '../../components/mylib-repo-list-view/content';



class MyLibraries extends Component {
  constructor(props) {
    super(props);
    this.state = {
      loading: true,
      errorMsg: '',
      items: []
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
      //todo update repoList 
    });
  }

  toggleTransferSubmit = (repoID) => {
    this.setState({
      items: this.state.items.filter(item => item.repo_id !== repoID) 
    }) 
  }

  renameRepo = (repoID, newName) => {
    let array = this.state.items;
    for (var i=0; i < array.length; i++) {
      if (array[i].repo_id === repoID) {
        array[i].repo_name=newName; 
        break;
      }
    }
    this.setState({items: array});
  }

  render() {
    return (
      <Fragment>
        <div className="main-panel-north">
          <RepoViewToolbar onShowSidePanel={this.props.onShowSidePanel} onCreateRepo={this.onCreateRepo} libraryType={'mine'}/>
          <CommonToolbar onSearchedClick={this.props.onSearchedClick} />
        </div>
        <div className="main-panel-center">
          <div className="cur-view-container">
            <div className="cur-view-path">
              <h3 className="sf-heading">{gettext("My Libraries")}</h3>
            </div>
            <div className="cur-view-content">
              <Content 
                data={this.state}  
                toggleTransferSubmit={this.toggleTransferSubmit}
                renameRepo={this.renameRepo}
              />
            </div>
          </div>
        </div>
      </Fragment>
    );
  }
}

export default MyLibraries;
