import React, { useCallback, useEffect, useRef, useState } from 'react';
import PropTypes from 'prop-types';
import classnames from 'classnames';
import ClickOutside from '../../../../components/click-outside';
import { gettext } from '../../../../utils/constants';
import { KeyCodes } from '../../../../constants';
import { isCellValueChanged } from '../../../utils/cell';
import { getTrimmedString } from '../../../utils/common';
import ObjectUtils from '../../../../utils/object';

import './index.css';

const TextEditor = React.memo(({ value: oldValue, onChange: onChangeAPI }) => {
  const [showEditor, setShowEditor] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    ref.current.innerText = oldValue || '';
  }, [oldValue]);

  const closeEditor = useCallback(() => {
    if (!showEditor) return;
    const value = ref.current.innerText;
    if (value !== oldValue) {
      onChangeAPI(getTrimmedString(value) || '');
    }
    setShowEditor(false);
  }, [showEditor, oldValue, onChangeAPI]);

  const onPaste = useCallback((event) => {
    event.stopPropagation();
  }, []);

  const onCut = useCallback((event) => {
    event.stopPropagation();
  }, []);

  const onKeyDown = useCallback((event) => {
    const { selectionStart, selectionEnd, value } = event.currentTarget;
    if (event.keyCode === KeyCodes.Enter) {
      event.preventDefault();
      closeEditor();
    } else if (
      (event.keyCode === KeyCodes.ChineseInputMethod) ||
      (event.keyCode === KeyCodes.LeftArrow && selectionStart === 0) ||
      (event.keyCode === KeyCodes.RightArrow && selectionEnd === value.length)
    ) {
      event.stopPropagation();
    }
  }, [closeEditor]);

  const displayEditor = useCallback(() => {
    if (showEditor) return;
    setShowEditor(true);
    setTimeout(() => {
      ref.current.focus();
      const range = document.createRange();
      range.selectNodeContents(ref.current);
      range.collapse(false);
      const selection = window.getSelection();
      selection.removeAllRanges();
      selection.addRange(range);
    }, 1);
  }, [showEditor]);

  return (
    <ClickOutside onClickOutside={closeEditor}>
      <div
        className={classnames('sf-metadata-property-detail-editor sf-metadata-text-property-detail-editor', { 'formatter': !showEditor })}
        onClick={displayEditor}
        ref={ref}
        onKeyDown={onKeyDown}
        onCut={onCut}
        onPaste={onPaste}
        placeholder={gettext('Empty')}
        contentEditable={showEditor}
      />
    </ClickOutside>
  );
}, (props, nextProps) => {
  const isChanged = isCellValueChanged(props.value, nextProps.value, nextProps.field.type) ||
    !ObjectUtils.isSameObject(props.field, nextProps.field) ||
    props.onChange !== nextProps.onChange;
  return !isChanged;
});

TextEditor.propTypes = {
  value: PropTypes.string,
  field: PropTypes.object.isRequired,
  onChange: PropTypes.func,
};

export default TextEditor;
