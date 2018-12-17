import { mediaUrl, gettext } from './constants';

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
    'default' : 'file.png'
  },

  getFileIconUrl: function(filename, size) {
    if (size > 24) {
      size = 192;
    } else {
      size = 24;
    }

    var file_ext;
    if (filename.lastIndexOf('.') == -1) {
      return mediaUrl + 'img/file/' + size + '/'
        + this.FILEEXT_ICON_MAP['default'];
    } else {
      file_ext = filename.substr(filename.lastIndexOf('.') + 1).toLowerCase();
    }

    if (this.FILEEXT_ICON_MAP[file_ext]) {
      return mediaUrl + 'img/file/' + size + '/' + this.FILEEXT_ICON_MAP[file_ext];
    } else {
      return mediaUrl + 'img/file/' + size + '/' + this.FILEEXT_ICON_MAP['default'];
    }
  },

  // check if a file is an image
  imageCheck: function (filename) {
    // no file ext
    if (filename.lastIndexOf('.') == -1) {
      return false;
    }
    var file_ext = filename.substr(filename.lastIndexOf('.') + 1).toLowerCase();
    var image_exts = ['gif', 'jpeg', 'jpg', 'png', 'ico', 'bmp'];
    if (image_exts.indexOf(file_ext) != -1) {
      return true;
    } else {
      return false;
    }
  },

  // check if a file is a video
  videoCheck: function (filename) {
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

  getFileName: function(filePath) {
    let lastIndex = filePath.lastIndexOf('/');
    return filePath.slice(lastIndex+1);
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
    return newAncestor + '/' + path.replace(ancestor, '');
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
      navigator.userAgent.indexOf('Chrome') > -1;
  },

  getLibIconUrl: function(options) {
    /*
     * param: {is_encrypted, is_readonly, size}
     */
    // icon name
    var icon_name = 'lib.png';
    if (options.is_encrypted) {
      icon_name = 'lib-encrypted.png';
    }
    if (options.is_readonly) {
      icon_name = 'lib-readonly.png';
    }

    // icon size
    var icon_size = options.size || 256; // 'size' can be 24, 48, or undefined. (2017.7.31)

    return mediaUrl + 'img/lib/' + icon_size + '/' + icon_name;
  },

  getFolderIconUrl: function(options) {
    /*
     * param: {is_readonly, size}
     */
    const readonly = options.is_readonly;
    const size = options.size;
    return `${mediaUrl}img/folder${readonly ? '-read-only' : ''}${size > 24 ? '-192' : '-24'}.png`;
  },

  getLibIconTitle: function(options) {
    /*
     * param: {encrypted, is_admin, permission}
     */
    var title;
    if (options.encrypted) {
      title = gettext("Encrypted library");
    } else if (options.is_admin) { // shared with 'admin' permission
      title = gettext("Admin access");
    } else {
      switch(options.permission) {
        case 'rw':
          title = gettext("Read-Write library");
          break;
        case 'r':
          title = gettext("Read-Only library");
          break;
        case 'cloud-edit':
          title = gettext("Preview-Edit-on-Cloud library");
          break;
        case 'preview':
          title = gettext("Preview-on-Cloud library");
          break;
      }
    }
    return title;
  },

  getFolderIconTitle: function(options) {
    var title;
    switch(options.permission) {
      case 'rw':
        title = gettext("Read-Write folder");
        break;
      case 'r':
        title = gettext("Read-Only folder");
        break;
      case 'cloud-edit':
        title = gettext("Preview-Edit-on-Cloud folder");
        break;
      case 'preview':
        title = gettext("Preview-on-Cloud folder");
        break;
    }
    return title;
  },

  sharePerms: {
    'rw': gettext("Read-Write"),
    'r': gettext("Read-Only"),
    'admin': gettext("Admin"),
    'cloud-edit': gettext("Preview-Edit-on-Cloud"),
    'preview': gettext("Preview-on-Cloud")
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
  }
};
