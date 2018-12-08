import React, { Fragment } from 'react';
import PropTypes from 'prop-types';
import GroupPath from './group-path';
import GroupTool from './group-tool';

const propTypes = {
  currentGroup: PropTypes.object.isRequired,
};

class CurGroupPath extends React.Component {

  render() {
    return (
      <Fragment>
        <GroupPath currentGroup={this.props.currentGroup}/>
        <GroupTool currentGroup={this.props.currentGroup}/>
      </Fragment>
    );
  }
}

CurGroupPath.propTypes = propTypes;

export default CurGroupPath;
