import React from 'react';
import PropTypes from 'prop-types';
import CustomPermissionEditor from './custom-permission-editor';

const propTypes = {
  permission: PropTypes.object.isRequired,
  onChangeMode: PropTypes.func.isRequired,
  editCustomPermission: PropTypes.func.isRequired
};

class EditCustomPermission extends React.Component {

  onUpdateCustomPermission = (permission_name, permission_desc, permission) => {
    const { permission: editPermission } = this.props;
    const newPermission = Object.assign({}, editPermission, {
      name: permission_name,
      description: permission_desc,
      permission: permission
    });
    this.props.editCustomPermission(newPermission);
  }

  render() {
    return (
      <CustomPermissionEditor 
        mode={'edit'}
        permission={this.props.permission}
        onChangeMode={this.props.onChangeMode}
        onUpdateCustomPermission={this.onUpdateCustomPermission}
      />
    );
  }
}

EditCustomPermission.propTypes = propTypes;

export default EditCustomPermission;
