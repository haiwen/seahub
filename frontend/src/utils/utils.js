import { mediaUrl, gettext, serviceURL, siteRoot, isPro, enableFileComment, fileAuditEnabled, canGenerateShareLink, canGenerateUploadLink, shareLinkPasswordMinLength, username, folderPermEnabled, onlyofficeConverterExtensions, enableOnlyoffice } from './constants';
import TextTranslation from './text-translation';
import React from 'react';
import toaster from '../components/toast';
import PermissionDeniedTip from '../components/permission-denied-tip';
import { compareTwoString } from './compare-two-string';

export const Utils = {

  keyCodes:  {
    esc:   27,
    space: 32,
    tab:   9,
    up:    38,
    down:  40
  },

  bytesToSize: function(bytes) {
    if (typeof(bytes) == 'undefined') return ' ';

    if(bytes < 0) return '--';
    const sizes = ['bytes', 'KB', 'MB', 'GB', 'TB', 'PB'];

    if (bytes === 0) return bytes + ' ' + sizes[0];

    const i = parseInt(Math.floor(Math.log(bytes) / Math.log(1000)), 10);
    if (i === 0) return bytes + ' ' + sizes[i];
    return (bytes / (1000 ** i)).toFixed(1) + ' ' + sizes[i];
  },

  isHiDPI: function() {
    var pixelRatio = window.devicePixelRatio ? window.devicePixelRatio : 1;
    if (pixelRatio > 1) {
      return true;
    } else {
      return false;
    }
  },

  isDesktop: function() {
    return window.innerWidth >= 768;
  },

  isWeChat: function() {
    let ua = window.navigator.userAgent.toLowerCase();
    let isWeChat = ua.match(/MicroMessenger/i) == 'micromessenger';
    let isEnterpriseWeChat = ua.match(/MicroMessenger/i) == 'micromessenger' && ua.match(/wxwork/i) == 'wxwork';
    return isEnterpriseWeChat || isWeChat;
  },

  FILEEXT_ICON_MAP: {

    // text file
    'md': 'txt.png',
    'txt': 'txt.png',

    // pdf file
    'pdf' : 'pdf.png',

    // document file
    'doc' : 'word.png',
    'docx' : 'word.png',
    'odt' : 'word.png',
    'fodt' : 'word.png',

    'ppt' : 'ppt.png',
    'pptx' : 'ppt.png',
    'odp' : 'ppt.png',
    'fodp' : 'ppt.png',

    'xls' : 'excel.png',
    'xlsx' : 'excel.png',
    'ods' : 'excel.png',
    'fods' : 'excel.png',

    // video
    'mp4': 'video.png',
    'ogv': 'video.png',
    'webm': 'video.png',
    'mov': 'video.png',
    'flv': 'video.png',
    'wmv': 'video.png',
    'rmvb': 'video.png',

    // music file
    'mp3' : 'music.png',
    'oga' : 'music.png',
    'ogg' : 'music.png',
    'flac' : 'music.png',
    'aac' : 'music.png',
    'ac3' : 'music.png',
    'wma' : 'music.png',

    // image file
    'jpg' : 'pic.png',
    'jpeg' : 'pic.png',
    'png' : 'pic.png',
    'svg' : 'pic.png',
    'gif' : 'pic.png',
    'bmp' : 'pic.png',
    'ico' : 'pic.png',

    // default
    'default' : 'file.png',
    'sdoc': 'sdoc.png',
  },

  // check if a file is an image
  imageCheck: function(filename) {
    // no file ext
    if (filename.lastIndexOf('.') == -1) {
      return false;
    }
    var file_ext = filename.substr(filename.lastIndexOf('.') + 1).toLowerCase();
    var image_exts = ['gif', 'jpeg', 'jpg', 'png', 'ico', 'bmp', 'tif', 'tiff'];
    if (image_exts.indexOf(file_ext) != -1) {
      return true;
    } else {
      return false;
    }
  },

  getShareLinkPermissionList: function(itemType, permission, path, canEdit) {
    // itemType: library, dir, file
    // permission: rw, r, admin, cloud-edit, preview, custom-*

    let permissionOptions = [];

    const { isCustomPermission } = Utils.getUserPermission(permission);
    if (isCustomPermission) {
      permissionOptions.push('preview_download');
      permissionOptions.push('preview_only');
      return permissionOptions;
    }

    if (permission == 'rw' || permission == 'admin' || permission == 'r') {
      permissionOptions.push('preview_download');
    }
    permissionOptions.push('preview_only');

    if (itemType == 'library' || itemType == 'dir') {
      if (permission == 'rw' || permission == 'admin') {
        permissionOptions.push('download_upload');
      }
    } else {
      if (this.isEditableOfficeFile(path) && (permission == 'rw' || permission == 'admin') && canEdit) {
        permissionOptions.push('edit_download');
      }

      // not support
      // if (this.isEditableOfficeFile(path) && (permission == 'cloud-edit')) {
      //   permissionOptions.push('cloud_edit');
      // }

    }
    return permissionOptions;
  },

  getShareLinkPermissionStr: function(permissions) {
    const { can_edit, can_download, can_upload } = permissions;
    switch (`${can_edit} ${can_download} ${can_upload}`) {
      case 'false true false':
        return 'preview_download';
      case 'false false false':
        return 'preview_only';
      case 'false true true':
        return 'download_upload';
      case 'true true false':
        return 'edit_download';
      case 'true false false':
        return 'cloud_edit';
    }
  },

  isEditableOfficeFile: function(filename) {
    // no file ext
    if (filename.lastIndexOf('.') == -1) {
      return false;
    }
    var file_ext = filename.substr(filename.lastIndexOf('.') + 1).toLowerCase();
    var exts = ['docx', 'pptx', 'xlsx'];
    if (exts.indexOf(file_ext) != -1) {
      return true;
    } else {
      return false;
    }
  },

  // check if a file is a video
  videoCheck: function(filename) {
    // no file ext
    if (filename.lastIndexOf('.') == -1) {
      return false;
    }
    var file_ext = filename.substr(filename.lastIndexOf('.') + 1).toLowerCase();
    var exts = ['mp4', 'ogv', 'webm', 'mov'];
    if (exts.indexOf(file_ext) != -1) {
      return true;
    } else {
      return false;
    }
  },

  checkDuplicatedNameInList: function(list, targetName) {
    return list.some(object => {
      return object.name === targetName;
    });
  },

  encodePath: function(path) {
    // IE8 does not support 'map()'
    /*
       return path.split('/').map(function(e) {
       return encodeURIComponent(e);
       }).join('/');
       */
    if (!path) {
      return '';
    }
    var path_arr = path.split('/');
    var path_arr_ = [];
    for (var i = 0, len = path_arr.length; i < len; i++) {
      path_arr_.push(encodeURIComponent(path_arr[i]));
    }
    return path_arr_.join('/');
  },

  HTMLescape: function(html) {
    return document.createElement('div')
      .appendChild(document.createTextNode(html))
      .parentNode
      .innerHTML;
  },

  generateDialogTitle: function(title, operationTarget) {
    /*
     * @param title: gettext('...{placeholder}...')
     */
    /*
    const targetStr = this.HTMLescape(operationTarget);
    const str = `<span class="op-target ellipsis ellipsis-op-target" title=${targetStr}>${targetStr}</span>`;
    return title.replace('{placeholder}', str);
    */
    return title.replace('{placeholder}', operationTarget);
  },

  getFileName: function(filePath) {
    let lastIndex = filePath.lastIndexOf('/');
    return filePath.slice(lastIndex+1);
  },

  /**
   * input: '/abc/bc/cb'
   * output: ['/abc', '/abc/bc', '/abc/bc/cb'];
   */
  getPaths: function(path) {
    let paths = path.split('/').slice(1);
    let result = [];
    while(paths.length) {
      result.push('/' + paths.join('/'));
      paths.pop();
    }
    return result.reverse();
  },

  /**
   * input:
   *  eg: /
   *      ../abc/abc/
   *      ../abc/bc
   * output(return):
   *  eg: /
   *      abc
   *      bc
   */
  getFolderName: function(path) {
    if (path === '/') {
      return path;
    }
    path = path[path.length - 1] !== '/' ? path : path.slice(0, path.length -2);
    return path.slice(path.lastIndexOf('/') + 1);
  },

  /*
    return dirname of a path.
    if path is '/', return '/'.
  */
  getDirName: function(path) {
    let dir = path.slice(0, path.lastIndexOf('/'));
    if (dir === '') {
      return '/';
    } else {
      return dir;
    }
  },

  isChildPath: function(child, parent) {
    let p = this.getDirName(child);
    return p === parent;
  },

  isAncestorPath: function(ancestor, path) {
    return path.indexOf(ancestor) > -1;
  },

  renameAncestorPath: function(path, ancestor, newAncestor) {
    return path.replace(ancestor, newAncestor);
  },

  joinPath: function(pathA, pathB) {
    if (pathA[pathA.length-1] === '/') {
      return pathA + pathB;
    } else {
      return pathA + '/' + pathB;
    }
  },

  isSupportUploadFolder: function() {
    return navigator.userAgent.indexOf('Firefox')!=-1 ||
      navigator.userAgent.indexOf('Chrome') > -1 ||
      navigator.userAgent.indexOf('Safari') > -1;
  },

  isIEBrower: function() { // is ie <= ie11 not include Edge
    var userAgent = navigator.userAgent;
    var isIE = userAgent.indexOf('compatible') > -1 && userAgent.indexOf('MSIE') > -1;
    var isIE11 = userAgent.indexOf('Trident') > -1 && userAgent.indexOf('rv:11.0') > -1;
    return isIE || isIE11;
  },

  getDefaultLibIconUrl: function(isBig) {
    let size = Utils.isHiDPI() ? 48 : 24;
    size = isBig ? 256 : size;
    let icon_name = 'lib.png';
    return mediaUrl + 'img/lib/' + size + '/' + icon_name;
  },

  getLibIconUrl: function(repo, isBig) {
    let permission = repo.permission || repo.share_permission; //Compatible with regular repo and repo shared
    let size = Utils.isHiDPI() ? 48 : 24;
    size = isBig ? 256 : size;

    let icon_name = 'lib.png';
    if (repo.encrypted) {
      icon_name = 'lib-encrypted.png';
    }
    switch (permission) {
      case 'r':
        icon_name = 'lib-readonly.png';
        break;
      case 'preview':
        icon_name = 'lib-cloud-preview.png';
        break;
      case 'cloud-edit':
        icon_name = 'lib-cloud-preview-edit.png';
        break;
    }

    // must be the last
    if (repo.status == 'read-only') {
      icon_name = 'lib-readonly.png';
    }

    return mediaUrl + 'img/lib/' + size + '/' + icon_name;
  },

  getDirentIcon: function (dirent, isBig) {
    let size = this.isHiDPI() ? 48 : 24;
    size = isBig ? 192 : size;
    if (dirent.isDir()) {
      let readonly = false;
      if (dirent.permission && (dirent.permission === 'r' || dirent.permission === 'preview')) {
        readonly = true;
      }
      return this.getFolderIconUrl(readonly, size);
    } else {
      return this.getFileIconUrl(dirent.name, size);
    }
  },

  getAdminTemplateDirentIcon: function (dirent, isBig) {
    let size = this.isHiDPI() ? 48 : 24;
    size = isBig ? 192 : size;
    if (dirent.is_file) {
      return this.getFileIconUrl(dirent.obj_name, size);
    } else {
      return this.getFolderIconUrl();
    }
  },

  getFolderIconUrl: function(readonly = false, size) {
    if (!size) {
      size = Utils.isHiDPI() ? 48 : 24;
    }
    size = size > 24 ? 192 : 24;
    return `${mediaUrl}img/folder${readonly ? '-read-only-' : '-'}${size}.png`;
  },

  getFileIconUrl: function(filename, size) {
    if (!size) {
      size = Utils.isHiDPI() ? 48 : 24;
    }
    size = size > 24 ? 192 : 24;
    let file_ext = '';
    if (filename.lastIndexOf('.') == -1) {
      return mediaUrl + 'img/file/' + size + '/' + this.FILEEXT_ICON_MAP['default'];
    } else {
      file_ext = filename.substr(filename.lastIndexOf('.') + 1).toLowerCase();
    }

    if (this.FILEEXT_ICON_MAP[file_ext]) {
      return mediaUrl + 'img/file/' + size + '/' + this.FILEEXT_ICON_MAP[file_ext];
    } else {
      return mediaUrl + 'img/file/' + size + '/' + this.FILEEXT_ICON_MAP['default'];
    }
  },

  getLibIconTitle: function(repo) {
    var title;
    let permission = repo.permission || repo.share_permission; //Compatible with regular repo and repo shared
    if (repo.encrypted) {
      title = gettext('Encrypted library');
    } else if (repo.is_admin) { // shared with 'admin' permission
      title = gettext('Admin access');
    } else {
      switch(permission) {
        case 'rw':
          title = gettext('Read-Write library');
          break;
        case 'r':
          title = gettext('Read-Only library');
          break;
        case 'cloud-edit':
          title = gettext('Online Read-Write library');
          break;
        case 'preview':
          title = gettext('Online Read-Only library');
          break;
      }
    }
    return title;
  },

  getFolderIconTitle: function(options) {
    var title;
    switch(options.permission) {
      case 'rw':
        title = gettext('Read-Write folder');
        break;
      case 'r':
        title = gettext('Read-Only folder');
        break;
      case 'cloud-edit':
        title = gettext('Online Read-Write folder');
        break;
      case 'preview':
        title = gettext('Online Read-Only folder');
        break;
    }
    return title;
  },

  getFolderOperationList: function(isRepoOwner, currentRepoInfo, dirent, isContextmenu) {

    let list = [];
    const { SHARE, DOWNLOAD, DELETE, RENAME, MOVE, COPY, PERMISSION, OPEN_VIA_CLIENT } = TextTranslation;
    const permission = dirent.permission;
    const { isCustomPermission, customPermission } = Utils.getUserPermission(permission);

    if (isContextmenu) {
      if (permission == 'rw' || permission == 'r') {
        list.push(DOWNLOAD);
      }

      if (isCustomPermission && customPermission.permission.download) {
        list.push(DOWNLOAD);
      }

      if (Utils.isHasPermissionToShare(currentRepoInfo, permission, dirent)) {
        list.push(SHARE);
      }

      if (permission == 'rw') {
        list.push(DELETE, 'Divider');
      }

      if (isCustomPermission && customPermission.permission.delete) {
        list.push(DELETE, 'Divider');
      }
    }

    if (permission == 'rw') {
      list.push(RENAME, MOVE);
    }

    if (isCustomPermission && customPermission.permission.modify) {
      list.push(RENAME, MOVE);
    }

    if (permission == 'rw') {
      list.push(COPY);
    }

    if (isCustomPermission && customPermission.permission.copy) {
      list.push(COPY);
    }

    if (permission == 'rw') {
      if (folderPermEnabled  && ((isRepoOwner && currentRepoInfo.has_been_shared_out) || currentRepoInfo.is_admin)) {
        list.push('Divider', PERMISSION);
      }
      list.push('Divider', OPEN_VIA_CLIENT);
    }

    if (permission == 'r' && !currentRepoInfo.encrypted) {
      list.push(COPY);
    }

    // if the last item of menuList is ‘Divider’, delete the last item
    if (list[list.length - 1] === 'Divider') {
      list.pop();
    }

    return list;
  },

  getFileOperationList: function(isRepoOwner, currentRepoInfo, dirent, isContextmenu) {
    let list = [];
    const { SHARE, DOWNLOAD, DELETE, RENAME, MOVE, COPY, TAGS, UNLOCK, LOCK, MASK_AS_DRAFT, UNMASK_AS_DRAFT,
      COMMENT, HISTORY, ACCESS_LOG, OPEN_VIA_CLIENT, ONLYOFFICE_CONVERT } = TextTranslation;
    const permission = dirent.permission;
    const { isCustomPermission, customPermission } = Utils.getUserPermission(permission);

    if (isContextmenu) {
      if (permission == 'rw' || permission == 'r') {
        list.push(DOWNLOAD);
      }

      if (isCustomPermission && customPermission.permission.download) {
        list.push(DOWNLOAD);
      }

      if (Utils.isHasPermissionToShare(currentRepoInfo, permission, dirent)) {
        list.push(SHARE);
      }

      if (permission == 'rw') {
        if (!dirent.is_locked || (dirent.is_locked && dirent.locked_by_me)) {
          list.push(DELETE);
        }
        list.push('Divider');
      }

      if (isCustomPermission && customPermission.permission.delete) {
        if (!dirent.is_locked || (dirent.is_locked && dirent.locked_by_me)) {
          list.push(DELETE);
        }
        list.push('Divider');
      }
    }

    if (permission == 'rw') {
      if (!dirent.is_locked || (dirent.is_locked && dirent.locked_by_me)) {
        list.push(RENAME, MOVE);
      }
    }

    if (isCustomPermission && customPermission.permission.modify) {
      if (!dirent.is_locked || (dirent.is_locked && dirent.locked_by_me)) {
        list.push(RENAME, MOVE);
      }
    }

    if (permission == 'rw') {
      list.push(COPY);
    }

    if (isCustomPermission) {
      if (customPermission.permission.copy) {
        list.push(COPY);
      }
    }

    if (permission == 'rw') {
      list.push(TAGS);
      if (isPro) {
        if (dirent.is_locked) {
          if (dirent.locked_by_me || dirent.lock_owner == 'OnlineOffice' || isRepoOwner || currentRepoInfo.is_admin) {
            list.push(UNLOCK);
          }
        } else {
          list.push(LOCK);
        }
      }

      list.push('Divider');
      if (Utils.isSdocFile(dirent.name)) {
        if (dirent.is_sdoc_draft) {
          list.push(UNMASK_AS_DRAFT);
        } else {
          list.push(MASK_AS_DRAFT);
        }
      }
      if (enableFileComment) {
        list.push(COMMENT);
      }
      list.push(HISTORY);
      if (isPro && fileAuditEnabled) {
        list.push(ACCESS_LOG);
      }
      list.push('Divider', OPEN_VIA_CLIENT);
    }

    if (permission == 'r') {
      if (!currentRepoInfo.encrypted) {
        list.push(COPY);
      }
      if (enableFileComment) {
        list.push(COMMENT);
      }
      list.push(HISTORY);
    }

    if (permission == 'rw' && enableOnlyoffice &&
      onlyofficeConverterExtensions.includes(this.getFileExtension(dirent.name, false))) {
      list.push(ONLYOFFICE_CONVERT);
    }

    // if the last item of menuList is ‘Divider’, delete the last item
    if (list[list.length - 1] === 'Divider') {
      list.pop();
    }
    return list;
  },

  getFileExtension: function (fileName, withoutDot) {
    let parts = fileName.toLowerCase().split('.');

    return withoutDot ? parts.pop() : '.' + parts.pop();
  },

  getDirentOperationList: function(isRepoOwner, currentRepoInfo, dirent, isContextmenu) {
    return dirent.type == 'dir' ?
      Utils.getFolderOperationList(isRepoOwner, currentRepoInfo, dirent, isContextmenu) :
      Utils.getFileOperationList(isRepoOwner, currentRepoInfo, dirent, isContextmenu);
  },

  sharePerms: function(permission) {
    var title;
    switch(permission) {
      case 'rw':
        title = gettext('Read-Write');
        break;
      case 'r':
        title = gettext('Read-Only');
        break;
      case 'admin':
        title = gettext('Admin');
        break;
      case 'cloud-edit':
        title = gettext('Online Read-Write');
        break;
      case 'preview':
        title = gettext('Online Read-Only');
        break;
    }
    return title;
  },

  sharePermsExplanation: function(permission) {
    var title;
    switch(permission) {
      case 'rw':
        title = gettext('User can read, write, upload, download and sync files.');
        break;
      case 'r':
        title = gettext('User can read, download and sync files.');
        break;
      case 'admin':
        title = gettext('Besides Write permission, user can also share the library.');
        break;
      case 'cloud-edit':
        title = gettext('User can view and edit file online via browser. Files can\'t be downloaded.');
        break;
      case 'preview':
        title = gettext('User can only view files online via browser. Files can\'t be downloaded.');
        break;
    }
    return title;
  },

  getShareLinkPermissionObject: function(permission) {
    switch (permission) {
      case 'preview_download':
        return {
          value: permission,
          text: gettext('Preview and download'),
          permissionDetails: {
            'can_edit': false,
            'can_download': true,
            'can_upload': false
          }
        };
      case 'preview_only':
        return {
          value: permission,
          text: gettext('Preview only'),
          permissionDetails: {
            'can_edit': false,
            'can_download': false,
            'can_upload': false
          }
        };
      case 'download_upload':
        return {
          value: permission,
          text: gettext('Download and upload'),
          permissionDetails: {
            'can_edit': false,
            'can_download': true,
            'can_upload': true
          }
        };
      case 'edit_download':
        return {
          value: permission,
          text: gettext('Edit on cloud and download'),
          permissionDetails: {
            'can_edit': true,
            'can_download': true,
            'can_upload': false
          }
        };
      case 'cloud_edit':
        return {
          value: permission,
          text: gettext('Edit on cloud only'),
          permissionDetails: {
            'can_edit': true,
            'can_download': false,
            'can_upload': false
          }
        };
    }
    return {
      text: '',
    };
  },

  formatSize: function(options) {
    /*
     * param: {bytes, precision}
     */
    var bytes = options.bytes;
    var precision = options.precision || 0;

    var kilobyte = 1000;
    var megabyte = kilobyte * 1000;
    var gigabyte = megabyte * 1000;
    var terabyte = gigabyte * 1000;

    if ((bytes >= 0) && (bytes < kilobyte)) {
      return bytes + ' B';

    } else if ((bytes >= kilobyte) && (bytes < megabyte)) {
      return (bytes / kilobyte).toFixed(precision) + ' KB';

    } else if ((bytes >= megabyte) && (bytes < gigabyte)) {
      return (bytes / megabyte).toFixed(precision) + ' MB';

    } else if ((bytes >= gigabyte) && (bytes < terabyte)) {
      return (bytes / gigabyte).toFixed(precision) + ' GB';

    } else if (bytes >= terabyte) {
      return (bytes / terabyte).toFixed(precision) + ' TB';

    } else {
      return bytes + ' B';
    }
  },

  formatBitRate: function(bits) {
    var Bs;
    if (typeof bits !== 'number') {
      return '';
    }
    Bs = bits / 8;
    if (Bs >= 1000000000) {
      return (Bs / 1000000000).toFixed(2) + ' GB/s';
    }
    if (Bs >= 1000000) {
      return (Bs / 1000000).toFixed(2) + ' MB/s';
    }
    if (Bs >= 1000) {
      return (Bs / 1000).toFixed(2) + ' kB/s';
    }
    return Bs.toFixed(2) + ' B/s';
  },

  isMarkdownFile: function(filePath) {
    let index = filePath.lastIndexOf('.');
    if (index === -1) {
      return false;
    } else {
      let type = filePath.substring(index).toLowerCase();
      if (type === '.md' || type === '.markdown') {
        return true;
      } else {
        return false;
      }
    }
  },

  isSdocFile: function(filePath) {
    let index = filePath.lastIndexOf('.');
    if (index === -1) {
      return false;
    } else {
      let type = filePath.substring(index).toLowerCase();
      if (type === '.sdoc') {
        return true;
      } else {
        return false;
      }
    }
  },

  isInternalFileLink: function(url, repoID) {
    var re = new RegExp(serviceURL + '/lib/' + repoID + '/file.*');
    return re.test(url);
  },

  isInternalMarkdownLink: function(url, repoID) {
    var re = new RegExp(serviceURL + '/lib/' + repoID + '.*\.md$');
    return re.test(url);
  },

  isInternalDirLink: function(url, repoID) {
    var re = new RegExp(serviceURL + '/library/' + repoID + '.*');
    return re.test(url);
  },

  getPathFromInternalMarkdownLink: function(url, repoID) {
    var re = new RegExp(serviceURL + '/lib/' + repoID + '/file' + '(.*\.md)');
    var array = re.exec(url);
    var path = decodeURIComponent(array[1]);
    return path;
  },

  getPathFromInternalDirLink: function(url, repoID) {
    var re = new RegExp(serviceURL + '/library/' + repoID + '(/.*)');
    var array = re.exec(url);
    var path = decodeURIComponent(array[1]);
    path = path.slice(1);
    path = path.slice(path.indexOf('/'));
    return path;
  },

  isWikiInternalMarkdownLink: function(url, slug) {
    slug = encodeURIComponent(slug);
    var re = new RegExp(serviceURL + '/published/' + slug + '.*\.md$');
    return re.test(url);
  },

  isWikiInternalDirLink: function(url, slug) {
    slug = encodeURIComponent(slug);
    var re = new RegExp(serviceURL + '/published/' + slug + '.*');
    return re.test(url);
  },

  getPathFromWikiInternalMarkdownLink: function(url, slug) {
    slug = encodeURIComponent(slug);
    var re = new RegExp(serviceURL + '/published/' + slug + '(.*\.md)');
    var array = re.exec(url);
    var path = array[1];
    try {
      path = decodeURIComponent(path);
    } catch(err) {
      path = path.replace(/%/g, '%25');
      path = decodeURIComponent(path);
    }
    return path;
  },

  getPathFromWikiInternalDirLink: function(url, slug) {
    slug = encodeURIComponent(slug);
    var re = new RegExp(serviceURL + '/published/' + slug + '(/.*)');
    var array = re.exec(url);
    var path = array[1];
    try {
      path = decodeURIComponent(path);
    } catch(err) {
      path = path.replace(/%/g, '%25');
      path = decodeURIComponent(path);
    }
    return path;
  },

  compareTwoWord: function(wordA, wordB) {
    // compare wordA and wordB at lower case
    // if wordA >= wordB, return 1
    // if wordA < wordB, return -1

    return compareTwoString(wordA, wordB);
  },

  // compare two strings which may have digits in them
  // and compare those digits as number instead of string
  compareStrWithNumbersIn: function(a, b) {
    var reParts = /\d+|\D+/g;
    var reDigit = /\d/;
    var aParts = a.match(reParts);
    var bParts = b.match(reParts);
    var isDigitPart;
    var len = Math.min(aParts.length, bParts.length);
    var aPart, bPart;

    if (aParts && bParts &&
      (isDigitPart = reDigit.test(aParts[0])) == reDigit.test(bParts[0])) {
      // Loop through each substring part to compare the overall strings.
      for (var i = 0; i < len; i++) {
        aPart = aParts[i];
        bPart = bParts[i];

        if (isDigitPart) {
          aPart = parseInt(aPart, 10);
          bPart = parseInt(bPart, 10);
        }

        if (aPart != bPart) {
          return aPart < bPart ? -1 : 1;
        }

        // Toggle the value of isDigitPart since the parts will alternate.
        isDigitPart = !isDigitPart;
      }
    }

    // Use normal comparison.
    return (a >= b) - (a <= b);
  },

  sortRepos: function(repos, sortBy, sortOrder) {
    const _this = this;
    let comparator;

    switch (`${sortBy}-${sortOrder}`) {
      case 'name-asc':
        comparator = function(a, b) {
          if (!a.repo_name) {
            return 1;
          }
          if (!b.repo_name) {
            return -1;
          }
          var result = _this.compareTwoWord(a.repo_name, b.repo_name);
          return result;
        };
        break;
      case 'name-desc':
        comparator = function(a, b) {
          if (!a.repo_name) {
            return -1;
          }
          if (!b.repo_name) {
            return 1;
          }
          var result = _this.compareTwoWord(a.repo_name, b.repo_name);
          return -result;
        };
        break;
      case 'time-asc':
        comparator = function(a, b) {
          return a.last_modified < b.last_modified ? -1 : 1;
        };
        break;
      case 'time-desc':
        comparator = function(a, b) {
          return a.last_modified < b.last_modified ? 1 : -1;
        };
        break;
      case 'size-asc':
        comparator = function(a, b) {
          if (a.size === b.size) {
            let result = _this.compareTwoWord(a.repo_name, b.repo_name);
            return result;
          }
          return a.size_original < b.size_original ? -1 : 1;
        };
        break;
      case 'size-desc':
        comparator = function(a, b) {
          if (a.size === b.size) {
            let result = _this.compareTwoWord(a.repo_name, b.repo_name);
            return -result;
          }

          return a.size_original < b.size_original ? 1 : -1;
        };
        break;
    }

    repos.sort(comparator);
    return repos;
  },

  sortDirents: function(items, sortBy, sortOrder) {
    const _this = this;
    let comparator;

    switch (`${sortBy}-${sortOrder}`) {
      case 'name-asc':
        comparator = function(a, b) {
          var result = _this.compareTwoWord(a.name, b.name);
          return result;
        };
        break;
      case 'name-desc':
        comparator = function(a, b) {
          var result = _this.compareTwoWord(a.name, b.name);
          return -result;
        };
        break;
      case 'time-asc':
        comparator = function(a, b) {
          return a.mtime < b.mtime ? -1 : 1;
        };
        break;
      case 'time-desc':
        comparator = function(a, b) {
          return a.mtime < b.mtime ? 1 : -1;
        };
        break;
      case 'size-asc':
        comparator = function(a, b) {
          if (a.type == 'dir' && b.type == 'dir') {
            return 0;
          }
          return a.size_original < b.size_original ? -1 : 1;
        };
        break;
      case 'size-desc':
        comparator = function(a, b) {
          if (a.type == 'dir' && b.type == 'dir') {
            return 0;
          }
          return a.size_original < b.size_original ? 1 : -1;
        };
        break;
    }

    items.sort((a, b) => {
      if (a.type == 'dir' && b.type == 'file') {
        return -1;
      } else if (a.type == 'file' && b.type == 'dir') {
        return 1;
      } else {
        return comparator(a, b);
      }
    });
    return items;
  },

  // sort dirents in shared folder
  sortDirentsInSharedDir: function(items, sortBy, sortOrder) {
    const _this = this;
    let comparator;

    switch (`${sortBy}-${sortOrder}`) {
      case 'name-asc':
        comparator = function(a, b) {
          let result;
          if (a.is_dir) {
            result = _this.compareTwoWord(a.folder_name, b.folder_name);
          } else {
            result = _this.compareTwoWord(a.file_name, b.file_name);
          }
          return result;
        };
        break;
      case 'name-desc':
        comparator = function(a, b) {
          let result;
          if (a.is_dir) {
            result = _this.compareTwoWord(a.folder_name, b.folder_name);
          } else {
            result = _this.compareTwoWord(a.file_name, b.file_name);
          }
          return -result;
        };
        break;
      case 'time-asc':
        comparator = function(a, b) {
          return a.last_modified < b.last_modified ? -1 : 1;
        };
        break;
      case 'time-desc':
        comparator = function(a, b) {
          return a.last_modified < b.last_modified ? 1 : -1;
        };
        break;
      case 'size-asc':
        comparator = function(a, b) {
          if (a.is_dir) {
            return 0;
          } else {
            return a.size < b.size ? -1 : 1;
          }
        };
        break;
      case 'size-desc':
        comparator = function(a, b) {
          if (a.is_dir) {
            return 0;
          } else {
            return a.size < b.size ? 1 : -1;
          }
        };
        break;
    }

    items.sort((a, b) => {
      if (a.is_dir && !b.is_dir) {
        return -1;
      } else if (!a.is_dir && b.is_dir) {
        return 1;
      } else {
        return comparator(a, b);
      }
    });
    return items;
  },

  /*
   * only used in the 'catch' part of a seafileAPI request
   */
  getErrorMsg: function(error, showPermissionDeniedTip) {
    let errorMsg = '';
    if (error.response) {
      if (error.response.status == 403) {
        if (showPermissionDeniedTip) {
          toaster.danger(
            <PermissionDeniedTip />,
            {id: 'permission_denied', duration: 3600}
          );
        }
        errorMsg = gettext('Permission denied');
      } else if (error.response.data &&
        error.response.data['error_msg']) {
        errorMsg = error.response.data['error_msg'];
      } else {
        errorMsg = gettext('Error');
      }
    } else {
      errorMsg = gettext('Please check the network.');
    }
    return errorMsg;
  },

  changeMarkdownNodes: function(nodes, fn) {
    nodes.map((item) => {
      fn(item);
      if (item.children && item.children.length > 0){
        Utils.changeMarkdownNodes(item.children, fn);
      }
    });

    return nodes;
  },

  chooseLanguage: function(suffix) {
    let mode;
    switch(suffix) {
      case 'py':
        mode = 'python';
        break;
      case 'js':
        mode = 'javascript';
        break;
      case 'c':
        mode = 'c';
        break;
      case 'cpp':
        mode = 'cpp';
        break;
      case 'cs':
        mode = 'csharp';
        break;
      case 'java':
        mode = 'java';
        break;
      case 'mdf':
        mode = 'text/x-sql';
        break;
      case 'html':
        mode = 'html';
        break;
      case 'sh':
        mode = 'shell';
        break;
      default:
        mode = suffix;
    }
    return mode;
  },

  DARK_COLOR_MAP: {
    // old color
    'red': '#D11507',
    'orange': '#FF8C00',
    'yellow': '#EDEF00',
    'green': '#006400',
    'cyan': '#00E0E1',
    'blue': '#2510A3',
    'indigo': '#350C56',
    'purple': '#551054',
    'pink': '#E3A5B0',
    'azure': '#C4D0D0',
    'lime': '#00E100',
    'teal': '#006A6B',
    'gray': '#545454',

    // new color
    '#FFA8A8': '#E49090',
    '#FFA94D': '#E39136',
    '#FFD43B': '#E0B815',
    '#A0EC50': '#83CF32',
    '#A9E34B': '#8DC72E',
    '#63E6BE': '#43CAA4',
    '#4FD2C9': '#2DB9B0',
    '#72C3FC': '#57ABE3',
    '#91A7FF': '#7A91E7',
    '#E599F7': '#CC82DE',
    '#B197FC': '#9B82E5',
    '#F783AC': '#DF6D97',
    '#CED4DA': '#A8ADB2',
  },

  getDarkColor: function(color) {
    let darkColor;
    darkColor = this.DARK_COLOR_MAP[color];
    return darkColor;
  },

  getCopySuccessfulMessage: function(dirNames) {
    let message;
    let dirNamesLength = dirNames.length;
    if (dirNamesLength === 1) {
      message = gettext('Successfully copied %(name)s.');
    } else if (dirNamesLength === 2) {
      message = gettext('Successfully copied %(name)s and 1 other item.');
    } else {
      message = gettext('Successfully copied %(name)s and %(amount)s other items.');
      message = message.replace('%(amount)s', dirNamesLength - 1);
    }
    message = message.replace('%(name)s', dirNames[0]);
    return message;
  },

  getMoveSuccessMessage: function(dirNames) {
    let message;
    let dirNamesLength = dirNames.length;
    if (dirNamesLength === 1) {
      message = gettext('Successfully moved %(name)s.');
    } else if (dirNamesLength === 2) {
      message = gettext('Successfully moved %(name)s and 1 other item.');
    } else {
      message = gettext('Successfully moved %(name)s and %(amount)s other items.');
      message = message.replace('%(amount)s', dirNamesLength - 1);
    }
    message = message.replace('%(name)s', dirNames[0]);
    return message;
  },

  getCopyFailedMessage: function(dirNames) {
    let message;
    let dirNamesLength = dirNames.length;

    if (dirNamesLength > 1) {
      message = gettext('Failed to copy %(name)s and %(amount)s other item(s).');
      message = message.replace('%(amount)s', dirNamesLength - 1);
    } else {
      message = gettext('Failed to copy %(name)s.');
    }
    message = message.replace('%(name)s', dirNames[0]);
    return message;
  },

  getMoveFailedMessage: function(dirNames) {
    let message;
    let dirNamesLength = dirNames.length;
    if (dirNamesLength > 1) {
      message = gettext('Failed to move %(name)s and %(amount)s other item(s).');
      message = message.replace('%(amount)s', dirNamesLength - 1);
    } else {
      message = gettext('Failed to move %(name)s.');
    }
    message = message.replace('%(name)s', dirNames[0]);
    return message;
  },

  handleSearchedItemClick: function(searchedItem) {
    if (searchedItem.is_dir === true) {
      let url = siteRoot + 'library/' + searchedItem.repo_id + '/' + searchedItem.repo_name + searchedItem.path;
      let newWindow = window.open('about:blank');
      newWindow.location.href = url;
    } else {
      let url = siteRoot + 'lib/' + searchedItem.repo_id + '/file' + Utils.encodePath(searchedItem.path);
      let newWindow = window.open('about:blank');
      newWindow.location.href = url;
    }
  },

  generatePassword: function(length, hasNum=1, hasChar=1, hasSymbol=1) {

    var password = '';

    // 65~90：A~Z
    password += String.fromCharCode(Math.floor((Math.random() * (90-65)) + 65));

    // 97~122：a~z
    password += String.fromCharCode(Math.floor((Math.random() * (122-97)) + 97));

    // 48~57：0~9
    password += String.fromCharCode(Math.floor((Math.random() * (57-48)) + 48));

    // 33~47：!~/
    password += String.fromCharCode(Math.floor((Math.random() * (47-33)) + 33));

    // 33~47：!~/
    // 48~57：0~9
    // 58~64：:~@
    // 65~90：A~Z
    // 91~96：[~`
    // 97~122：a~z
    // 123~127：{~
    for (var i = 0; i < length-4; i++) {
      var num = Math.floor((Math.random() * (127-33)) + 33);
      password += String.fromCharCode(num);
    }

    return password;
  },

  pathNormalize: function(originalPath) {
    let oldPath = originalPath.split('/');
    let newPath = [];
    for (let i = 0; i < oldPath.length; i++) {
      if (oldPath[i] === '.' || oldPath[i] === '') {
        continue;
      } else if (oldPath[i] === '..') {
        newPath.pop();
      } else {
        newPath.push(oldPath[i]);
      }
    }
    return newPath.join('/');
  },

  getEventData: function(event, data) {
    if (event.target.dataset) {
      return event.target.dataset[data];
    }
    return event.target.getAttribute('data-' + data);

  },

  /**
   * Check whether user has permission to share a dirent.
   * If dirent is none, then check whether the user can share the repo
   * scene 1: root path or folder path, control the share button in the toolbar
   * scene 2: selected a dirent, control the share button in the toolbar dropdown-menu
   * scene 3: dirent list(grid list), control the share button in the dirent-item or righe-menu
   *
   * @param {*} repoInfo
   * @param {*} userDirPermission
   * @param {*} dirent
   */
  isHasPermissionToShare: function(repoInfo, userDirPermission, dirent) {

    const { isCustomPermission, customPermission } = Utils.getUserPermission(userDirPermission);
    if (isCustomPermission) {
      const { download_external_link } = customPermission.permission;
      return download_external_link;
    }

    let { is_admin: isAdmin, is_virtual: isVirtual, encrypted: repoEncrypted, owner_email: ownerEmail } = repoInfo;
    let isRepoOwner = ownerEmail === username;

    if (repoEncrypted) {
      return true;
    }

    // for 'file' & 'dir'
    if (dirent) {
      if (userDirPermission == 'rw' || userDirPermission == 'r') {
        // can generate internal link
        return true;
      }
    }

    // the root path or the dirent type is dir
    let hasGenerateShareLinkPermission = false;
    if (canGenerateShareLink && (userDirPermission == 'rw' || userDirPermission == 'r')) {
      hasGenerateShareLinkPermission = true;
      return hasGenerateShareLinkPermission;
    }

    let hasGenerateUploadLinkPermission = false;
    if (canGenerateUploadLink && (userDirPermission == 'rw')) {
      hasGenerateUploadLinkPermission = true;
      return hasGenerateUploadLinkPermission;
    }

    let hasDirPrivateSharePermission = false;
    if (!isVirtual && (isRepoOwner || isAdmin)) {
      hasDirPrivateSharePermission = true;
      return hasDirPrivateSharePermission;
    }

    return false;
  },

  registerGlobalVariable: function(namespace, key, value) {
    if (!window[namespace]) {
      window[namespace] = {};
    }
    window[namespace][key] = value;
  },

  formatTime: function(seconds) {
    var ss = parseInt(seconds);
    var mm = 0;
    var hh = 0;
    if (ss > 60) {
      mm = parseInt(ss / 60);
      ss = parseInt(ss % 60);
    }
    if (mm > 60) {
      hh = parseInt(mm / 60);
      mm = parseInt(mm % 60);
    }

    var result = ('00' + parseInt(ss)).slice(-2);
    if (mm > 0) {
      result = ('00' + parseInt(mm)).slice(-2) + ':' + result;
    } else {
      result = '00:' + result;
    }
    if (hh > 0) {
      result = ('00' + parseInt(hh)).slice(-2) + ':' + result;
    } else {
      result = '00:' + result;
    }
    return result;
  },

  hasNextPage(curPage, perPage, totalCount) {
    return curPage * perPage < totalCount;
  },

  getStrengthLevel: function(pwd) {
    const _this = this;
    var num = 0;

    if (pwd.length < shareLinkPasswordMinLength) {
      return 0;
    } else {
      for (var i = 0; i < pwd.length; i++) {
        // return the unicode
        // bitwise OR
        num |= _this.getCharMode(pwd.charCodeAt(i));
      }
      return _this.calculateBitwise(num);
    }
  },

  getCharMode: function(n) {
    if (n >= 48 && n <= 57) // nums
      return 1;
    if (n >= 65 && n <= 90) // uppers
      return 2;
    if (n >= 97 && n <= 122) // lowers
      return 4;
    else
      return 8;
  },

  calculateBitwise: function(num) {
    var level = 0;
    for (var i = 0; i < 4; i++){
      // bitwise AND
      if (num&1) level++;
      // Right logical shift
      num>>>=1;
    }
    return level;
  },

  getSharedPermission: function(item) {
    let permission = item.permission;
    if (item.is_admin) {
      permission = 'admin';
    }
    if (item.permission.startsWith('custom-')) {
      permission = item.permission.slice(7);
    }
    return permission;
  },

  getUserPermission: function(userPerm) {
    const { custom_permission } = window;
    const common_permissions = ['rw', 'r', 'admin', 'cloud-edit', 'preview'];
    // visit the shared repo(virtual repo) by custom permission
    if (!custom_permission || common_permissions.indexOf(userPerm) > -1) {
      return { isCustomPermission: false };
    }
    // userPerm is startsWith 'custom-'
    if (custom_permission) {
      const permissionId = custom_permission.id;
      const userPermId = parseInt(userPerm.split('-')[1]);
      if (permissionId === userPermId) {
        return { isCustomPermission: true, customPermission: custom_permission };
      }
      // TODO user set custom permission on folder
    }
    return { isCustomPermission: false };
  },

  // for a11y
  onKeyDown: function(e) {
    if (e.key == 'Enter' || e.key == 'Space') {
      e.target.click();
    }
  },

  updateTabTitle: function(content) {
    const title = document.getElementsByTagName('title')[0];
    title.innerText = content;
  },

  generateHistoryURL: function(siteRoot, repoID, path) {
    if (!siteRoot || !repoID || !path) return '';
    return siteRoot + 'repo/file_revisions/' + repoID + '/?p=' + this.encodePath(path);
  }

};
