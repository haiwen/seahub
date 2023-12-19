import React from 'react';
import PropTypes from 'prop-types';
import { v4 as uuidv4 } from 'uuid';
import { gettext, siteRoot } from '../../utils/constants';
import { Utils } from '../../utils/utils';
import SeahubPopover from '../common/seahub-popover';
import ListTagPopover from '../popover/list-tag-popover';

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
      isListRepoTagShow: false,
    };
    this.tagsIconID = `tags-icon-${uuidv4()}`;
  }

  onMouseDown = (e) => {
    e.stopPropagation();
  };

  toggleRepoTag = (e) => {
    e.stopPropagation();
    this.setState({ isListRepoTagShow: !this.state.isListRepoTagShow });
  };

  hidePopover = (e) => {
    if (e) {
      let dom = e.target;
      while (dom) {
        if (typeof dom.className === 'string' && dom.className.includes('tag-color-popover')) return;
        dom = dom.parentNode;
      }
    }
    this.setState({ isListRepoTagShow: false });
  };

  toggleCancel = () => {
    this.setState({ isListRepoTagShow: false });
  };

  isMarkdownFile(filePath) {
    return Utils.getFileName(filePath).includes('.md');
  }

  render() {
    let { repoID, userPerm, currentPath } = this.props;
    if (userPerm !== 'rw') {
      return '';
    }
    if (this.isMarkdownFile(currentPath)) {
      return '';
    }
    let toolbarDom = null;
    if (Utils.getFileName(currentPath)) { // name not '' is not root path
      let trashUrl = siteRoot + 'repo/' + repoID + '/trash/?path=' + encodeURIComponent(currentPath);
      toolbarDom = (
        <ul className="path-toolbar">
          <li className="toolbar-item">
            <a
              className="op-link sf2-icon-tag"
              href="#"
              id={this.tagsIconID}
              role="button"
              onClick={this.toggleRepoTag}
              onMouseDown={this.onMouseDown}
              title={gettext('Tags')}
              aria-label={gettext('Tags')}
            ></a>
          </li>
          <li className="toolbar-item">
            <a className="op-link sf2-icon-recycle" href={trashUrl} title={gettext('Trash')} aria-label={gettext('Trash')}></a>
          </li>
        </ul>
      );
    } else { // currentPath === '/' is root path
      let trashUrl = siteRoot + 'repo/' + repoID + '/trash/';
      let historyUrl = siteRoot + 'repo/history/' + repoID + '/';
      toolbarDom = (
        <ul className="path-toolbar">
          <li className="toolbar-item">
            <a
              className="op-link sf2-icon-tag"
              href="#"
              id={this.tagsIconID}
              role="button"
              onClick={this.toggleRepoTag}
              onMouseDown={this.onMouseDown}
              title={gettext('Tags')}
              aria-label={gettext('Tags')}
            ></a>
          </li>
          <li className="toolbar-item">
            <a className="op-link sf2-icon-recycle" href={trashUrl} title={gettext('Trash')} aria-label={gettext('Trash')}></a>
          </li>
          <li className="toolbar-item">
            <a className="op-link sf2-icon-history" href={historyUrl} title={gettext('History')} aria-label={gettext('History')}></a>
          </li>
        </ul>
      );
    }
    return (
      <>
        {toolbarDom}
        {this.state.isListRepoTagShow &&
          <SeahubPopover
            popoverClassName="list-tag-popover"
            target={this.tagsIconID}
            hideSeahubPopover={this.hidePopover}
            hideSeahubPopoverWithEsc={this.hidePopover}
            canHideSeahubPopover={true}
            boundariesElement={document.body}
            placement={'bottom-end'}
          >
            <ListTagPopover
              repoID={repoID}
              onListTagCancel={this.toggleCancel}
            />
          </SeahubPopover>
        }
      </>
    );
  }
}

DirTool.propTypes = propTypes;

export default DirTool;
