import React from 'react';
import PropTypes from 'prop-types';
import SelectEditor from './select-editor';
import { gettext, isEmailConfigured } from '../../utils/constants';

const propTypes = {
  isTextMode: PropTypes.bool.isRequired,
  isEditIconShow: PropTypes.bool.isRequired,
  currentScope: PropTypes.string.isRequired,
  onScopeChanged: PropTypes.func.isRequired
};

class ShareLinkScopeEditor extends React.Component {

  translateScope = (scope) => {
    if (scope === 'all_users') {
      return gettext('Anyone with the link');
    }

    if (scope === 'specific_users') {
      return gettext('Specific users in the team');
    }

    if (scope === 'specific_emails') {
      return gettext('Specific people with email address');
    }
  };


  render() {
    let scopeOptions = ['all_users', 'specific_users'];
    if (isEmailConfigured) {
      scopeOptions.push('specific_emails');
    }
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