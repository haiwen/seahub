import React, { Component } from 'react';
import PropTypes from 'prop-types';
import {
  HEADER_HEIGHT_TYPE,
  isEmptyObject,
  Z_INDEX,
} from '../../../../_basic';
import HeaderCell from './header-cell';
import HeaderActionsCell from './header-actions-cell';
import { isMobile } from '../../../../utils';
import { getFrozenColumns } from '../../../../utils/table-utils';
import { isFrozen } from '../../../../utils/column-utils';
import { GRID_HEADER_DEFAULT_HEIGHT, GRID_HEADER_DOUBLE_HEIGHT } from '../../../../constants';

class RecordsHeader extends Component {

  static propTypes = {
    containerWidth: PropTypes.number,
    columns: PropTypes.array.isRequired,
    colOverScanStartIdx: PropTypes.number,
    colOverScanEndIdx: PropTypes.number,
    table: PropTypes.object,
    hasSelectedRecord: PropTypes.bool,
    isSelectedAll: PropTypes.bool,
    isGroupView: PropTypes.bool,
    groupOffsetLeft: PropTypes.number,
    lastFrozenColumnKey: PropTypes.string,
    onRef: PropTypes.func,
    resizeColumnWidth: PropTypes.func,
    selectNoneRecords: PropTypes.func,
    selectAllRecords: PropTypes.func,
    downloadColumnAllFiles: PropTypes.func,
  };

  getFrozenCells = (height, isHideTriangle) => {
    const { columns, lastFrozenColumnKey } = this.props;
    const frozenColumns = getFrozenColumns(columns);
    return frozenColumns.map(column => {
      const { key } = column;
      const style = { backgroundColor: '#f9f9f9' };
      const isLastFrozenCell = key === lastFrozenColumnKey;
      return (
        <HeaderCell
          frozen
          key={key}
          height={height}
          column={column}
          style={style}
          isLastFrozenCell={isLastFrozenCell}
          isHideTriangle={isHideTriangle}
          resizeColumnWidth={this.props.resizeColumnWidth}
          downloadColumnAllFiles={this.props.downloadColumnAllFiles}
        />
      );
    });
  };

  getHeaderCells = (height, isHideTriangle) => {
    const { columns, groupOffsetLeft, colOverScanStartIdx, colOverScanEndIdx } = this.props;
    const rendererColumns = columns.slice(colOverScanStartIdx, colOverScanEndIdx);
    return rendererColumns.map(column => {
      return (
        <HeaderCell
          isHideTriangle={isHideTriangle}
          key={column.key}
          groupOffsetLeft={groupOffsetLeft}
          height={height}
          column={column}
          resizeColumnWidth={this.props.resizeColumnWidth}
          downloadColumnAllFiles={this.props.downloadColumnAllFiles}
        />
      );
    });
  };

  getFrozenWrapperStyle = (height) => {
    const { isGroupView, columns } = this.props;
    let style = {
      position: (isMobile ? 'absolute' : 'fixed'),
      marginLeft: '0px',
      height,
      zIndex: Z_INDEX.SEQUENCE_COLUMN,
    };
    if ((isGroupView && !isFrozen(columns[0])) || isMobile) {
      style.position = 'absolute';
    }
    return style;
  };

  render() {
    const {
      containerWidth, hasSelectedRecord, isSelectedAll, lastFrozenColumnKey, groupOffsetLeft, table
    } = this.props;
    const headerSettings = table.header_settings || {};
    const heightMode = isEmptyObject(headerSettings) ? HEADER_HEIGHT_TYPE.DEFAULT : headerSettings.header_height;
    const isHideTriangle = headerSettings && headerSettings.is_hide_triangle;
    const height = heightMode === HEADER_HEIGHT_TYPE.DOUBLE ? GRID_HEADER_DOUBLE_HEIGHT : GRID_HEADER_DEFAULT_HEIGHT;
    const headerHeight = height + 1;
    const frozenCells = this.getFrozenCells(height, isHideTriangle);
    const headerCells = this.getHeaderCells(height, isHideTriangle);
    const headerStyle = {
      width: containerWidth,
      minWidth: '100%',
      zIndex: Z_INDEX.GRID_HEADER,
      height
    };
    return (
      <div className="static-sf-metadata-result-content grid-header" style={{ height: headerHeight }}>
        <div className="sf-metadata-result-table-row" style={headerStyle}>
          {/* frozen */}
          <div className="frozen-columns d-flex" style={this.getFrozenWrapperStyle(height)} ref={ref => {
            !isMobile && this.props.onRef(ref);
          }}>
            <HeaderActionsCell
              isMobile={isMobile}
              height={height}
              hasSelectedRecord={hasSelectedRecord}
              isSelectedAll={isSelectedAll}
              isLastFrozenCell={!lastFrozenColumnKey}
              groupOffsetLeft={groupOffsetLeft}
              selectNoneRecords={this.props.selectNoneRecords}
              selectAllRecords={this.props.selectAllRecords}
            />
            {frozenCells}
          </div>
          {/* scroll */}
          {headerCells}
        </div>
      </div>
    );
  }
}

export default RecordsHeader;
