import React from 'react';
import { gettext, repoID, slug, permission, siteRoot } from '../../utils/constants';
import { Utils } from '../../utils/utils';
import PropTypes from 'prop-types';

const propTypes = {
  filePath: PropTypes.string.isRequired
};

class PathToolbar extends React.Component {

  isMarkdownFile(filePath) {
    let lastIndex = filePath.lastIndexOf('/');
    let name = filePath.slice(lastIndex + 1);
    return name.indexOf('.md') > -1 ? true : false;
  }
  
  render() {
    let isFile = this.isMarkdownFile(this.props.filePath);
    let index = this.props.filePath.lastIndexOf('/');
    let name = this.props.filePath.slice(index + 1);
    let trashUrl = siteRoot + 'repo/recycle/' + repoID + '/?referer=' + encodeURIComponent(location.href);
    let historyUrl = siteRoot + 'repo/history/' + repoID + '/?referer=' + encodeURIComponent(location.href);
    if ( (name === slug  || name === '') && !isFile && permission) {
      return (
        <ul className="path-toolbar">
          <li className="toolbar-item"><a className="op-link sf2-icon-trash" href={trashUrl} title={gettext('Trash')} aria-label={gettext('Trash')}></a></li>
          <li className="toolbar-item"><a className="op-link sf2-icon-history" href={historyUrl} title={gettext('History')} aria-label={gettext('History')}></a></li>
        </ul>
      );
    } else if ( !isFile && permission) {
      return (
        <ul className="path-toolbar">
          <li className="toolbar-item"><a className="op-link sf2-icon-trash" href={trashUrl} title={gettext('Trash')} aria-label={gettext('Trash')}></a></li>
        </ul>
      );
    } else if (permission) {
      historyUrl = siteRoot + 'repo/file_revisions/' + repoID + '/?p=' + Utils.encodePath(this.props.filePath) + '&referer=' + encodeURIComponent(location.href);
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
