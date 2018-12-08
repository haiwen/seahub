import React, { Fragment } from 'react';
import PropTypes from 'prop-types';
import RepoPath from './repo-path';
import RepoTool from './repo-tool';

const propTypes = {
  currentTab: PropTypes.string.isRequired,
  currentGroup: PropTypes.object,
};

class CurGroupPath extends React.Component {

  render() {
    let { currentTab, currentGroup } = this.props;
    return (
      <Fragment>
        <RepoPath currentTab={currentTab} currentGroup={currentGroup}/>
        <RepoTool currentTab={currentTab} currentGroup={currentGroup}/>
      </Fragment>
    );
  }
}

CurGroupPath.propTypes = propTypes;

export default CurGroupPath;
