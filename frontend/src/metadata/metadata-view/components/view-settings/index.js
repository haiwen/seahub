import React, { useCallback, useEffect, useMemo, useState } from 'react';
import PropTypes from 'prop-types';
import classnames from 'classnames';
import { FilterSetter, GroupbySetter, SortSetter, HideColumnSetter } from '../data-process-setter';
import { EVENT_BUS_TYPE } from '../../constants';

import './index.css';

const TableTool = () => {
  const [isLoading, setLoading] = useState(true);
  const [view, setView] = useState(null);
  const [collaborators, setCollaborators] = useState([]);

  const columns = useMemo(() => {
    if (!view) return [];
    return view.available_columns;
  }, [view]);

  const onHeaderClick = useCallback(() => {
    window.sfMetadataContext.eventBus.dispatch(EVENT_BUS_TYPE.SELECT_NONE);
  }, []);

  const modifyFilters = useCallback((filters, filterConjunction) => {
    window.sfMetadataContext.eventBus.dispatch(EVENT_BUS_TYPE.MODIFY_FILTERS, filters, filterConjunction);
  }, []);

  const modifySorts = useCallback((sorts) => {
    window.sfMetadataContext.eventBus.dispatch(EVENT_BUS_TYPE.MODIFY_SORTS, sorts);
  }, []);

  const modifyGroupbys = useCallback(() => {
    window.sfMetadataContext.eventBus.dispatch(EVENT_BUS_TYPE.MODIFY_GROUPBYS);
  }, []);

  const modifyHiddenColumns = useCallback(() => {
    window.sfMetadataContext.eventBus.dispatch(EVENT_BUS_TYPE.MODIFY_GROUPBYS);
  }, []);

  const viewChange = useCallback((view) => {
    setView(view);
  }, []);

  useEffect(() => {
    let timer = setInterval(() => {
      if (window.sfMetadataContext) {
        timer && clearInterval(timer);
        timer = null;
        setLoading(false);
        setView(window.sfMetadataStore.data.view);
        setCollaborators(window.sfMetadataStore?.collaborators || []);
      }
    }, 300);
    return () => {
      timer && clearInterval(timer);
    };
  }, []);

  useEffect(() => {
    if (isLoading) return;

    const unsubscribeViewChange = window.sfMetadataContext.eventBus.subscribe(EVENT_BUS_TYPE.VIEW_CHANGED, viewChange);
    return () => {
      unsubscribeViewChange();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoading]);

  if (!view) return null;

  return (
    <div
      className={classnames('sf-metadata-tool')}
      // style={{ zIndex: Z_INDEX.TABLE_HEADER, transform: 'translateZ(1000px)' }}
      onClick={onHeaderClick}
    >
      <div className="sf-metadata-tool-left-operations">
        <FilterSetter
          wrapperClass="custom-tool-label custom-filter-label"
          filtersClassName="sf-metadata-filters"
          target="sf-metadata-filter-popover"
          filterConjunction={view.filter_conjunction}
          filters={view.filters}
          columns={columns}
          modifyFilters={modifyFilters}
          collaborators={collaborators}
        />
        <SortSetter
          wrapperClass="custom-tool-label custom-sort-label"
          target="sf-metadata-sort-popover"
          sorts={view.sorts}
          columns={columns}
          modifySorts={modifySorts}
        />
        <GroupbySetter
          wrapperClass={'custom-tool-label custom-groupby-label'}
          target={'sf-metadata-groupby-popover'}
          columns={[]}
          groupbys={[]}
          modifyGroupbys={modifyGroupbys}
        />
        <HideColumnSetter
          wrapperClass={'custom-tool-label custom-hide-column-label'}
          target={'sf-metadata-hide-column-popover'}
          columns={[]}
          modifyHiddenColumns={modifyHiddenColumns}
        />
      </div>
      <div className="sf-metadata-tool-right-operations"></div>
    </div>
  );
};

TableTool.propTypes = {
  view: PropTypes.object,
  modifyFilters: PropTypes.func,
  modifySorts: PropTypes.func,
  modifyGroupbys: PropTypes.func,
  modifyHiddenColumns: PropTypes.func,
};

export default TableTool;
