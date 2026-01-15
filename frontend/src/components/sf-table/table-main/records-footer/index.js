import React from 'react';
import PropTypes from 'prop-types';
import Loading from '../../../loading';
import { RecordMetrics } from '../../utils/record-metrics';
import { TreeMetrics } from '../../utils/tree-metrics';
import { gettext } from '../../../../utils/constants';
import { CANVAS_RIGHT_INTERVAL } from '../../constants/grid';
import { GRID_FOOTER as Z_INDEX_GRID_FOOTER } from '../../constants/z-index';
import { addClassName, removeClassName } from '../../../../utils/dom';
import { getRecordsFromSelectedRange } from '../../utils/selected-cell-utils';

import './index.css';

class RecordsFooter extends React.Component {

  ref = null;

  componentDidMount() {
    window.addEventListener('resize', this.calculateAtBorder);
  }

  componentWillUnmount() {
    window.removeEventListener('resize', this.calculateAtBorder);
  }

  componentDidUpdate() {
    this.calculateAtBorder();
  }

  calculateAtBorder = () => {
    const { bottom } = this.ref.getBoundingClientRect();

    // update classnames after records count change
    const originClassName = this.ref ? this.ref.className : '';
    let newClassName;
    if (bottom >= window.innerHeight) {
      newClassName = addClassName(originClassName, 'at-border');
    } else {
      newClassName = removeClassName(originClassName, 'at-border');
    }
    if (newClassName !== originClassName && this.ref) {
      this.ref.className = newClassName;
    }
  };

  onLoadMore = () => {
    if (this.props.isLoadingMoreRecords) {
      return;
    }
    if (this.props.loadMore) {
      this.props.loadMore();
      return;
    }
    const loadNumber = this.props.recordsCount < 50000 ? 50000 : 100000;
    this.props.loadAll(loadNumber);
  };

  setSummaryScrollLeft = (scrollLeft) => {
    this.summaryItemsRef.scrollLeft = scrollLeft;
  };

  getSelectedCellsCount = (selectedRange) => {
    const { topLeft, bottomRight } = selectedRange || {};

    // if no cell selected topLeft.rowIdx is -1 , then return 0
    if (!topLeft || topLeft.rowIdx === -1) {
      return 0;
    }

    return (bottomRight.idx - topLeft.idx + 1) * (bottomRight.rowIdx - topLeft.rowIdx + 1);
  };

  getSummaries = () => {
    const {
      isGroupView, hasSelectedRecord, recordMetrics, selectedRange, summaries,
      recordGetterByIndex,
    } = this.props;
    if (hasSelectedRecord) {
      const selectedRecordIds = RecordMetrics.getSelectedIds(recordMetrics);
      const selectedRecords = selectedRecordIds && selectedRecordIds.map(id => this.props.recordGetterById(id)).filter(Boolean);
      return this.props.getRecordsSummaries(selectedRecords);
    }

    const selectedCellsCount = this.getSelectedCellsCount(selectedRange);
    if (selectedCellsCount > 1) {
      const records = getRecordsFromSelectedRange({ selectedRange, isGroupView, recordGetterByIndex });
      return this.props.getRecordsSummaries(records);
    }

    return summaries;
  };

  getSummaryItems = () => {
    const { columns, sequenceColumnWidth, hasMoreRecords, isLoadingMoreRecords } = this.props;
    const displayColumns = isLoadingMoreRecords || hasMoreRecords ? columns.slice(1, columns.length) : columns;
    let totalWidth = sequenceColumnWidth;
    let summaryItems = Array.isArray(displayColumns) && displayColumns.map((column, columnIndex) => {
      let summaryItem;
      let { width, key } = column;
      totalWidth += width;
      summaryItem = <div className="summary-item" style={{ width }} key={key}></div>;
      return summaryItem;
    });
    return { summaryItems, totalWidth };
  };

  getRecord = () => {
    const { hasMoreRecords, hasSelectedRecord, recordMetrics, selectedRange, recordsCount, showRecordAsTree, treeMetrics } = this.props;
    if (hasSelectedRecord) {
      let selectedRecordsCount = 1;
      if (showRecordAsTree) {
        selectedRecordsCount = TreeMetrics.getSelectedTreeNodesKeys(treeMetrics).length;
      } else {
        selectedRecordsCount = RecordMetrics.getSelectedIds(recordMetrics).length;
      }
      return selectedRecordsCount > 1 ? gettext('xxx records selected').replace('xxx', selectedRecordsCount) : gettext('1 record selected');
    }
    const selectedCellsCount = this.getSelectedCellsCount(selectedRange);
    if (selectedCellsCount > 1) {
      return gettext('xxx cells selected').replace('xxx', selectedCellsCount);
    }

    let recordsCountText;
    if (recordsCount > 1) {
      recordsCountText = gettext('xxx records').replace('xxx', recordsCount);
    } else {
      recordsCountText = gettext('xxx record').replace('xxx', recordsCount);
    }
    if (hasMoreRecords) {
      recordsCountText += ' +';
    }
    return recordsCountText;
  };

  render() {
    const { hasMoreRecords, isLoadingMoreRecords, columns, sequenceColumnWidth, groupOffsetLeft } = this.props;
    let { summaryItems, totalWidth } = this.getSummaryItems();
    const recordWidth = (isLoadingMoreRecords || hasMoreRecords ? sequenceColumnWidth + columns[0].width : sequenceColumnWidth) + groupOffsetLeft;

    return (
      <div className="sf-table-footer" style={{ zIndex: Z_INDEX_GRID_FOOTER }} ref={ref => this.ref = ref}>
        <div className="rows-record d-flex text-nowrap" style={{ width: recordWidth }}>
          <span>{this.getRecord()}</span>
          {(!isLoadingMoreRecords && hasMoreRecords && (this.props.loadMore || this.props.loadAll)) &&
            <span className="load-all ml-4" onClick={this.onLoadMore}>{this.props.loadMore ? gettext('Load more') : gettext('Load all')}</span>
          }
          {isLoadingMoreRecords &&
            <span className="loading-message ml-4">
              <span className="mr-2">{gettext('Loading')}</span>
              <Loading className="sf-metadata-loading-tip center" />
            </span>
          }
        </div>
        <div className="summaries-pane">
          <div className="summaries-scroll" ref={ref => this.summaryItemsRef = ref}>
            <div style={{ width: totalWidth + CANVAS_RIGHT_INTERVAL }}>
              {summaryItems || ''}
            </div>
          </div>
        </div>
      </div>
    );
  }
}

RecordsFooter.propTypes = {
  hasMoreRecords: PropTypes.bool,
  isLoadingMoreRecords: PropTypes.bool,
  isGroupView: PropTypes.bool,
  hasSelectedRecord: PropTypes.bool,
  recordsCount: PropTypes.number,
  summaries: PropTypes.object,
  summaryConfigs: PropTypes.object,
  columns: PropTypes.array,
  sequenceColumnWidth: PropTypes.number,
  groupOffsetLeft: PropTypes.number,
  recordMetrics: PropTypes.object,
  showRecordAsTree: PropTypes.bool,
  treeMetrics: PropTypes.object,
  selectedRange: PropTypes.object,
  recordGetterById: PropTypes.func,
  recordGetterByIndex: PropTypes.func,
  getRecordsSummaries: PropTypes.func,
  loadAll: PropTypes.func,
  loadMore: PropTypes.func,
};

export default RecordsFooter;
