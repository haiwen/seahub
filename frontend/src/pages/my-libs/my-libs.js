import React from 'react';
import PropTypes from 'prop-types';
import { Router } from '@reach/router';
import DirView from '../../components/dir-view/dir-view';
import RepoView from '../../components/repo-view/repo-view';

const propTypes = {
  onShowSidePanel: PropTypes.func.isRequired,
};

class MyLibraries extends React.Component {


  render() {
    return (
      <div className="main-panel">
        <Router>
          <RepoView path={'/'} />
          <DirView 
            path={'/:repoID/*'} 
            onMenuClick={this.props.onShowSidePanel}
            updateCurrentTab={this.props.updateCurrentTab}
          />
        </Router>
      </div>
    );
  }
}

MyLibraries.propTypes = propTypes;

export default MyLibraries;
