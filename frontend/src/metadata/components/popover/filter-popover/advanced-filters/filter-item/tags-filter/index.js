import React, { useMemo } from 'react';
import PropTypes from 'prop-types';
import { CustomizeSelect, Icon } from '@seafile/sf-metadata-ui-component';
import { DELETED_OPTION_BACKGROUND_COLOR, DELETED_OPTION_TIPS } from '../../../../../../constants';
import { gettext } from '../../../../../../../utils/constants';

import './index.css';

const TagsFilter = ({ options, filterTerm, readOnly, onSelectMultiple }) => {

  const selectValue = useMemo(() => {
    return Array.isArray(filterTerm) && filterTerm.length > 0 && filterTerm.map((item) => {
      const option = options.find(option => option.name === item);
      if (!option) return null;
      const optionStyle = { margin: '0 10px 0 0' };
      let optionName = null;
      let optionColor = null;

      if (option) {
        optionName = option.name;
        optionColor = option.color;
        optionStyle.background = option.color;
      } else {
        optionStyle.background = DELETED_OPTION_BACKGROUND_COLOR;
        optionName = gettext(DELETED_OPTION_TIPS);
      }

      return (
        <div
          key={'option_' + item}
          className="tag-item"
          title={optionName}
          aria-label={optionName}
        >
          <span className="sf-metadata-tag-color" style={{ background: optionColor }}></span>
          <span className="sf-metadata-tag-name">{optionName}</span>
        </div>
      );
    });
  }, [filterTerm, options]);

  const dataOptions = useMemo(() => {
    return options.map(option => ({
      value: { columnOption: option },
      label: (
        <div className="select-option-name option-tag">
          <div className="sf-metadata-tag-container">
            <span className="sf-metadata-tag-color" style={{ background: option.color }}></span>
            <span className="sf-metadata-tag-name">{option.name}</span>
          </div>
          <div className="tag-check-icon">
            {filterTerm.indexOf(option.name) > -1 && (<Icon iconName="check-mark" />)}
          </div>
        </div>
      )
    }));
  }, [options, filterTerm]);

  return (
    <CustomizeSelect
      readOnly={readOnly}
      className="sf-metadata-selector-tags"
      value={selectValue ? { label: selectValue } : {}}
      options={dataOptions}
      onSelectOption={onSelectMultiple}
      placeholder={gettext('Select tag(s)')}
      searchable={true}
      searchPlaceholder={gettext('Search tag')}
      noOptionsPlaceholder={gettext('No tags available')}
      supportMultipleSelect={true}
    />
  );
};

TagsFilter.propTypes = {
  filterTerm: PropTypes.oneOfType([PropTypes.array, PropTypes.string]),
  readOnly: PropTypes.bool.isRequired,
  onSelectMultiple: PropTypes.func.isRequired,
};

export default TagsFilter;
