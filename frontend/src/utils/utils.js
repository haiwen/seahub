import { mediaUrl, gettext, serviceURL } from './constants';
import { strChineseFirstPY } from './pinyin-by-unicode';

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

  generateDialogTitle: function(title, operationTarget) {
    /*
     * @param title: gettext('...{placeholder}...')
     */
    const targetStr = this.HTMLescape(operationTarget);
    const str = `<span class="op-target ellipsis ellipsis-op-target" title=${targetStr}>${targetStr}</span>`;
    return title.replace('{placeholder}', str);
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
      navigator.userAgent.indexOf('Chrome') > -1;
  },

  getLibIconUrl: function(repo, isBig) {
    let permission = repo.permission || repo.share_permission; //Compatible with regular repo and repo shared
    let size = Utils.isHiDPI() ? 48 : 24;
    size = isBig ? 256 : size;
    let icon_name = 'lib.png';
    if (repo.encrypted) {
      icon_name = 'lib-encrypted.png';
    }
    if (permission === 'r' || permission === 'perview') {
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
          title = gettext('Preview-Edit-on-Cloud library');
          break;
        case 'preview':
          title = gettext('Preview-on-Cloud library');
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
        title = gettext('Preview-Edit-on-Cloud folder');
        break;
      case 'preview':
        title = gettext('Preview-on-Cloud folder');
        break;
    }
    return title;
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
        title = gettext('Preview-Edit-on-Cloud');
        break;
      case 'preview':
        title = gettext('Preview-on-Cloud');
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
        title = gettext('Same as Preview on cloud. But user can also edit files online via browser.');
        break;
      case 'preview':
        title = gettext('User can only view files online via browser. Files can\'t be downloaded.');
        break;
    }
    return title;
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
    var re = new RegExp(serviceURL + '/wikis/' + slug + '.*\.md$');
    return re.test(url);
  },

  isWikiInternalDirLink: function(url, slug) {
    slug = encodeURIComponent(slug);
    var re = new RegExp(serviceURL + '/wikis/' + slug + '.*');
    return re.test(url);
  },

  getPathFromWikiInternalMarkdownLink: function(url, slug) {
    slug = encodeURIComponent(slug);
    var re = new RegExp(serviceURL + '/wikis/' + slug + '(.*\.md)');
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
    var re = new RegExp(serviceURL + '/wikis/' + slug + '(/.*)');
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

    var a_val, b_val,
      a_uni = wordA.charCodeAt(0),
      b_uni = wordB.charCodeAt(0);

    if ((19968 < a_uni && a_uni < 40869) && (19968 < b_uni && b_uni < 40869)) {
      // both are chinese words
      a_val = strChineseFirstPY.charAt(a_uni - 19968).toLowerCase();
      b_val = strChineseFirstPY.charAt(b_uni - 19968).toLowerCase();
    } else if ((19968 < a_uni && a_uni < 40869) && !(19968 < b_uni && b_uni < 40869)) {
      // a is chinese and b is english
      return 1;
    } else if (!(19968 < a_uni && a_uni < 40869) && (19968 < b_uni && b_uni < 40869)) {
      // a is english and b is chinese
      return -1;
    } else {
      // both are english words
      a_val = wordA.toLowerCase();
      b_val = wordB.toLowerCase();
      return this.compareStrWithNumbersIn(a_val, b_val);
    }

    return a_val >= b_val ? 1 : -1;
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

  changeMarkdownNodes: function(nodes, fn) {
    nodes.map((item) => {
      fn(item); 
      if (item.nodes && item.nodes.length > 0){
        Utils.changeMarkdownNodes(item.nodes, fn); 
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
        mode = 'text/x-csrc';
        break;
      case 'cpp':
        mode = 'text/x-c++src';
        break;
      case 'java':
        mode = 'text/x-java';
        break;
      case 'cs':
        mode = 'text/x-csharp';
        break;
      case 'mdf':
        mode = 'text/x-sql';
        break;
      case 'html':
        mode = 'htmlmixed';
        break;
      default:
        mode = suffix;
    }
    return mode;
  },

};
