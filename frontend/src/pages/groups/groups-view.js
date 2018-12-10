import React, { Fragment } from 'react';
import PropTypes from 'prop-types';
import { gettext, siteRoot, loginUrl } from '../../utils/constants';
import { seafileAPI } from '../../utils/seafile-api';
import Loading from '../../components/loading';
import Group from '../../models/group';
import RepoInfo from '../../models/repoInfo';
import GeneralToolbar from '../../components/toolbar/general-toolbar';
import SharedRepoListView from '../../components/shared-repo-list-view/shared-repo-list-view';

import '../../css/groups.css';

const propTypes = {
  group: PropTypes.object.isRequired,
};


class RepoListViewPanel extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      repoList: [],
    };
  }

  componentDidMount() {
    let group = this.props.group;
    let repoList = group.repos.map(item => {
      let repo = new RepoInfo(item);
      return repo;
    });
    this.setState({repoList: repoList});
  }

  render() {
    let group = this.props.group;
    const emptyTip = <p className="group-item-empty-tip">{gettext('No libraries')}</p>;
    return (
      <Fragment>
        <h4 className="group-item-heading ellipsis">
          <a href={`${siteRoot}group/${group.id}/`} title={group.name}>{group.name}</a>
        </h4>
        {this.state.repoList.length === 0 ? 
          emptyTip :
          <SharedRepoListView 
            isShowTableThread={false}
            isShowRepoOwner={false} 
            currentGroup={this.props.group} 
            repoList={this.state.repoList}
          />
        }
      </Fragment>
    );
  }
 }

RepoListViewPanel.propTypes = propTypes;

class GroupsView extends React.Component {
  
  constructor(props) {
    super(props);
    this.state = {
      isLoading: true,
      errorMsg: '',
      groupList: [],
    }
  }

  componentDidMount() {
    seafileAPI.listGroupsV2({'with_repos': 1}).then((res) => { // TODO: api name
      // `{'with_repos': 1}`: list repos of every group
      // res: {data: [...], status: 200, statusText: "OK", headers: {…}, config: {…}, …}
      let groupList = res.data.map(item => {
        let group = new Group(item);
        return group;
      })
      this.setState({
        isLoading: false,
        groupList: groupList,
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

  render() {
    return (
      <Fragment>
        <GeneralToolbar onShowSidePanel={this.props.onShowSidePanel} onSearchedClick={this.props.onSearchedClick}/>
        <div className="main-panel-center">
          <div className="cur-view-container">
            <div className="cur-view-path">
              <h3 className="sf-heading">{gettext("My Groups")}</h3>
            </div>
            <div className="cur-view-content">
              {this.state.isLoading && <Loading />}
              {(!this.state.isLoading && this.state.errorMsg !== '') && this.state.errorMsg}
              {/* {(!this.state.isLoading && this.state.groupList.length === 0 ) && emptyTip} //todo */}
              {!this.state.isLoading && this.state.groupList.map((group, index) => {
                return (
                  <RepoListViewPanel key={index} group={group} />
                );
              })}
            </div>
          </div>
        </div>
      </Fragment>
    );
  }
}

// Groups.propTypes = propTypes;

export default GroupsView;
