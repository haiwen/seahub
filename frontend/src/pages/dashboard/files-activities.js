import React, { Component, Fragment } from 'react';
import PropTypes from 'prop-types';
import moment from 'moment';
import { seafileAPI } from '../../utils/seafile-api';
import { gettext, siteRoot } from '../../utils/constants';
import { Utils } from '../../utils/utils';
import Loading from '../../components/loading';
import Activity from '../../models/activity';
import ListCreatedFileDialog from '../../components/dialog/list-created-files-dialog';
import ModalPortal from '../../components/modal-portal';
import '../../css/files-activities.css';

moment.locale(window.app.config.lang);

const contentPropTypes = {
  isLoadingMore: PropTypes.bool.isRequired,
  items: PropTypes.array.isRequired,
};

class FileActivitiesContent extends Component {

  render() {
    let {items, isLoadingMore} = this.props;
    return ( 
      <Fragment>
        <table width="100%" className="table table-hover table-vcenter">
          <colgroup>
            <col width="8%" />
            <col width="15%" />
            <col width="20%" />
            <col width="37%" />
            <col width="20%" />
          </colgroup>
          <TableBody items={items} />
        </table>
        {isLoadingMore ? <span className="loading-icon loading-tip"></span> : ''}
      </Fragment>
    ); 
  }
}

FileActivitiesContent.propTypes = contentPropTypes;


const tablePropTypes = {
  items: PropTypes.array.isRequired,
};

class TableBody extends Component {

  constructor(props) {
    super(props);
    this.state = {
      isListCreatedFiles: false,
      activity: '',
    };
  }

  onListCreatedFilesToggle = (activity) => {
    this.setState({
      isListCreatedFiles: !this.state.isListCreatedFiles,
      activity: activity,
    });
  }

