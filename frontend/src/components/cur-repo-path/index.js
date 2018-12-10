import React, { Fragment } from 'react';
import PropTypes from 'prop-types';
import RepoPath from './repo-path';
import RepoTool from './repo-tool';

const propTypes = {
  libraryType: PropTypes.string.isRequired,
  currentGroup: PropTypes.object,
};

class CurGroupPath extends React.Component {

  render() {
    let { libraryType, currentGroup } = this.props;
    return (
      <Fragment>
        <RepoPath libraryType={libraryType} currentGroup={currentGroup}/>
        <RepoTool libraryType={libraryType} currentGroup={currentGroup}/>
      </Fragment>
    );
  }
}

CurGroupPath.propTypes = propTypes;

export default CurGroupPath;
