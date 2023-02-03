import React from 'react';
import PropTypes from 'prop-types';
import moment from 'moment';

import { gettext, siteRoot } from '../../utils/constants';
import { Utils } from '../../utils/utils';

const propTypes = {
  noticeItem: PropTypes.object.isRequired,
  onNoticeItemClick: PropTypes.func
};

const MSG_TYPE_ADD_USER_TO_GROUP = 'add_user_to_group';
const MSG_TYPE_REPO_SHARE = 'repo_share';
const MSG_TYPE_REPO_SHARE_TO_GROUP = 'repo_share_to_group';
const MSG_TYPE_REPO_TRANSFER = 'repo_transfer';
const MSG_TYPE_FILE_UPLOADED = 'file_uploaded';
const MSG_TYPE_FILE_COMMENT = 'file_comment';
const MSG_TYPE_DRAFT_COMMENT = 'draft_comment';
const MSG_TYPE_DRAFT_REVIEWER = 'draft_reviewer';
const MSG_TYPE_GUEST_INVITATION_ACCEPTED = 'guest_invitation_accepted';
const MSG_TYPE_REPO_MONITOR = 'repo_monitor';

class NoticeItem extends React.Component {

  generatorNoticeInfo () {
    let noticeItem = this.props.noticeItem;
    let noticeType = noticeItem.type;
    let detail = noticeItem.detail;

    if (noticeType === MSG_TYPE_ADD_USER_TO_GROUP) {

      let avatar_url = detail.group_staff_avatar_url;

      let groupStaff = detail.group_staff_name;

      // group name does not support special characters
      let userHref = siteRoot + 'profile/' + detail.group_staff_email + '/';
      let groupHref = siteRoot + 'group/' + detail.group_id + '/';
      let groupName = detail.group_name;

      let notice = gettext('User {user_link} has added you to {group_link}');
      let userLink = '<a href=' + userHref + '>' + groupStaff + '</a>';
      let groupLink = '<a href=' + groupHref + '>' + groupName + '</a>';

      notice = notice.replace('{user_link}', userLink);
      notice = notice.replace('{group_link}', groupLink);

      return {avatar_url, notice};
    }

    if (noticeType === MSG_TYPE_REPO_SHARE) {

      let avatar_url = detail.share_from_user_avatar_url;

      let shareFrom = detail.share_from_user_name;

      let repoName = detail.repo_name;
      let repoUrl = siteRoot + 'library/' + detail.repo_id + '/' +  repoName + '/';

      let path = detail.path;
      let notice = '';
      // 1. handle translate
      if (path === '/') { // share repo
        notice = gettext('{share_from} has shared a library named {repo_link} to you.');
      } else { // share folder
        notice = gettext('{share_from} has shared a folder named {repo_link} to you.');
      }

      // 2. handle xss(cross-site scripting)
      notice = notice.replace('{share_from}', shareFrom);
      notice = notice.replace('{repo_link}', `{tagA}${repoName}{/tagA}`);
      notice = Utils.HTMLescape(notice);

      // 3. add jump link
      notice = notice.replace('{tagA}', `<a href='${Utils.encodePath(repoUrl)}'>`);
      notice = notice.replace('{/tagA}', '</a>');

      return {avatar_url, notice};
    }

    if (noticeType === MSG_TYPE_REPO_SHARE_TO_GROUP) {

      let avatar_url = detail.share_from_user_avatar_url;

      let shareFrom = detail.share_from_user_name;

      let repoName = detail.repo_name;
      let repoUrl = siteRoot + 'library/' + detail.repo_id + '/' + repoName + '/';

      let groupUrl = siteRoot + 'group/' + detail.group_id + '/';
      let groupName = detail.group_name;

      let path = detail.path;
      let notice = '';
      // 1. handle translate
      if (path === '/') {
        notice =  gettext('{share_from} has shared a library named {repo_link} to group {group_link}.');
      } else {
        notice =  gettext('{share_from} has shared a folder named {repo_link} to group {group_link}.');
      }

      // 2. handle xss(cross-site scripting)
      notice = notice.replace('{share_from}', shareFrom);
      notice = notice.replace('{repo_link}', `{tagA}${repoName}{/tagA}`);
      notice = notice.replace('{group_link}', `{tagB}${groupName}{/tagB}`);
      notice = Utils.HTMLescape(notice);

      // 3. add jump link
      notice = notice.replace('{tagA}', `<a href='${Utils.encodePath(repoUrl)}'>`);
      notice = notice.replace('{/tagA}', '</a>');
      notice = notice.replace('{tagB}', `<a href='${Utils.encodePath(groupUrl)}'>`);
      notice = notice.replace('{/tagB}', '</a>');
      return {avatar_url, notice};
    }

    if (noticeType === MSG_TYPE_REPO_TRANSFER) {

      let avatar_url = detail.transfer_from_user_avatar_url;

      let repoOwner = detail.transfer_from_user_name;

      let repoName = detail.repo_name;
      let repoUrl = siteRoot + 'library/' + detail.repo_id + '/' + repoName + '/';
      // 1. handle translate
      let notice = gettext('{user} has transfered a library named {repo_link} to you.');

      // 2. handle xss(cross-site scripting)
      notice = notice.replace('{user}', repoOwner);
      notice = notice.replace('{repo_link}', `{tagA}${repoName}{/tagA}`);
      notice = Utils.HTMLescape(notice);

      // 3. add jump link
      notice = notice.replace('{tagA}', `<a href=${Utils.encodePath(repoUrl)}>`);
      notice = notice.replace('{/tagA}', '</a>');
      return {avatar_url, notice};
    }

    if (noticeType === MSG_TYPE_FILE_UPLOADED) {
      let avatar_url = detail.uploaded_user_avatar_url;
      let fileName = detail.file_name;
      let fileLink = siteRoot + 'lib/' + detail.repo_id + '/' + 'file' + detail.file_path;

      let folderName = detail.folder_name;
      let folderLink = siteRoot + 'library/' + detail.repo_id + '/' + detail.repo_name + detail.folder_path;
      let notice = '';
      if (detail.repo_id) { // todo is repo exist ?
        // 1. handle translate
        notice = gettext('A file named {upload_file_link} is uploaded to {uploaded_link}.');

        // 2. handle xss(cross-site scripting)
        notice = notice.replace('{upload_file_link}', `{tagA}${fileName}{/tagA}`);
        notice = notice.replace('{uploaded_link}', `{tagB}${folderName}{/tagB}`);
        notice = Utils.HTMLescape(notice);

        // 3. add jump link
        notice = notice.replace('{tagA}', `<a href=${Utils.encodePath(fileLink)}>`);
        notice = notice.replace('{/tagA}', '</a>');
        notice = notice.replace('{tagB}', `<a href=${Utils.encodePath(folderLink)}>`);
        notice = notice.replace('{/tagB}', '</a>');
      } else {
        // 1. handle translate
        notice = gettext('A file named {upload_file_link} is uploaded to {uploaded_link}.');

        // 2. handle xss(cross-site scripting)
        notice = notice.replace('{upload_file_link}', `${fileName}`);
        notice = Utils.HTMLescape(notice);
        notice = notice.replace('{uploaded_link}', '<strong>Deleted Library</strong>');
      }
      return {avatar_url, notice};
    }

    if (noticeType === MSG_TYPE_FILE_COMMENT) {

      let avatar_url = detail.author_avatar_url;

      let author = detail.author_name;

      let fileName = detail.file_name;
      let fileUrl = siteRoot + 'lib/' + detail.repo_id + '/' + 'file' + detail.file_path;

      // 1. handle translate
      let notice = gettext('File {file_link} has a new comment form user {author}.');

      // 2. handle xss(cross-site scripting)
      notice = notice.replace('{file_link}', `{tagA}${fileName}{/tagA}`);
      notice = notice.replace('{author}', author);
      notice = Utils.HTMLescape(notice);

      // 3. add jump link
      notice = notice.replace('{tagA}', `<a href=${Utils.encodePath(fileUrl)}>`);
      notice = notice.replace('{/tagA}', '</a>');
      return {avatar_url, notice};
    }

    if (noticeType === MSG_TYPE_DRAFT_COMMENT) {

      let avatar_url = detail.author_avatar_url;

      let author = detail.author_name;

      let draftId = detail.draft_id;
      let draftUrl = siteRoot + 'drafts/' + draftId + '/';

      let notice = gettext('{draft_link} has a new comment from user {author}.');
      let draftLink = '<a href=' + draftUrl + '>' + gettext('Draft') + '#' + draftId + '</a>';
      notice = notice.replace('{draft_link}', draftLink);
      notice = notice.replace('{author}', author);
      return {avatar_url, notice};
    }

    if (noticeType === MSG_TYPE_DRAFT_REVIEWER) {

      let avatar_url = detail.request_user_avatat_url;

      let fromUser = detail.request_user_name;

      let draftId = detail.draft_id;
      let draftUrl = siteRoot + 'drafts/' + draftId + '/';

      let notice = gettext('{from_user} has sent you a request for {draft_link}.');
      let draftLink = '<a href=' + draftUrl + '>' + gettext('Draft') + '#' + draftId + '</a>';
      notice = notice.replace('{from_user}', fromUser);
      notice = notice.replace('{draft_link}', draftLink);
      return {avatar_url, notice};
    }

    if (noticeType === MSG_TYPE_REPO_MONITOR) {
      const {
        op_user_avatar_url: avatar_url,
        op_user_email,
        op_user_name,
        op_type,
        repo_id, repo_name,
        obj_type,
        obj_path_list,
        old_obj_path_list
      } = detail;

      const userProfileURL = `${siteRoot}profile/${encodeURIComponent(op_user_email)}`;
      const userLink = `<a href=${userProfileURL} target="_blank">${Utils.HTMLescape(op_user_name)}</a>`;

      const repoURL = `${siteRoot}library/${repo_id}/${encodeURIComponent(repo_name)}/`;
      const repoLink = `<a href=${repoURL} target="_blank">${Utils.HTMLescape(repo_name)}</a>`;

      let notice = '';
      if (obj_type == 'file') {
        const fileName = Utils.getFileName(obj_path_list[0]);
        const fileURL = `${siteRoot}lib/${repo_id}/file${Utils.encodePath(obj_path_list[0])}`;
        const fileLink = `<a href=${fileURL} target="_blank">${Utils.HTMLescape(fileName)}</a>`;
        switch (op_type) {
          case 'create':
            notice = obj_path_list.length == 1 ? gettext('{user} created file {fileName} in library {libraryName}.') : gettext('{user} created file {fileName} and {fileCount} other file(s) in library {libraryName}.');
            break;
          case 'delete':
            notice = obj_path_list.length == 1 ? gettext('{user} deleted file {fileName} in library {libraryName}.') : gettext('{user} deleted file {fileName} and {fileCount} other file(s) in library {libraryName}.');
            notice = notice.replace('{fileName}', fileName);
            break;
          case 'recover':
            notice = gettext('{user} restored file {fileName} in library {libraryName}.');
            break;
          case 'rename':
            notice = gettext('{user} renamed file {oldFileName} {fileName} in library {libraryName}.');
            notice = notice.replace('{oldFileName}', Utils.getFileName(old_obj_path_list[0]));
            break;
          case 'move':
            notice = obj_path_list.length == 1 ? gettext('{user} moved file {fileName} in library {libraryName}.') : gettext('{user} moved file {fileName} and {fileCount} other file(s) in library {libraryName}.');
            break;
          case 'edit':
            notice = gettext('{user} updated file {fileName} in library {libraryName}.');
            break;
          // no default
        }
        notice = notice.replace('{fileName}', fileLink);
        notice = notice.replace('{fileCount}', obj_path_list.length - 1);
      } else { // dir
        const folderName = Utils.getFolderName(obj_path_list[0]);
        const folderURL = `${siteRoot}library/${repo_id}/${encodeURIComponent(repo_name)}${Utils.encodePath(obj_path_list[0])}`;
        const folderLink = `<a href=${folderURL} target="_blank">${Utils.HTMLescape(folderName)}</a>`;
        switch (detail.op_type) {
          case 'create':
            notice = obj_path_list.length == 1 ? gettext('{user} created folder {folderName} in library {libraryName}.') : gettext('{user} created folder {folderName} and {folderCount} other folder(s) in library {libraryName}.');
            break;
          case 'delete':
            notice = obj_path_list.length == 1 ? gettext('{user} deleted folder {folderName} in library {libraryName}.') : gettext('{user} deleted folder {folderName} and {folderCount} other folder(s) in library {libraryName}.');
            notice = notice.replace('{folderName}', folderName);
            break;
          case 'recover':
            notice = gettext('{user} restored folder {folderName} in library {libraryName}.');
            break;
          case 'rename':
            notice = gettext('{user} renamed folder {oldFolderName} {folderName} in library {libraryName}.');
            notice = notice.replace('{oldFolderName}', Utils.getFolderName(old_obj_path_list[0]));
            break;
          case 'move':
            notice = obj_path_list.length == 1 ? gettext('{user} moved folder {folderName} in library {libraryName}.') : gettext('{user} moved folder {folderName} and {folderCount} other folder(s) in library {libraryName}.');
            break;
          // no default
        }
        notice = notice.replace('{folderName}', folderLink);
        notice = notice.replace('{folderCount}', obj_path_list.length - 1);
      }

      notice = notice.replace('{user}', userLink);
      notice = notice.replace('{libraryName}', repoLink);

      return { avatar_url, notice };
    }

    // if (noticeType === MSG_TYPE_GUEST_INVITATION_ACCEPTED) {

    // }

    return {avatar_url : null, notice : null};
  }

