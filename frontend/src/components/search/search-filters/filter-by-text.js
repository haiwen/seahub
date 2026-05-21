import React, { useCallback, useMemo, useState } from 'react';
import PropTypes from 'prop-types';
import { gettext } from '../../../utils/constants';
import { SEARCH_FILTERS_KEY } from '../../../constants';
import Icon from '../../icon';
import CustomDropdown from '../../dropdown';

const FilterByText = ({ searchFilenameOnly, onChange }) => {
  const [value, setValue] = useState(searchFilenameOnly ? SEARCH_FILTERS_KEY.SEARCH_FILENAME_ONLY : SEARCH_FILTERS_KEY.SEARCH_FILENAME_AND_CONTENT);

  const options = useMemo(() => {
    return [
      {
        key: SEARCH_FILTERS_KEY.SEARCH_FILENAME_AND_CONTENT,
        label: gettext('File name and content'),
      }, {
        key: SEARCH_FILTERS_KEY.SEARCH_FILENAME_ONLY,
        label: gettext('File name only'),
      }
    ];
  }, []);

  const label = options.find((option) => option.key === value).label;

  const onItemClick = useCallback((item) => {
    setValue(item.key);
    const isSearchFilenameOnly = item.key === SEARCH_FILTERS_KEY.SEARCH_FILENAME_ONLY;
    onChange(SEARCH_FILTERS_KEY.SEARCH_FILENAME_ONLY, isSearchFilenameOnly);
  }, [onChange]);

  const items = useMemo(() => {
    return options.map((option) => ({
      ...option,
      checked: option.key === value,
      onClick: () => onItemClick(option),
    }));
  }, [options, value, onItemClick]);

  return (
    <div className="search-filter filter-by-text-container">
      <CustomDropdown
        variant="control"
        items={items}
        trigger={(
          <>
            <span className="filter-label" title={label}>{label}</span>
            <Icon symbol="down" className="w-3 h-3 ml-1" />
          </>
        )}
        triggerClassName="search-filter-toggle"
        menuClassName="search-filter-menu filter-by-text-menu"
        modifiers={[{
          name: 'offset',
          options: {
            offset: [0, 8]
          }
        }]}
      />
    </div>
  );
};

FilterByText.propTypes = {
  searchFilenameOnly: PropTypes.bool.isRequired,
  onChange: PropTypes.func.isRequired,
};

export default FilterByText;
