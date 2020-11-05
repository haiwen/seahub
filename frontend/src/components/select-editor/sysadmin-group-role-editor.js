import React from 'react';
import PropTypes from 'prop-types';
import { gettext } from '../../utils/constants';
import SelectEditor from './select-editor';

const propTypes = {
  isTextMode: PropTypes.bool.isRequired,
  isEditIconShow: PropTypes.bool.isRequired,
  roleOptions: PropTypes.array.isRequired,
  currentRole: PropTypes.string.isRequired,
  onRoleChanged: PropTypes.func.isRequired
};

class SysAdminGroupRoleEditor extends React.Component {

  translateRoles = (role) => {
    switch (role) {
      case 'Member':
        return gettext('Member');
      case 'Admin':
        return gettext('Admin');
      default:
        return role;
    }
  }

  render() {
    return (
      <SelectEditor
        isTextMode={this.props.isTextMode}
        isEditIconShow={this.props.isEditIconShow}
        options={this.props.roleOptions}
        currentOption={this.props.currentRole}
        onOptionChanged={this.props.onRoleChanged}
        translateOption={this.translateRoles}
      />
    );
  }
}

SysAdminGroupRoleEditor.propTypes = propTypes;

export default SysAdminGroupRoleEditor;