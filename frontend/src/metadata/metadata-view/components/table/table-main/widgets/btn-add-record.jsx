import React from 'react';
import PropTypes from 'prop-types';
import classnames from 'classnames';
import { UncontrolledTooltip } from 'reactstrap';
import { SEQUENCE_COLUMN } from '../../../../_basic';
import { gettext } from '../../../../utils';

class BtnAddRecord extends React.Component {

  componentDidMount() {
    this.initFrozenColumnsStyle();
  }

  shouldComponentUpdate(nextProps) {
    return (
      nextProps.isGroupView !== this.props.isGroupView ||
      nextProps.groupPathString !== this.props.groupPathString ||
      nextProps.height !== this.props.height ||
      nextProps.width !== this.props.width ||
      nextProps.top !== this.props.top ||
      nextProps.left !== this.props.left ||
      nextProps.iconWidth !== this.props.iconWidth ||
      nextProps.lastFrozenColumnKey !== this.props.lastFrozenColumnKey ||
      nextProps.scrollLeft !== this.props.scrollLeft
    );
  }

  initFrozenColumnsStyle = () => {
    const { isGroupView, lastFrozenColumnKey, scrollLeft } = this.props;
    let style = {
      position: 'absolute',
      marginLeft: scrollLeft > 0 ? scrollLeft + 'px' : '0px',
    };
    if (isGroupView) {
      if (!lastFrozenColumnKey) {
        style.marginLeft = '0px';
      }
    }
    this.frozenColumns.style.position = style.position;
    this.frozenColumns.style.marginLeft = style.marginLeft;
  };

  renderBtn = () => {
    const { height, iconWidth, lastFrozenColumnKey, isGroupView, groupPathString } = this.props;
    let iconStyle = {
      height,
      width: iconWidth,
      zIndex: SEQUENCE_COLUMN,
    };
    if (isGroupView) {
      if (!lastFrozenColumnKey) {
        iconStyle.marginLeft = '0px';
      }
    }
    const btnClassName = classnames('table-btn-add-record', { 'table-last--frozen': isGroupView || !lastFrozenColumnKey });
    let btnId = 'btn_table_add_record__frozen';
    if (isGroupView) {
      btnId += groupPathString;
    }
    return (
      <>
        <div
          className={classnames('frozen-columns', btnClassName)}
          style={{ ...iconStyle }}
          ref={ref => this.frozenColumns = ref}
          onClick={this.props.onAddRecord}
          id={btnId}
        >
          <span className="table-btn-add-record-icon">+</span>
          <UncontrolledTooltip
            hideArrow
            fade={false}
            delay={{ show: 500, hide: 0 }}
            placement="bottom"
            target={btnId}
          >
            {gettext('Add_record')}
          </UncontrolledTooltip>
        </div>
        <div
          className={btnClassName}
          style={{ ...iconStyle, visibility: 'hidden' }}
          onClick={this.props.onAddRecord}
        >
          <span className="table-btn-add-record-icon">+</span>
        </div>
      </>
    );
  };

  render() {
    const { isGroupView, height, top, left, width } = this.props;
    let btnStyle = {
      height,
      width,
    };
    if (isGroupView) {
      btnStyle.top = top;
      btnStyle.left = left;
    }
    return (
      <div className="sf-metadata-result-table-row table-btn-add-record-row" style={btnStyle}>
        {this.renderBtn()}
        <div className="table-btn-add-record-row-filler" style={{ height }}></div>
      </div>
    );
  }
}

BtnAddRecord.propTypes = {
  isGroupView: PropTypes.bool,
  groupPathString: PropTypes.string,
  height: PropTypes.number,
  width: PropTypes.number,
  iconWidth: PropTypes.number,
  top: PropTypes.number,
  left: PropTypes.number,
  scrollLeft: PropTypes.number,
  lastFrozenColumnKey: PropTypes.string,
  onAddRecord: PropTypes.func,
};

export default BtnAddRecord;
