import React, { useMemo, useCallback, useState, useRef, useEffect } from 'react';
import PropTypes from 'prop-types';
import { Popover } from 'reactstrap';
import Editor from '../../cell-editors/multiple-select-editor';
import DeleteOptions from '../../cell-editors/multiple-select-editor/delete-options';
import { gettext } from '../../../../utils/constants';
import { KeyCodes } from '../../../../constants';
import { getColumnOptionIdsByNames } from '../../../utils/cell';
import { getColumnOptions } from '../../../utils/column';
import { getEventClassName } from '../../../../utils/dom';

import './index.css';

const MultipleSelectEditor = ({ field, value, onChange, modifyColumnData }) => {
  const ref = useRef(null);
  const [showEditor, setShowEditor] = useState(false);
  const options = useMemo(() => getColumnOptions(field), [field]);

  const onClick = useCallback((event) => {
    if (!event.target) return;
    const className = getEventClassName(event);
    if (className.indexOf('sf-metadata-search-options') > -1) return;
    const dom = document.querySelector('.sf-metadata-multiple-select-editor');
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

  const deleteOption = useCallback((id, event) => {
    event && event.stopPropagation();
    event && event.nativeEvent && event.nativeEvent.stopImmediatePropagation();
    const oldValue = getColumnOptionIdsByNames(field, value);
    const newValue = oldValue.filter(c => c !== id);
    onChange(newValue);
  }, [field, value, onChange]);

  const onCommit = useCallback((newValue) => {
    onChange(newValue);
  }, [onChange]);

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
        className="sf-metadata-property-editor-popover sf-metadata-single-select-property-editor-popover sf-metadata-multiple-select-property-editor-popover"
        boundariesElement={document.body}
      >
        <Editor
          saveImmediately={true}
          value={value}
          column={{ ...field, width: Math.max(width - 2, 200) }}
          modifyColumnData={modifyColumnData}
          onCommit={onCommit}
        />
      </Popover>
    );
  }, [showEditor, onCommit, value, modifyColumnData, field]);

  const isEmpty = useMemo(() => {
    if (!Array.isArray(value) || value.length === 0) return true;
    const selectedOptions = options.filter((option) => value.includes(option.id) || value.includes(option.name));
    const invalidOptionIds = value.filter(optionId => optionId && !options.find(o => o.id === optionId || o.name === optionId));
    return selectedOptions.length + invalidOptionIds.length === 0;
  }, [options, value]);

  return (
    <div
      className="sf-metadata-property-detail-editor sf-metadata-single-select-property-detail-editor sf-metadata-multiple-select-property-detail-editor"
      placeholder={gettext('Empty')}
      ref={ref}
      onClick={openEditor}
    >
      {!isEmpty && (<DeleteOptions value={value} options={options} onDelete={deleteOption} />)}
      {renderEditor()}
    </div>
  );
};

MultipleSelectEditor.propTypes = {
  field: PropTypes.object.isRequired,
  value: PropTypes.array,
  onChange: PropTypes.func.isRequired,
  modifyColumnData: PropTypes.func,
};

export default MultipleSelectEditor;
