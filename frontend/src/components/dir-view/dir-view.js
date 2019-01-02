import React, { Fragment } from 'react';
import PropTypes from 'prop-types';
import { siteRoot } from '../../utils/constants';
import { seafileAPI } from '../../utils/seafile-api';
import { Utils } from '../../utils/utils';
import { gettext } from '../../utils/constants';
import collabServer from '../../utils/collab-server';
import toaster from '../toast';
import DirPanel from './dir-panel';
import Dirent from '../../models/dirent';
import FileTag from '../../models/file-tag';
import RepoTag from '../../models/repo-tag';
import RepoInfo from '../../models/repo-info';

const propTypes = {
  pathPrefix: PropTypes.array.isRequired,
  onTabNavClick: PropTypes.func.isRequired,
  onMenuClick: PropTypes.func.isRequired,
};

class DirView extends React.Component {

  constructor(props) {
    super(props);

    this.state = {
      path: '/',
      pathExist: true,
      repoName: '',
      repoID: '',
      permission: true,
      libNeedDecrypt: false,
      isDirentSelected: false,
      isAllDirentSelected: false,
      isDirentListLoading: true,
      currentRepoInfo: null,
      direntList: [],
      selectedDirentList: [],
      dirID: '',
      errorMsg: '',
      usedRepoTags: [],
    };
    window.onpopstate = this.onpopstate;
    this.lastModifyTime = new Date();
  }

  onpopstate = (event) => {
    if (event.state && event.state.path) {
      this.updateDirentList(event.state.path);
      this.setState({path: event.state.path});
    }
  }

  componentDidMount() {
    // eg: http://127.0.0.1:8000/library/repo_id/repo_name/**/**/\
    let location = decodeURIComponent(window.location.href);
    let repoID = this.props.repoID;
    collabServer.watchRepo(repoID, this.onRepoUpdateEvent);
    seafileAPI.listRepoTags(repoID).then(res => {
      let usedRepoTags = [];
      res.data.repo_tags.forEach(item => {
        let usedRepoTag = new RepoTag(item);
        if (usedRepoTag.fileCount > 0) {
          usedRepoTags.push(usedRepoTag);
        }
      });
      this.setState({usedRepoTags: usedRepoTags});
    });
    seafileAPI.getRepoInfo(repoID).then(res => {
      let repoInfo = new RepoInfo(res.data);
      this.setState({
        currentRepoInfo: repoInfo,
        repoID: repoInfo.repo_id,
        repoName: repoInfo.repo_name,
        permission: repoInfo.permission === 'rw',
        libNeedDecrypt: res.data.lib_need_decrypt,
      });

      let repoName = repoInfo.repo_name;
      let repoID = repoInfo.repo_id;
      let path = location.slice(location.indexOf(repoID) + repoID.length); // get the string after repoID
      path = path.slice(path.indexOf(repoName) + repoName.length); // get current path
      this.setState({path: path});
      if (!res.data.lib_need_decrypt) {
        this.updateDirentList(path);
      }
    }).catch(error => {
      if (error.response) {
        if (error.response.status == 403) {
          this.setState({
            isDirentListLoading: false,
            errorMsg: gettext('Permission denied')
          });
        } else {
          this.setState({
            isDirentListLoading: false,
            errorMsg: gettext('Error')
          });
        }
      } else {
        this.setState({
          isDirentListLoading: false,
          errorMsg: gettext('Please check the network.')
        });
      }
    });
  }

  componentWillUnmount() {
    collabServer.unwatchRepo(this.props.repoID);
  }

  componentDidUpdate() {
    this.lastModifyTime = new Date();
  }

  onRepoUpdateEvent = () => {
    let currentTime = new Date();
    if ((parseFloat(currentTime - this.lastModifyTime)/1000) <= 5) {
      return;
    }
    let repoID = this.props.repoID;
    let { path, dirID } = this.state;
    seafileAPI.dirMetaData(repoID, path).then((res) => {
      if (res.data.id !== dirID) {
        toaster.notify(
          <span>
            {gettext('This folder has been updated. ')}
            <a href='' >{gettext('Refresh')}</a>
          </span>,
          {id: 'repo_updated', duration: 3600}
        );
      }
    })
  }

  updateUsedRepoTags = (newUsedRepoTags) => {
    this.setState({usedRepoTags: newUsedRepoTags});
  }

