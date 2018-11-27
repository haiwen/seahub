import React, { Fragment } from 'react';
import PropTypes from 'prop-types';
import DirPath from './dir-path';
import DirTool from './dir-tool';

const propTypes = {
  repoName: PropTypes.string.isRequired,
  currentPath: PropTypes.string.isRequired,
  onPathClick: PropTypes.func.isRequired,
};

class CurDirPath extends React.Component {

  render() {
    return (
      <Fragment>
        <DirPath 
          repoName={this.props.repoName}
          currentPath={this.props.currentPath}
          onPathClick={this.props.onPathClick}
        />
        <DirTool currentPath={this.props.currentPath} />
      </Fragment>
    );
  }
}

CurDirPath.propTypes = propTypes;

export default CurDirPath;
