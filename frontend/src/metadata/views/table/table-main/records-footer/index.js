import React from 'react';
import PropTypes from 'prop-types';
import Loading from '../../../../../components/loading';
import RecordMetrics from '../../utils/record-metrics';
import { gettext } from '../../../../../utils/constants';
import { SEQUENCE_COLUMN_WIDTH, CANVAS_RIGHT_INTERVAL, metadataZIndexes } from '../../../../constants';
import { addClassName, removeClassName } from '../../../../../utils/dom';
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

  onClick = () => {
    if (this.props.isLoadingMore) {
      return;
    }
    const loadNumber = this.props.recordsCount < 50000 ? 50000 : 100000;
    this.props.loadAll(loadNumber);
  };

  setSummaryScrollLeft = (scrollLeft) => {
    this.summaryItemsRef.scrollLeft = scrollLeft;
  };

  getSelectedCellsCount = (selectedRange) => {
    const { topLeft, bottomRight } = selectedRange;

    // if no cell selected topLeft.rowIdx is -1 , then return 0
    if (topLeft.rowIdx === -1) {
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
    const { columns, hasMore, isLoadingMore } = this.props;
    const displayColumns = isLoadingMore || hasMore ? columns.slice(1, columns.length) : columns;
    let totalWidth = SEQUENCE_COLUMN_WIDTH;
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
    const { hasMore, hasSelectedRecord, recordMetrics, selectedRange, recordsCount } = this.props;
    if (hasSelectedRecord) {
      const selectedRecordsCount = RecordMetrics.getSelectedIds(recordMetrics).length;
      return selectedRecordsCount > 1 ? gettext('{name_placeholder} records selected').replace('{name_placeholder}', selectedRecordsCount) : gettext('1 record selected');
    }
    const selectedCellsCount = this.getSelectedCellsCount(selectedRange);
    if (selectedCellsCount > 1) {
      return gettext('{name_placeholder} cells selected').replace('{name_placeholder}', selectedCellsCount);
    }

    let recordsCountText;
    if (recordsCount > 1) {
      recordsCountText = gettext('{name_placeholder} records').replace('{name_placeholder}', recordsCount);
    } else {
      recordsCountText = gettext('{name_placeholder} record').replace('{name_placeholder}', recordsCount);
    }
    if (hasMore) {
      recordsCountText += ' +';
    }
    return recordsCountText;
  };

  render() {
    const { hasMore, isLoadingMore, columns, groupOffsetLeft } = this.props;
    let { summaryItems, totalWidth } = this.getSummaryItems();
    const recordWidth = (isLoadingMore || hasMore ? SEQUENCE_COLUMN_WIDTH + columns[0].width : SEQUENCE_COLUMN_WIDTH) + groupOffsetLeft;

    return (
      <div className="sf-metadata-result-footer" style={{ zIndex: metadataZIndexes.GRID_FOOTER }} ref={ref => this.ref = ref}>
        <div className="rows-record d-flex text-nowrap" style={{ width: recordWidth }}>
          <span>{this.getRecord()}</span>
          {!isLoadingMore && hasMore &&
            <span className="load-all ml-4" onClick={this.onClick}>{gettext('Load all')}</span>
          }
          {isLoadingMore &&
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
  hasMore: PropTypes.bool,
  isLoadingMore: PropTypes.bool,
  isGroupView: PropTypes.bool,
  hasSelectedRecord: PropTypes.bool,
  recordsCount: PropTypes.number,
  summaries: PropTypes.object,
  summaryConfigs: PropTypes.object,
  columns: PropTypes.array,
  groupOffsetLeft: PropTypes.number,
  recordMetrics: PropTypes.object,
  selectedRange: PropTypes.object,
  recordGetterById: PropTypes.func,
  recordGetterByIndex: PropTypes.func,
  getRecordsSummaries: PropTypes.func,
  loadAll: PropTypes.func,
};

export default RecordsFooter;
