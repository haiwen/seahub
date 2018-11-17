import React, { Fragment } from 'react';
import { gettext, repoID, slug, permission, siteRoot } from '../../utils/constants';
import { Utils } from '../../utils/utils';
import PropTypes from 'prop-types';
import ListTagDialog from '../dialog/list-tag-dialog';
import CreateTagDialog from '../dialog/create-tag-dialog';
import UpdateTagDialog from '../dialog/update-tag-dialog';

const propTypes = {
  path: PropTypes.string.isRequired
};

class PathToolbar extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      currentTag: null,
      isListRepoTagShow: false,
      isUpdateRepoTagShow: false,
      isCreateRepoTagShow: false,
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

  isMarkdownFile(filePath) {
    let name = Utils.getFileName(filePath);
    return name.indexOf('.md') > -1 ? true : false;
  }

  render() {
    let isFile = this.isMarkdownFile(this.props.path);
    let name = Utils.getFileName(this.props.path);
    let trashUrl = siteRoot + 'repo/recycle/' + repoID + '/?referer=' + encodeURIComponent(location.href);
    let historyUrl = siteRoot + 'repo/history/' + repoID + '/?referer=' + encodeURIComponent(location.href);
    if ( (name === slug  || name === '') && !isFile && permission) {
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
              onListTagCancel={this.onListRepoTagToggle}
              onCreateRepoTag={this.onCreateRepoTagToggle}
              onUpdateRepoTag={this.onUpdateRepoTagToggle}
            />
          }
          {
            this.state.isCreateRepoTagShow &&
            <CreateTagDialog
              toggleCancel={this.onCreateRepoTagToggle}
            />
          }
          {
            this.state.isUpdateRepoTagShow &&
            <UpdateTagDialog
              currentTag={this.state.currentTag}
              toggleCancel={this.onUpdateRepoTagToggle}
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
      historyUrl = siteRoot + 'repo/file_revisions/' + repoID + '/?p=' + Utils.encodePath(this.props.path) + '&referer=' + encodeURIComponent(location.href);
      return (
        <ul className="path-toolbar">
          <li className="toolbar-item"><a className="op-link sf2-icon-history" href={historyUrl} title={gettext('History')} aria-label={gettext('History')}></a></li>
        </ul>
      );
    }
    return '';
  }
}

PathToolbar.propTypes = propTypes;

export default PathToolbar;
