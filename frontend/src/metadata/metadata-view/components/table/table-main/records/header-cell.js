import React, { createRef, Component } from 'react';
import ReactDOM from 'react-dom';
import PropTypes from 'prop-types';
import classnames from 'classnames';
import { UncontrolledTooltip, Tooltip } from 'reactstrap';
import { Icon } from '@seafile/sf-metadata-ui-component';
import { COLUMNS_ICON_CONFIG, COLUMNS_ICON_NAME } from '../../../../_basic';
import ResizeColumnHandle from './resize-column-handle';
import { SUPPORT_BATCH_DOWNLOAD_TYPES, TABLE_SUPPORT_EDIT_TYPE_MAP, EVENT_BUS_TYPE } from '../../../../constants';
import HeaderDropdownMenu from './header-dropdown-menu';
import { gettext } from '../../../../utils';

class HeaderCell extends Component {

  static defaultProps = {
    style: null,
  };

  static propTypes = {
    groupOffsetLeft: PropTypes.number,
    height: PropTypes.number,
    column: PropTypes.object,
    style: PropTypes.object,
    frozen: PropTypes.bool,
    isLastFrozenCell: PropTypes.bool,
    isHideTriangle: PropTypes.bool,
    resizeColumnWidth: PropTypes.func,
    downloadColumnAllFiles: PropTypes.func,
  };

  constructor(props) {
    super(props);
    this.descriptionRef = createRef();
    this.uneditableTip = createRef();
    this.eventBus = window.sfMetadataContext.eventBus;
    this.state = {
      tooltipOpen: false,
      isMenuShow: false,
    };
  }

  headerCellRef = (node) => this.headerCell = node;

  getWidthFromMouseEvent = (e) => {
    let right = e.pageX || (e.touches && e.touches[0] && e.touches[0].pageX) || (e.changedTouches && e.changedTouches[e.changedTouches.length - 1].pageX);
    if (e.pageX === 0) {
      right = 0;
    }
    const left = ReactDOM.findDOMNode(this.headerCell).getBoundingClientRect().left;
    return right - left;
  };

  onDrag = (e) => {
    const width = this.getWidthFromMouseEvent(e);
    if (width > 0) {
      this.props.resizeColumnWidth(this.props.column, width);
    }
  };

  onIconTooltipToggle = () => {
    this.setState({ tooltipOpen: !this.state.tooltipOpen });
  };

  handleHeaderCellClick = (column) => {
    this.eventBus.dispatch(EVENT_BUS_TYPE.SELECT_COLUMN, column);
  };

  checkDropdownAvailable = () => {
    const { isHideTriangle, column } = this.props;
    if (isHideTriangle) {
      return false;
    }
    if (SUPPORT_BATCH_DOWNLOAD_TYPES.includes(column.type)) {
      return true;
    }
    return false;
  };

  toggleHeaderDropDownMenu = () => {
    this.setState({ isMenuShow: !this.state.isMenuShow });
  };

  render() {
    const { frozen, groupOffsetLeft, column, isLastFrozenCell, height } = this.props;
    const { left, width, description, key, name, type } = column;
    const canEditable = window.sfMetadataContext.canModifyCell(column);
    const style = Object.assign({ width, maxWidth: width, minWidth: width, height }, this.props.style);
    if (!frozen) {
      style.left = left + groupOffsetLeft;
    }
    const headerIconTooltip = COLUMNS_ICON_NAME[type];

    return (
      <div key={key} className="record-header-cell">
        <div
          className={classnames('sf-metadata-result-table-cell column', { 'table-last--frozen': isLastFrozenCell })}
          ref={this.headerCellRef}
          style={style}
          onClick={() => this.handleHeaderCellClick(column, frozen)}
        >
          <div className="sf-metadata-result-column-content record-header-cell-left d-flex align-items-center text-truncate">
            <span className="mr-2" id={`header-icon-${key}`}>
              <Icon iconName={COLUMNS_ICON_CONFIG[type]} />
            </span>
            <Tooltip placement="bottom" isOpen={this.state.tooltipOpen} toggle={this.onIconTooltipToggle} target={`header-icon-${key}`} fade={false}>
              {gettext(headerIconTooltip)}
            </Tooltip>
            <div className="header-name d-flex">
              <span title={name} className={`header-name-text ${height === 56 && 'double'}`}>{name}</span>
            </div>
          </div>
          {(TABLE_SUPPORT_EDIT_TYPE_MAP[type] && !canEditable) &&
            <span
              className="sf-metadata-font sf-metadata-icon-unlock column-uneditable-tip"
              ref={this.uneditableTip}
              id={`uneditable-column-${key}`}
            >
              <UncontrolledTooltip
                target={this.uneditableTip}
                placement='bottom'
                fade={false}
              >
                {gettext('No editing permission')}
              </UncontrolledTooltip>
            </span>
          }
          {description &&
            <>
              <span
                className="ml-2 sf-metadata-font sf-metadata-icon-description column-uneditable-tip"
                ref={this.descriptionRef}
                id={`column-description-${key}`}
                onMouseEnter={this.onToggleDescriptionTip}
                onMouseLeave={this.onToggleDescriptionTip}
              >
              </span>
              <UncontrolledTooltip
                innerClassName="column-description-tip"
                target={this.descriptionRef}
                placement='bottom'
                fade={false}
              >
                {description}
              </UncontrolledTooltip>
            </>
          }
          {this.checkDropdownAvailable() &&
            <HeaderDropdownMenu
              isMenuShow={this.state.isMenuShow}
              column={column}
              toggleHeaderDropDownMenu={this.toggleHeaderDropDownMenu}
              downloadColumnAllFiles={this.props.downloadColumnAllFiles}
            />
          }
          <ResizeColumnHandle
            onDrag={this.onDrag}
          />
        </div>
      </div>
    );
  }
}

export default HeaderCell;
