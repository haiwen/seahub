import React, { Component, Fragment } from 'react';
import PropTypes from 'prop-types';
import dayjs from 'dayjs';
import { Link } from '@gatsbyjs/reach-router';
import { seafileAPI } from '../../utils/seafile-api';
import { gettext, siteRoot, username } from '../../utils/constants';
import { Utils } from '../../utils/utils';
import Loading from '../../components/loading';
import Activity from '../../models/activity';
import FileActivitiesContent from './content';
import UserSelector from './user-selector';

import '../../css/files-activities.css';

dayjs.locale(window.app.config.lang);

const propTypes = {
  onlyMine: PropTypes.bool
};

class FilesActivities extends Component {

  constructor(props) {
    super(props);
    this.state = {
      errorMsg: '',
      isFirstLoading: true,
      isLoadingMore: false, // only for 'scroll down to the bottom'
      currentPage: 1,
      hasMore: true,
      allItems: [],
      items: [],
      availableUsers: [],
      targetUsers: []
    };
    this.curPathList = [];
    this.oldPathList = [];
    this.availableUserEmails = new Set();
  }

  componentDidMount() {
    let { currentPage, availableUsers } = this.state;
    seafileAPI.listActivities(currentPage, this.props.onlyMine ? username : '').then(res => {
      // {"events":[...]}
      let events = this.mergePublishEvents(res.data.events);
      events = this.mergeFileCreateEvents(events);
      events.forEach(item => {
        if (!this.availableUserEmails.has(item.author_email)) {
          this.availableUserEmails.add(item.author_email);
          availableUsers.push({
            email: item.author_email,
            name: item.author_name,
            contact_email: item.author_contact_email,
            avatar_url: item.avatar_url,
            isSelected: false,
            login_id: item.login_id
          });
        }
      });

      const curItems = this.filterEvents(events);
      this.setState({
        allItems: events,
        items: curItems,
        availableUsers: availableUsers,
        currentPage: currentPage + 1,
        isFirstLoading: curItems.length == 0,
        hasMore: true,
      });
      if (this.state.items.length < 25) {
        this.getMore();
      }
    }).catch(error => {
      this.setState({
        isFirstLoading: false,
        errorMsg: Utils.getErrorMsg(error, true) // true: show login tip if 403
      });
    });
  }

  mergePublishEvents = (events) => {
    events.forEach((item) => {
      if (item.op_type === 'publish') {
        this.curPathList.push(item.path);
        this.oldPathList.push(item.old_path);
      }
    });
    let actuallyEvents = [];
    for (var i = 0; i < events.length; i++) {
      if (events[i].obj_type === 'file') {
        if (events[i].op_type === 'delete' && this.oldPathList.includes(events[i].path)) {
          this.oldPathList.splice(this.oldPathList.indexOf(events[i].path), 1);
        } else if (events[i].op_type === 'edit' && this.curPathList.includes(events[i].path)) {
          this.curPathList.splice(this.curPathList.indexOf(events[i].path), 1);
        } else if (events[i].op_type === 'rename' && this.oldPathList.includes(events[i].old_path)) {
          this.oldPathList.splice(this.oldPathList.indexOf(events[i].old_path), 1);
        } else {
          actuallyEvents.push(events[i]);
        }
      } else {
        actuallyEvents.push(events[i]);
      }
    }
    return actuallyEvents;
  };

  mergeFileCreateEvents = (events) => {
    let actuallyEvents = [];
    let multiFilesActivity = null;
    for (var i = 0; i < events.length; i++) {
      let isFulfilCondition = events[i].obj_type === 'file' &&
                              events[i].op_type === 'create' &&
                              events[i + 1] &&
                              events[i + 1].obj_type === 'file' &&
                              events[i + 1].op_type === 'create' &&
                              events[i + 1].repo_name === events[i].repo_name &&
                              events[i + 1].author_email === events[i].author_email;
      if (multiFilesActivity != null) {
        multiFilesActivity.createdFilesCount++;
        multiFilesActivity.createdFilesList.push(events[i]);
        if (isFulfilCondition) {
          continue;
        } else {
          actuallyEvents.push(multiFilesActivity);
          multiFilesActivity = null;
        }
      } else {
        if (isFulfilCondition) {
          multiFilesActivity = new Activity(events[i]);
          multiFilesActivity.obj_type = 'files';
          multiFilesActivity.createdFilesCount++;
          multiFilesActivity.createdFilesList.push(events[i]);
        } else {
          actuallyEvents.push(events[i]);
        }
      }
    }
    return actuallyEvents;
  };

