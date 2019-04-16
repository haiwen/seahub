import React from 'react';
import PropTypes from 'prop-types';
import { gettext } from '../../utils/constants';
import SelectEditor from './select-editor';

const propTypes = {
  isTextMode: PropTypes.bool.isRequired,
  isEditIconShow: PropTypes.bool.isRequired,
  permissionOptions: PropTypes.array.isRequired,
  currentPermission: PropTypes.string.isRequired,
  onPermissionChanged: PropTypes.func.isRequired
};

class ShareLinksPermissionEditor extends React.Component {

  translatePermission = (permission) => {
    if (permission === 'Preview only') {
      return gettext('Preview only');
    }
      
    if (permission === 'Preview and download') {
      return gettext('Preview and download');
    }
  }

  render() {
    return (
      <SelectEditor 
        isTextMode={this.props.isTextMode}
        isEditIconShow={this.props.isEditIconShow}
        options={this.props.permissionOptions}
        currentOption={this.props.currentPermission}
        onOptionChanged={this.props.onPermissionChanged}
        translateOption={this.translatePermission}
      />
    );
  }
}

ShareLinksPermissionEditor.propTypes = propTypes;

export default ShareLinksPermissionEditor;
