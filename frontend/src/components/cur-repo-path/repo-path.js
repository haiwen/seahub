import React from 'react';
import PropTypes from 'prop-types';
import {gettext, siteRoot} from '../../utils/constants';

const propTypes = {
  currentGroup: PropTypes.object, // for group
  libraryType: PropTypes.string.isRequired, //for my-library, shared width me, shared whith all, groups 
};

class RepoPath extends React.Component {

  render() {
    let { libraryType, currentGroup } = this.props;
    if (libraryType === 'group' && currentGroup) {
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

    return (
      <div className="path-container">
        <span>{libraryType}</span>
      </div>
    ); 
  }
}

RepoPath.propTypes = propTypes;

export default RepoPath;
