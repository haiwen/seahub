import React from 'react';
import PropTypes from 'prop-types';
import { Utils } from '../../utils/utils';
import SelectEditor from './select-editor';

const propTypes = {
  isTextMode: PropTypes.bool.isRequired,
  isEditIconShow: PropTypes.bool.isRequired,
  permissions: PropTypes.array.isRequired,
  currentPermission: PropTypes.string.isRequired,
  onPermissionChangedHandler: PropTypes.func.isRequired
};

class PermissionEditor extends React.Component {

  translatePermission = (permission) => {
    return Utils.sharePerms(permission);
  }

  render() {
    return (
      <SelectEditor 
        isTextMode={this.props.isTextMode}
        isEditIconShow={this.props.isEditIconShow}
        options={this.props.permissions}
        currentOption={this.props.currentPermission}
        onOptionChangedHandler={this.props.onPermissionChangedHandler}
        translateOption={this.translatePermission}
      />
    );
  }
}

PermissionEditor.propTypes = propTypes;

export default PermissionEditor;
