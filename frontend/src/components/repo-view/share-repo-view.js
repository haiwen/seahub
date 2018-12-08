import React, { Fragment } from 'react';
import PropTypes from 'prop-types';
import { seafileAPI } from '../../utils/seafile-api';
import RepoInfo from '../../models/repoInfo';
import Loading from '../../components/loading';
import CommonToolbar from '../../components/toolbar/common-toolbar';
import RepoViewToolbar from '../../components/toolbar/repo-view-toobar';
import CurRepoPath from '../../components/cur-repo-path/';
import ShareRepoListView from '../../components/shared-repo-list-view/shared-repo-list-view';

const propTypes = {
  isLoading: PropTypes.bool.isRequired,
  isShowRepoOwner: PropTypes.bool.isRequired,
  errMessage: PropTypes.string.isRequired,
  currentTab: PropTypes.string.isRequired,
  repoList: PropTypes.array.isRequired,
  onShowSidePanel: PropTypes.func.isRequired,
  emptyTip: PropTypes.object,
  currentGroup: PropTypes.object,
  onSearchedClick: PropTypes.func,
};

class ShareRepoView extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      repoList: [],
    };
  }

  componentWillReceiveProps(nextProps) {
    this.setState({repoList: nextProps.repoList});
  }

  onCreateRepo = (repo) => {
    let groupId = this.props.groupID;
    seafileAPI.createGroupRepo(groupId, repo).then(res => {
      let repo = new RepoInfo(res.data);
      let repoList = this.addRepoItem(repo);
      this.setState({repoList: repoList});
    }).catch(() => {
      //todo
    });
  }

  addRepoItem = (repo) => {
    let newRepoList = this.state.repoList.map(item => {return item;});
    newRepoList.push(repo);
    return newRepoList;
  }

  render() {
    let { errMessage, emptyTip } = this.props;
    return (
      <Fragment>
        <div className="main-panel-north">
          <RepoViewToolbar 
            libraryType={this.props.currentTab}
            onShowSidePanel={this.props.onShowSidePanel} 
            onCreateRepo={this.onCreateRepo} 
          />
          <CommonToolbar onSearchedClick={this.props.onSearchedClick} />
        </div>
        <div className="main-panel-center">
          <div className="cur-view-container">
            <div className="cur-view-path">
              <CurRepoPath currentTab={this.props.currentTab} currentGroup={this.props.currentGroup}/>
            </div>
            <div className="cur-view-content">
              {this.props.isLoading && <Loading />}
              {(!this.props.isLoading && errMessage) && errMessage}
              {(!this.props.isLoading && this.state.repoList.length === 0) && emptyTip}
              {(!this.props.isLoading && this.state.repoList.length > 0) &&
                <ShareRepoListView 
                  repoList={this.props.repoList} 
                  currentGroup={this.props.currentGroup} 
                  isShowRepoOwner={this.props.isShowRepoOwner}
                />
              }
            </div>
          </div>
        </div>
      </Fragment>
    );
  }
}

ShareRepoView.propTypes = propTypes;

export default ShareRepoView;
