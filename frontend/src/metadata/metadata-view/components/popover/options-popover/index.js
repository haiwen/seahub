import React, { useCallback, useMemo, useState, useRef } from 'react';
import { CustomizeAddTool, CustomizePopover, SearchInput } from '@seafile/sf-metadata-ui-component';
import { gettext } from '../../../utils';
import { getColumnOptions, generateOptionID } from '../../../_basic';
import { getNotDuplicateOption } from '../../../utils/column-utils';
import OptionsContainer from './options-container';
import Option from './option';
import ConfirmDeletePopover from './confirm-delete-popover';
import toaster from '../../../../../components/toast';

import './index.css';

const OptionsPopover = ({ target, column, onToggle, onSubmit }) => {
  const [options, setOptions] = useState(getColumnOptions(column));
  const [searchValue, setSearchValue] = useState('');
  const [viewingOptionId, setViewingOptionId] = useState(-1);
  const [deletingOptionId, setDeletingOptionId] = useState('');
  const [editingOptionId, setEditingOptionId] = useState(-1);
  const isFreezeRef = useRef(false);
  const ref = useRef(null);

  const displayOptions = useMemo(() => {
    const validSearchValue = searchValue.trim().toLowerCase();
    if (!validSearchValue) return options || [];
    return options.filter(option => {
      const { name } = option;
      if (typeof name !== 'string') return false;
      const lowercaseName = name.toLowerCase();
      return lowercaseName.includes(validSearchValue);
    });
  }, [options, searchValue]);

  const onChange = useCallback((options) => {
    onSubmit(options.filter(item => item.name));
    setOptions(options);
  }, [onSubmit]);

  const onUpdate = useCallback((newOption, type) => {
    if (type === 'name') {
      const newName = newOption.name;
      const duplicateNameOption = options.find(o => o.name === newName);
      if (duplicateNameOption) {
        toaster.danger(gettext('There is another option with this name'));
        return;
      }
    }
    const newOptions = options.slice(0);
    const optionIndex = newOptions.findIndex(item => item.id === newOption.id);
    newOptions.splice(optionIndex, 1, newOption);
    onChange(newOptions);
  }, [options, onChange]);

  const onMove = useCallback((optionSource, optionTarget) => {
    const { idx: sourceIdx } = optionSource;
    const { idx: targetIdx, data: targetOption } = optionTarget;
    const movedOption = displayOptions.splice(sourceIdx, 1)[0];
    const newOptions = options.slice(0).filter(item => item.id !== movedOption.id);
    let insertIndex = newOptions.findIndex(option => option.id === targetOption.id);
    if (targetIdx > sourceIdx) {
      insertIndex++;
    }
    newOptions.splice(insertIndex, 0, movedOption);
    onChange(newOptions);
  }, [options, displayOptions, onChange]);

  const onAdd = useCallback(() => {
    const defaultOption = getNotDuplicateOption(options);
    const { COLOR: color, TEXT_COLOR: textColor, BORDER_COLOR: borderColor } = defaultOption;
    let newOption = { name: searchValue?.trim() || '', color, textColor, borderColor };
    newOption.id = generateOptionID(options);
    const newOptions = options.slice(0);
    newOptions.push(newOption);
    onChange(newOptions);
    setEditingOptionId(newOption.id);
  }, [searchValue, options, onChange]);

  const onDelete = useCallback((optionId) => {
    const newOptions = options.filter(option => option.id !== optionId);
    const lastOptionId = displayOptions[displayOptions.length - 1].id;
    if (lastOptionId === optionId) {
      setViewingOptionId(displayOptions[displayOptions.length - 2]?.id || '');
    }
    setDeletingOptionId('');
    onChange(newOptions);
  }, [displayOptions, options, onChange]);

  const onMouseEnter = useCallback((optionId) => {
    if (isFreezeRef.current || viewingOptionId === optionId) return;
    setViewingOptionId(optionId);
  }, [isFreezeRef, viewingOptionId]);

  const onMouseLeave = useCallback(() => {
    if (isFreezeRef.current) return;
    setViewingOptionId('');
  }, []);

  const onToggleFreeze = useCallback((isFreeze) => {
    isFreezeRef.current = isFreeze;
  }, []);

  const onOpenNameEditor = useCallback((optionId) => {
    setEditingOptionId(optionId);
  }, []);

  const onCloseNameEditor = useCallback(() => {
    setEditingOptionId('');
  }, []);

  const onSearchValueChange = useCallback((value) => {
    if (searchValue === value) return;
    setSearchValue(value);
  }, [searchValue]);

  const updateDeleteOption = useCallback((optionId) => {
    setDeletingOptionId(optionId);
  }, []);

  const closeDeleteOption = useCallback(() => {
    setDeletingOptionId('');
  }, []);

  const onDeleteOption = useCallback(() => {
    onDelete(deletingOptionId);
  }, [deletingOptionId, onDelete]);

  const renderEmptyTip = useCallback(() => {
    if (displayOptions.length > 0) return null;
    if (searchValue) return (<div className="none-search-result mt-2">{gettext('No options available')}</div>);
    return (<div className="none-search-result mt-2">{gettext('No options')}</div>);
  }, [searchValue, displayOptions]);

  const renderOptions = useCallback(() => {
    return Array.isArray(displayOptions) ? displayOptions.map((option, index) => {
      const { id } = option;
      return (
        <Option
          key={id}
          option={option}
          index={index}
          isEditing={editingOptionId === id}
          isDeleting={deletingOptionId === id}
          isViewing={viewingOptionId === id}
          onMove={onMove}
          onUpdate={onUpdate}
          onDelete={updateDeleteOption}
          onMouseEnter={onMouseEnter}
          onMouseLeave={onMouseLeave}
          onToggleFreeze={onToggleFreeze}
          onOpenNameEditor={onOpenNameEditor}
          onCloseNameEditor={onCloseNameEditor}
        />
      );
    }) : [];
  }, [displayOptions, editingOptionId, deletingOptionId, viewingOptionId, onMove, onUpdate, updateDeleteOption, onMouseEnter, onMouseLeave, onToggleFreeze, onOpenNameEditor, onCloseNameEditor]);

  return (
    <>
      <CustomizePopover
        target={target}
        className="sf-metadata-edit-column-options"
        canHide={!deletingOptionId}
        hide={onToggle}
        hideWithEsc={onToggle}
      >
        <div className="sf-metadata-edit-column-options-container">
          <div className="sf-metadata-edit-column-options-search-container">
            <SearchInput className="sf-metadata-option-search-control" placeholder={gettext('Search option')} onChange={onSearchValueChange} autoFocus={true} />
          </div>
          {renderEmptyTip()}
          <OptionsContainer
            options={renderOptions()}
            viewingOptionId={viewingOptionId}
            inputRef={ref}
          />
          <CustomizeAddTool className="sf-metadata-add-option" callBack={onAdd} footerName={gettext('Add option')} addIconClassName="sf-metadata-add-option-icon" />
        </div>
      </CustomizePopover>
      {deletingOptionId && (
        <ConfirmDeletePopover option={options.find(o => o.id === deletingOptionId)} onToggle={closeDeleteOption} onSubmit={onDeleteOption} />
      )}
    </>
  );
};

export default OptionsPopover;
