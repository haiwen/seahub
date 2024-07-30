import React, { Component } from 'react';
import PropTypes from 'prop-types';
import joinClasses from 'classnames';
import GroupContainerLeft from '../group-container-left';
import GroupContainerRight from '../group-container-right';
import { isMobile } from '../../../../../../utils';
import { isFrozen } from '../../../../../../utils/column-utils';
import { GROUP_VIEW_OFFSET, SEQUENCE_COLUMN_WIDTH } from '../../../../../../constants';
import { Z_INDEX } from '../../../../../../_basic';
import { SIDE_PANEL_FOLDED_WIDTH } from '../../../../../../../../constants';

import './index.css';

class GroupContainer extends Component {

  shouldComponentUpdate(nextProps) {
    return (
      nextProps.groupPathString !== this.props.groupPathString ||
      nextProps.group !== this.props.group ||
      nextProps.width !== this.props.width ||
      nextProps.height !== this.props.height ||
      nextProps.top !== this.props.top ||
      nextProps.columns !== this.props.columns ||
      nextProps.rowHeight !== this.props.rowHeight ||
      nextProps.isExpanded !== this.props.isExpanded ||
      nextProps.scrollLeft !== this.props.scrollLeft ||
      nextProps.lastFrozenColumnKey !== this.props.lastFrozenColumnKey ||
      nextProps.summaryConfigs !== this.props.summaryConfigs
    );
  }

  componentDidMount() {
    if (this.props.lastFrozenColumnKey && !isMobile) {
      this.checkScroll();
    }
  }

  checkScroll() {
    const { scrollLeft } = this.props;
    this.cancelFixFrozenDOMs(scrollLeft);
  }

  fixedFrozenDOMs = (scrollLeft, scrollTop) => {
    if (this.backDrop) {
      const { left: tableContentLeft } = this.props.getTableContentRect();
      this.backDrop.style.position = 'fixed';
      this.backDrop.style.marginLeft = (tableContentLeft - SIDE_PANEL_FOLDED_WIDTH) + 'px';
      this.backDrop.style.marginTop = (-scrollTop) + 'px';
    }

    this.leftContainer && this.leftContainer.fixedFrozenDOMs(scrollLeft, scrollTop);
    this.rightContainer && this.rightContainer.fixedFrozenDOMs(scrollLeft, scrollTop);
  };

  cancelFixFrozenDOMs = (scrollLeft) => {
    if (this.backDrop) {
      this.backDrop.style.position = 'absolute';
      this.backDrop.style.marginLeft = scrollLeft - GROUP_VIEW_OFFSET + 'px';
      this.backDrop.style.marginTop = '0px';
    }

    this.leftContainer && this.leftContainer.cancelFixFrozenDOMs(scrollLeft);
    this.rightContainer && this.rightContainer.cancelFixFrozenDOMs(scrollLeft);
  };

  setContainer = (node) => {
    this.group = node;
  };

  setBackDrop = (node) => {
    this.backDrop = node;
  };

  onExpandGroupToggle = () => {
    const { groupPathString } = this.props;
    this.props.onExpandGroupToggle(groupPathString);
  };

  render() {
    const {
      group, columns, width, isExpanded, folding, summaryConfigs, height, backdropHeight, top,
      groupOffsetLeft, lastFrozenColumnKey, maxLevel,
    } = this.props;
    const { left, level } = group;
    const firstLevelGroup = level === 1;
    const groupClassName = joinClasses(
      'group-item',
      `group-level-${level}`,
      isExpanded ? 'expanded-group' : 'folded-group',
      folding ? 'folding' : '',
    );

    const firstColumn = columns[0] || {};
    const firstColumnFrozen = isFrozen(firstColumn);
    const firstColumnWidth = firstColumn.width || 0;
    const leftPaneWidth = SEQUENCE_COLUMN_WIDTH + firstColumnWidth + (firstLevelGroup ? 0 : ((level - 1) * GROUP_VIEW_OFFSET - 1));
    const rightPaneWidth = width - leftPaneWidth;
    const groupItemStyle = {
      height,
      width,
      top,
      left
    };
    let backDropStyle = {
      height: backdropHeight,
      width: leftPaneWidth + GROUP_VIEW_OFFSET,
      zIndex: Z_INDEX.GROUP_BACKDROP
    };

    return (
      <div className={groupClassName} ref={this.setContainer} style={groupItemStyle}>
        {(level === maxLevel && firstColumnFrozen) &&
          <div className="group-backdrop" ref={this.setBackDrop} style={backDropStyle}></div>
        }
        <GroupContainerLeft
          ref={ref => this.leftContainer = ref}
          group={group}
          firstColumnFrozen={firstColumnFrozen}
          lastColumnFrozen={firstColumn.key === lastFrozenColumnKey}
          leftPaneWidth={leftPaneWidth}
          height={height}
          isExpanded={isExpanded}
          firstColumnKey={firstColumn.key}
          maxLevel={maxLevel}
          onExpandGroupToggle={this.onExpandGroupToggle}
        />
        <GroupContainerRight
          ref={ref => this.rightContainer = ref}
          group={group}
          isExpanded={isExpanded}
          leftPaneWidth={leftPaneWidth}
          rightPaneWidth={rightPaneWidth}
          height={height}
          groupOffsetLeft={groupOffsetLeft}
          lastFrozenColumnKey={lastFrozenColumnKey}
          columns={columns}
          summaryConfigs={summaryConfigs}
          getTableContentRect={this.props.getTableContentRect}
        />
      </div>
    );
  }
}

GroupContainer.propTypes = {
  group: PropTypes.object,
  groupPathString: PropTypes.string,
  folding: PropTypes.bool,
  columns: PropTypes.array,
  rowHeight: PropTypes.number,
  width: PropTypes.number,
  height: PropTypes.number,
  backdropHeight: PropTypes.number,
  top: PropTypes.number,
  groupOffsetLeft: PropTypes.number,
  formulaRow: PropTypes.object,
  lastFrozenColumnKey: PropTypes.string,
  isExpanded: PropTypes.bool,
  scrollLeft: PropTypes.number,
  maxLevel: PropTypes.number,
  summaryConfigs: PropTypes.object,
  getTableContentRect: PropTypes.func,
  onExpandGroupToggle: PropTypes.func,
  updateSummaryConfig: PropTypes.func,
};

export default GroupContainer;
