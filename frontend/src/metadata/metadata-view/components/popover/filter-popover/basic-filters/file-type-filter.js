import React, { useCallback, useMemo } from 'react';
import PropTypes from 'prop-types';
import { gettext } from '../../../../utils';
import { CustomizeSelect, Icon } from '@seafile/sf-metadata-ui-component';

const OPTIONS = [
  { value: 'picture', name: gettext('Only pictures') },
  { value: 'video', name: gettext('Only videos') },
  { value: 'all', name: gettext('Pictures and videos') },
];

const FileTypeFilter = ({ readOnly, value = 'picture', onChange: onChangeAPI }) => {

  const options = useMemo(() => {
    return OPTIONS.map(o => {
      const { name } = o;
      return {
        value: o.value,
        label: (
          <div className="select-basic-filter-option">
            <div className="select-basic-filter-option-name" title={name} aria-label={name}>{name}</div>
            <div className="select-basic-filter-option-check-icon">
              {value === o.value && (<Icon iconName="check-mark" />)}
            </div>
          </div>
        )
      };
    });
  }, [value]);

  const displayValue = useMemo(() => {
    const selectedOption = OPTIONS.find(o => o.value === value) || OPTIONS[2];
    return {
      label: (
        <div>
          {selectedOption.name}
        </div>
      )
    };
  }, [value]);

  const onChange = useCallback((newValue) => {
    if (newValue === value) return;
    onChangeAPI(newValue);
  }, [value, onChangeAPI]);

  return (
    <CustomizeSelect
      readOnly={readOnly}
      className="sf-metadata-basic-filters-select"
      value={displayValue}
      options={options}
      onSelectOption={onChange}
      component={{
        DropDownIcon: (
          <i className="sf3-font sf3-font-down"></i>
        )
      }}
    />
  );
};

FileTypeFilter.propTypes = {
  readOnly: PropTypes.bool,
  value: PropTypes.string,
  onChange: PropTypes.func,
};

export default FileTypeFilter;
