import React from 'react';
import PropTypes from 'prop-types';
import { gettext } from '../../utils/constants';
import SelectEditor from './select-editor';

const propTypes = {
  isTextMode: PropTypes.bool.isRequired,
  isEditIconShow: PropTypes.bool.isRequired,
  permissions: PropTypes.array.isRequired,
  currentPermission: PropTypes.string.isRequired,
  onPermissionChanged: PropTypes.func.isRequired
};

class WikiPermissionEditor extends React.Component {

  translatePermission = (permission) => {
    if (permission === 'private') {
      return gettext('Private');
    }

    if (permission === 'public') {
      return gettext('Public');
    }
  }

  render() {
    return (
      <SelectEditor
        isTextMode={this.props.isTextMode}
        isEditIconShow={this.props.isEditIconShow}
        options={this.props.permissions}
        currentOption={this.props.currentPermission}
        onOptionChanged={this.props.onPermissionChanged}
        translateOption={this.translatePermission}
      />
    );
  }

}

WikiPermissionEditor.propTypes = propTypes;

export default WikiPermissionEditor;