  getMore() {
    const { currentPage, availableUsers, targetUsers } = this.state;
    seafileAPI.listActivities(currentPage, this.props.onlyMine ? username : '').then(res => {
      // {"events":[...]}
      let events = this.mergePublishEvents(res.data.events);
      events = this.mergeFileCreateEvents(events);
      events.forEach(item => {
        if (!this.availableUserEmails.has(item.author_email)) {
          this.availableUserEmails.add(item.author_email);
          availableUsers.push({
            email: item.author_email,
            name: item.author_name,
            contact_email: item.author_contact_email,
            avatar_url: item.avatar_url,
            isSelected: false,
            login_id: item.login_id,
          });
        }
      });
      const filteredEvents = this.filterEvents(events);
      const curItems = [...this.state.items, ...filteredEvents];
      this.setState({
        allItems: [...this.state.allItems, ...events],
        items: curItems,
        availableUsers: availableUsers,
        currentPage: currentPage + 1,
        isFirstLoading: curItems.length == 0,
        isLoadingMore: false,
        hasMore: res.data.events.length === 0 ? false : true
      });
      if (this.state.items.length < 25 && this.state.hasMore) {
        if (!(targetUsers.length && currentPage == 100)) {
          this.getMore();
        }
      }
    }).catch(error => {
      this.setState({
        isFirstLoading: false,
        isLoadingMore: false,
        errorMsg: Utils.getErrorMsg(error, true) // true: show login tip if 403
      });
    });
  }

  filterEvents = (events) => {
    const { onlyMine } = this.props;
    const { targetUsers } = this.state;

    if (!onlyMine && targetUsers.length) {
      return events.filter(item => targetUsers.map(item => item.email).indexOf(item.author_email) != -1);
    }
    return events;
  };

  setTargetUsers = (selectedUsers) => {
    this.setState({
      targetUsers: selectedUsers
    }, () => {
      const items = this.filterEvents(this.state.allItems);
      this.setState({
        items: items
      }, () => {
        if (items.length < 25 && this.state.hasMore) {
          this.getMore();
        }
      });
    });
  };

  toggleSelectUser = (user) => {
    const { availableUsers } = this.state;
    this.setState({
      availableUsers: availableUsers.map(item => {
        if (item.email == user.email) {
          item.isSelected = !user.isSelected;
        }
        return item;
      })
    });
  };

  handleScroll = (event) => {
    if (!this.state.isLoadingMore && this.state.hasMore) {
      const clientHeight = event.target.clientHeight;
      const scrollHeight = event.target.scrollHeight;
      const scrollTop = event.target.scrollTop;
      const isBottom = (clientHeight + scrollTop + 1 >= scrollHeight);
      if (isBottom) { // scroll to the bottom
        this.setState({ isLoadingMore: true }, () => {
          this.getMore();
        });
      }
    }
  };

  render() {
    const { onlyMine } = this.props;
    const { targetUsers, availableUsers } = this.state;
    return (
      <div className="main-panel-center">
        <div className="cur-view-container" id="activities">
          <div className="cur-view-path">
            <ul className="nav">
              <li className="nav-item">
                <Link to={`${siteRoot}dashboard/`} className={`nav-link${onlyMine ? '' : ' active'}`}>{gettext('All Activities')}</Link>
              </li>
              <li className="nav-item">
                <Link to={`${siteRoot}my-activities/`} className={`nav-link${onlyMine ? ' active' : ''}`}>{gettext('My Activities')}</Link>
              </li>
            </ul>
          </div>
          <div className="cur-view-content d-block" onScroll={this.handleScroll}>
            {this.state.isFirstLoading && <Loading />}
            {(!this.state.isFirstLoading && this.state.errorMsg) &&
              <p className="error text-center">{this.state.errorMsg}</p>
            }
            {!this.state.isFirstLoading && (
              <Fragment>
                {!onlyMine && (
                  <UserSelector
                    availableUsers={availableUsers}
                    currentSelectedUsers={targetUsers}
                    setTargetUsers={this.setTargetUsers}
                    toggleSelectUser={this.toggleSelectUser}
                  />
                )}
                <FileActivitiesContent items={this.state.items} isLoadingMore={this.state.isLoadingMore} />
              </Fragment>
            )
            }
          </div>
        </div>
      </div>
    );
  }
}

FilesActivities.propTypes = propTypes;

export default FilesActivities;