  updateDirentList = (filePath) => {
    let repoID = this.state.repoID;
    this.setState({isDirentListLoading: true});
    seafileAPI.listDir(repoID, filePath).then(res => {
      let direntList = res.data.map(item => {
        return new Dirent(item);
      });
      this.setState({
        isDirentListLoading: false,
        pathExist: true,
        direntList: direntList,
        dirID: res.headers.oid,
      });
    }).catch(() => {
      this.setState({
        isDirentListLoading: false,
        pathExist: false
      });
    });
  }

  onItemClick = (dirent) => {
    this.resetSelected();
    let direntPath = Utils.joinPath(this.state.path, dirent.name);
    if (dirent.isDir()) {
      this.updateDirentList(direntPath);
      this.setState({path: direntPath});

      let fileUrl = siteRoot + 'library/' + this.state.repoID + '/' + this.state.repoName + Utils.encodePath(direntPath);
      window.history.pushState({url: fileUrl, path: direntPath}, direntPath, fileUrl);
    } else {
      const w=window.open('about:blank');
      const url = siteRoot + 'lib/' + this.state.repoID + '/file' + Utils.encodePath(direntPath);
      w.location.href = url;
    }
  }

  onAddFolder = (dirPath) => {
    let repoID = this.state.repoID;
    seafileAPI.createDir(repoID, dirPath).then(() => {
      let name = Utils.getFileName(dirPath);
      let dirent = this.createDirent(name, 'dir');
      let direntList = this.addItem(dirent, 'dir');
      this.setState({direntList: direntList});
    });
  }
  
  onAddFile = (filePath, isDraft) => {
    let repoID = this.state.repoID;
    seafileAPI.createFile(repoID, filePath, isDraft).then(res => {
      let name = Utils.getFileName(filePath);
      let dirent = this.createDirent(name, 'file', res.data);
      let direntList = this.addItem(dirent, 'file');
      this.setState({direntList: direntList});
    });
  }

  onItemDelete = (dirent) => {
    let repoID = this.state.repoID;
    let direntPath = Utils.joinPath(this.state.path, dirent.name);
    if (dirent.isDir()) {
      seafileAPI.deleteDir(repoID, direntPath).then(() => {
        let direntList = this.deleteItem(dirent);
        this.setState({direntList: direntList});
      }).catch(() => {
        // todo
      })
    } else {
      seafileAPI.deleteFile(repoID, direntPath).then(() => {
        let direntList = this.deleteItem(dirent);
        this.setState({direntList: direntList});
      }).catch(() => {
        // todo
      })
    }
  }

  onItemRename = (dirent, newName) => {
    let repoID = this.state.repoID;
    let direntPath = Utils.joinPath(this.state.path, dirent.name);
    if (dirent.isDir()) {
      seafileAPI.renameDir(repoID, direntPath, newName).then(() => {
        let direntList = this.renameItem(dirent, newName);
        this.setState({direntList: direntList});
      }).catch(() => {
        //todo
      });
    } else {
      seafileAPI.renameFile(repoID, direntPath, newName).then(() => {
        let direntList = this.renameItem(dirent, newName);
        this.setState({direntList: direntList});
      }).catch(() => {
        //todo
      });
    }
  }
  
  onItemMove = (destRepo, dirent, moveToDirentPath) => {
    let dirName = dirent.name;
    let repoID = this.state.repoID;
    seafileAPI.moveDir(repoID, destRepo.repo_id, moveToDirentPath, this.state.path, dirName).then(() => {
      
      let direntList = this.deleteItem(dirent);
      this.setState({direntList: direntList});

      let message = gettext('Successfully moved %(name)s.');
      message = message.replace('%(name)s', dirName);
      toaster.success(message);
    }).catch(() => {
      let message = gettext('Failed to move %(name)s');
      message = message.replace('%(name)s', dirName);
      toaster.danger(message);
    });
  }

  onItemCopy = (destRepo, dirent, copyToDirentPath) => {
    let dirName = dirent.name;
    let repoID = this.state.repoID;
    seafileAPI.copyDir(repoID, destRepo.repo_id, copyToDirentPath, this.state.path, dirName).then(() => {
      let message = gettext('Successfully copied %(name)s.');
      message = message.replace('%(name)s', dirName);
      toaster.success(message);
    }).catch(() => {
      let message = gettext('Failed to copy %(name)s');
      message = message.replace('%(name)s', dirName);
      toaster.danger(message);
    });
  }

