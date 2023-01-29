import React, { Component, Fragment } from 'react';
import { Button } from 'reactstrap';
import axios from 'axios';
import { Utils } from '../../../utils/utils';
import { seafileAPI } from '../../../utils/seafile-api';
import { siteRoot, gettext } from '../../../utils/constants';
import toaster from '../../../components/toast';
import CreateFolderDialog from '../../../components/dialog/create-folder-dialog';
import Dirent from '../../../models/system-admin/dirent';
import MainPanelTopbar from '../main-panel-topbar';
import DirPathBar from './dir-path-bar';
import DirContent from './dir-content';

class DirView extends Component {

  constructor(props) {
    super(props);
    this.state = {
      loading: true,
      errorMsg: '',
      isSystemRepo: false,
      repoName: '',
      path: '',
      direntList: [],
      isNewFolderDialogOpen: false
    };
    this.fileInput = React.createRef();
  }

  componentDidMount () {
    this.loadDirentList('/');
  }

  onPathClick = (path) => {
    this.loadDirentList(path);
  }

  toggleNewFolderDialog = () => {
    this.setState({isNewFolderDialogOpen: !this.state.isNewFolderDialogOpen});
  }

  createNewFolder = (path) => {
    let folderName = Utils.getFileName(path);
    seafileAPI.sysAdminCreateSysRepoFolder(this.props.repoID, this.state.path, folderName).then(res => {
      let new_dirent = new Dirent(res.data);
      let direntList = this.state.direntList;
      direntList.unshift(new_dirent);
      this.setState({
        direntList: direntList
      });
      this.toggleNewFolderDialog();
    }).catch((err) => {
      let errMessage = Utils.getErrorMsg(err);
      toaster.danger(errMessage);
    });
  }

  openFolder = (dirent) => {
    let direntPath = Utils.joinPath(this.state.path, dirent.name);
    if (!dirent.is_file) {
      this.loadDirentList(direntPath);
    }
  }

  loadDirentList = (path) => {
    const repoID = this.props.repoID;
    seafileAPI.sysAdminListRepoDirents(repoID, path).then(res => {
      const { is_system_library: isSystemRepo, repo_name: repoName, dirent_list } = res.data;
      let direntList = [];
      dirent_list.forEach(item => {
        let dirent = new Dirent(item);
        direntList.push(dirent);
      });
      this.setState({
        loading: false,
        repoName: repoName,
        isSystemRepo: isSystemRepo,
        direntList: direntList,
        path: path,
      }, () => {
        let url = siteRoot + 'sys/libraries/' + repoID + '/' + encodeURIComponent(this.state.repoName) + Utils.encodePath(path);
        window.history.replaceState({url: url, path: path}, path, url);
      });
    }).catch((error) => {
      this.setState({
        loading: false,
        errorMsg: Utils.getErrorMsg(error, true) // true: show login tip if 403
      });
    });
  }

  deleteDirent = (dirent) => {
    let path = Utils.joinPath(this.state.path, dirent.name);
    seafileAPI.sysAdminDeleteRepoDirent(this.props.repoID, path).then(res => {
      toaster.success(gettext('Successfully deleted 1 item.'));
      let direntList = this.state.direntList.filter(item => {
        return item.name != dirent.name;
      });
      this.setState({
        direntList: direntList
      });
    }).catch((err) => {
      let errMessage = Utils.getErrorMsg(err);
      toaster.danger(errMessage);
    });
  }

  downloadDirent = (dirent) => {
    let path = Utils.joinPath(this.state.path, dirent.name);
    seafileAPI.sysAdminGetRepoFileDownloadURL(this.props.repoID, path).then(res => {
      location.href = res.data.download_url;
    }).catch((err) => {
      let errMessage = Utils.getErrorMsg(err);
      toaster.danger(errMessage);
    });
  }

  openFileInput = () => {
    this.fileInput.current.click();
  }

  onFileInputChange = () => {
    if (!this.fileInput.current.files.length) {
      return;
    }
    const file = this.fileInput.current.files[0];

    let { path } = this.state;
    seafileAPI.sydAdminGetSysRepoItemUploadURL(path).then(res => {
      let formData = new FormData();
      formData.append('parent_dir', path);
      formData.append('file', file);
      axios.post(res.data.upload_link, formData).then(res => {
        const fileObj = res.data[0];
        let newDirent = new Dirent({
          'is_file': true,
          'obj_name': fileObj.name,
          'file_size': Utils.bytesToSize(fileObj.size),
          'last_update': (new Date()).getTime()
        });
        let direntList = this.state.direntList;
        const dirs = direntList.filter(item => { return !item.is_file; });
        direntList.splice(dirs.length, 0, newDirent);
        this.setState({
          direntList: direntList
        });
      });
    }).catch((err) => {
      let errMessage = Utils.getErrorMsg(err);
      toaster.danger(errMessage);
    });
  }

  checkDuplicatedName = (newName) => {
    let direntList = this.state.direntList;
    let isDuplicated = direntList.some(object => {
      return object.name === newName;
    });
    return isDuplicated;
  }

  render() {
    const { loading, errorMsg,
      repoName, direntList, isSystemRepo, path,
      isNewFolderDialogOpen } = this.state;
    const { repoID } = this.props;

    return (
      <Fragment>
        {isSystemRepo ?
          <MainPanelTopbar {...this.props}>
            <Fragment>
              <input className="d-none" type="file" onChange={this.onFileInputChange} ref={this.fileInput} />
              <Button className="operation-item" onClick={this.openFileInput}>{gettext('Upload')}</Button>
              <Button className="operation-item" onClick={this.toggleNewFolderDialog}>{gettext('New Folder')}</Button>
            </Fragment>
          </MainPanelTopbar> : <MainPanelTopbar {...this.props} />
        }
        <div className="main-panel-center flex-row">
          <div className="cur-view-container">
            <div className="cur-view-path align-items-center">
              <DirPathBar
                isSystemRepo={isSystemRepo}
                repoID={repoID}
                repoName={repoName}
                currentPath={path}
                onPathClick={this.onPathClick}
              />
            </div>
            <div className="cur-view-content">
              <DirContent
                loading={loading}
                errorMsg={errorMsg}
                fromSystemRepo={isSystemRepo}
                direntList={direntList}
                openFolder={this.openFolder}
                deleteDirent={this.deleteDirent}
                downloadDirent={this.downloadDirent}
              />
            </div>
          </div>
        </div>
        {isNewFolderDialogOpen &&
          <CreateFolderDialog
            parentPath={path}
            checkDuplicatedName={this.checkDuplicatedName}
            onAddFolder={this.createNewFolder}
            addFolderCancel={this.toggleNewFolderDialog}
          />
        }
      </Fragment>
    );
  }
}

export default DirView;
