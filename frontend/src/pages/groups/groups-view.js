import React, { Fragment } from 'react';
import PropTypes from 'prop-types';
import { gettext, canAddGroup } from '../../utils/constants';
import { seafileAPI } from '../../utils/seafile-api';
import { Utils } from '../../utils/utils';
import Loading from '../../components/loading';
import Group from '../../models/group';
import Repo from '../../models/repo';
import TopToolbar from '../../components/toolbar/top-toolbar';
import GroupsToolbar from '../../components/toolbar/groups-toolbar';
import EmptyTip from '../../components/empty-tip';
import GroupItem from './group-item';

import '../../css/groups.css';

class GroupsView extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      isLoading: true,
      errorMsg: '',
      groupList: []
    };
  }

  listGroups = () => {
    seafileAPI.listGroups(true).then((res) => {
      // `{'with_repos': 1}`: list repos of every group
      let groupList = res.data.map(item => {
        let group = new Group(item);
        group.repos = item.repos.map(item => {
          return new Repo(item);
        });
        return group;
      });
      this.setState({
        isLoading: false,
        groupList: groupList.sort((a, b) => {
          return a.name.toLowerCase() < b.name.toLowerCase() ? -1 : 1;
        })
      });
    }).catch((error) => {
      this.setState({
        isLoading: false,
        errorMsg: Utils.getErrorMsg(error, true) // true: show login tip if 403
      });
    });
  };

  onCreateGroup = (groupData) => {
    const newGroup = new Group(groupData);
    const { groupList: newList } = this.state;
    newList.unshift(newGroup);
    this.setState({
      groupList: newList
    });
  };

  componentDidMount() {
    this.listGroups();
  }

  updateGroup = (group) => {
    const { groupList } = this.state;
    this.setState({
      groupList: groupList.map((item) => {
        if (item.id == group.id) {
          item = group;
        }
        return item;
      })
    });
  };

  render() {
    const emptyTip = (
      <EmptyTip>
        <h2>{gettext('No groups')}</h2>
        {canAddGroup ?
          <p>{gettext('You are not in any groups. Groups allow multiple people to collaborate on libraries. You can create a group by clicking the "New Group" button in the menu bar.')}</p> :
          <p>{gettext('You are not in any groups. Groups allow multiple people to collaborate on libraries. Groups you join will be listed here.')}</p>
        }
      </EmptyTip>
    );

    return (
      <Fragment>
        <TopToolbar
          onShowSidePanel={this.props.onShowSidePanel}
          onSearchedClick={this.props.onSearchedClick}
        >
          {canAddGroup && <GroupsToolbar onCreateGroup={this.onCreateGroup} />}
        </TopToolbar>
        <div className="main-panel-center flex-row">
          <div className="cur-view-container">
            <div className="cur-view-path">
              <h3 className="sf-heading">{gettext('My Groups')}</h3>
            </div>
            <div className="cur-view-content cur-view-content-groups">
              {this.state.isLoading && <Loading />}
              {(!this.state.isLoading && this.state.errorMsg) && <div className="error text-center mt-2">{this.state.errorMsg}</div>}
              {(!this.state.isLoading && !this.state.errorMsg && this.state.groupList.length == 0) && emptyTip}
              {!this.state.isLoading && this.state.groupList.map((group, index) => {
                return (
                  <GroupItem
                    key={index}
                    group={group}
                    updateGroup={this.updateGroup}
                  />
                );
              })}
            </div>
          </div>
        </div>
      </Fragment>
    );
  }
}

const GroupsViewPropTypes = {
  onShowSidePanel: PropTypes.func.isRequired,
  onSearchedClick: PropTypes.func.isRequired,
};

GroupsView.propTypes = GroupsViewPropTypes;

export default GroupsView;