  render() {
    let listFilesActivities = this.props.items.map(function(item, index) {
      let op, details;
      let userProfileURL = `${siteRoot}profile/${encodeURIComponent(item.author_email)}/`;

      let libURL = siteRoot + 'library/' + item.repo_id + '/' + encodeURIComponent(item.repo_name) + '/';
      let libLink = <a href={libURL}>{item.repo_name}</a>;
      let smallLibLink = <a className="small text-secondary" href={libURL}>{item.repo_name}</a>;

      if (item.obj_type == 'repo') {
        switch(item.op_type) {
          case 'create':
            op = gettext('Created library');
            details = <td>{libLink}</td>;
            break;
          case 'rename':
            op = gettext('Renamed library');
            details = <td>{item.old_repo_name} => {libLink}</td>;
            break;
          case 'delete':
            op = gettext('Deleted library');
            details = <td>{item.repo_name}</td>;
            break;
          case 'recover':
            op = gettext('Restored library');
            details = <td>{libLink}</td>;
            break;
          case 'clean-up-trash':
            if (item.days == 0) {
              op = gettext('Removed all items from trash.');
            } else {
              op = gettext('Removed items older than {n} days from trash.').replace('{n}', item.days);
            }
            details = <td>{libLink}</td>;
            break;
        }
      } else if (item.obj_type == 'review') {
        let fileURL = `${siteRoot}drafts/review/${item.review_id}`;
        let fileLink = <a href={fileURL} target="_blank">{item.name}</a>;
        switch(item.op_type) {
          case 'open':
            op = gettext('Open review');
            details = <td>{fileLink}<br />{smallLibLink}</td>;
            break;
          case 'closed':
            op = gettext('Close review');
            details = <td>{fileLink}<br />{smallLibLink}</td>;
            break;
          case 'finished':
            op = gettext('Publish draft');
            details = <td>{fileLink}<br />{smallLibLink}</td>;
            break;
        }
      } else if (item.obj_type == 'files') {
        let fileURL = `${siteRoot}lib/${item.repo_id}/file${Utils.encodePath(item.path)}`;
        let fileLink = `<a href=${fileURL} target="_blank">${item.name}</a>`;
        let fileCount = `<a href='#'>${item.createdFilesCount - 1}</a>`;
        let firstLine = gettext('{file} and {n} other files');
        firstLine = firstLine.replace('{file}', fileLink);
        firstLine = firstLine.replace('{n}', fileCount);
        op = gettext('Created {n} files').replace('{n}', item.createdFilesCount);
        details = <td><div dangerouslySetInnerHTML={{__html: firstLine}} onClick={this.onListCreatedFilesToggle.bind(this, item)}></div>{smallLibLink}</td>;
      } else if (item.obj_type == 'file') {
        let fileURL = `${siteRoot}lib/${item.repo_id}/file${Utils.encodePath(item.path)}`;
        let fileLink = <a href={fileURL} target="_blank">{item.name}</a>;
        switch(item.op_type) {
          case 'create':
            if (item.name.endsWith('(draft).md')) {
              op = gettext('Created draft');
              details = <td>{fileLink}<br />{smallLibLink}</td>;
              break;
            }
            op = gettext('Created file');
            details = <td>{fileLink}<br />{smallLibLink}</td>;
            break;
          case 'delete':
            if (item.name.endsWith('(draft).md')) {
              op = gettext('Deleted draft');
              details = <td>{item.name}<br />{smallLibLink}</td>;
              break;
            }
            op = gettext('Deleted file');
            details = <td>{item.name}<br />{smallLibLink}</td>;
            break;
          case 'recover':
            op = gettext('Restored file');
            details = <td>{fileLink}<br />{smallLibLink}</td>;
            break;
          case 'rename':
            op = gettext('Renamed file');
            details = <td>{item.old_name} => {fileLink}<br />{smallLibLink}</td>;
            break;
          case 'move':
            var filePathLink = <a href={fileURL}>{item.path}</a>;
            op = gettext('Moved file');
            details = <td>{item.old_path} => {filePathLink}<br />{smallLibLink}</td>;
            break;
          case 'edit': // update
            if (item.name.endsWith('(draft).md')) {
              op = gettext('Updated draft');
              details = <td>{fileLink}<br />{smallLibLink}</td>;
              break;
            }
            op = gettext('Updated file');
            details = <td>{fileLink}<br />{smallLibLink}</td>;
            break;
        }
      } else { // dir
        let dirURL = siteRoot + 'library/' + item.repo_id + '/' + encodeURIComponent(item.repo_name) + Utils.encodePath(item.path);
        let dirLink = <a href={dirURL} target="_blank">{item.name}</a>;
        switch(item.op_type) {
          case 'create':
            op = gettext('Created folder');
            details = <td>{dirLink}<br />{smallLibLink}</td>;
            break;
          case 'delete':
            op = gettext('Deleted folder');
            details = <td>{item.name}<br />{smallLibLink}</td>;
            break;
          case 'recover':
            op = gettext('Restored folder');
            details = <td>{dirLink}<br />{smallLibLink}</td>;
            break;
          case 'rename':
            op = gettext('Renamed folder');
            details = <td>{item.old_name} => {dirLink}<br />{smallLibLink}</td>;
            break;
          case 'move':
            var dirPathLink = <a href={dirURL}>{item.path}</a>;
            op = gettext('Moved folder');
            details = <td>{item.old_path} => {dirPathLink}<br />{smallLibLink}</td>;
            break;
        }
      }

      let isShowDate = true;
      if (index > 0) {
        let lastEventTime = this.props.items[index - 1].time;
        isShowDate = moment(item.time).isSame(lastEventTime, 'day') ? false : true;
      }

      return (
        <Fragment key={index}>
          { isShowDate &&
            <tr>
              <td colSpan='5' className="activity-date">{moment(item.time).format('YYYY-MM-DD')}</td>
            </tr>
          }
          <tr>
            <td className="text-center">
              <img src={item.avatar_url} alt="" width="36px" height="36px" className="avatar" />
            </td>
            <td>
              <a href={userProfileURL}>{item.author_name}</a>
            </td>
            <td><span className="activity-op">{op}</span></td>
            {details}
            <td className="text-secondary">
              <time datetime={item.time} is="relative-time" title={moment(item.time).format('llll')}>{moment(item.time).fromNow()}</time>
            </td>
          </tr>
        </Fragment>
      );
    }, this);

    return (
      <Fragment>
        <tbody>{listFilesActivities}</tbody>
        {this.state.isListCreatedFiles &&
          <ModalPortal>
            <ListCreatedFileDialog
              activity={this.state.activity}
              toggleCancel={this.onListCreatedFilesToggle}
            />
          </ModalPortal>
        }
      </Fragment>
    );
  }
}

