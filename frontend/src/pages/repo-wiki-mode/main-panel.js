import React, { Component, Fragment } from 'react';
import PropTypes from 'prop-types';
import cookie from 'react-cookies';
import { gettext, repoID, serviceUrl, slug, permission } from '../../utils/constants';
import { seafileAPI } from '../../utils/seafile-api';
import { Utils } from '../../utils/utils';
import Repo from '../../models/repo';
import CommonToolbar from '../../components/toolbar/common-toolbar';
import ViewModeToolbar from '../../components/toolbar/view-mode-toolbar';
import DirOperationToolBar from '../../components/toolbar/dir-operation-toolbar';
import MutipleDirOperationToolbar from '../../components/toolbar/mutilple-dir-operation-toolbar';
import CurDirPath from '../../components/cur-dir-path';
import MarkdownViewer from '../../components/markdown-viewer';
import DirentListView from '../../components/dirent-list-view/dirent-list-view';
import DirentDetail from '../../components/dirent-detail/dirent-details';
import FileUploader from '../../components/file-uploader/file-uploader';

const propTypes = {
  content: PropTypes.string,
  lastModified: PropTypes.string,
  latestContributor: PropTypes.string,
  permission: PropTypes.string,
  path: PropTypes.string.isRequired,
  // whether the file or dir corresponding to the path exist
  pathExist: PropTypes.bool.isRequired,
  isFileLoading: PropTypes.bool.isRequired,
  isViewFile: PropTypes.bool.isRequired,
  isDirentListLoading: PropTypes.bool.isRequired,
  isDirentSelected: PropTypes.bool.isRequired,
  isAllDirentSelected: PropTypes.bool.isRequired,
  direntList: PropTypes.array.isRequired,
  selectedDirentList: PropTypes.array.isRequired,
  updateDirent: PropTypes.func.isRequired,
  onSideNavMenuClick: PropTypes.func.isRequired,
  onSearchedClick: PropTypes.func.isRequired,
  onMainNavBarClick: PropTypes.func.isRequired,
  onLinkClick: PropTypes.func.isRequired,
  onItemClick: PropTypes.func.isRequired,
  onAllDirentSelected: PropTypes.func.isRequired,
  onItemSelected: PropTypes.func.isRequired,
  onItemDelete: PropTypes.func.isRequired,
  onItemRename: PropTypes.func.isRequired,
  onItemMove: PropTypes.func.isRequired,
  onItemCopy: PropTypes.func.isRequired,
  onAddFile: PropTypes.func.isRequired,
  onAddFolder: PropTypes.func.isRequired,
  onFileTagChanged: PropTypes.func.isRequired,
  onItemsMove: PropTypes.func.isRequired,
  onItemsCopy: PropTypes.func.isRequired,
  onItemsDelete: PropTypes.func.isRequired,
};

class MainPanel extends Component {

  constructor(props) {
    super(props);
    this.state = {
      currentMode: 'wiki',
      isDirentDetailShow: false,
      currentDirent: null,
      direntPath: '',
      currentRepo: null,
      isRepoOwner: false,
    };
  }

  componentDidMount() {
    seafileAPI.getRepoInfo(repoID).then(res => {
      let repo = new Repo(res.data);
      seafileAPI.getAccountInfo().then(res => {
        let user_email = res.data.email;
        let isRepoOwner = repo.owner_email === user_email;
        this.setState({
          currentRepo: repo,
          isRepoOwner: isRepoOwner,
        });
      });
    });
  }

  switchViewMode = (mode) => {
    cookie.save('view_mode', mode, { path: '/' });
    let dirPath = this.props.isViewFile ? Utils.getDirName(this.props.path) : this.props.path;
    window.location.href = serviceUrl + '/#common/lib/' + repoID + dirPath;
  }

  onSideNavMenuClick = () => {
    this.props.onSideNavMenuClick();
  }

  onMainNavBarClick = (path) => {
    this.props.onMainNavBarClick(path);
  }

  onItemDetails = (dirent) => {
    this.setState({
      currentDirent: dirent,
      isDirentDetailShow: true,
    });
  }

  onItemDetailsClose = () => {
    this.setState({isDirentDetailShow: false});
  }

  onFileTagChanged = (dirent, direntPath) => {
    this.props.onFileTagChanged(dirent, direntPath);
  }

  onUploadFile = (e) => {
    e.nativeEvent.stopImmediatePropagation();
    this.uploader.onFileUpload();
  }

