import React, { useCallback, useEffect, useRef, useState } from 'react';
import PropTypes from 'prop-types';
import LongTextFormatter from '../../cell-formatter/long-text';
import Editor from '../../cell-editors/long-text-editor';
import { gettext } from '../../../../utils/constants';
import { Utils } from '../../../../utils/utils';

import './index.css';

const LongTextEditor = ({ field, value: oldValue, onChange }) => {
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

  const isEmpty = !value || !value.trim();

  return (
    <>
      <div
        className="sf-metadata-property-detail-editor sf-metadata-long-text-property-detail-editor"
        placeholder={gettext('Empty')}
        onClick={openEditor}
        tabIndex={0}
        role="button"
        aria-label={gettext('Edit')}
        onKeyDown={Utils.onKeyDown}
      >
        {!isEmpty && (<LongTextFormatter value={value} className="sf-metadata-property-detail-formatter" />)}
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
