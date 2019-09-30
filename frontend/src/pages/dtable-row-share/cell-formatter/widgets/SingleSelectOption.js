import React from 'react';
import PropTypes from 'prop-types';

const propTypes = {
  mode: PropTypes.string,
  value: PropTypes.string,
  column: PropTypes.object,
};

class SingleSelectOption extends React.Component {

  getCurrentOption = () => {
    let { value, column } = this.props;
    let options = column.data.options;
    let option = options.find(item => { return item.ID === value;});
    return option;
  }

  getClassName = () => {
    let type = this.props.column.type;
    return 'grid_cell_type_' + type;
  }

  getStyle = () => {
    let option = this.getCurrentOption();
    let style = {
      display: 'inline-block',
      padding: '0px 10px',
      height: '20px',
      textAlign: 'center',
      borderRadius: '10px',
      fontSize: '13px',
      backgroundColor: option.color,
    };
    return option ? style : null;
  }

  render() {
    let { value, column } = this.props;
    if (!value || !column.data || !column.data.options) {
      return (<div></div>);
    }

    let currentOption = this.getCurrentOption();
    if (currentOption) {
      let optionClass = this.getClassName();
      let optionStyle = this.getStyle();
      return (<div className={optionClass} style={optionStyle}>{currentOption.name}</div>);
    } 
    return null;  
  }
}

SingleSelectOption.propTypes = propTypes;

export default SingleSelectOption;
