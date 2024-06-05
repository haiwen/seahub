import React, { Fragment } from 'react';
import PropTypes from 'prop-types';
import { gettext } from '../../utils/constants';
import CommonToolbar from '../../components/toolbar/common-toolbar';

const propTypes = {
  onSideNavMenuClick: PropTypes.func.isRequired,
  repoID: PropTypes.string.isRequired,
  repoName: PropTypes.string.isRequired,
  onSearchedClick: PropTypes.func.isRequired,
  currentRepoInfo: PropTypes.object,
  path: PropTypes.string,
};

class LibContentToolbar extends React.Component {

  render() {
    return (
      <Fragment>
        <div className="cur-view-toolbar">
          <span className="sf2-icon-menu hidden-md-up d-md-none side-nav-toggle" title={gettext('Side Nav Menu')} onClick={this.props.onSideNavMenuClick}></span>
        </div>
        <CommonToolbar
          isLibView={true}
          path={this.props.path}
          repoID={this.props.repoID}
          repoName={this.props.repoName}
          currentRepoInfo={this.props.currentRepoInfo}
          onSearchedClick={this.props.onSearchedClick}
          searchPlaceholder={gettext('Search files')}
        />
      </Fragment>
    );
  }
}

LibContentToolbar.propTypes = propTypes;

export default LibContentToolbar;
