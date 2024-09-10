import React, { useCallback, useEffect, useMemo, useState } from 'react';
import PropTypes from 'prop-types';
import { SliderSetter, FilterSetter, GroupbySetter, SortSetter, HideColumnSetter } from '../data-process-setter';
import { EVENT_BUS_TYPE } from '../../constants';
import { VIEW_TYPE } from '../../_basic';

import './index.css';

const ViewToolBar = ({ viewId }) => {
  const [view, setView] = useState(null);
  const [collaborators, setCollaborators] = useState([]);

  const viewColumns = useMemo(() => {
    if (!view) return [];
    return view.columns;
  }, [view]);

  const onHeaderClick = useCallback(() => {
    window.sfMetadataContext.eventBus.dispatch(EVENT_BUS_TYPE.SELECT_NONE);
  }, []);

  const modifyFilters = useCallback((filters, filterConjunction, basicFilters) => {
    window.sfMetadataContext.eventBus.dispatch(EVENT_BUS_TYPE.MODIFY_FILTERS, filters, filterConjunction, basicFilters);
  }, []);

  const modifySorts = useCallback((sorts) => {
    window.sfMetadataContext.eventBus.dispatch(EVENT_BUS_TYPE.MODIFY_SORTS, sorts);
  }, []);

  const modifyGroupbys = useCallback((groupbys) => {
    window.sfMetadataContext.eventBus.dispatch(EVENT_BUS_TYPE.MODIFY_GROUPBYS, groupbys);
  }, []);

  const modifyHiddenColumns = useCallback((hiddenColumns) => {
    window.sfMetadataContext.eventBus.dispatch(EVENT_BUS_TYPE.MODIFY_HIDDEN_COLUMNS, hiddenColumns);
  }, []);

  const modifyColumnOrder = useCallback((sourceColumnKey, targetColumnKey) => {
    window.sfMetadataContext.eventBus.dispatch(EVENT_BUS_TYPE.MODIFY_COLUMN_ORDER, sourceColumnKey, targetColumnKey);
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
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewId]);

  if (!view) return null;

  const viewType = view.type;
  const readOnly = !window.sfMetadataContext.canModifyView(view);

  return (
    <div
      className="sf-metadata-tool"
      onClick={onHeaderClick}
    >
      <div className="sf-metadata-tool-left-operations">
        {view.type === VIEW_TYPE.GALLERY && <SliderSetter view={view} />}
        <FilterSetter
          isNeedSubmit={true}
          wrapperClass="sf-metadata-view-tool-operation-btn sf-metadata-view-tool-filter"
          filtersClassName="sf-metadata-filters"
          target="sf-metadata-filter-popover"
          readOnly={readOnly}
          filterConjunction={view.filter_conjunction}
          basicFilters={view.basic_filters}
          filters={view.filters}
          columns={viewColumns}
          modifyFilters={modifyFilters}
          collaborators={collaborators}
        />
        <SortSetter
          isNeedSubmit={true}
          wrapperClass="sf-metadata-view-tool-operation-btn sf-metadata-view-tool-sort"
          target="sf-metadata-sort-popover"
          readOnly={readOnly}
          sorts={view.sorts}
          type={viewType}
          columns={viewColumns}
          modifySorts={modifySorts}
        />
        {viewType !== VIEW_TYPE.GALLERY && (
          <GroupbySetter
            isNeedSubmit={true}
            wrapperClass="sf-metadata-view-tool-operation-btn sf-metadata-view-tool-groupby"
            target="sf-metadata-groupby-popover"
            readOnly={readOnly}
            columns={viewColumns}
            groupbys={view.groupbys}
            modifyGroupbys={modifyGroupbys}
          />
        )}
        {viewType !== VIEW_TYPE.GALLERY && (
          <HideColumnSetter
            wrapperClass="sf-metadata-view-tool-operation-btn sf-metadata-view-tool-hide-column"
            target="sf-metadata-hide-column-popover"
            readOnly={readOnly}
            columns={viewColumns.slice(1)}
            hiddenColumns={view.hidden_columns || []}
            modifyHiddenColumns={modifyHiddenColumns}
            modifyColumnOrder={modifyColumnOrder}
          />
        )}
      </div>
      <div className="sf-metadata-tool-right-operations"></div>
    </div>
  );
};

ViewToolBar.propTypes = {
  viewId: PropTypes.string,
};

export default ViewToolBar;
