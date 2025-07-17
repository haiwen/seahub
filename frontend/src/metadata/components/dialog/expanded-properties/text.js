import React, { useCallback, useEffect, useRef, useState } from 'react';
import { getCellValueByColumn, getFileMTimeFromRecord, getFileNameFromRecord, getParentDirFromRecord } from '../../../utils/cell';
import { checkIsDir } from '../../../utils/row';
import { Utils } from '../../../../utils/utils';
import { siteRoot, thumbnailDefaultSize } from '../../../../utils/constants';
import { CellType } from '../../../constants';
import { KeyCodes } from '../../../../constants';

const Text = ({ record, column, onCommit }) => {
  const [value, setValue] = useState('');

  const inputRef = useRef(null);

  const onChange = useCallback((e) => {
    const newValue = e.target.value;
    if (newValue === value) return;
    setValue(newValue);
  }, [value]);

  const onBlur = useCallback(() => {
    onCommit(column, value);
  }, [value, column, onCommit]);

  const onKeyDown = useCallback((e) => {
    if (e.keyCode === KeyCodes.Esc) {
      e.stopPropagation();
      setTimeout(() => {
        inputRef.current && inputRef.current.blur();
      }, 1);
      return;
    }
    const { selectionStart, selectionEnd, value } = e.currentTarget;
    if (
      e.keyCode === KeyCodes.ChineseInputMethod ||
      e.keyCode === KeyCodes.LeftArrow && selectionStart === 0 ||
      e.keyCode === KeyCodes.RightArrow && selectionEnd === value.length
    ) {
      e.stopPropagation();
    }
  }, []);

  useEffect(() => {
    const value = getCellValueByColumn(record, column);
    value && setValue(value);
  }, [record, column]);

  const readOnly = !column.editable;

  if (!readOnly) {
    return (
      <input
        className="form-control"
        type="text"
        ref={inputRef}
        value={value}
        onChange={onChange}
        onBlur={onBlur}
        onKeyDown={onKeyDown}
        onCut={(e) => e.stopPropagation()}
        onPaste={(e) => e.stopPropagation()}
      />
    );
  }

  const type = column.type;
  const parentDir = getParentDirFromRecord(record);
  const filename = getFileNameFromRecord(record);
  const isDir = checkIsDir(record);
  let iconUrl = Utils.getFileIconUrl(filename);
  if (isDir) {
    iconUrl = Utils.getFolderIconUrl();
  } else if (Utils.imageCheck(filename)) {
    const path = Utils.encodePath(Utils.joinPath(parentDir, filename));
    const repoID = window.sfMetadataStore.repoId;
    iconUrl = `${siteRoot}thumbnail/${repoID}/${thumbnailDefaultSize}${path}?mtime=${getFileMTimeFromRecord(record)}`;
  }

  if (type == CellType.FILE_NAME) {
    return (
      <div className="form-control disabled">
        <span className="w-6 h-6 overflow-hidden mr-2">
          <img src={iconUrl} height={24} alt='' />
        </span>
        <span>{filename}</span>
      </div>
    );
  }

  return (
    <div className="form-control disabled">
      <span>{value}</span>
    </div>
  );
};

export default Text;
