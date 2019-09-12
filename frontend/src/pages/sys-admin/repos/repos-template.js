import React, { Component, Fragment } from 'react';
import { siteRoot } from '../../../utils/constants';
import { Utils } from '../../../utils/utils';
import { gettext } from '../../../utils/constants';
import MainPanelTopbar from '../../org-admin/main-panel-topbar';
import { Button } from 'reactstrap';
import { seafileAPI } from '../../../utils/seafile-api';
import toaster from '../../../components/toast';
import DirentAdminTemplate from '../../../models/dirent-admin-template';
import RepoTemplatePath from './repos-template-path';
import RepoTemplateDirListView from './repos-template-dir-list-view';
import { post } from 'axios';
import CreateFolderDialog from '../../../components/dialog/create-folder-dialog';


class ReposTemplate extends Component {

  constructor(props) {
    super(props);
    this.uploadInput = React.createRef();
    this.state = {
      loading: true,
      errorMsg: '',
      direntList: [],
      repoName: '',
      isNewFolderDialogOpen: false,
      path: ''
    };
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
      let new_dirent = new DirentAdminTemplate(res.data);
      let direntList = this.state.direntList;
      direntList.push(new_dirent);
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
    let repoID = this.props.repoID;
    seafileAPI.sysAdminListRepoDirents(repoID, path).then(res => {
      let direntList = [];
      res.data.dirent_list.forEach(item => {
        let dirent = new DirentAdminTemplate(item);
        direntList.push(dirent);
      });
      this.setState({
        repoName: res.data.repo_name,
        direntList: Utils.sortDirents(direntList, 'name', 'asc'),
        path: path,
      }, () => {
        let url = siteRoot + 'sys/libraries/' + repoID + '/' + encodeURIComponent(this.state.repoName) + Utils.encodePath(path);
        window.history.replaceState({url: url, path: path}, path, url);
      });
    }).catch((err) => {
      let errMessage = Utils.getErrorMsg(err);
      toaster.danger(errMessage);
    });
  }

  deleteDirent = (dirent) => {
    let path = this.state.path + dirent.name;
    seafileAPI.sysAdminDeleteRepoDirent(this.props.repoID, path).then(res => {
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

  downloadItem = (dirent) => {
    let path = this.state.path + dirent.name;
    seafileAPI.sysAdminGetRepoFileDownloadURL(this.props.repoID, path).then(res => {
      location.href = res.data.download_url;
    }).catch((err) => {
      let errMessage = Utils.getErrorMsg(err);
      toaster.danger(errMessage);
    });
  }

  choseItemToUpload = () => {
    this.uploadInput.current.click();
  }

  uploadDirOrFile = () => {
    // get upload url -> 
    // send upload post request this file -> 
    // get new file info, add it to direntList
    let { path } = this.state;
    seafileAPI.sydAdminGetSysRepoItemUploadURL(path).then(res => {
      if (!this.uploadInput.current.files.length) {
        return;
      }
      const file = this.uploadInput.current.files[0];
      let formData = new FormData();
      formData.append('parent_dir', path);
      formData.append('file', file);
      post(res.data.upload_link, formData).then(res => {
        seafileAPI.sysAdminGetSysRepoItemInfo(this.props.repoID, path + res.data[0].name).then(res => {
          let new_dirent = new DirentAdminTemplate(res.data);
          let direntList = this.state.direntList;
          direntList.push(new_dirent);
          this.setState({
            direntList: direntList
          });
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
    let { repoName, direntList, path, isNewFolderDialogOpen } = this.state;
    let { repoID } = this.props;

    return (
      <Fragment>
        <MainPanelTopbar>
          <Fragment>
            <input className="d-none" type="file" onChange={this.uploadDirOrFile} ref={this.uploadInput} />
            <Button className={'btn btn-secondary operation-item'} onClick={this.choseItemToUpload}>{gettext('Upload')}</Button>
            <Button className={'btn btn-secondary operation-item'} onClick={this.toggleNewFolderDialog}>{gettext('New Folder')}</Button>
          </Fragment>
        </MainPanelTopbar>
        <div className="main-panel-center flex-row">
          <div className="cur-view-container">
            <div className="cur-view-path align-items-center">
              <RepoTemplatePath 
                repoName={repoName}
                currentPath={path}
                onPathClick={this.onPathClick}
                repoID={repoID}
              />
            </div>
            <div className="cur-view-content">
              <RepoTemplateDirListView
                direntList={direntList}
                openFolder={this.openFolder}
                deleteDirent={this.deleteDirent}
                downloadItem={this.downloadItem}
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

export default ReposTemplate;
