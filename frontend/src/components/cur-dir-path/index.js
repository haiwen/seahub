import React, { Fragment } from 'react';
import PropTypes from 'prop-types';
import { Utils } from '../../utils/utils';
import SortOptionsDialog from '../../components/dialog/sort-options';
import DirPath from './dir-path';
import DirTool from './dir-tool';

const propTypes = {
  repoID: PropTypes.string.isRequired,
  repoName: PropTypes.string.isRequired,
  userPerm: PropTypes.string,
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

  constructor(props) {
    super(props);
    this.state = {
      isSortOptionsDialogOpen: false
    };
  }

  toggleSortOptionsDialog = () => {
    this.setState({
      isSortOptionsDialogOpen: !this.state.isSortOptionsDialogOpen
    });
  }

  render() {
    const isDesktop = Utils.isDesktop();
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
        {isDesktop &&
        <DirTool
          repoID={this.props.repoID}
          repoName={this.props.repoName}
          userPerm={this.props.userPerm}
          currentPath={this.props.currentPath}
          updateUsedRepoTags={this.props.updateUsedRepoTags}
          onDeleteRepoTag={this.props.onDeleteRepoTag}
        />}
        {!isDesktop && this.props.direntList.length > 0 &&
        <span className="sf3-font sf3-font-sort action-icon" onClick={this.toggleSortOptionsDialog}></span>}
        {this.state.isSortOptionsDialogOpen &&
        <SortOptionsDialog
          toggleDialog={this.toggleSortOptionsDialog}
          sortBy={this.props.sortBy}
          sortOrder={this.props.sortOrder}
          sortItems={this.props.sortItems}
        />
        }
      </Fragment>
    );
  }
}

CurDirPath.propTypes = propTypes;

export default CurDirPath;
