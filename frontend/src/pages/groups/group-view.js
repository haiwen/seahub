import React, { Fragment } from 'react';
import PropTypes from 'prop-types';
import Loading from '../../components/loading';
import { gettext, username, loginUrl } from '../../utils/constants';
import { seafileAPI } from '../../utils/seafile-api';
import Group from '../../models/group';
import RepoInfo from '../../models/repoInfo';
import CommonToolbar from '../../components/toolbar/common-toolbar';
import RepoViewToolbar from '../../components/toolbar/repo-view-toobar';
import CurGroupPath from '../../components/cur-group-path/';
import RepoListView from '../../components/repo-list-view/repo-list-view';

const propTypes = {

};

class GroupView extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      isLoading: true,
      errMessage: '',
      currentGroup: null,
      repoList: [],
    }
  }

  componentDidMount() {
    let groupID = this.props.groupID;
    this.loadGroup(groupID);
  }

  componentWillReceiveProps(nextProps) {
    if (nextProps.groupID !== this.props.groupID) {
      this.loadGroup(nextProps.groupID);
    }
  }

  loadGroup = (groupID) => {
    seafileAPI.getGroup(groupID).then((res) => {
      let currentGroup = new Group(res.data);
      this.setState({currentGroup: currentGroup});
      this.loadRepos(groupID);
    }).catch((error) => {
      if (error.response) {
        if (error.response.status == 403) {
          this.setState({
            isLoading: false,
            errorMsg: gettext("Permission denied")
          });
          location.href = `${loginUrl}?next=${encodeURIComponent(location.href)}`;
        } else {
          this.setState({
            isLoading: false,
            errorMsg: gettext("Error")
          });
        }
      } else {
        this.setState({
          isLoading: false,
          errorMsg: gettext("Please check the network.")
        });
      }
    });
  }

  loadRepos = (groupID) => {
    this.setState({isLoading: true});
    seafileAPI.listGroupRepos(groupID).then((res) => {
      let repoList = res.data.map(item => {
        let repoInfo = new RepoInfo(item);
        return repoInfo;
      });
      this.setState({
        isLoading: false,
        repoList: repoList
      });
    }).catch((error) => {
      if (error.response) {
        if (error.response.status == 403) {
          this.setState({
            isLoading: false,
            errorMsg: gettext("Permission denied")
          });
          location.href = `${loginUrl}?next=${encodeURIComponent(location.href)}`;
        } else {
          this.setState({
            isLoading: false,
            errorMsg: gettext("Error")
          });
        }
      } else {
        this.setState({
          isLoading: false,
          errorMsg: gettext("Please check the network.")
        });
      }
    });
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

  getEmptyTip = () => {
    let currentGroup = this.state.currentGroup;
    let emptyTip = null;
    if (currentGroup) {
      if (currentGroup.parent_group_id === 0) {
        emptyTip = (
          <div className="empty-tip">
            <h2>{gettext('No library is shared to this group')}</h2>
            <p>{gettext('You can share libraries by clicking the "New Library" button above or the "Share" icon on your libraries list.')}</p>
            <p>{gettext('Libraries shared as writable can be downloaded and synced by other group members. Read only libraries can only be downloaded, updates by others will not be uploaded.')}</p>
          </div>
        );
      } else {
        if (currentGroup.admins.indexOf(username) == -1) {
          emptyTip = (
            <div className="empty-tip">
              <h2>{gettext('No libraries')}</h2>
            </div>
          );
        } else {
          emptyTip = (
            <div className="empty-tip">
              <h2>{gettext('No libraries')}</h2>
              <p>{gettext('You can create libraries by clicking the "New Library" button above.')}</p>
            </div>
          );
        }
      }
    }
    return emptyTip;
  }

  render() {
    let emptyTip = this.getEmptyTip();
    return (
      <Fragment>
        <div className="main-panel-north">
          <RepoViewToolbar onShowSidePanel={this.props.onShowSidePanel} onCreateRepo={this.onCreateRepo} libraryType={'group'}/>
          <CommonToolbar onSearchedClick={this.props.onSearchedClick} />
        </div>
        <div className="main-panel-center">
          <div className="cur-view-container">
            <div className="cur-view-path">
              {this.state.currentGroup && <CurGroupPath currentGroup={this.state.currentGroup}/>}
            </div>
            <div className="cur-view-content">
              {this.state.isLoading && <Loading />}
              {(!this.state.isLoading && this.state.errMessage) && this.state.errMessage}
              {(!this.state.isLoading && this.state.repoList.length === 0) && emptyTip}
              {(!this.state.isLoading && this.state.repoList.length > 0) &&
                <RepoListView 
                  isShowRepoOwner={true}
                  currentGroup={this.state.currentGroup} 
                  repoList={this.state.repoList} 
                />
              }
            </div>
          </div>
        </div>
      </Fragment>
    );
  }
}

GroupView.propTypes = propTypes;

export default GroupView;
