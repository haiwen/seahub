import React from 'react';
import { Button } from 'reactstrap';

class ToggleFilter extends React.Component {

  constructor(props) {
    super(props);
  }

  render() {
    const { filterBy } = this.props;
    return (
      <Button
        color='secondary'
        className="my-2 mr-2"
        onClick={this.props.toggleFilter}
      >   
        <span className="text-primary">{filterBy}</span>
        <span className="ml-2 close" style={{fontSize: '1.2rem'}}>x</span>
      </Button>
    );

  }

}

export default ToggleFilter;
