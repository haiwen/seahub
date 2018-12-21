import React, { Fragment } from 'react';
import { gettext, siteRoot } from '../../utils/constants';
import { Utils } from '../../utils/utils';
import PropTypes from 'prop-types';
import ModalPortal from '../modal-portal';
import { Modal } from 'reactstrap';
import ListTagDialog from '../dialog/list-tag-dialog';
import CreateTagDialog from '../dialog/create-tag-dialog';
import UpdateTagDialog from '../dialog/update-tag-dialog';
import ListTaggedFilesDialog from '../dialog/list-taggedfiles-dialog';

const propTypes = {
  repoID: PropTypes.string.isRequired,
  repoName: PropTypes.string.isRequired,
  permission: PropTypes.bool.isRequired,
  currentPath: PropTypes.string.isRequired,
};

class DirTool extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      isRepoTagDialogShow: false,
      currentTag: null,
      isListRepoTagShow: false,
      isUpdateRepoTagShow: false,
      isCreateRepoTagShow: false,
      isListTaggedFileShow: false,
    };
  }

  onShowListRepoTag = () => {
    this.setState({
      isRepoTagDialogShow: true,
      isListRepoTagShow: true,
      isUpdateRepoTagShow: false,
      isCreateRepoTagShow: false,
      isListTaggedFileShow: false
    });
  }

  onCloseRepoTagDialog = () => {
    this.setState({
      isRepoTagDialogShow: false,
      isListRepoTagShow: false,
      isUpdateRepoTagShow: false,
      isCreateRepoTagShow: false,
      isListTaggedFileShow: false
    });
  }

  onCreateRepoTagToggle = () => {
    this.setState({
      isCreateRepoTagShow: !this.state.isCreateRepoTagShow,
      isListRepoTagShow: !this.state.isListRepoTagShow,
    });
  }

  onUpdateRepoTagToggle = (currentTag) => {
    this.setState({
      currentTag: currentTag,
      isListRepoTagShow: !this.state.isListRepoTagShow,
      isUpdateRepoTagShow: !this.state.isUpdateRepoTagShow,
    });
  }

  onListTaggedFileToggle = (currentTag) => {
    this.setState({
      currentTag: currentTag,
      isListRepoTagShow: !this.state.isListRepoTagShow,
      isListTaggedFileShow: !this.state.isListTaggedFileShow,
    });
  }

  isMarkdownFile(filePath) {
    let name = Utils.getFileName(filePath);
    return name.indexOf('.md') > -1 ? true : false;
  }

  render() {
    let { repoID, repoName, permission, currentPath } = this.props;
    let isFile = this.isMarkdownFile(currentPath);
    let name = Utils.getFileName(currentPath);
    let trashUrl = siteRoot + 'repo/recycle/' + repoID + '/?referer=' + encodeURIComponent(location.href);
    let historyUrl = siteRoot + 'repo/history/' + repoID + '/?referer=' + encodeURIComponent(location.href);
    if ( (name === repoName  || name === '') && !isFile && permission) {
      return (
        <Fragment>
          <ul className="path-toolbar">
            <li className="toolbar-item"><a className="op-link sf2-icon-tag" onClick={this.onShowListRepoTag} title={gettext('Tags')} aria-label={gettext('Tags')}></a></li>
            <li className="toolbar-item"><a className="op-link sf2-icon-trash" href={trashUrl} title={gettext('Trash')} aria-label={gettext('Trash')}></a></li>
            <li className="toolbar-item"><a className="op-link sf2-icon-history" href={historyUrl} title={gettext('History')} aria-label={gettext('History')}></a></li>
          </ul>

          {this.state.isRepoTagDialogShow && (
            <ModalPortal>
              <Modal isOpen={true}>
                {this.state.isListRepoTagShow && (
                  <ListTagDialog
                    repoID={repoID}
                    onListTagCancel={this.onCloseRepoTagDialog}
                    onCreateRepoTag={this.onCreateRepoTagToggle}
                    onUpdateRepoTag={this.onUpdateRepoTagToggle}
                    onListTaggedFiles={this.onListTaggedFileToggle}
                  />
                )}

                {this.state.isCreateRepoTagShow && (
                  <CreateTagDialog
                    repoID={repoID}
                    onClose={this.onCloseRepoTagDialog}
                    toggleCancel={this.onCreateRepoTagToggle}
                  />
                )}

                {this.state.isUpdateRepoTagShow && (
                  <UpdateTagDialog
                    repoID={repoID}
                    currentTag={this.state.currentTag}
                    onClose={this.onCloseRepoTagDialog}
                    toggleCancel={this.onUpdateRepoTagToggle}
                  />
                )}

                {this.state.isListTaggedFileShow && (
                  <ListTaggedFilesDialog
                    repoID={this.props.repoID}
                    currentTag={this.state.currentTag}
                    onClose={this.onCloseRepoTagDialog}
                    toggleCancel={this.onListTaggedFileToggle}
                  />
                )}
              </Modal>
            </ModalPortal>
          )}
        </Fragment>
      );
    } else if (!isFile && permission) {
      return (
        <ul className="path-toolbar">
          <li className="toolbar-item"><a className="op-link sf2-icon-trash" href={trashUrl} title={gettext('Trash')} aria-label={gettext('Trash')}></a></li>
        </ul>
      );
    } else if (permission) {
      historyUrl = siteRoot + 'repo/file_revisions/' + repoID + '/?p=' + Utils.encodePath(currentPath) + '&referer=' + encodeURIComponent(location.href);
      return (
        <ul className="path-toolbar">
          <li className="toolbar-item"><a className="op-link sf2-icon-history" href={historyUrl} title={gettext('History')} aria-label={gettext('History')}></a></li>
        </ul>
      );
    }
    return '';
  }
}

DirTool.propTypes = propTypes;

export default DirTool;
