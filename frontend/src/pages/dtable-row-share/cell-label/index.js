import React from 'react';
import PropTypes from 'prop-types';
import { CELL_ICON } from '../contants/contants';
import '../css/label.css';

const propTypes = {
  mode: PropTypes.oneOfType(['grid_mode', 'form_mode', 'grally_mode', 'calender_mode', 'kanban_mode']),
  column: PropTypes.object
};

class CellLabel extends React.Component {

  render() {
    let column = this.props.column;
    let label_icon = CELL_ICON[column.type];
    let label_name = column.name;
    return (
      <Label className={`${this.props.mode} cell-label`}>
        <span className="label-icon"><i className={label_icon}></i></span>
        <span className="label-name">{label_name}</span>
      </Label>
    );
  }
}

CellLabel.propTypes = propTypes;

export default CellLabel;
