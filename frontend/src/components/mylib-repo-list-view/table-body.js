import React, { Component } from 'react';
import Item from './item';

class TableBody extends Component {

  constructor(props) {
    super(props);
    this.state = {
      items: this.props.items
    };
  }

  render() {
    
    let listItems = this.state.items.map(function(item, index) {
      return <Item key={index} data={item} operations={this.props.operations} />;
    }, this);

    return (
      <tbody>{listItems}</tbody>
    );
  }
}

export default TableBody;