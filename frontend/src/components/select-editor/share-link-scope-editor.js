import React from 'react';
import PropTypes from 'prop-types';
import { Utils } from '../../utils/utils';
import SelectEditor from './select-editor';

const propTypes = {
  isTextMode: PropTypes.bool.isRequired,
  isEditIconShow: PropTypes.bool.isRequired,
  currentScope: PropTypes.string.isRequired,
  onScopeChanged: PropTypes.func.isRequired
};

class ShareLinkScopeEditor extends React.Component {

  translateScope = (scope) => {
    if (scope === 'all_users') {
        return '全网盘用户';
    }

    if (scope === 'specific_users') {
        return '指定用户';
    }
  }


  render() {
    const scopeOptions = ['all_users', 'specific_users'];
    return (
      <SelectEditor
        isTextMode={this.props.isTextMode}
        isEditIconShow={this.props.isEditIconShow}
        options={scopeOptions}
        currentOption={this.props.currentScope}
        onOptionChanged={this.props.onScopeChanged}
        translateOption={this.translateScope}
      />
    );
  }
}

ShareLinkScopeEditor.propTypes = propTypes;

export default ShareLinkScopeEditor;
