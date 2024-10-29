import React, { useState, useCallback, useMemo } from 'react';
import PropTypes from 'prop-types';
import { Icon } from '@seafile/sf-metadata-ui-component';
import { gettext } from '../../../../utils/constants';
import AddListPopover from '../../../components/popover/add-list-popover';
import { COLUMN_DATA_OPERATION_TYPE } from '../../../store/operations';
import { useMetadataView } from '../../../hooks/metadata-view';

const AddList = ({ groupByColumn }) => {
  const [isShowAddListPopover, setShowAddListPopover] = useState(false);
  const { store } = useMetadataView();

  const options = useMemo(() => groupByColumn.data.options, [groupByColumn]);

  const handleAddListButtonClick = useCallback(() => {
    setShowAddListPopover(true);
  }, []);

  const handleAddNewList = useCallback((option) => {
    const oldData = groupByColumn.data;
    const options = [...oldData.options, option];
    const optionModifyType = COLUMN_DATA_OPERATION_TYPE.ADD_OPTION;
    store.modifyColumnData(groupByColumn.key, { options }, { options: oldData.options }, { optionModifyType });
    setShowAddListPopover(false);
  }, [store, groupByColumn]);

  const handleCancelAddList = useCallback(() => {
    setShowAddListPopover(false);
  }, []);

  return (
    <>
      <div
        id="add-list-button"
        className='add-list-button'
        onClick={handleAddListButtonClick}
      >
        <Icon iconName="add-table" />
        <span className="btn-text">{gettext('Add a new list')}</span>
      </div>
      {isShowAddListPopover && (
        <AddListPopover
          options={options}
          onCancel={handleCancelAddList}
          onSubmit={handleAddNewList}
        />
      )}
    </>
  );
};

AddList.propTypes = {
  groupByColumn: PropTypes.object.isRequired,
};

export default AddList;
