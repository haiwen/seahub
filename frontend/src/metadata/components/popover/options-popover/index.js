import React, { useCallback, useMemo, useState, useRef } from 'react';
import PropTypes from 'prop-types';
import CustomizePopover from '../../../../components/customize-popover';
import CommonAddTool from '../../../../components/common-add-tool';
import SearchInput from '../../../../components/search-input';
import toaster from '../../../../components/toast';
import ConfirmDeletePopover from './confirm-delete-popover';
import OptionsContainer from './options-container';
import OptionFooter from './options-footer';
import Option from './option';
import { gettext } from '../../../../utils/constants';
import { useMetadataView } from '../../../hooks/metadata-view';
import { getColumnOptions, getOptionNameById, generateNewOption } from '../../../utils/column';
import { checkIsPredefinedOption } from '../../../utils/cell';
import { COLUMN_DATA_OPERATION_TYPE } from '../../../store/operations';

import './index.css';

const OptionsPopover = ({ target, column, onToggle, onSubmit }) => {
  const [options, setOptions] = useState(getColumnOptions(column));
  const [searchValue, setSearchValue] = useState('');
  const [viewingOptionId, setViewingOptionId] = useState(-1);
  const [deletingOptionId, setDeletingOptionId] = useState('');
  const [editingOptionId, setEditingOptionId] = useState(-1);
  const [relationRowsNum, setRelationRowsNum] = useState(0);
  const isFreezeRef = useRef(false);
  const ref = useRef(null);
  const isValidEditingOption = useRef(true);
  const { metadata } = useMetadataView();

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

  const createOptionEnabled = useMemo(() => {
    if (!searchValue) return true;
    return displayOptions.findIndex(option => option.name === searchValue) === -1 ? true : false;
  }, [displayOptions, searchValue]);

  const onChange = useCallback((options, optionModifyType) => {
    if (optionModifyType !== COLUMN_DATA_OPERATION_TYPE.INIT_NEW_OPTION) {
      onSubmit(options.filter(item => item.name), optionModifyType);
    }
    setOptions(options);
  }, [onSubmit]);

  const onUpdate = useCallback((newOption, type, successCallback, failCallback) => {
    const duplicateNameOption = options.find(o => o.name === newOption.name && o.id !== newOption.id);
    if (duplicateNameOption) {
      toaster.danger(gettext('There is another option with this name'));
      failCallback && failCallback();
      isValidEditingOption.current = false;
      return;
    }
    isValidEditingOption.current = true;
    successCallback && successCallback();
    const newOptions = options.slice(0);
    const optionIndex = newOptions.findIndex(item => item.id === newOption.id);
    newOptions.splice(optionIndex, 1, newOption);
    onChange(newOptions, type);
  }, [options, onChange, isValidEditingOption]);

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
    onChange(newOptions, COLUMN_DATA_OPERATION_TYPE.MOVE_OPTION);
  }, [options, displayOptions, onChange]);

  const onAdd = useCallback(() => {
    const newOptionName = searchValue?.trim() || '';
    const newOption = generateNewOption(options, newOptionName);
    const newOptions = options.slice(0);
    newOptions.push(newOption);
    const optionModifyType = newOptionName ? COLUMN_DATA_OPERATION_TYPE.ADD_OPTION : COLUMN_DATA_OPERATION_TYPE.INIT_NEW_OPTION;
    onChange(newOptions, optionModifyType);
    setEditingOptionId(newOptionName ? '' : newOption.id);
  }, [searchValue, options, onChange]);

  const onDelete = useCallback((optionId) => {
    const newOptions = options.filter(option => option.id !== optionId);
    const lastOptionId = displayOptions[displayOptions.length - 1].id;
    if (lastOptionId === optionId) {
      setViewingOptionId(displayOptions[displayOptions.length - 2]?.id || '');
    }
    setDeletingOptionId('');
    onChange(newOptions, COLUMN_DATA_OPERATION_TYPE.DELETE_OPTION);
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
    if (!isValidEditingOption.current) return;
    setEditingOptionId(optionId);
  }, [isValidEditingOption]);

  const onCloseNameEditor = useCallback(() => {
    setEditingOptionId('');
  }, []);

  const onRemoveEmptyOption = useCallback((optionId) => {
    const newOptions = options.filter(option => option.id !== optionId);
    setOptions(newOptions);
    setEditingOptionId('');
  }, [options]);

  const onSearchValueChange = useCallback((value) => {
    if (searchValue === value) return;
    setSearchValue(value);
  }, [searchValue]);

  const closeDeleteOption = useCallback(() => {
    setDeletingOptionId('');
  }, []);

  const onDeleteOption = useCallback(() => {
    onDelete(deletingOptionId);
  }, [deletingOptionId, onDelete]);

  const onImportOptions = useCallback((options) => {
    onSubmit(options, COLUMN_DATA_OPERATION_TYPE.ADD_OPTION);
    setOptions(options);
  }, [onSubmit]);

  const updateDeleteOption = useCallback((optionId) => {
    const optionName = getOptionNameById(column, optionId);
    let relationRowsNum = 0;
    metadata.rows.forEach(row => {
      if (row[column.name] === optionName) {
        relationRowsNum++;
      }
    });
    if (relationRowsNum > 0) {
      setDeletingOptionId(optionId);
      setRelationRowsNum(relationRowsNum);
    } else {
      setRelationRowsNum(0);
      onDelete(optionId);
    }
  }, [metadata, column, onDelete]);

  const onPopoverToggle = useCallback((e) => {
    if (e && e.target.className.includes('option-color-item')) return; // not close options-popover via change color
    onToggle(e);
  }, [onToggle]);

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
          isPredefined={checkIsPredefinedOption(column, id)}
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
          onRemoveEmptyOption={onRemoveEmptyOption}
        />
      );
    }) : [];
  }, [column, displayOptions, editingOptionId, deletingOptionId, viewingOptionId, onMove, onUpdate, updateDeleteOption, onMouseEnter, onMouseLeave, onToggleFreeze, onOpenNameEditor, onCloseNameEditor, onRemoveEmptyOption]);

  return (
    <>
      <CustomizePopover
        target={target}
        popoverClassName="sf-metadata-edit-column-options-popover"
        canHidePopover={!deletingOptionId && isValidEditingOption.current}
        hidePopover={onPopoverToggle}
        hidePopoverWithEsc={onPopoverToggle}
      >
        <div className="sf-metadata-edit-column-options-container">
          <div className="sf-metadata-edit-column-options-search-container">
            <SearchInput
              className="sf-metadata-option-search-control"
              placeholder={gettext('Search option')}
              onChange={onSearchValueChange}
              autoFocus={true}
            />
          </div>
          {renderEmptyTip()}
          <OptionsContainer
            options={renderOptions()}
            viewingOptionId={viewingOptionId}
            inputRef={ref}
          />
          {createOptionEnabled && (
            <CommonAddTool
              className="sf-metadata-add-option"
              callBack={onAdd}
              footerName={gettext('Add option')}
              addIconClassName="sf-metadata-add-option-icon"
            />
          )}
          <OptionFooter column={column} onToggle={onToggle} onImportOptions={onImportOptions}/>
        </div>
      </CustomizePopover>
      {deletingOptionId && (
        <ConfirmDeletePopover
          option={options.find(o => o.id === deletingOptionId)}
          onToggle={closeDeleteOption}
          onSubmit={onDeleteOption}
          deleteNumber={relationRowsNum}
        />
      )}
    </>
  );
};

OptionsPopover.propTypes = {
  target: PropTypes.oneOfType([PropTypes.string, PropTypes.node]),
  column: PropTypes.object.isRequired,
  onToggle: PropTypes.func,
  onSubmit: PropTypes.func
};

export default OptionsPopover;