TableBody.propTypes = tablePropTypes;

class FilesActivities extends Component {
  constructor(props) {
    super(props);
    this.state = {
      errorMsg: '',
      isFirstLoading: true,
      isLoadingMore: false,
      currentPage: 1,
      hasMore: true,
      items: [],
    };
    this.avatarSize = 72;
    this.curPathList = [];
    this.oldPathList = [];
  }

  componentDidMount() {
    let currentPage = this.state.currentPage;
    seafileAPI.listActivities(currentPage, this.avatarSize).then(res => {
      // {"events":[...]}
      let events = this.mergeReviewEvents(res.data.events);
      events = this.mergeFileCreateEvents(events);
      this.setState({
        items: events,
        currentPage: currentPage + 1,
        isFirstLoading: false,
        hasMore: true,
      });
      if (this.state.items.length < 25) {
        this.getMore();
      }
    }).catch(error => {
      if (error.response.status == 403) {
        this.setState({
          isFirstLoading: false,
          errorMsg: gettext('Permission denied')
        });
      }
    });
  }

  mergeReviewEvents = (events) => {
    events.map((item) => {
      if (item.op_type === 'finished') {
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
  }

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
        } else {
          actuallyEvents.push(events[i]);
        }
      }
    }
    return actuallyEvents;
  }

  getMore() {
    let currentPage = this.state.currentPage;
    seafileAPI.listActivities(currentPage, this.avatarSize).then(res => {
      // {"events":[...]}
      let events = this.mergeReviewEvents(res.data.events);
      events = this.mergeFileCreateEvents(events);
      this.setState({
        isLoadingMore: false,
        items: [...this.state.items, ...events],
        currentPage: currentPage + 1,
        hasMore: res.data.events.length === 0 ? false : true 
      });
      if (this.state.items.length < 25 && this.state.hasMore) {
        this.getMore();
      }
    }).catch(error => {
      if (error.response.status == 403) {
        this.setState({
          isLoadingMore: false,
          errorMsg: gettext('Permission denied')
        });
      }
    });
  }

  handleScroll = (event) => {
    if (!this.state.isLoadingMore && this.state.hasMore) {
      const clientHeight = event.target.clientHeight;
      const scrollHeight = event.target.scrollHeight;
      const scrollTop    = event.target.scrollTop;
      const isBottom = (clientHeight + scrollTop + 1 >= scrollHeight);
      if (isBottom) { // scroll to the bottom
        this.setState({isLoadingMore: true}, () => {
          this.getMore();
        });
      }
    }
  }

  render() {
    return (
      <div className="main-panel-center">
        <div className="cur-view-container" id="activities">
          <div className="cur-view-path">
            <h3 className="sf-heading">{gettext('Activities')}</h3>
          </div>
          <div className="cur-view-content" onScroll={this.handleScroll}>
            {this.state.isFirstLoading && <Loading />}
            {(!this.state.isFirstLoading && this.state.errorMsg) && 
              <p className="error text-center">{this.state.errorMsg}</p>
            }
            {!this.state.isFirstLoading && 
              <FileActivitiesContent items={this.state.items} isLoadingMore={this.state.isLoadingMore}/>
            }
          </div>
        </div>
      </div>
    );
  }
}

export default FilesActivities;
