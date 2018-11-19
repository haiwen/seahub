import React, { Fragment } from 'react';
import { gettext, siteRoot } from '../../utils/constants';
import { Utils } from '../../utils/utils';
import PropTypes from 'prop-types';
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
      currentTag: null,
      isListRepoTagShow: false,
      isUpdateRepoTagShow: false,
      isCreateRepoTagShow: false,
      isListTaggedFileShow: false,
    };
  }

  onListRepoTagToggle = () => {
    this.setState({isListRepoTagShow: !this.state.isListRepoTagShow});
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
            <li className="toolbar-item"><a className="op-link sf2-icon-tag" onClick={this.onListRepoTagToggle} title={gettext('Tags')} aria-label={gettext('Tags')}></a></li>
            <li className="toolbar-item"><a className="op-link sf2-icon-trash" href={trashUrl} title={gettext('Trash')} aria-label={gettext('Trash')}></a></li>
            <li className="toolbar-item"><a className="op-link sf2-icon-history" href={historyUrl} title={gettext('History')} aria-label={gettext('History')}></a></li>
          </ul>
          {
            this.state.isListRepoTagShow &&
            <ListTagDialog
              repoID={repoID}
              onListTagCancel={this.onListRepoTagToggle}
              onCreateRepoTag={this.onCreateRepoTagToggle}
              onUpdateRepoTag={this.onUpdateRepoTagToggle}
              onListFileCancel={this.onListTaggedFileToggle}
            />
          }
          {
            this.state.isCreateRepoTagShow &&
            <CreateTagDialog
              repoID={repoID}
              toggleCancel={this.onCreateRepoTagToggle}
            />
          }
          {
            this.state.isUpdateRepoTagShow &&
            <UpdateTagDialog
              repoID={repoID}
              currentTag={this.state.currentTag}
              toggleCancel={this.onUpdateRepoTagToggle}
            />
          }
          {
            this.state.isListTaggedFileShow &&
            <ListTaggedFilesDialog
              repoTagId={this.state.currentTag.id}
              toggleCancel={this.onListTaggedFileToggle}
            />
          }
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
