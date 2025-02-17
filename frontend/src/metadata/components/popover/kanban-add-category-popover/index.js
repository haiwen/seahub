import React, { useState, useCallback } from 'react';
import PropTypes from 'prop-types';
import { Button } from 'reactstrap';
import { CustomizePopover } from '@seafile/sf-metadata-ui-component';
import Color from '../options-popover/option/color';
import Name from '../options-popover/option/name';
import { generateNewOption } from '../../../utils/column';
import { gettext } from '../../../../utils/constants';
import { COLUMN_DATA_OPERATION_TYPE } from '../../../store/operations';
import toaster from '../../../../components/toast';

import './index.css';

const KanbanAddCategoryPopover = ({ target, options, onCancel, onSubmit }) => {
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

    const duplicateNameOption = options.find(o => o.name === option.name && o.id !== option.id);
    if (duplicateNameOption) {
      toaster.danger(gettext('There is another option with this name'));
      return;
    }

    onSubmit(option);
  }, [options, option, onSubmit]);

  return (
    <CustomizePopover
      target={target}
      className="sf-metadata-kanban-add-board-popover"
      hide={onCancel}
      hideWithEsc={onCancel}
      modifiers={[[{ name: 'preventOverflow', options: { boundary: document.body } }]]}
    >
      <div className="sf-metadata-kanban-add-board-popover-inner">
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
          <Button className="mr-2" onClick={onCancel}>{gettext('Cancel')}</Button>
          <Button color="primary" onClick={handleSubmit}>{gettext('Submit')}</Button>
        </div>
      </div>
    </CustomizePopover>
  );
};

KanbanAddCategoryPopover.propTypes = {
  target: PropTypes.oneOfType([PropTypes.string, PropTypes.node]),
  options: PropTypes.array.isRequired,
  onCancel: PropTypes.func.isRequired,
  onSubmit: PropTypes.func.isRequired,
};

export default KanbanAddCategoryPopover;
