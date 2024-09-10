import React from 'react';
import PropTypes from 'prop-types';
import { LongTextEditorDialog, getPreviewContent } from '@seafile/seafile-editor';
import LongtextAPI from './api';
import { getValidLongTextValue, isLongTextValueExceedLimit, LONG_TEXT_EXCEED_LIMIT_MESSAGE,
  LONG_TEXT_EXCEED_LIMIT_SUGGEST,
} from '../../../_basic';
import toaster from '../../../../../components/toast';
import { lang, serviceURL } from '../../../../../utils/constants';

import './index.css';

class LongTextEditor extends React.PureComponent {

  constructor(props) {
    super(props);
    this.isLongTextValueChanged = false;
    this.repoID = window.sfMetadataContext.getSetting('repoID');
    this.filePath = '/';
    const repoInfo = window.sfMetadataContext.getSetting('repoInfo');
    const { repo_name } = repoInfo;
    this.api = new LongtextAPI({ repoID: this.repoID, repoName: repo_name, server: serviceURL });
    this.value = this.initEditorValue();
  }

  initEditorValue = () => {
    const value = this.props.value;
    if (value) {
      if (typeof value === 'object') return value;
      if (typeof value === 'string') {
        if (value.length === 1) {
          this.isLongTextValueChanged = true;
        }
        const { previewText, images, links, checklist } = getPreviewContent(value);
        return Object.assign({}, { text: value, preview: previewText, images, links, checklist });
      }
      // When typing fast in a long text, first keystroke should be saved
      if (typeof value === 'string' && value.length === 1) {
        this.isLongTextValueChanged = true;
        return { text: value, preview: value, links: [], images: [] };
      }
    }

    return { text: '', preview: '', links: [], images: [], checklist: { completed: 0, count: 0 } };
  };

  getOldValue = () => {
    const value = this.props.value;
    if (value) {
      if (typeof value === 'object') return value.text;
      if (typeof value === 'string') return value;
      return '';
    }
    return '';
  };

  getValue = () => {
    const updated = {};
    updated[this.props.column.key] = this.value.text;
    return updated;
  };

  onEditorValueChanged = (value) => {
    this.value = value;
    this.isLongTextValueChanged = true;
  };

  onSaveEditorValue = (value) => {
    if (isLongTextValueExceedLimit(value)) {
      toaster.closeAll();
      toaster.danger(LONG_TEXT_EXCEED_LIMIT_MESSAGE, { duration: null });
      return;
    }
    this.props.onCommit(value?.text);
    this.isLongTextValueChanged = false;
  };

  onCloseEditorDialog = () => {
    const { readOnly } = this.props;
    if (!readOnly && this.isLongTextValueChanged) {
      if (isLongTextValueExceedLimit(this.value)) {
        toaster.closeAll();
        toaster.warning(LONG_TEXT_EXCEED_LIMIT_SUGGEST, { duration: null });
        this.value = getValidLongTextValue(this.value);
      }

      this.props.onCommit(this.value?.text);
      this.isLongTextValueChanged = false;
    }

    this.props.onCommitCancel();
  };

  render() {
    const { column, readOnly } = this.props;
    const headerName = column.name;

    return (
      <LongTextEditorDialog
        className="sf-metadata-long-text-editor-dialog"
        lang={lang}
        readOnly={readOnly}
        headerName={headerName}
        value={this.value.text}
        autoSave={true}
        saveDelay={20 * 1000}
        isCheckBrowser={true}
        editorApi={this.api}
        // mathJaxSource={mediaUrl + 'js/mathjax/tex-svg.js'}
        onSaveEditorValue={this.onSaveEditorValue}
        onEditorValueChanged={this.onEditorValueChanged}
        onCloseEditorDialog={this.onCloseEditorDialog}
      />
    );
  }
}

LongTextEditor.propTypes = {
  readOnly: PropTypes.bool,
  column: PropTypes.object,
  onCommit: PropTypes.func,
  onCommitCancel: PropTypes.func,
};

export default LongTextEditor;
