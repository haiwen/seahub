import React, { useCallback, useEffect, useMemo, useState } from 'react';
import PropTypes from 'prop-types';
import { FilterSetter, GroupbySetter, SortSetter, HideColumnSetter } from '../data-process-setter';
import { EVENT_BUS_TYPE } from '../../constants';

import './index.css';

const ViewToolBar = ({ metadataViewId }) => {
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
    let unsubscribeViewChange;
    let timer = setInterval(() => {
      if (window.sfMetadataContext && window.sfMetadataStore.data) {
        timer && clearInterval(timer);
        timer = null;
        setView(window.sfMetadataStore.data.view);
        setCollaborators(window.sfMetadataStore?.collaborators || []);
        unsubscribeViewChange = window.sfMetadataContext.eventBus.subscribe(EVENT_BUS_TYPE.VIEW_CHANGED, viewChange);
      }
    }, 300);
    return () => {
      timer && clearInterval(timer);
      unsubscribeViewChange && unsubscribeViewChange();
    };
  }, [metadataViewId]);

  if (!view) return null;

  return (
    <div
      className='sf-metadata-tool'
      // style={{ zIndex: Z_INDEX.TABLE_HEADER, transform: 'translateZ(1000px)' }}
      onClick={onHeaderClick}
    >
      <div className="sf-metadata-tool-left-operations">
        <FilterSetter
          wrapperClass="sf-metadata-view-tool-operation-btn sf-metadata-view-tool-filter"
          filtersClassName="sf-metadata-filters"
          target="sf-metadata-filter-popover"
          filterConjunction={view.filter_conjunction}
          filters={view.filters}
          columns={columns}
          modifyFilters={modifyFilters}
          collaborators={collaborators}
        />
        <SortSetter
          wrapperClass="sf-metadata-view-tool-operation-btn sf-metadata-view-tool-sort"
          target="sf-metadata-sort-popover"
          sorts={view.sorts}
          columns={columns}
          modifySorts={modifySorts}
        />
        <GroupbySetter
          wrapperClass="sf-metadata-view-tool-operation-btn sf-metadata-view-tool-groupby"
          target={'sf-metadata-groupby-popover'}
          columns={[]}
          groupbys={[]}
          modifyGroupbys={modifyGroupbys}
        />
        <HideColumnSetter
          wrapperClass="sf-metadata-view-tool-operation-btn sf-metadata-view-tool-hide-column"
          target={'sf-metadata-hide-column-popover'}
          columns={[]}
          modifyHiddenColumns={modifyHiddenColumns}
        />
      </div>
      <div className="sf-metadata-tool-right-operations"></div>
    </div>
  );
};

ViewToolBar.propTypes = {
  metadataViewId: PropTypes.string,
};

export default ViewToolBar;
