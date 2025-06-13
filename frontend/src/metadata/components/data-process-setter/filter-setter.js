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
import { useMetadataStatus } from '../../../hooks';

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

  const { globalHiddenColumns } = useMetadataStatus();

  const validColumns = useMemo(() => columns.filter(column => !globalHiddenColumns.includes(column.key)), [globalHiddenColumns, columns]);

  const validBasicFilters = useMemo(() => basicFilters.filter(filter => !globalHiddenColumns.includes(filter.column_key)), [globalHiddenColumns, basicFilters]);

  const filters = useMemo(() => {
    return deepCopy(getValidFilters(propsFilters || [], validColumns));
  }, [propsFilters, validColumns]);

  const filtersCount = useMemo(() => {
    return filters.length + validBasicFilters.length;
  }, [filters, validBasicFilters]);

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
    const validFilters = getValidFilters(filters, validColumns);
    modifyFilters(validFilters, filter_conjunction, basic_filters);
  }, [validColumns, modifyFilters]);

  if (!validColumns) return null;
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
          columns={validColumns}
          collaborators={collaborators}
          filterConjunction={filterConjunction}
          filters={filters}
          basicFilters={validBasicFilters}
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
