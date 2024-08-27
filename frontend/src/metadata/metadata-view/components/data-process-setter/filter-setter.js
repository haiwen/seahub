import React, { useCallback, useMemo, useState } from 'react';
import PropTypes from 'prop-types';
import classnames from 'classnames';
import deepCopy from 'deep-copy';
import { IconBtn } from '@seafile/sf-metadata-ui-component';
import { getValidFilters, CommonlyUsedHotkey } from '../../_basic';
import { gettext } from '../../../../utils/constants';
import { FilterPopover } from '../popover';

const FilterSetter = ({
  readOnly,
  columns,
  wrapperClass,
  filters: propsFilters,
  isNeedSubmit,
  isPre,
  collaborators,
  filtersClassName,
  target,
  filterConjunction,
  basicFilters,
  modifyFilters
}) => {
  const [isShowSetter, setShowSetter] = useState(false);

  const filters = useMemo(() => {
    return deepCopy(getValidFilters(propsFilters || [], columns));
  }, [propsFilters, columns]);

  const filtersCount = useMemo(() => {
    return filters.length + basicFilters.length;
  }, [filters, basicFilters]);

  const message = useMemo(() => {
    if (filtersCount === 1) return isNeedSubmit ? gettext('1 preset filter') : gettext('1 filter');
    if (filtersCount > 1) return filtersCount + ' ' + (isNeedSubmit ? gettext('Preset filters') : gettext('Filters'));
    return isNeedSubmit ? gettext('Preset filter') : gettext('Filter');
  }, [isNeedSubmit, filtersCount]);

  const onSetterToggle = useCallback(() => {
    setShowSetter(!isShowSetter);
  }, [isShowSetter]);

  const onKeyDown = useCallback((event) => {
    event.stopPropagation();
    if (CommonlyUsedHotkey.isEnter(event) || CommonlyUsedHotkey.isSpace(event)) onSetterToggle();
  }, [onSetterToggle]);

  const onChange = useCallback((update) => {
    const { filters, filter_conjunction, basic_filters } = update || {};
    const validFilters = getValidFilters(filters, columns);
    modifyFilters(validFilters, filter_conjunction, basic_filters);
  }, [columns, modifyFilters]);

  if (!columns) return null;
  const className = classnames(wrapperClass, { 'active': filtersCount > 0 });
  return (
    <>
      <IconBtn
        iconName="filter"
        size={24}
        className={className}
        onClick={onSetterToggle}
        role="button"
        onKeyDown={onKeyDown}
        title={message}
        aria-label={message}
        tabIndex={0}
        id={target}
      />
      {isShowSetter &&
        <FilterPopover
          placement="bottom-end"
          filtersClassName={filtersClassName}
          target={target}
          readOnly={readOnly}
          isNeedSubmit={isNeedSubmit}
          columns={columns}
          collaborators={collaborators}
          filterConjunction={filterConjunction}
          filters={filters}
          basicFilters={basicFilters}
          hidePopover={onSetterToggle}
          update={onChange}
          isPre={isPre}
        />
      }
    </>
  );

};

FilterSetter.propTypes = {
  readOnly: PropTypes.bool,
  wrapperClass: PropTypes.string,
  filtersClassName: PropTypes.string,
  target: PropTypes.string,
  isNeedSubmit: PropTypes.bool,
  filterConjunction: PropTypes.string,
  filters: PropTypes.array,
  columns: PropTypes.array,
  modifyFilters: PropTypes.func,
  collaborators: PropTypes.array,
  isPre: PropTypes.bool,
  basicFilters: PropTypes.array,
};

FilterSetter.defaultProps = {
  target: 'sf-metadata-filter-popover',
  isNeedSubmit: false,
  basicFilters: [],
};

export default FilterSetter;
