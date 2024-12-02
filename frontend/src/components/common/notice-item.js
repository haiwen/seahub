import React from 'react';
import PropTypes from 'prop-types';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import { gettext, siteRoot } from '../../utils/constants';
import { Utils } from '../../utils/utils';
import { processor } from '@seafile/seafile-editor';
import '../../css/notice-item.css';

const propTypes = {
  noticeItem: PropTypes.object.isRequired,
  tr: PropTypes.any,
  onNoticeItemClick: PropTypes.func
};

const MSG_TYPE_ADD_USER_TO_GROUP = 'add_user_to_group';
const MSG_TYPE_REPO_SHARE = 'repo_share';
const MSG_TYPE_REPO_SHARE_TO_GROUP = 'repo_share_to_group';
const MSG_TYPE_REPO_TRANSFER = 'repo_transfer';
const MSG_TYPE_FILE_UPLOADED = 'file_uploaded';
const MSG_TYPE_FOLDER_UPLOADED = 'folder_uploaded';
// const MSG_TYPE_GUEST_INVITATION_ACCEPTED = 'guest_invitation_accepted';
const MSG_TYPE_REPO_MONITOR = 'repo_monitor';
const MSG_TYPE_DELETED_FILES = 'deleted_files';
const MSG_TYPE_SAML_SSO_FAILED = 'saml_sso_failed';
const MSG_TYPE_REPO_SHARE_PERM_CHANGE = 'repo_share_perm_change';
const MSG_TYPE_REPO_SHARE_PERM_DELETE = 'repo_share_perm_delete';
const MSG_TYPE_FACE_CLUSTER = 'face_cluster';
const MSG_TYPE_SEADOC_REPLY = 'reply';
const MSG_TYPE_SEADOC_COMMENT = 'comment';

dayjs.extend(relativeTime);

class NoticeItem extends React.Component {

  generatorNoticeInfo() {
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
      let username = detail.group_staff_name;
      let notice = gettext('User {user_link} has added you to {group_link}');
      let userLink = '<a href=' + userHref + '>' + groupStaff + '</a>';
      let groupLink = '<a href=' + groupHref + '>' + groupName + '</a>';
      notice = notice.replace('{user_link}', userLink);
      notice = notice.replace('{group_link}', groupLink);
      return { avatar_url, notice, username };
    }

    if (noticeType === MSG_TYPE_REPO_SHARE) {
      let avatar_url = detail.share_from_user_avatar_url;
      let shareFrom = detail.share_from_user_name;
      let repoName = detail.repo_name;
      let repoUrl = siteRoot + 'library/' + detail.repo_id + '/' + repoName + '/';
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
      return { avatar_url, notice, username: shareFrom };
    }

    if (noticeType === MSG_TYPE_REPO_SHARE_PERM_CHANGE) {
      let avatar_url = detail.share_from_user_avatar_url;
      let shareFrom = detail.share_from_user_name;
      let permission = detail.permission;
      let repoName = detail.repo_name;
      let repoUrl = siteRoot + 'library/' + detail.repo_id + '/' + repoName + '/';
      let path = detail.path;
      let notice = '';
      // 1. handle translate
      if (path === '/') { // share repo
        notice = gettext('{share_from} has changed the permission of library {repo_link} to {permission}.');
      } else { // share folder
        notice = gettext('{share_from} has changed the permission of folder {repo_link} to {permission}.');
      }
      // 2. handle xss(cross-site scripting)
      notice = notice.replace('{share_from}', shareFrom);
      notice = notice.replace('{repo_link}', `{tagA}${repoName}{/tagA}`);
      notice = notice.replace('{permission}', permission);
      notice = Utils.HTMLescape(notice);
      // 3. add jump link
      notice = notice.replace('{tagA}', `<a href='${Utils.encodePath(repoUrl)}'>`);
      notice = notice.replace('{/tagA}', '</a>');
      return { avatar_url, notice, username: shareFrom };
    }

