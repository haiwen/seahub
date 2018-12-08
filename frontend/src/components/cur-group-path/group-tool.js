import React from 'react';
import PropTypes from 'prop-types';
import { gettext, username } from '../../utils/constants';

const propTypes = {
  currentGroup: PropTypes.object.isRequired,
};

class GroupTool extends React.Component {

  render() {
    let currentGroup = this.props.currentGroup;
    let isShowSettingIcon = !(currentGroup.parent_group_id !== 0 && currentGroup.admins.indexOf(username) === -1);
    return (
      <div className="path-tool">
        {isShowSettingIcon && (
          <a href="#" className="sf2-icon-cog1 op-icon group-top-op-icon" title={gettext("Settings")} id="group-settings-icon" aria-label={gettext("Settings")}></a>
        )}
        <a href="#" className="sf2-icon-user2 op-icon group-top-op-icon" title={gettext("Members")} id="group-members-icon" aria-label={gettext("Members")}></a>
      </div>
    );
  }
}

GroupTool.propTypes = propTypes;

export default GroupTool;
