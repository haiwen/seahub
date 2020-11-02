import React from 'react';
import PropTypes from 'prop-types';
import { gettext } from '../../utils/constants';
import SelectEditor from './select-editor';

const propTypes = {
  isTextMode: PropTypes.bool.isRequired,
  isEditIconShow: PropTypes.bool.isRequired,
  roles: PropTypes.array.isRequired,
  currentRole: PropTypes.string.isRequired,
  onRoleChanged: PropTypes.func.isRequired,
  toggleItemFreezed: PropTypes.func,
};

class RoleEditor extends React.Component {

  translateRole = (role) => {
    if (role === 'Admin') {
      return gettext('Admin');
    }

    if (role === 'Member') {
      return gettext('Member');
    }
  }

  render() {
    return (
      <SelectEditor
        isTextMode={this.props.isTextMode}
        isEditIconShow={this.props.isEditIconShow}
        options={this.props.roles}
        currentOption={this.props.currentRole}
        onOptionChanged={this.props.onRoleChanged}
        translateOption={this.translateRole}
        toggleItemFreezed={this.props.toggleItemFreezed}
      />
    );
  }
}

RoleEditor.propTypes = propTypes;

export default RoleEditor;