    if (noticeType === MSG_TYPE_REPO_SHARE_PERM_DELETE) {
      let avatar_url = detail.share_from_user_avatar_url;
      let shareFrom = detail.share_from_user_name;
      let repoName = detail.repo_name;
      let path = detail.path;
      let notice = '';
      // 1. handle translate
      if (path === '/') { // share repo
        notice = gettext('{share_from} has cancelled the sharing of library {repo_name}.');
      } else { // share folder
        notice = gettext('{share_from} has cancelled the sharing of folder {repo_name}.');
      }
      // 2. handle xss(cross-site scripting)
      notice = notice.replace('{share_from}', shareFrom);
      notice = notice.replace('{repo_name}', repoName);
      notice = Utils.HTMLescape(notice);
      return { avatar_url, notice, username: shareFrom };
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
        notice = gettext('{share_from} has shared a library named {repo_link} to group {group_link}.');
      } else {
        notice = gettext('{share_from} has shared a folder named {repo_link} to group {group_link}.');
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
      return { avatar_url, notice, username: shareFrom };
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
      return { avatar_url, notice, username: repoOwner };
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
        notice = gettext('A file named {upload_file_link} is uploaded.');
        // 2. handle xss(cross-site scripting)
        notice = notice.replace('{upload_file_link}', `${fileName}`);
        notice = Utils.HTMLescape(notice);
      }
      return { avatar_url, notice };
    }

    if (noticeType === MSG_TYPE_FOLDER_UPLOADED) {
      let avatar_url = detail.uploaded_user_avatar_url;
      let folderName = detail.folder_name;
      let folderLink = siteRoot + 'library/' + detail.repo_id + '/' + detail.repo_name + detail.folder_path;

      let parentDirName = detail.parent_dir_name;
      let parentDirLink = siteRoot + 'library/' + detail.repo_id + '/' + detail.repo_name + detail.parent_dir_path;
      let notice = '';
      if (detail.repo_id) { // todo is repo exist ?
        // 1. handle translate
        notice = gettext('A folder named {upload_folder_link} is uploaded to {uploaded_link}.');

        // 2. handle xss(cross-site scripting)
        notice = notice.replace('{upload_folder_link}', `{tagA}${folderName}{/tagA}`);
        notice = notice.replace('{uploaded_link}', `{tagB}${parentDirName}{/tagB}`);
        notice = Utils.HTMLescape(notice);

        // 3. add jump link
        notice = notice.replace('{tagA}', `<a href=${Utils.encodePath(folderLink)}>`);
        notice = notice.replace('{/tagA}', '</a>');
        notice = notice.replace('{tagB}', `<a href=${Utils.encodePath(parentDirLink)}>`);
        notice = notice.replace('{/tagB}', '</a>');
      } else {
        // 1. handle translate
        notice = gettext('A folder named {upload_folder_link} is uploaded.');

        // 2. handle xss(cross-site scripting)
        notice = notice.replace('{upload_folder_link}', `${folderName}`);
        notice = Utils.HTMLescape(notice);
      }
      return { avatar_url, notice };
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

    if (noticeType === MSG_TYPE_DELETED_FILES) {
      const { repo_id, repo_name } = detail;
      const repoURL = `${siteRoot}library/${repo_id}/${encodeURIComponent(repo_name)}/`;
      const repoLink = `<a href=${repoURL} target="_blank">${Utils.HTMLescape(repo_name)}</a>`;
      let notice = gettext('Your library {libraryName} has recently deleted a large number of files.');
      notice = notice.replace('{libraryName}', repoLink);
      return { avatar_url: null, notice };
    }

    if (noticeType === MSG_TYPE_FACE_CLUSTER) {
      let repo_id = detail.repo_id;
      let repo_name = detail.repo_name;

      const repoURL = `${siteRoot}library/${repo_id}/${encodeURIComponent(repo_name)}/`;
      const repoLink = `<a href=${repoURL} target="_blank">${Utils.HTMLescape(repo_name)}</a>`;

      let notice = gettext('Face recognition is done for library {libraryName}.');
      notice = notice.replace('{libraryName}', repoLink);

      return { avatar_url: null, notice };
    }

    if (noticeType === MSG_TYPE_SAML_SSO_FAILED) {
      const { error_msg } = detail;
      let notice = gettext(error_msg);
      return { avatar_url: null, notice };
    }

    if (noticeType === MSG_TYPE_SEADOC_COMMENT) {
      let avatar_url = detail.avatar_url;
      let notice = detail.comment;
      let username = detail.user_name;
      let is_resolved = detail.is_resolved;
      let sdoc_name = detail.sdoc_name;
      const repo_id = detail.repo_id;
      const sdoc_path = detail.sdoc_path;
      const sdoc_href = siteRoot + 'lib/' + repo_id + '/file' + sdoc_path;
      let sdoc_link = '<a href=' + sdoc_href + '>' + sdoc_name + '</a>';
      processor.process(notice, (error, vfile) => {
        notice = String(vfile);
      });
      if (is_resolved) {
        notice = 'Marked "' + detail.resolve_comment + '" as resolved in document ' + sdoc_link;
      } else {
        notice = 'Added a new comment in document ' + sdoc_link + ':' + notice;
      }
      return { avatar_url, username, notice };
    }

    if (noticeType === MSG_TYPE_SEADOC_REPLY) {
      let avatar_url = detail.avatar_url;
      let notice = detail.reply;
      let username = detail.user_name;
      let is_resolved = detail.is_resolved;
      let sdoc_name = detail.sdoc_name;
      const repo_id = detail.repo_id;
      const sdoc_path = detail.sdoc_path;
      const sdoc_href = siteRoot + 'lib/' + repo_id + '/file' + sdoc_path;
      let sdoc_link = '<a href=' + sdoc_href + '>' + sdoc_name + '</a>';
      processor.process(notice, (error, vfile) => {
        notice = String(vfile);
      });
      if (is_resolved) {
        notice = 'Marked "' + detail.resolve_comment + '" as resolved in document ' + sdoc_link;
      } else {
        notice = 'Added a new reply in document ' + sdoc_link + ':' + notice;
      }
      return { avatar_url, username, notice };
    }

    // if (noticeType === MSG_TYPE_GUEST_INVITATION_ACCEPTED) {

    // }

    return { avatar_url: null, notice: null, username: null };
  }

  onNoticeItemClick = () => {
    let item = this.props.noticeItem;
    if (item.seen === true) {
      return;
    }
    this.props.onNoticeItemClick(item);
  };

  render() {
    let noticeItem = this.props.noticeItem;
    let { avatar_url, username, notice } = this.generatorNoticeInfo();
    if (!avatar_url && !notice) {
      return '';
    }

    return this.props.tr ? (
      <tr className={noticeItem.seen ? 'read' : 'unread font-weight-bold'}>
        <td className="text-center">
          <img src={avatar_url} width="32" height="32" className="avatar" alt="" />
        </td>
        <td className="pr-1 pr-md-8">
          <p className="m-0" dangerouslySetInnerHTML={{ __html: notice }}></p>
        </td>
        <td>
          {dayjs(noticeItem.time).fromNow()}
        </td>
      </tr>
    ) : (
      <li className='notification-item' onClick={this.onNoticeItemClick}>
        <div className="notification-item-header">
          {!noticeItem.seen &&
            <span className="notification-point" onClick={this.onMarkNotificationRead}></span>
          }
          <div className="notification-header-info">
            <div className="notification-user-detail">
              <img className="notification-user-avatar" src={avatar_url} alt="" />
              <span className="ml-2 notification-user-name">{username || gettext('System')}</span>
            </div>
            <span className="notification-time">{dayjs(noticeItem.time).fromNow()}</span>
          </div>
        </div>
        <div className="notification-content-wrapper">
          <div dangerouslySetInnerHTML={{ __html: notice }}></div>
        </div>
      </li>
    );
  }
}

NoticeItem.propTypes = propTypes;

export default NoticeItem;
