import React from 'react';
import PropTypes from 'prop-types';
import { gettext, username, loginUrl } from '../../utils/constants';
import { seafileAPI } from '../../utils/seafile-api';
import Group from '../../models/group';
import RepoInfo from '../../models/repoInfo';
import SharedRepoView from '../../components/repo-view/share-repo-view';

const propTypes = {
  onShowSidePanel: PropTypes.func.isRequired,
  onSearchedClick: PropTypes.func.isRequired,
};

class GroupView extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      isLoading: true,
      errMessage: '',
      emptyTip: null,
      currentGroup: null,
      isStaff: false,
      repoList: [],
      currentTab: 'group',
      isShowRepoOwner: true,
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
      let emptyTip = this.getEmptyTip(currentGroup);
      let isStaff  = currentGroup.admins.indexOf(username) > -1;  //for item operations
      this.setState({
        emptyTip: emptyTip,
        currentGroup: currentGroup,
        isStaff: isStaff,
      });
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

  getEmptyTip = (currentGroup) => {
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
        if (currentGroup.admins.indexOf(username) == -1) {  // is a member of this group
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
    return (
      <SharedRepoView {...this.state} {...this.props}/>
    );
  }
}

GroupView.propTypes = propTypes;

export default GroupView;
