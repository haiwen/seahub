import React from 'react';
import PropTypes from 'prop-types';
import {gettext, siteRoot} from '../../utils/constants';

const propTypes = {
  currentGroup: PropTypes.object.isRequired
};

class GroupPath extends React.Component {

  render() {
    let currentGroup = this.props.currentGroup;
    return (
      <div className="path-container">
        <a href={`${siteRoot}groups/`}>{gettext("Groups")}</a>
        <span className="path-split">/</span>
        <span>{currentGroup.name}</span>
        {currentGroup.parent_group_id !== 0 && (
          <span className="address-book-group-icon icon-building" title={gettext("This is a special group representing a department.")}></span>
        )}
      </div>
    );
  }
}

GroupPath.propTypes = propTypes;

export default GroupPath;
