import React, { Component } from 'react';
import PropTypes from 'prop-types';
import classnames from 'classnames';
import { DELETED_OPTION_BACKGROUND_COLOR, DELETED_OPTION_TIPS } from '../../../../../constants';
import { gettext } from '../../../../../utils/constants';
import SingleSelectEditor from './single-select-editor';
import { getSelectColumnOptions } from '../../../../../utils/ledger';

import './index.css';

class SingleSelect extends Component {

  constructor(props) {
    super(props);
    const { column } = props;
    this.options = getSelectColumnOptions(column);
    this.state = {
      isShowSingleSelect: false,
    };
    this.editorKey = `single-select-editor-${column.key}`;
  }

  updateState = () => {
    // this.setState({ isShowSingleSelect: !this.state.isShowSingleSelect });
  }

  onCommit = (value, column) => {
    this.props.onCommit(value, column);
  }

  render() {
    const { isShowSingleSelect } = this.state;
    const { column, row } = this.props;
    const currentOptionID = row[column.key];
    const option = this.options.find(option => option.id === currentOptionID);
    const optionStyle = option ?
      { backgroundColor: option.color, color: option.textColor || null } :
      { backgroundColor: DELETED_OPTION_BACKGROUND_COLOR };
    const optionName = option ? option.name : gettext(DELETED_OPTION_TIPS);

    return (
      <>
        <div
          id={this.editorKey}
          className={classnames('selected-single-select-container', { 'disable': !column.editable, 'focus': isShowSingleSelect })}
        >
          <div className="single-select-inner w-100 h-100 d-flex align-items-center justify-content-between">
            <div>
              {currentOptionID && (
                <div
                  className="single-select-option"
                  style={optionStyle}
                  title={optionName}
                >{optionName}</div>
              )}
            </div>
            {column.editable && (
              <i className="fas fa-caret-down"></i>
            )}
          </div>
        </div>
        {column.editable && (
          <SingleSelectEditor
            column={column}
            row={this.props.row}
            columns={this.props.columns}
            onCommit={this.onCommit}
            onUpdateState={this.updateState}
          />
        )}
      </>
    );
  }
}

SingleSelect.propTypes = {
  column: PropTypes.object,
  row: PropTypes.object,
  columns: PropTypes.array,
  onCommit: PropTypes.func,
};

export default SingleSelect;
