import React, { Fragment } from 'react';
import PropTypes from 'prop-types';
import { Tooltip } from 'reactstrap';
import { Utils } from '../../utils/utils';
import { gettext, siteRoot } from '../../utils/constants';
import { seafileAPI } from '../../utils/seafile-api';
import CommonToolbar from '../../components/toolbar/common-toolbar';
import ViewModeToolbar from '../../components/toolbar/view-mode-toolbar';
import DirOperationToolBar from '../../components/toolbar/dir-operation-toolbar';
import MutipleDirOperationToolbar from '../../components/toolbar/mutilple-dir-operation-toolbar';

const propTypes = {
  isViewFile: PropTypes.bool.isRequired,
  filePermission: PropTypes.bool.isRequired, // ture = 'rw'
  isDraft: PropTypes.bool.isRequired,
  hasDraft: PropTypes.bool.isRequired,
  // side-panel
  onSideNavMenuClick: PropTypes.func.isRequired,
  // mutiple-dir
  isDirentSelected: PropTypes.bool.isRequired,
  repoID: PropTypes.string.isRequired,
  path: PropTypes.string.isRequired,
  selectedDirentList: PropTypes.array.isRequired,
  onItemsMove: PropTypes.func.isRequired,
  onItemsCopy: PropTypes.func.isRequired,
  onItemsDelete: PropTypes.func.isRequired,
  // dir
  direntList: PropTypes.array.isRequired,
  repoName: PropTypes.string.isRequired,
  repoEncrypted: PropTypes.bool.isRequired,
  isAdmin: PropTypes.bool.isRequired,
  isGroupOwnedRepo: PropTypes.bool.isRequired,
  userPerm: PropTypes.string.isRequired,
  showShareBtn: PropTypes.bool.isRequired,
  enableDirPrivateShare: PropTypes.bool.isRequired,
  onAddFile: PropTypes.func.isRequired,
  onAddFolder: PropTypes.func.isRequired,
  onUploadFile: PropTypes.func.isRequired,
  onUploadFolder: PropTypes.func.isRequired,
  // view-mode
  currentMode: PropTypes.string.isRequired,
  switchViewMode: PropTypes.func.isRequired,
  // search
  onSearchedClick: PropTypes.func.isRequired,
};

class LibContentToolbar extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      isDraftMessageShow: false,
    };
  }

  onEditClick = (e) => {
    e.preventDefault();
    let { path, repoID } = this.props;
    let url = siteRoot + 'lib/' + repoID + '/file' + Utils.encodePath(path) + '?mode=edit';
    window.open(url);
  }

  onNewDraft = (e) => {
    e.preventDefault();
    let { path, repoID } = this.props;
    seafileAPI.createDraft(repoID, path).then(res => {
      window.location.href = siteRoot + 'lib/' + res.data.origin_repo_id + '/file' + res.data.draft_file_path + '?mode=edit';
    });
  }

  onDraftHover = () => {
    this.setState({isDraftMessageShow: !this.state.isDraftMessageShow});
  }

  render() {
    if (this.props.isViewFile) {
      return (
        <Fragment>
          <div className="cur-view-toolbar">
            <span className="sf2-icon-menu hidden-md-up d-md-none side-nav-toggle" title={gettext('Side Nav Menu')} onClick={this.props.onSideNavMenuClick}></span>
            <div className="dir-operation">
              {(this.props.filePermission && !this.props.hasDraft) && (
                <Fragment>
                  <button className="btn btn-secondary operation-item" title={gettext('Edit File')} onClick={this.onEditClick}>{gettext('Edit')}</button>
                </Fragment>
              )}
              {/* default have read priv */}
              {(!this.props.isDraft && !this.props.hasDraft) && (
                <Fragment>
                  <button id="new-draft" className="btn btn-secondary operation-item" onClick={this.onNewDraft}>{gettext('New Draft')}</button>
                  <Tooltip target="new-draft" placement="bottom" isOpen={this.state.isDraftMessageShow} toggle={this.onDraftHover}>{gettext('Create a draft from this file, instead of editing it directly.')}</Tooltip>
                </Fragment>
              )}
            </div>
            <ViewModeToolbar currentMode={this.props.currentMode} switchViewMode={this.props.switchViewMode}/>
          </div>
          <CommonToolbar repoID={this.props.repoID} onSearchedClick={this.props.onSearchedClick} searchPlaceholder={gettext('Search files in this library')}/>
        </Fragment>
      );
    }

    return (
      <Fragment>
        <div className="cur-view-toolbar">
          <span className="sf2-icon-menu hidden-md-up d-md-none side-nav-toggle" title={gettext('Side Nav Menu')} onClick={this.props.onSideNavMenuClick}></span>
          <div className="dir-operation">
            {this.props.isDirentSelected ?
              <MutipleDirOperationToolbar
                repoID={this.props.repoID} 
                path={this.props.path}
                selectedDirentList={this.props.selectedDirentList}
                onItemsMove={this.props.onItemsMove}
                onItemsCopy={this.props.onItemsCopy}
                onItemsDelete={this.props.onItemsDelete}
              /> :
              <DirOperationToolBar 
                path={this.props.path}
                repoID={this.props.repoID}
                repoName={this.props.repoName}
                repoEncrypted={this.props.repoEncrypted}
                direntList={this.props.direntList}
                showShareBtn={this.props.showShareBtn}
                enableDirPrivateShare={this.props.enableDirPrivateShare}
                userPerm={this.props.userPerm}
                isAdmin={this.props.isAdmin}
                isGroupOwnedRepo={this.props.isGroupOwnedRepo}
                onAddFile={this.props.onAddFile}
                onAddFolder={this.props.onAddFolder}
                onUploadFile={this.props.onUploadFile}
                onUploadFolder={this.props.onUploadFolder}
              />
            }
          </div>
          <ViewModeToolbar currentMode={this.props.currentMode} switchViewMode={this.props.switchViewMode}/>
        </div>
        <CommonToolbar repoID={this.props.repoID} onSearchedClick={this.props.onSearchedClick} searchPlaceholder={gettext('Search files in this library')}/>
      </Fragment>
    );
  }
}

LibContentToolbar.propTypes = propTypes;

export default LibContentToolbar;
