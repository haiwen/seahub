import React, { useCallback, useMemo } from 'react';
import PropTypes from 'prop-types';
import CustomizeSelect from '../../../../../components/customize-select';
import { gettext } from '../../../../../utils/constants';
import Icon from '../../../../../components/icon';

const OPTIONS = [
  { value: 'picture', name: gettext('Only pictures') },
  { value: 'video', name: gettext('Only videos') },
  { value: 'all', name: gettext('Pictures and videos') },
];

const GalleryFileTypeFilter = ({ readOnly, value = 'picture', onChange: onChangeAPI }) => {

  const options = useMemo(() => {
    return OPTIONS.map(o => {
      const { name } = o;
      return {
        value: o.value,
        label: (
          <div className="select-basic-filter-option">
            <div className="select-basic-filter-option-name" title={name} aria-label={name}>{name}</div>
            <div className="select-basic-filter-option-check-icon">
              {value === o.value && (<Icon symbol="check-thin" />)}
            </div>
          </div>
        )
      };
    });
  }, [value]);

  const displayValue = useMemo(() => {
    const selectedOption = OPTIONS.find(o => o.value === value) || OPTIONS[2];
    return { label: <>{selectedOption.name}</> };
  }, [value]);

  const onChange = useCallback((newValue) => {
    if (newValue === value) return;
    onChangeAPI(newValue);
  }, [value, onChangeAPI]);

  return (
    <CustomizeSelect
      readOnly={readOnly}
      className="sf-metadata-basic-filters-select sf-metadata-table-view-basic-filter-file-type-select mr-4"
      value={displayValue}
      options={options}
      onSelectOption={onChange}
    />
  );
};

GalleryFileTypeFilter.propTypes = {
  readOnly: PropTypes.bool,
  value: PropTypes.string,
  onChange: PropTypes.func,
};

export default GalleryFileTypeFilter;
