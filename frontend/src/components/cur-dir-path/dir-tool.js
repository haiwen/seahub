import React, { Fragment } from 'react';
import { gettext, siteRoot } from '../../utils/constants';
import { Utils } from '../../utils/utils';
import PropTypes from 'prop-types';
import ModalPortal from '../modal-portal';
import { Modal } from 'reactstrap';
import ListTagDialog from '../dialog/list-tag-dialog';
import CreateTagDialog from '../dialog/create-tag-dialog';
import ListTaggedFilesDialog from '../dialog/list-taggedfiles-dialog';

const propTypes = {
  repoID: PropTypes.string.isRequired,
  userPerm: PropTypes.string,
  currentPath: PropTypes.string.isRequired,
  updateUsedRepoTags: PropTypes.func.isRequired,
  onDeleteRepoTag: PropTypes.func.isRequired,
};

class DirTool extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      isRepoTagDialogShow: false,
      currentTag: null,
      isListRepoTagShow: false,
      isCreateRepoTagShow: false,
      isListTaggedFileShow: false,
    };
  }

  onShowListRepoTag = (e) => {
    e.preventDefault();
    this.setState({
      isRepoTagDialogShow: true,
      isListRepoTagShow: true,
      isCreateRepoTagShow: false,
      isListTaggedFileShow: false
    });
  }

  onCloseRepoTagDialog = () => {
    this.setState({
      isRepoTagDialogShow: false,
      isListRepoTagShow: false,
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
    let { repoID, userPerm, currentPath } = this.props;
    let isFile = this.isMarkdownFile(currentPath);
    let name = Utils.getFileName(currentPath);
    let trashUrl = siteRoot + 'repo/' + repoID + '/trash/';
    let historyUrl = siteRoot + 'repo/history/' + repoID + '/';
    if (userPerm === 'rw') {
      if (!isFile) {
        if (name) { // name not '' is not root path
          trashUrl = siteRoot + 'repo/' + repoID + '/trash/?path=' + encodeURIComponent(currentPath);
          return (
            <ul className="path-toolbar">
              <li className="toolbar-item"><a className="op-link sf2-icon-recycle" href={trashUrl} title={gettext('Trash')} aria-label={gettext('Trash')}></a></li>
            </ul>
          );
        } else { // currentPath === '/' is root path
          return (
            <Fragment>
              <ul className="path-toolbar">
                <li className="toolbar-item"><a className="op-link sf2-icon-tag" href="#" role="button" onClick={this.onShowListRepoTag} title={gettext('Tags')} aria-label={gettext('Tags')}></a></li>
                <li className="toolbar-item"><a className="op-link sf2-icon-recycle" href={trashUrl} title={gettext('Trash')} aria-label={gettext('Trash')}></a></li>
                <li className="toolbar-item"><a className="op-link sf2-icon-history" href={historyUrl} title={gettext('History')} aria-label={gettext('History')}></a></li>
              </ul>

              {this.state.isRepoTagDialogShow && (
                <ModalPortal>
                  <Modal isOpen={true} autoFocus={false}>
                    {this.state.isListRepoTagShow && (
                      <ListTagDialog
                        repoID={repoID}
                        onListTagCancel={this.onCloseRepoTagDialog}
                        onCreateRepoTag={this.onCreateRepoTagToggle}
                      />
                    )}
                    {this.state.isCreateRepoTagShow && (
                      <CreateTagDialog
                        repoID={repoID}
                        onClose={this.onCloseRepoTagDialog}
                        toggleCancel={this.onCreateRepoTagToggle}
                      />
                    )}
                    {this.state.isListTaggedFileShow && (
                      <ListTaggedFilesDialog
                        repoID={this.props.repoID}
                        currentTag={this.state.currentTag}
                        onClose={this.onCloseRepoTagDialog}
                        toggleCancel={this.onListTaggedFileToggle}
                        updateUsedRepoTags={this.props.updateUsedRepoTags}
                      />
                    )}
                  </Modal>
                </ModalPortal>
              )}
            </Fragment>
          );
        }
      }
    }
    return '';
  }
}

DirTool.propTypes = propTypes;

export default DirTool;
