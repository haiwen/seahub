import React from 'react';

class ButtonGroup extends React.PureComponent {
  render() {
    return (
      <div className={'btn-group ' + this.props.className} role={'group'}>
        {this.props.children}
      </div>
    );
  }
}

export default ButtonGroup;
