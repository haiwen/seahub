import React, { useState, useCallback, useMemo } from 'react';
import PropTypes from 'prop-types';
import { Icon } from '@seafile/sf-metadata-ui-component';
import { gettext } from '../../../../utils/constants';
import AddCategoryPopover from '../../../components/popover/kanban-add-category-popover';
import { COLUMN_DATA_OPERATION_TYPE } from '../../../store/operations';
import { useMetadataView } from '../../../hooks/metadata-view';

import './index.css';

const AddBoard = ({ groupByColumn }) => {
  const [isShowPopover, setShowPopover] = useState(false);
  const { store } = useMetadataView();

  const options = useMemo(() => groupByColumn.data.options, [groupByColumn]);
  const id = useMemo(() => 'sf-metadata-kanban-add-board-button', []);

  const handleButtonClick = useCallback((event) => {
    event.stopPropagation();
    event.nativeEvent.stopImmediatePropagation();
    setShowPopover(!isShowPopover);
  }, [isShowPopover]);

  const handleAddNewOption = useCallback((option) => {
    const oldData = groupByColumn.data;
    const options = [...oldData.options, option];
    const optionModifyType = COLUMN_DATA_OPERATION_TYPE.ADD_OPTION;
    store.modifyColumnData(groupByColumn.key, { options }, { options: oldData.options }, { optionModifyType });
    setShowPopover(false);
  }, [store, groupByColumn]);

  const onToggle = useCallback(() => {
    setShowPopover(!isShowPopover);
  }, [isShowPopover]);

  return (
    <>
      <div id={id} className="sf-metadata-kanban-add-board-button" onClick={handleButtonClick} title={gettext('Add a new category')}>
        <Icon iconName="add-table" />
        <span className="sf-metadata-kanban-add-board-title">{gettext('Add a new category')}</span>
      </div>
      {isShowPopover && (
        <AddCategoryPopover target={id} options={options} onCancel={onToggle} onSubmit={handleAddNewOption} />
      )}
    </>
  );
};

AddBoard.propTypes = {
  groupByColumn: PropTypes.object.isRequired,
};

export default AddBoard;
