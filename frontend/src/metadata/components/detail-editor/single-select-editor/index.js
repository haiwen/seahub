import React, { useMemo, useCallback, useState, useRef, useEffect } from 'react';
import PropTypes from 'prop-types';
import { Popover } from 'reactstrap';
import Editor from '../../cell-editors/single-select-editor';
import { gettext } from '../../../../utils/constants';
import { KeyCodes } from '../../../../constants';
import { getOption } from '../../../utils/cell';
import { getColumnOptions } from '../../../utils/column';
import { getEventClassName } from '../../../../utils/dom';

import './index.css';

const SingleSelectEditor = ({ field, value, record, fields, onChange, modifyColumnData }) => {
  const ref = useRef(null);
  const [showEditor, setShowEditor] = useState(false);
  const options = useMemo(() => getColumnOptions(field), [field]);

  const onClick = useCallback((event) => {
    if (!event.target) return;
    const className = getEventClassName(event);
    if (className.indexOf('sf-metadata-search-options') > -1) return;
    const dom = document.querySelector('.sf-metadata-single-select-editor');
    if (!dom) return;
    if (dom.contains(event.target)) return;
    if (ref.current && !ref.current.contains(event.target) && showEditor) {
      setShowEditor(false);
    }
  }, [showEditor]);

  const onHotKey = useCallback((event) => {
    if (event.keyCode === KeyCodes.Esc) {
      if (showEditor) {
        setShowEditor(false);
      }
    }
  }, [showEditor]);

  useEffect(() => {
    document.addEventListener('mousedown', onClick);
    document.addEventListener('keydown', onHotKey, true);
    return () => {
      document.removeEventListener('mousedown', onClick);
      document.removeEventListener('keydown', onHotKey, true);
    };
  }, [onClick, onHotKey]);

  const openEditor = useCallback(() => {
    setShowEditor(true);
  }, []);

  const onCommit = useCallback((newValue) => {
    onChange(newValue);
    setShowEditor(false);
  }, [onChange]);

  const option = value ? getOption(options, value) : null;

  const renderEditor = useCallback(() => {
    if (!showEditor) return null;
    const { width } = ref.current.getBoundingClientRect();
    return (
      <Popover
        target={ref}
        isOpen={true}
        placement="bottom-end"
        hideArrow={true}
        fade={false}
        className="sf-metadata-property-editor-popover sf-metadata-single-select-property-editor-popover"
        boundariesElement={document.body}
      >
        <Editor
          value={value}
          column={{ ...field, width: Math.max(width - 2, 200) }}
          columns={fields}
          modifyColumnData={modifyColumnData}
          record={record}
          height={2}
          onCommit={onCommit}
        />
      </Popover>
    );
  }, [showEditor, onCommit, record, value, modifyColumnData, fields, field]);

  return (
    <div
      className="sf-metadata-property-detail-editor sf-metadata-single-select-property-detail-editor"
      placeholder={gettext('Empty')}
      ref={ref}
      onClick={openEditor}
    >
      {option && (
        <div
          className="sf-metadata-single-select-property-value"
          style={{ backgroundColor: option.color, color: option.textColor || null }}
        >
          {option.name}
        </div>
      )}
      {renderEditor()}
    </div>
  );
};

SingleSelectEditor.propTypes = {
  field: PropTypes.object.isRequired,
  value: PropTypes.string,
  onChange: PropTypes.func.isRequired,
};

export default SingleSelectEditor;
