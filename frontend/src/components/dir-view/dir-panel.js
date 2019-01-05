import React, { Fragment } from 'react';
import PropTypes from 'prop-types';
import cookie from 'react-cookies';
import { gettext, siteRoot, username } from '../../utils/constants';
import { seafileAPI } from '../../utils/seafile-api';
import { Utils } from '../../utils/utils';
import CommonToolbar from '../toolbar/common-toolbar';
import ViewModeToolbar from '../toolbar/view-mode-toolbar';
import DirOperationToolBar from '../toolbar/dir-operation-toolbar';
import MutipleDirOperationToolbar from '../toolbar/mutilple-dir-operation-toolbar';
import CurDirPath from '../cur-dir-path';
import DirentListView from '../dirent-list-view/dirent-list-view';
import DirentDetail from '../dirent-detail/dirent-details';
import FileUploader from '../file-uploader/file-uploader';
import ModalPortal from '../modal-portal';
import LibDecryptDialog from '../dialog/lib-decrypt-dialog';
import FileTagsViewer from '../../components/filetags-viewer';
import ReadmeContentViewer from '../../components/readme-viewer';

const propTypes = {
  currentRepoInfo: PropTypes.object,
  pathPrefix: PropTypes.array.isRequired,
  path: PropTypes.string.isRequired,
  errorMsg: PropTypes.string.isRequired,
  repoID: PropTypes.string.isRequired,
  repoName: PropTypes.string.isRequired,
  pathExist: PropTypes.bool.isRequired,
  permission: PropTypes.bool.isRequired,
  isDirentListLoading: PropTypes.bool.isRequired,
  isDirentSelected: PropTypes.bool.isRequired,
  isAllDirentSelected: PropTypes.bool.isRequired,
  direntList: PropTypes.array.isRequired,
  sortBy: PropTypes.string.isRequired,
  sortOrder: PropTypes.string.isRequired,
  sortItems: PropTypes.func.isRequired,
  selectedDirentList: PropTypes.array.isRequired,
  onItemClick: PropTypes.func.isRequired,
  onAddFile: PropTypes.func.isRequired,
  onAddFolder: PropTypes.func.isRequired,
  onItemMove: PropTypes.func.isRequired,
  onItemCopy: PropTypes.func.isRequired,
  onItemRename: PropTypes.func.isRequired,
  onItemDelete: PropTypes.func.isRequired,
  onItemSelected: PropTypes.func.isRequired,
  onItemsCopy: PropTypes.func.isRequired,
  onItemsMove: PropTypes.func.isRequired,
  onItemsDelete: PropTypes.func.isRequired,
  onAllItemSelected: PropTypes.func.isRequired,
  onFileTagChanged: PropTypes.func.isRequired,
  onMenuClick: PropTypes.func.isRequired,
  onPathClick: PropTypes.func.isRequired,
  onTabNavClick: PropTypes.func.isRequired,
  updateDirent: PropTypes.func.isRequired,
  onSearchedClick: PropTypes.func.isRequired,
  onFileUploadSuccess: PropTypes.func.isRequired,
  usedRepoTags: PropTypes.array.isRequired,
};