  onItemSelected = (dirent) => {
    let direntList = this.state.direntList.map(item => {
      if (item.name === dirent.name) {
        item.isSelected = !item.isSelected;
      }
      return item;
    });
    let selectedDirentList = direntList.filter(item => {
      return item.isSelected;
    });

    if (selectedDirentList.length) {
      this.setState({isDirentSelected: true});
      if (selectedDirentList.length === direntList.length) {
        this.setState({
          isAllDirentSelected: true,
          direntList: direntList,
          selectedDirentList: selectedDirentList,
        });
      } else {
        this.setState({
          isAllDirentSelected: false,
          direntList: direntList,
          selectedDirentList: selectedDirentList
        });
      }
    } else {
      this.setState({
        isDirentSelected: false,
        isAllDirentSelected: false,
        direntList: direntList,
        selectedDirentList: []
      });
    }
  }

  onItemsMove = (destRepo, destDirentPath) => {
    let dirNames = this.getSelectedDirentNames();
    let repoID = this.state.repoID;
    seafileAPI.moveDir(repoID, destRepo.repo_id, destDirentPath, this.state.path, dirNames).then(() => {
      let direntList = this.deleteItems(dirNames);
      this.setState({
        direntList: direntList,
        isDirentSelected: false,
        selectedDirentList: [],
      });
      let message = gettext('Successfully moved %(name)s.');
      message = message.replace('%(name)s', dirNames);
      toaster.success(message);
    }).catch(() => {
      let message = gettext('Failed to move %(name)s');
      message = message.replace('%(name)s', dirNames);
      toaster.danger(message);
    });
  }

  onItemsCopy = (destRepo, destDirentPath) => {
    let dirNames = this.getSelectedDirentNames();
    let repoID = this.state.repoID;
    seafileAPI.copyDir(repoID, destRepo.repo_id, destDirentPath, this.state.path, dirNames).then(() => {
      let message = gettext('Successfully copied %(name)s.');
      message = message.replace('%(name)s', dirNames);
      toaster.success(message);
    }).catch(() => {
      let message = gettext('Failed to copy %(name)s');
      message = message.replace('%(name)s', dirNames);
      toaster.danger(message);
    });
  }

  onItemsDelete = () => {
    let dirNames = this.getSelectedDirentNames();
    let repoID = this.state.repoID;
    seafileAPI.deleteMutipleDirents(repoID, this.state.path, dirNames).then(res => {
      let direntList = this.deleteItems(dirNames);
      this.setState({
        direntList: direntList,
        isDirentSelected: false,
        selectedDirentList: [],
      });
    });
  }

  onAllItemSelected = () => {
    if (this.state.isAllDirentSelected) {
      let direntList = this.state.direntList.map(item => {
        item.isSelected = false;
        return item;
      });
      this.setState({
        isDirentSelected: false,
        isAllDirentSelected: false,
        direntList: direntList,
        selectedDirentList: [],
      });
    } else {
      let direntList = this.state.direntList.map(item => {
        item.isSelected = true;
        return item;
      });
      this.setState({
        isDirentSelected: true,
        isAllDirentSelected: true,
        direntList: direntList,
        selectedDirentList: direntList,
      });
    }
  }

  onFileTagChanged = (dirent, direntPath) => {
    let repoID = this.state.repoID;
    seafileAPI.listFileTags(repoID, direntPath).then(res => {
      let fileTags = res.data.file_tags.map(item => {
        return new FileTag(item);
      });
      this.updateDirent(dirent, 'file_tags', fileTags);
    });

    seafileAPI.listRepoTags(repoID).then(res => {
      let usedRepoTags = [];
      res.data.repo_tags.forEach(item => {
        let usedRepoTag = new RepoTag(item);
        if (usedRepoTag.fileCount > 0) {
          usedRepoTags.push(usedRepoTag);
        }
      });
      this.updateUsedRepoTags(usedRepoTags);
    });
  }

  onMenuClick = () => {
    this.props.onMenuClick();
  }

  onPathClick = (path) => {
    this.updateDirentList(path);
    this.setState({path: path});

    let fileUrl = siteRoot + 'library/' + this.state.repoID + '/' + this.state.repoName  + Utils.encodePath(path);
    window.history.pushState({url: fileUrl, path: path}, path, fileUrl);
  }

  updateDirent = (dirent, paramKey, paramValue) => {
    let newDirentList = this.state.direntList.map(item => {
      if (item.name === dirent.name) {
        item[paramKey] = paramValue;
      }
      return item;
    });
    this.setState({direntList: newDirentList});
  }

