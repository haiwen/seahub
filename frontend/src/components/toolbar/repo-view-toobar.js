import React, { Fragment } from 'react';
import PropTypes from 'prop-types';
import { gettext } from '../../utils/constants';

const propTypes = {
  isOwnLibrary: PropTypes.bool.isRequired,
  libraryType: PropTypes.string.isRequired,
};

class RepoViewToolbar extends React.Component {

  render() {
    return (
      <div className="cur-view-toolbar border-left-show">
        <span className="sf2-icon-menu side-nav-toggle hidden-md-up d-md-none" title="Side Nav Menu" onClick={this.props.onShowSidePanel}></span>
        <div className="operation">
          <button className="btn btn-secondary operation-item" title={gettext('New Library')} onClick={this.onCreateClick}>{gettext('New Library')}</button>
          <button className="btn btn-secondary operation-item" title={gettext('More')} onClick={this.onShareClick}>{gettext('More')}</button>
        </div>
      </div>
    );
  }
}

RepoViewToolbar.propTypes = propTypes;

export default RepoViewToolbar;
