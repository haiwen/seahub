import React, { useCallback, useMemo, useState } from 'react';
import PropTypes from 'prop-types';
import classnames from 'classnames';
import deepCopy from 'deep-copy';
import IconBtn from '../../../components/icon-btn';
import { FilterPopover } from '../popover';
import { getValidFilters } from '../../utils/filter';
import { gettext } from '../../../utils/constants';
import { isEnter, isSpace } from '../../../utils/hotkey';
import { VIEW_TYPE } from '../../constants';

const FilterSetter = ({
  readOnly,
  columns,
  wrapperClass,
  filters: propsFilters,
  isPre,
  collaborators,
  filtersClassName,
  target = 'sf-metadata-filter-popover',
  filterConjunction,
  basicFilters = [],
  modifyFilters,
  viewType = VIEW_TYPE.TABLE,
}) => {
  const [isShowSetter, setShowSetter] = useState(false);

  const filters = useMemo(() => {
    return deepCopy(getValidFilters(propsFilters || [], columns));
  }, [propsFilters, columns]);

  const filtersCount = useMemo(() => {
    return filters.length + basicFilters.length;
  }, [filters, basicFilters]);

  const message = useMemo(() => {
    if (filtersCount === 1) return gettext('1 filter');
    if (filtersCount > 1) return filtersCount + ' ' + gettext('Filters');
    return gettext('Filter');
  }, [filtersCount]);

  const onSetterToggle = useCallback(() => {
    setShowSetter(!isShowSetter);
  }, [isShowSetter]);

  const onKeyDown = useCallback((event) => {
    event.stopPropagation();
    if (isEnter(event) || isSpace(event)) onSetterToggle();
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
        symbol="filter"
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
          columns={columns}
          collaborators={collaborators}
          filterConjunction={filterConjunction}
          filters={filters}
          basicFilters={basicFilters}
          hidePopover={onSetterToggle}
          update={onChange}
          isPre={isPre}
          viewType={viewType}
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
  filterConjunction: PropTypes.string,
  filters: PropTypes.array,
  columns: PropTypes.array,
  modifyFilters: PropTypes.func,
  collaborators: PropTypes.array,
  isPre: PropTypes.bool,
  basicFilters: PropTypes.array,
  viewType: PropTypes.string,
};

export default FilterSetter;
