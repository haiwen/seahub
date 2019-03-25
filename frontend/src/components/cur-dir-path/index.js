import React, { Fragment } from 'react';
import PropTypes from 'prop-types';
import DirPath from './dir-path';
import DirTool from './dir-tool';

const propTypes = {
  repoID: PropTypes.string.isRequired,
  repoName: PropTypes.string.isRequired,
  permission: PropTypes.bool.isRequired,
  currentPath: PropTypes.string.isRequired,
  onPathClick: PropTypes.func.isRequired,
  onTabNavClick: PropTypes.func,
  pathPrefix: PropTypes.array,
  isViewFile: PropTypes.bool,
  updateUsedRepoTags: PropTypes.func.isRequired,
  fileTags: PropTypes.array.isRequired,
  onDeleteRepoTag: PropTypes.func.isRequired,
};

class CurDirPath extends React.Component {

  render() {
    return (
      <Fragment>
        <DirPath 
          repoName={this.props.repoName}
          pathPrefix={this.props.pathPrefix}
          currentPath={this.props.currentPath}
          onPathClick={this.props.onPathClick}
          onTabNavClick={this.props.onTabNavClick}
          repoID={this.props.repoID}
          isViewFile={this.props.isViewFile}
          fileTags={this.props.fileTags}
        />
        <DirTool 
          repoID={this.props.repoID}
          repoName={this.props.repoName} 
          permission={this.props.permission}
          currentPath={this.props.currentPath} 
          updateUsedRepoTags={this.props.updateUsedRepoTags}
          onDeleteRepoTag={this.props.onDeleteRepoTag}
        />
      </Fragment>
    );
  }
}

CurDirPath.propTypes = propTypes;

export default CurDirPath;