  onFileUploadSuccess = () => {
    // todo update upload file to direntList
  }

  onSearchedClick = (selectedItem) => {
    if (selectedItem.is_dir === true) {
      this.setState({path: selectedItem.path});
    } else {
      let url = siteRoot + 'lib/' + selectedItem.repo_id + '/file' + selectedItem.path;
      let newWindow = window.open('about:blank');
      newWindow.location.href = url;
    }
  }

  resetSelected = () => {
    this.setState({isDirentSelected: false, isAllDirentSelected: false});
  }

  addItem = (dirent, type) => {
    let direntList = this.state.direntList.map(item => {return item}); //clone
    if (type === 'dir') {
      direntList.unshift(dirent);
      return direntList;
    }
    direntList.push(dirent);
    return direntList;
  }

  deleteItem = (dirent) => {
    return this.state.direntList.filter(item => {
      return item.name !== dirent.name;
    });
  }
  
  renameItem = (dirent, newName) => {
    return this.state.direntList.map(item => {
      if (item.name === dirent.name) {
        item.name = newName;
      }
      return item;
    });
  }
  
  deleteItems = (dirNames) => {
    let direntList = this.state.direntList.map(item => {return item}); //clone
    while (dirNames.length) {
      for (let i = 0; i < direntList.length; i++) {
        if (direntList[i].name === dirNames[0]) {
          direntList.splice(i, 1);
          break;
        }
      }
      dirNames.shift();
    }
    return direntList;
  }
  
  createDirent(name, type, direntInfo) {
    let data = new Date().getTime()/1000;
    let dirent = null;
    if (type === 'dir') {
      dirent = new Dirent({
        id: '000000000000000000',
        name: name,
        type: type,
        mtime: data,
        permission: 'rw',
      });
    } else {
      dirent = new Dirent({
        id: '000000000000000000',
        name: name,
        type: type,
        mtime: data,
        permission: 'rw',
        size: direntInfo.size,
        starred: false,
        is_locked: false,
        lock_time: '',
        lock_owner: null,
        locked_by_me: false,
        modifier_name: '',
        modifier_email: '',
        modifier_contact_email: '',
        file_tags: []
      });
    }
    return dirent;
  }

  getSelectedDirentNames = () => {
    let names = [];
    this.state.selectedDirentList.forEach(selectedDirent => {
      names.push(selectedDirent.name);
    });
    return names;
  }

  isMarkdownFile(filePath) {
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

  onLibDecryptDialog = () => {
    this.setState({
      libNeedDecrypt: !this.state.libNeedDecrypt
    })
    this.updateDirentList(this.state.path);
  }

  render() {
    return (
      <DirPanel 
        pathPrefix={this.props.pathPrefix}
        currentRepoInfo={this.state.currentRepoInfo}
        path={this.state.path}
        pathExist={this.state.pathExist}
        errorMsg={this.state.errorMsg}
        repoID={this.state.repoID}
        repoName={this.state.repoName}
        permission={this.state.permission}
        isDirentListLoading={this.state.isDirentListLoading}
        isDirentSelected={this.state.isDirentSelected}
        isAllDirentSelected={this.state.isAllDirentSelected}
        direntList={this.state.direntList}
        selectedDirentList={this.state.selectedDirentList}
        onItemClick={this.onItemClick}
        onAddFile={this.onAddFile}
        onAddFolder={this.onAddFolder}
        onItemMove={this.onItemMove}
        onItemCopy={this.onItemCopy}
        onItemRename={this.onItemRename}
        onItemDelete={this.onItemDelete}
        onItemSelected={this.onItemSelected}
        onItemsMove={this.onItemsMove}
        onItemsCopy={this.onItemsCopy}
        onItemsDelete={this.onItemsDelete}
        onAllItemSelected={this.onAllItemSelected}
        onFileTagChanged={this.onFileTagChanged}
        onMenuClick={this.onMenuClick}
        onPathClick={this.onPathClick}
        onTabNavClick={this.props.onTabNavClick}
        updateDirent={this.updateDirent}
        switchViewMode={this.switchViewMode}
        onSearchedClick={this.onSearchedClick}
        onFileUploadSuccess={this.onFileUploadSuccess}
        libNeedDecrypt={this.state.libNeedDecrypt}
        onLibDecryptDialog={this.onLibDecryptDialog}
        usedRepoTags={this.state.usedRepoTags}
      />
    );
  }
}

DirView.propTypes = propTypes;

export default DirView;
