import React, { useState, useCallback } from 'react';
import { Button } from 'reactstrap';
import { CustomizePopover } from '@seafile/sf-metadata-ui-component';
import Color from '../options-popover/option/color';
import Name from '../options-popover/option/name';
import { generateNewOption } from '../../../utils/column';
import { gettext } from '../../../../utils/constants';
import { COLUMN_DATA_OPERATION_TYPE } from '../../../store/operations';
import toaster from '../../../../components/toast';

const AddListPopover = ({ options, onCancel, onSubmit }) => {
  const [option, setOption] = useState(generateNewOption(options, ''));

  const handleOptionChange = useCallback((newOption, type) => {
    switch (type) {
      case COLUMN_DATA_OPERATION_TYPE.MODIFY_OPTION_COLOR:
        setOption({ ...option, color: newOption.color, textColor: newOption.textColor, borderColor: newOption.borderColor });
        break;
      case COLUMN_DATA_OPERATION_TYPE.RENAME_OPTION:
        setOption({ ...option, name: newOption.name });
        break;
      default:
        break;
    }
  }, [option]);

  const handleSubmit = useCallback(() => {
    if (!option.name) {
      toaster.danger(gettext('Name is required'));
      return;
    }

    onSubmit(option);
  }, [option, onSubmit]);

  return (
    <CustomizePopover
      target='add-list-button'
      className='kanban-add-list-popover'
      canHide={false}
      hide={onCancel}
      hideWithEsc={onCancel}
    >
      <div className='kanban-add-list-popover-inner'>
        <div className="kanban-popover-body">
          <Color
            option={option}
            onChange={handleOptionChange}
            isViewing={true}
            isPredefined={false}
          />
          <Name
            option={option}
            isEditing={true}
            onChange={handleOptionChange}
          />
        </div>
        <div className="kanban-popover-footer">
          <Button className='mr-2' onClick={onCancel}>{gettext('Cancel')}</Button>
          <Button color="primary" disabled={false} onClick={handleSubmit}>{gettext('Submit')}</Button>
        </div>
      </div>
    </CustomizePopover>
  );
};

export default AddListPopover;
