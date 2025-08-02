import React, { useCallback, useEffect, useRef, useState } from 'react';
import PropTypes from 'prop-types';
import LongTextFormatter from '../../cell-formatter/long-text';
import Editor from '../../cell-editors/long-text-editor';
import { gettext } from '../../../../utils/constants';

import './index.css';

const LongTextEditor = ({ field, value: oldValue, placeholder, textNeedSlice, onChange }) => {
  const [value, setValue] = useState(oldValue);
  const [showEditor, setShowEditor] = useState(false);

  const valueRef = useRef(null);

  const openEditor = useCallback(() => {
    setShowEditor(true);
  }, []);

  const onCommit = useCallback((newValue) => {
    onChange && onChange(newValue);
    setValue(newValue);
  }, [onChange]);

  const onCommitCancel = useCallback(() => {
    setShowEditor(false);
  }, []);

  useEffect(() => {
    if (showEditor) return;
    if (valueRef.current === oldValue) return;
    setValue(oldValue);
    valueRef.current = oldValue;
  }, [showEditor, oldValue]);

  const isEmpty = !value || value.replace(/[\u200B-\u200D\uFEFF]/g, '').trim().length === 0;

  return (
    <>
      <div
        className="sf-metadata-property-detail-editor sf-metadata-long-text-property-detail-editor"
        placeholder={placeholder ? placeholder : gettext('Empty')}
        onClick={openEditor}
      >
        {!isEmpty ? (<LongTextFormatter value={value} className="sf-metadata-property-detail-formatter" textNeedSlice={textNeedSlice} />) : null}
      </div>
      {showEditor && (
        <Editor
          value={value}
          column={field}
          onCommit={onCommit}
          onCommitCancel={onCommitCancel}
        />
      )}
    </>
  );
};

LongTextEditor.propTypes = {
  field: PropTypes.object.isRequired,
  value: PropTypes.string,
  onChange: PropTypes.func.isRequired,
};

export default LongTextEditor;
