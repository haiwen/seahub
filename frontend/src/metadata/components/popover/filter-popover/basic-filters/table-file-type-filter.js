import React, { useCallback, useMemo } from 'react';
import PropTypes from 'prop-types';
import { CustomizeSelect } from '@seafile/sf-metadata-ui-component';
import { gettext } from '../../../../../utils/constants';
import { getFileTypeColumnOptions } from '../../../../utils/column';

const TableFileTypeFilter = ({ readOnly, value, onChange: onChangeAPI }) => {

  const OPTIONS = useMemo(() => {
    const optionsMap = getFileTypeColumnOptions();
    let options = [];
    for (const [key, option] of Object.entries(optionsMap)) {
      options.push({ value: key, name: option.name });
    }
    return options;
  }, []);

  const options = useMemo(() => {
    return OPTIONS.map(o => {
      const { name } = o;
      return {
        value: o.value,
        label: (
          <div className="select-basic-filter-option">
            <div className="select-basic-filter-option-checkbox mr-2">
              <input type="checkbox" checked={value.includes(o.value)} readOnly />
            </div>
            <div className="select-basic-filter-option-name" title={name} aria-label={name}>{name}</div>
          </div>
        )
      };
    });
  }, [OPTIONS, value]);

  const displayValue = useMemo(() => {
    const selectedOptions = OPTIONS.filter(o => value.includes(o.value));
    return {
      label: (
        <div className="select-basic-filter-display-name">
          {selectedOptions.length > 0 ? selectedOptions.map(o => o.name).join(', ') : gettext('File type')}
        </div>
      )
    };
  }, [OPTIONS, value]);

  const onChange = useCallback((newValue) => {
    if (value.includes(newValue)) {
      onChangeAPI(value.filter(v => v !== newValue));
    } else {
      onChangeAPI([...value, newValue]);
    }
  }, [value, onChangeAPI]);

  return (
    <CustomizeSelect
      readOnly={readOnly}
      className="sf-metadata-basic-filters-select sf-metadata-table-view-basic-filter-file-type-select ml-4"
      value={displayValue}
      options={options}
      onSelectOption={onChange}
      supportMultipleSelect={true}
      component={{
        DropDownIcon: (
          <i className="sf3-font sf3-font-down"></i>
        )
      }}
    />
  );
};

TableFileTypeFilter.propTypes = {
  readOnly: PropTypes.bool,
  value: PropTypes.array,
  onChange: PropTypes.func,
};

export default TableFileTypeFilter;
