import React, { Component, Fragment } from 'react';
import { Button } from 'reactstrap';
import axios from 'axios';
import { Utils } from '../../utils/utils';
import { seafileAPI } from '../../utils/seafile-api';
import { loginUrl, siteRoot, gettext } from '../../utils/constants';
import toaster from '../../components/toast';
import MainPanelTopbar from './remote-dir-topbar';
import DirPathBar from './remote-dir-path';
import DirContent from './remote-dir-content';

class Dirent {
  constructor(obj) {
    this.name = obj.name;
    this.mtime = obj.mtime;
    this.size = obj.size;
    this.is_file = obj.type === 'file';
  }

  isDir() {
    return !this.is_file;
  }
}

class DirView extends Component {

  constructor(props) {
    super(props);
    this.state = {
      loading: true,
      errorMsg: '',
      repoName: '',
      path: '',
      direntList: [],
      isNewFolderDialogOpen: false,
      userPerm: '',
    };
    this.fileInput = React.createRef();
  }

  componentDidMount () {
    this.loadDirentList('/');
  }

  onPathClick = (path) => {
    this.loadDirentList(path);
  }

  openFolder = (dirent) => {
    let direntPath = Utils.joinPath(this.state.path, dirent.name);
    if (!dirent.is_file) {
      this.loadDirentList(direntPath);
    }
  }

  loadDirentList = (path) => {
    const { providerID, repoID } = this.props;
    seafileAPI.listOCMRepoDir(providerID, repoID, path).then(res => {
      const { repo_name: repoName, dirent_list, user_perm } = res.data;
      let direntList = [];
      dirent_list.forEach(item => {
        let dirent = new Dirent(item);
        direntList.push(dirent);
      });
      this.setState({
        loading: false,
        repoName: repoName,
        direntList: direntList,
        path: path,
        userPerm: user_perm,
      }, () => {
        let url =`${siteRoot}remote-library/${providerID}/${repoID}/${repoName}${Utils.encodePath(path)}`;
        window.history.replaceState({url: url, path: path}, path, url);
      });
    }).catch((error) => {
      this.setState({
        loading: false,
        errorMsg: Utils.getErrorMsg(error, true) // true: show login tip if 403
      });
    });
  }

  downloadDirent = (dirent) => {
    let path = Utils.joinPath(this.state.path, dirent.name);
    seafileAPI.getOCMRepoDownloadURL(this.props.providerID, this.props.repoID, path).then(res => {
      location.href = res.data;
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
    let { providerID, repoID } = this.props;
    seafileAPI.getOCMRepoUploadURL(providerID, repoID, path).then(res => {
      let formData = new FormData();
      formData.append('parent_dir', path);
      formData.append('file', file);
      axios.post(res.data, formData).then(res => {
        const fileObj = res.data[0];
        let newDirent = new Dirent({
          'type': 'file',
          'name': fileObj.name,
          'size': fileObj.size,
          'mtime': (new Date()).getTime()
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

  render() {
    const { loading, errorMsg,
      repoName, direntList, path, userPerm } = this.state;
    const { repoID } = this.props;

    return (
      <Fragment>
        <MainPanelTopbar>
          <Fragment>
            <input className="d-none" type="file" onChange={this.onFileInputChange} ref={this.fileInput} />
            {userPerm === 'rw' &&
              <Button className="operation-item" onClick={this.openFileInput}>{gettext('Upload')}</Button>
            }
          </Fragment>
        </MainPanelTopbar>
        <div className="main-panel-center flex-row">
          <div className="cur-view-container">
            <div className="cur-view-path align-items-center">
              <DirPathBar
                repoID={repoID}
                repoName={repoName}
                currentPath={path}
                onPathClick={this.onPathClick}
                onTabNavClick={this.props.onTabNavClick}
              />
            </div>
            <div className="cur-view-content">
              <DirContent
                loading={loading}
                errorMsg={errorMsg}
                direntList={direntList}
                openFolder={this.openFolder}
                deleteDirent={this.deleteDirent}
                downloadDirent={this.downloadDirent}
              />
            </div>
          </div>
        </div>
      </Fragment>
    );
  }
}

export default DirView;
