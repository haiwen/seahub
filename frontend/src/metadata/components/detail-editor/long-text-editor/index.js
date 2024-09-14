import React, { useCallback, useState } from 'react';
import PropTypes from 'prop-types';
import { LongTextFormatter } from '@seafile/sf-metadata-ui-component';
import Editor from '../../cell-editors/long-text-editor';
import { gettext } from '../../../../utils/constants';

import './index.css';

const LongTextEditor = ({ field, value: oldValue, onChange }) => {
  const [value, setValue] = useState(oldValue);
  const [showEditor, setShowEditor] = useState(false);

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

  const isEmpty = !value || !value.trim();

  return (
    <>
      <div
        className="sf-metadata-property-detail-editor sf-metadata-long-text-property-detail-editor"
        placeholder={gettext('Empty')}
        onClick={openEditor}
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