  onUploadFolder = (e) => {
    e.nativeEvent.stopImmediatePropagation();
    this.uploader.onFolderUpload();
  }

  onFileUploadSuccess = (file) => {
    // todo
  }

  render() {
    const ErrMessage = (<div className="message empty-tip err-message"><h2>{gettext('Folder does not exist.')}</h2></div>);
    
    return (
      <div className="main-panel wiki-main-panel o-hidden">
        <div className="main-panel-north">
          <div className="cur-view-toolbar border-left-show">
            <span className="sf2-icon-menu hidden-md-up d-md-none side-nav-toggle" title={gettext('Side Nav Menu')} onClick={this.onSideNavMenuClick}></span>
            <div className="dir-operation">
              {this.props.isDirentSelected ?
                <MutipleDirOperationToolbar
                  repoID={repoID} 
                  path={this.props.path}
                  selectedDirentList={this.props.selectedDirentList}
                  onItemsMove={this.props.onItemsMove}
                  onItemsCopy={this.props.onItemsCopy}
                  onItemsDelete={this.props.onItemsDelete}
                /> :
                <DirOperationToolBar 
                  path={this.props.path}
                  repoID={repoID}
                  serviceUrl={serviceUrl}
                  permission={this.props.permission}
                  isViewFile={this.props.isViewFile}
                  onAddFile={this.props.onAddFile}
                  onAddFolder={this.props.onAddFolder}
                  onUploadFile={this.onUploadFile}
                  onUploadFolder={this.onUploadFolder}
                />
              }
            </div>
            <ViewModeToolbar currentMode={this.state.currentMode} switchViewMode={this.switchViewMode}/>
          </div>
          <CommonToolbar repoID={repoID} onSearchedClick={this.props.onSearchedClick} searchPlaceholder={'Search files in this library'}/>
        </div>
        <div className="main-panel-center flex-direction-row">
          <div className="cur-view-container">
            <div className="cur-view-path">
              <CurDirPath 
                repoID={repoID}
                repoName={slug}
                currentPath={this.props.path} 
                permission={permission} 
                onPathClick={this.onMainNavBarClick}
              />
            </div>
            <div className="cur-view-content">
              {!this.props.pathExist ?
                ErrMessage :
                <Fragment>
                  { this.props.isViewFile ?
                    <MarkdownViewer
                      markdownContent={this.props.content}
                      latestContributor={this.props.latestContributor}
                      lastModified = {this.props.lastModified}
                      onLinkClick={this.props.onLinkClick}
                      isFileLoading={this.props.isFileLoading}
                    /> :
                    <Fragment>
                      <DirentListView
                        path={this.props.path}
                        repoID={repoID}
                        serviceUrl={serviceUrl}
                        direntList={this.props.direntList}
                        onItemClick={this.props.onItemClick}
                        onItemDelete={this.props.onItemDelete}
                        onItemRename={this.props.onItemRename}
                        onItemMove={this.props.onItemMove}
                        onItemCopy={this.props.onItemCopy}
                        onItemDetails={this.onItemDetails}
                        isDirentListLoading={this.props.isDirentListLoading}
                        updateDirent={this.props.updateDirent}
                        currentRepo={this.state.currentRepo}
                        isRepoOwner={this.state.isRepoOwner}
                        isAllItemSelected={this.props.isAllDirentSelected}
                        onAllItemSelected={this.props.onAllDirentSelected}
                        onItemSelected={this.props.onItemSelected}
                      />
                      <FileUploader
                        ref={uploader => this.uploader = uploader}
                        dragAndDrop={true}
                        path={this.props.path}
                        repoID={repoID}
                        onFileUploadSuccess={this.onFileUploadSuccess}
                        direntList={this.props.direntList}
                      />
                    </Fragment>
                  }
                </Fragment>
              }
            </div>
          </div>
          {this.state.isDirentDetailShow && (
            <div className="cur-view-detail">
              <DirentDetail
                repoID={repoID}
                serviceUrl={serviceUrl}
                path={this.props.path}
                dirent={this.state.currentDirent}
                direntPath={this.state.direntPath}
                onItemDetailsClose={this.onItemDetailsClose}
                onFileTagChanged={this.onFileTagChanged}
              />
            </div>
          )}
        </div>
      </div>
    );
  }
}

MainPanel.propTypes = propTypes;

export default MainPanel;
