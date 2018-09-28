import React from 'react';
import { gettext, repoID, slug, permission, siteRoot } from '../constants';
import PropTypes from 'prop-types';

const propTypes = {
  filePath: PropTypes.string.isRequired
};

class PathToolbar extends React.Component {
  
  render() {
    let trashUrl = '';
    let historyUrl = '';
    let index = this.props.filePath.lastIndexOf('/');
    let name = this.props.filePath.slice(index + 1);
    if ( (name === slug  || name === '') && permission) {
      trashUrl = siteRoot + 'repo/recycle/' + repoID + '/?referer=' + encodeURIComponent(location.href);
      historyUrl = siteRoot + 'repo/history/' + repoID + '/?referer=' + encodeURIComponent(location.href);
      return (
        <ul className="path-toolbar">
          <li className="toolbar-item"><a className="op-link sf2-icon-trash" href={trashUrl} title={gettext('Trash')} aria-label={gettext('Trash')}></a></li>
          <li className="toolbar-item"><a className="op-link sf2-icon-history" href={historyUrl} title={gettext('History')} aria-label={gettext('History')}></a></li>
        </ul>
      );
    } else if (permission) {
      trashUrl = siteRoot + 'repo/recycle/' + repoID + '/?referer=' + encodeURIComponent(location.href);
      return (
        <ul className="path-toolbar">
          <li className="toolbar-item"><a className="op-link sf2-icon-trash" href={trashUrl} title={gettext('Trash')} aria-label={gettext('Trash')}></a></li>
        </ul>
      );
    }
    return '';
  }
}

PathToolbar.propTypes = propTypes;

export default PathToolbar;
