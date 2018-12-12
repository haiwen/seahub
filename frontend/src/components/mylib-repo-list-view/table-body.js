import React, { Component } from 'react';
import PropTypes from 'prop-types';
import Item from './item';

const propTypes = {
  items: PropTypes.array.isRequired,
  operations: PropTypes.object.isRequired,
};

class TableBody extends Component {

  constructor(props) {
    super(props);
    this.state = {
      items: this.props.items,
      isItemFreezed: false,
    };
  }

  onItemFreezedToggle = () => {
    this.setState({isItemFreezed: !this.state.isItemFreezed});
  }

  render() {
    let listItems = this.state.items.map((item, index) => {
      return (
        <Item 
          key={index} 
          data={item} 
          operations={this.props.operations}
          isItemFreezed={this.state.isItemFreezed}
          onItemFreezedToggle={this.onItemFreezedToggle}
        />
      );
    });

    return (
      <tbody>{listItems}</tbody>
    );
  }
}

TableBody.propTypes = propTypes;

export default TableBody;