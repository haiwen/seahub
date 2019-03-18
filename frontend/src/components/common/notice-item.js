import React from 'react';
import PropTypes from 'prop-types';
import moment from 'moment';

import { gettext } from '../../utils/constants';

const propTypes = {
  noticeItem: PropTypes.object.isRequired,
};

const MSG_TYPE_GROUP_MSG = 'group_msg'
const MSG_TYPE_GROUP_JOIN_REQUEST = 'group_join_request'
const MSG_TYPE_ADD_USER_TO_GROUP = 'add_user_to_group'
const MSG_TYPE_REPO_SHARE = 'repo_share'
const MSG_TYPE_REPO_SHARE_TO_GROUP = 'repo_share_to_group'
const MSG_TYPE_REPO_TRANSFER = 'repo_transfer'
const MSG_TYPE_FILE_UPLOADED = 'file_uploaded'
const MSG_TYPE_USER_MESSAGE = 'user_message'
const MSG_TYPE_FILE_COMMENT = 'file_comment'
const MSG_TYPE_DRAFT_COMMENT = 'draft_comment'
const MSG_TYPE_DRAFT_REVIEWER = 'draft_reviewer'
const MSG_TYPE_GUEST_INVITATION_ACCEPTED = 'guest_invitation_accepted'

class NoticeItem extends React.Component {

