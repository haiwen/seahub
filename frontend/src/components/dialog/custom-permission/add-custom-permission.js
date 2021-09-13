import React from 'react';
import PropTypes from 'prop-types';
import CustomPermissionEditor from './custom-permission-editor';

const propTypes = {
  onChangeMode: PropTypes.func.isRequired,
  addCustomPermission: PropTypes.func.isRequired,
};

class AddCustomPermission extends React.Component {

  onUpdateCustomPermission = (permission_name, permission_desc, permission) => {
    this.props.addCustomPermission(permission_name, permission_desc, permission)
  }

  render() {
    return (
      <CustomPermissionEditor 
        mode={'add'}
        onChangeMode={this.props.onChangeMode}
        onUpdateCustomPermission={this.onUpdateCustomPermission}
      />
    );
  }
  
}

AddCustomPermission.propTypes = propTypes;

export default AddCustomPermission;
