import React, { useCallback, useEffect, useRef, useState } from 'react';
import classNames from 'classnames';
import { gettext } from '../../../../utils/constants';
import { useMetadataDetails } from '../../../../metadata';
import { getCellValueByColumn } from '../../../../metadata/utils/cell';
import { PRIVATE_COLUMN_KEY } from '../../../../metadata/constants';
import ClickOutside from '../../../click-outside';
import { KeyCodes } from '../../../../constants';
import { getTrimmedString } from '../../../../metadata/utils/common';

const Description = ({ content }) => {
  const ref = useRef(null);
  const [isEditing, setIsEditing] = useState(false);
  const [value, setValue] = useState('');

  const { record, onChange } = useMetadataDetails();

  const displayEditor = useCallback(() => {
    if (isEditing) return;
    setIsEditing(true);
    setTimeout(() => {
      if (ref.current) {
        ref.current.focus();
        const range = document.createRange();
        range.selectNodeContents(ref.current);
        range.collapse(false);
        const selection = window.getSelection();
        selection.removeAllRanges();
        selection.addRange(range);
      }
    }, 0);
  }, [isEditing]);

  const closeEditor = useCallback(() => {
    if (!isEditing) return;
    const value = ref.current.innerText;
    if (value !== content) {
      onChange(PRIVATE_COLUMN_KEY.FILE_DESCRIPTION, getTrimmedString(value) || '');
    }
    setIsEditing(false);
  }, [isEditing, content, onChange]);

  const onKeyDown = useCallback((event) => {
    if (event.keyCode === KeyCodes.Enter) {
      event.preventDefault();
      closeEditor();
    }
  }, [closeEditor]);

  const onInputChange = useCallback(() => {
    setValue(ref.current.innerText);
  }, []);

  useEffect(() => {
    setValue(content);
    if (record) {
      const description = getCellValueByColumn(record, { key: PRIVATE_COLUMN_KEY.FILE_DESCRIPTION });
      ref.current.innerText = description || '';
    }
  }, [record, content]);

  return (
    <div className="sf-metadata-dirent-detail-description-container">
      <ClickOutside onClickOutside={closeEditor}>
        <div
          className={classNames('sf-metadata-dirent-detail-description', { 'empty': !value })}
          ref={ref}
          placeholder={gettext('Add description')}
          contentEditable={isEditing}
          onClick={displayEditor}
          onKeyDown={onKeyDown}
          onInput={onInputChange}
        />
      </ClickOutside>
    </div>
  );
};

export default Description;