  onNoticeItemClick = () => {
    let item = this.props.noticeItem;
    if (item.seen === true) {
      return;
    }
    this.props.onNoticeItemClick(item);
  }

  render() {
    let noticeItem = this.props.noticeItem;
    let { avatar_url, notice } = this.generatorNoticeInfo();

    if (!avatar_url && !notice) {
      return '';
    }

    return this.props.tr ? (
      <tr className={noticeItem.seen ? 'read' : 'unread font-weight-bold'}>
        <td className="text-center">
          <img src={avatar_url} width="32" height="32" className="avatar" alt="" />
        </td>
        <td className="pr-1 pr-md-8">
          <p className="m-0" dangerouslySetInnerHTML={{__html: notice}}></p>
        </td>
        <td>
          {moment(noticeItem.time).fromNow()}
        </td>
      </tr>
    ) : (
      <li onClick={this.onNoticeItemClick} className={noticeItem.seen ? 'read' : 'unread'}>
        <div className="notice-item">
          <div className="main-info">
            <img src={avatar_url} width="32" height="32" className="avatar" alt=""/>
            <p className="brief" dangerouslySetInnerHTML={{__html: notice}}></p>
          </div>
          <p className="time">{moment(noticeItem.time).fromNow()}</p>
        </div>
      </li>
    );
  }
}

NoticeItem.propTypes = propTypes;

export default NoticeItem;