class DirPanel extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      currentDirent: null,
      currentMode: 'list',
      isDirentDetailShow: false,
      isRepoOwner: false,
      readmeContent: '',
      isReadmeLoading: false,
    };
    this.titlesInfo = null;
  }

  componentDidMount() {
    let currentRepoInfo = this.props.currentRepoInfo;
    if (currentRepoInfo) {
      let isRepoOwner = currentRepoInfo.owner_email === username;
      this.setState({isRepoOwner: isRepoOwner});
    }
  }

  showReadme = (filePath, fileName) => {
    this.setState({
      isReadmeLoading: true,
    });
    let readmePath = Utils.joinPath(filePath, fileName);
    seafileAPI.getFileDownloadLink(this.props.repoID, readmePath).then((res) => {
      seafileAPI.getFileContent(res.data).then((res) => {
        this.setState({
          readmeContent: res.data,
          isReadmeLoading: false,
        });
      });
    });
  }

  onPathClick = (path) => {
    this.setState({isDirentDetailShow: false});
    this.props.onPathClick(path);
  }

  onItemClick = (dirent) => {
    this.setState({isDirentDetailShow: false});
    this.props.onItemClick(dirent);
  }

  onItemDetails = (dirent) => {
    this.setState({
      currentDirent: dirent,
      isDirentDetailShow: true,
    });
  }

  onItemDetailsClose = () => {
    // todo there is bug when change item
    this.setState({isDirentDetailShow: false});
  }

  onUploadFile = (e) => {
    e.nativeEvent.stopImmediatePropagation();
    this.uploader.onFileUpload();
  }

  onUploadFolder = (e) => {
    e.nativeEvent.stopImmediatePropagation();
    this.uploader.onFolderUpload();
  }

  switchViewMode = (mode) => {
    let { path, repoID } = this.props;
    if (mode === this.state.currentMode) {
      return;
    }
    if (mode === 'wiki') {
      var url = siteRoot + 'wiki/lib/' + repoID + path;      
      window.location = url;
    }
    cookie.save('view_mode', mode, { path: '/' });
    
    this.setState({currentMode: mode});
  }

  onContentRendered = (readmeViewer) => {
    this.titlesInfo = readmeViewer.titlesInfo;
  }

  render() {
    const errMessage = (<div className="message empty-tip err-message"><h2>{gettext('Folder does not exist.')}</h2></div>);

    return (
      <div className="main-panel wiki-main-panel o-hidden">
        <div className="main-panel-north">
          {!this.props.libNeedDecrypt &&
            <div className="cur-view-toolbar border-left-show">
              <span className="sf2-icon-menu hidden-md-up d-md-none side-nav-toggle" title={gettext('Side Nav Menu')} onClick={this.props.onMenuClick}></span>
              <div className="dir-operation">
                {this.props.isDirentSelected ?
                  <MutipleDirOperationToolbar
                    path={this.props.path}
                    repoID={this.props.repoID}
                    selectedDirentList={this.props.selectedDirentList}
                    onItemsMove={this.props.onItemsMove}
                    onItemsCopy={this.props.onItemsCopy}
                    onItemsDelete={this.props.onItemsDelete}
                  /> :
                  <DirOperationToolBar 
                    isViewFile={false}
                    path={this.props.path}
                    repoID={this.props.repoID}
                    onAddFile={this.props.onAddFile}
                    onAddFolder={this.props.onAddFolder}
                    onUploadFile={this.onUploadFile}
                    onUploadFolder={this.onUploadFolder}
                  />
                }
              </div>
              <ViewModeToolbar
                currentMode={this.state.currentMode} 
                switchViewMode={this.switchViewMode}
              />
            </div>
          }
          <CommonToolbar 
            repoID={this.props.repoID} 
            onSearchedClick={this.props.onSearchedClick} 
            searchPlaceholder={gettext('Search files in this library')}
          />
        </div>
        <div className="main-panel-center flex-row">
          {!this.props.libNeedDecrypt &&
            <div className="cur-view-container">
              <div className="cur-view-path">
                <CurDirPath 
                  isViewFile={false}
                  repoID={this.props.repoID}
                  repoName={this.props.repoName}
                  pathPrefix={this.props.pathPrefix}
                  currentPath={this.props.path} 
                  permission={this.props.permission}
                  onPathClick={this.onPathClick}
                  onTabNavClick={this.props.onTabNavClick}
                />
              </div>
              <div className="cur-view-content">
                {this.props.errorMsg ?
                 <p className="error text-center">{this.props.errorMsg}</p> :
                  <Fragment>
                    {!this.props.pathExist ?
                      errMessage :
                      <Fragment>
                        {(this.props.usedRepoTags.length > 0 && this.props.path === '/') && (
                          <div className="tags-summary-bar">
                            <FileTagsViewer
                              repoID={this.props.repoID}
                              currentPath={this.props.path}
                              usedRepoTags={this.props.usedRepoTags}
                            />
                          </div>
                        )}
                        <DirentListView
                          path={this.props.path}
                          repoID={this.props.repoID}
                          direntList={this.props.direntList}
                          sortBy={this.props.sortBy}
                          sortOrder={this.props.sortOrder}
                          sortItems={this.props.sortItems}
                          currentRepoInfo={this.props.currentRepoInfo}
                          isDirentListLoading={this.props.isDirentListLoading}
                          isAllItemSelected={this.props.isAllDirentSelected}
                          isRepoOwner={this.state.isRepoOwner}
                          onAddFile={this.props.onAddFile}
                          onItemDetails={this.onItemDetails}
                          onItemMove={this.props.onItemMove}
                          onItemCopy={this.props.onItemCopy}
                          onItemClick={this.onItemClick}
                          onItemDelete={this.props.onItemDelete}
                          onItemRename={this.props.onItemRename}
                          onItemSelected={this.props.onItemSelected}
                          onAllItemSelected={this.props.onAllItemSelected}
                          updateDirent={this.props.updateDirent}
                        />
                        {this.props.direntList.map(dirent => {
                          let fileName = dirent.name.toLowerCase();
                          if (fileName === 'readme.md' || fileName === 'readme.markdown') {
                            return (
                              <ReadmeContentViewer
                                key={dirent.id}
                                readmeContent={this.state.readmeContent}
                                isReadmeLoading={this.state.isReadmeLoading}
                                onContentRendered={this.onContentRendered}
                                showReadme={this.showReadme}
                                filePath={this.props.path}
                                fileName={dirent.name}
                              />
                            );
                          }
                        })}
                        <FileUploader
                          dragAndDrop={true}
                          ref={uploader => this.uploader = uploader}
                          path={this.props.path}
                          repoID={this.props.repoID}
                          direntList={this.props.direntList}
                          onFileUploadSuccess={this.props.onFileUploadSuccess}
                        />
                      </Fragment>
                    }
                  </Fragment>
                }
              </div>
              {/* {this.props.direntList.map(dirent => {
                let fileName = dirent.name.toLowerCase();
                if (fileName === 'readme.md' || fileName === 'readme.markdown') {
                  return (
                    <div key={dirent.id} className="cur-view-readme">
                      <ReadmeContentViewer
                        readmeContent={this.state.readmeContent}
                        isReadmeLoading={this.state.isReadmeLoading}
                        onContentRendered={this.onContentRendered}
                        showReadme={this.showReadme}
                        filePath={this.props.path}
                        fileName={dirent.name}
                      />
                    </div>
                  );
                }
              })} */}
            </div>
          }
          {this.state.isDirentDetailShow && (
            <div className="cur-view-detail">
              <DirentDetail
                path={this.props.path}
                repoID={this.props.repoID}
                dirent={this.state.currentDirent}
                onFileTagChanged={this.props.onFileTagChanged}
                onItemDetailsClose={this.onItemDetailsClose}
              />
            </div>
          )}
          {this.props.libNeedDecrypt && (
            <ModalPortal>
              <LibDecryptDialog 
                repoID={this.props.repoID} 
                onLibDecryptDialog={this.props.onLibDecryptDialog}
              />
            </ModalPortal>
          )}
        </div>
      </div>
    );
  }
}

DirPanel.propTypes = propTypes;

export default DirPanel;
