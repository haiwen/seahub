import { mediaUrl } from './constants';

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

  isUploaderSupport: function() {
    return navigator.userAgent.indexOf('Firefox')!=-1 ||
      navigator.userAgent.indexOf('Chrome') > -1;
  }
};