  generatorNoticeInfo () {
    let noticeItem = this.props.noticeItem;
    let noticeType = noticeItem.msg_type;
    let detail = noticeItem.detail;

    // if (noticeType === MSG_TYPE_GROUP_MSG) {
      
    // }

    // if (noticeType === MSG_TYPE_GROUP_JOIN_REQUEST) {

    // }

    if (noticeType === MSG_TYPE_ADD_USER_TO_GROUP) {
      let groupStaff = noticeItem.msg_from;
      
      let userHref = detail.user_href;
      let groupHref = detail.group_href;
      let groupName = detail.group_name

      let notice = gettext('User {user_link} has added you to {group_link}');
      let userLink = '<a href=' + userHref + '>' + groupStaff + '</a>';
      let groupLink = '<a href=' + groupHref + '>' + groupName + '</a>';

      notice = notice.replace('{user_link}', userLink);
      notice = notice.replace('{group_link}', groupLink);

      return notice;
    }

    if (noticeType === MSG_TYPE_REPO_SHARE) {
      let shareFrom = noticeItem.msg_from;

      let repoUrl = detail.repo_url;
      let repoName = detail.repo_name;

      let path = detail.path;
      let notice = '';
      let repoLink = '<a href=' + repoUrl + '>' + repoName + '</a>';
      if (path === '/') { // share repo
        notice = gettext('{share_from} has shared a library named {repo_link} to you.');
      } else { // share folder
        notice = gettext('{share_from} has shared a folder named {repo_link} to you.');
      }

      notice = notice.replace('{share_from}', shareFrom);
      notice = notice.replace('{repo_link}', repoLink);
      return notice;
    }

    if (noticeType === MSG_TYPE_REPO_SHARE_TO_GROUP) {
      let shareFrom = noticeItem.msg_from;

      let repoUrl = detail.repo_url;
      let repoName = detail.repo_name;

      let groupUrl = detail.group_url;
      let groupName = detail.group_name; 

      let path = detail.path;
      let notice = '';
      let repoLink = '<a href=' + repoUrl + '>' + repoName + '</a>';
      let groupLink = '<a href=' + groupUrl + '>' + groupName + '</a>';
      if (path === '/') {
        notice =  gettext('{share_from} has shared a library named {repo_link} to group {group_link}.');
      } else {
        notice =  gettext('{share_from} has shared a folder named {repo_link} to group {group_link}.');
      }
      notice = notice.replace('{share_from}', shareFrom);
      notice = notice.replace('{repo_link}', repoLink);
      notice = notice.replace('{group_link}', groupLink);
      return notice;
    }

    if (noticeType === MSG_TYPE_REPO_TRANSFER) {
      let repoOwner = noticeItem.msg_from;

      let repoUrl = detail.repo_url;
      let repoName = detail.repo_name;
      let notice = gettext('{user} has transfered a library named {repo_link} to you.');
      let repoLink = '<a href=' + repoUrl + '>' + repoName + '</a>';
      notice = notice.replace('{user}', repoOwner);
      notice = notice.replace('{repo_link}', repoLink);
      return notice;
    }

    if (noticeType === MSG_TYPE_FILE_UPLOADED) {
      let repoExist = detail.repo_exist;
      
      let fileName = detail.file_name;
      let fileLink = detail.file_link;

      let folderName = detail.folder_name;
      let folderLink = detail.folder_link;
      let notice = '';
      if (repoExist) {
        let uploadFileLink = '<a href=' + fileLink + '>' + fileName + '</a>';
        let uploadedLink = '<a href=' + folderLink  + '>' + folderName + '</a>';

        notice = gettext('A file named {upload_file_link} is uploaded to {uploaded_link}.');
        notice = notice.replace('{upload_file_link}', uploadFileLink);
        notice = notice.replace('{uploaded_link}', uploadedLink);
      } else {
        notice = gettext('A file name {file_name} is uploaded to {dest}.');
        notice = notice.replace('{file_name}', fileName);
        notice = notice.replace('{dest}', '<strong>Deleted Library</strong>')
      }
      return notice;
    }

    if (noticeType === MSG_TYPE_FILE_COMMENT) {
      let author = noticeItem.msg_from;

      let fileUrl = detail.file_url;
      let fileName = detail.file_name;

      let notice = gettext('File {file_link} has a new comment form user {author}.');
      let fileLink = '<a href=' + fileUrl + '>' + fileName + '</a>';
      notice = notice.replace('{file_link}', fileLink);
      notice = notice.replace('{author}', author);
      return notice;
    }
    
    if (noticeType === MSG_TYPE_DRAFT_COMMENT) {
      let author = noticeItem.msg_from;

      let draftUrl = detail.draft_url;
      let draftId = detail.draft_id;

      let notice = gettext('{draft_link} has a new comment from user {author}.');
      let draftLink = '<a href=' + draftUrl + '>' + gettext('Draft') + '#' + draftId + '</a>';
      notice = notice.replace('{draft_link}', draftLink);
      notice = notice.replace('{author}', author);
      return notice;
    }
    
    if (noticeType === MSG_TYPE_DRAFT_REVIEWER) {
      let fromUser = noticeItem.msg_from;

      let draftUrl = detail.draft_url;
      let draftId = detail.draft_id;

      let notice = gettext('{from_user} has sent you a request for {draft_link}.');
      let draftLink = '<a href=' + draftUrl + '>' + gettext('Draft') + '#' + draftId + '</a>';
      notice = notice.replace('{from_user}', fromUser);
      notice = notice.replace('{draft_link}', draftLink);
      return notice;
    }

    // if (noticeType === MSG_TYPE_USER_MESSAGE) {

    // }

    // if (noticeType === MSG_TYPE_GUEST_INVITATION_ACCEPTED) {

    // }
  }

  onNoticeItemClick = () => {
    let item = this.props.noticeItem;
    this.props.onNoticeItemClick(item);
  }

  render() {
    let noticeItem = this.props.noticeItem;
    let noticeInfo = this.generatorNoticeInfo();

    return (
      <li onClick={this.onNoticeItemClick} className={noticeItem.seen ? 'read' : 'unread'}>
        <div className="notice-item">
          <div className="main-info">
            <img src={noticeItem.avatar_url} width="32" height="32" className="avatar" />
            <p className="brief" dangerouslySetInnerHTML={{__html: noticeInfo}}></p>
          </div>
          <p className="time">{moment(noticeItem.timestamp).fromNow()}</p>
        </div>
      </li>
    )
  }
}

NoticeItem.propTypes = propTypes;

export default NoticeItem;
