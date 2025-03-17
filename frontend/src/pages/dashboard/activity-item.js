import React, { Component, Fragment } from 'react';
import PropTypes from 'prop-types';
import moment from 'moment';
import { gettext, siteRoot } from '../../utils/constants';
import { Utils } from '../../utils/utils';
import ListCreatedFileDialog from '../../components/dialog/list-created-files-dialog';
import ModalPortal from '../../components/modal-portal';

import '../../css/files-activities.css';

moment.locale(window.app.config.lang);

const activityPropTypes = {
  item: PropTypes.object.isRequired,
  index: PropTypes.number.isRequired,
  items: PropTypes.array.isRequired,
  isDesktop: PropTypes.bool.isRequired,
};

class ActivityItem extends Component {

  constructor(props) {
    super(props);
    this.state = {
      isListCreatedFiles: false,
    };
  }

  onListCreatedFilesToggle = () => {
    this.setState({
      isListCreatedFiles: !this.state.isListCreatedFiles,
    });
  };

  render() {
    const isDesktop = this.props.isDesktop;
    let {item, index, items} = this.props;
    let op, details, moreDetails = false;
    let userProfileURL = `${siteRoot}profile/${encodeURIComponent(item.author_email)}/`;

    let libURL = siteRoot + 'library/' + item.repo_id + '/' + encodeURIComponent(item.repo_name) + '/';
    let libLink = <a href={libURL}>{item.repo_name}</a>;
    let smallLibLink = <a className="small text-secondary" href={libURL}>{item.repo_name}</a>;

    if (item.obj_type == 'repo') {
      switch(item.op_type) {
        case 'create':
          op = gettext('Created library');
          details = libLink;
          break;
        case 'rename':
          op = gettext('Renamed library');
          details = <span>{item.old_repo_name} => {libLink}</span>;
          break;
        case 'delete':
          op = gettext('Deleted library');
          details = item.repo_name;
          break;
        case 'recover':
          op = gettext('Restored library');
          details = libLink;
          break;
        case 'clean-up-trash':
          op = gettext('Cleaned trash');
          if (item.days == 0) {
            details = gettext('Removed all items from trash.');
          } else {
            details = gettext('Removed items older than {n} days from trash.').replace('{n}', item.days);
          }
          moreDetails = true;
          break;
      }
    } else if (item.obj_type == 'files') {
      let fileURL = `${siteRoot}lib/${item.repo_id}/file${Utils.encodePath(item.path)}`;
      let fileLink = `<a href=${fileURL} target="_blank">${Utils.HTMLescape(item.name)}</a>`;
      let fileCount = item.createdFilesCount - 1;
      let firstLine = gettext('{file} and {n} other files')
        .replace('{file}', fileLink)
        .replace('{n}', fileCount);
      op = gettext('Created {n} files').replace('{n}', item.createdFilesCount);
      details = (
        <Fragment>
          <p className="m-0 d-inline" dangerouslySetInnerHTML={{__html: firstLine}}></p>
          {isDesktop && <button type="button" onClick={this.onListCreatedFilesToggle} className="activity-details text-secondary ml-2 border-0 p-0 bg-transparent">{gettext('details')}</button>}
        </Fragment>
      );
      moreDetails = true;
    } else if (item.obj_type == 'file') {
      const isDraft = item.name.endsWith('(draft).md');
      const fileURL = isDraft ? '' :
        `${siteRoot}lib/${item.repo_id}/file${Utils.encodePath(item.path)}`;
      let fileLink = <a href={fileURL} target="_blank" rel="noreferrer">{item.name}</a>;
      if (isDraft) {
        fileLink = item.name;
      }
      switch (item.op_type) {
        case 'create':
          op = isDraft ? gettext('Created draft') : gettext('Created file');
          details = fileLink;
          moreDetails = true;
          break;
        case 'delete':
          op = isDraft ? gettext('Deleted draft') : gettext('Deleted file');
          details = item.name;
          moreDetails = true;
          break;
        case 'recover':
          op = gettext('Restored file');
          details = fileLink;
          moreDetails = true;
          break;
        case 'rename':
          op = gettext('Renamed file');
          details = <span>{item.old_name} => {fileLink}</span>;
          moreDetails = true;
          break;
        case 'move':
          // eslint-disable-next-line
          const filePathLink = <a href={fileURL}>{item.path}</a>;
          op = gettext('Moved file');
          details = <span>{item.old_path} => {filePathLink}</span>;
          moreDetails = true;
          break;
        case 'edit': // update
          op = isDraft ? gettext('Updated draft') : gettext('Updated file');
          details = fileLink;
          moreDetails = true;
          break;
      }
    } else { // dir
      let dirURL = siteRoot + 'library/' + item.repo_id + '/' + encodeURIComponent(item.repo_name) + Utils.encodePath(item.path);
      let dirLink = <a href={dirURL} target="_blank" rel="noreferrer">{item.name}</a>;
      switch (item.op_type) {
        case 'create':
          op = gettext('Created folder');
          details = dirLink;
          moreDetails = true;
          break;
        case 'delete':
          op = gettext('Deleted folder');
          details = item.name;
          moreDetails = true;
          break;
        case 'recover':
          op = gettext('Restored folder');
          details = dirLink;
          moreDetails = true;
          break;
        case 'rename':
          op = gettext('Renamed folder');
          details = <span>{item.old_name} => {dirLink}</span>;
          moreDetails = true;
          break;
        case 'move':
          // eslint-disable-next-line
          const dirPathLink = <a href={dirURL}>{item.path}</a>;
          op = gettext('Moved folder');
          details = <span>{item.old_path} => {dirPathLink}</span>;
          moreDetails = true;
          break;
      }
    }

    let isShowDate = true;
    if (index > 0) {
      let lastEventTime = items[index - 1].time;
      isShowDate = moment(item.time).isSame(lastEventTime, 'day') ? false : true;
    }

    return (
      <Fragment>
        {isShowDate &&
          <tr>
            <td colSpan={isDesktop ? 5 : 3} className="border-top-0">{moment(item.time).format('YYYY-MM-DD')}</td>
          </tr>
        }
        {isDesktop ? (
          <tr>
            <td className="text-center">
              <img src={item.avatar_url} alt="" width="32" height="32" className="avatar" />
            </td>
            <td>
              <a href={userProfileURL}>{item.author_name}</a>
            </td>
            <td>{op}</td>
            <td>
              {details}
              {moreDetails && <br /> }
              {moreDetails && smallLibLink}
            </td>
            <td className="text-secondary">
              <time datetime={item.time} is="relative-time" title={moment(item.time).format('llll')}>{moment(item.time).fromNow()}</time>
            </td>
          </tr>
        ) : (
          <tr>
            <td className="text-center align-top">
              <img src={item.avatar_url} alt="" width="32" height="32" className="avatar" />
            </td>
            <td>
              <a href={userProfileURL}>{item.author_name}</a>
              <p className="m-0 text-secondary">{op}</p>
              {details}
            </td>
            <td className="text-right align-top">
              <span className="text-secondary mobile-activity-time">
                <time datetime={item.time} is="relative-time" title={moment(item.time).format('llll')}>{moment(item.time).fromNow()}</time>
              </span>
              {moreDetails && <br /> }
              {moreDetails && libLink}
            </td>
          </tr>
        )}
        {this.state.isListCreatedFiles &&
          <ModalPortal>
            <ListCreatedFileDialog
              activity={item}
              toggleCancel={this.onListCreatedFilesToggle}
            />
          </ModalPortal>
        }
      </Fragment>
    );
  }
}

ActivityItem.propTypes = activityPropTypes;

export default ActivityItem;
