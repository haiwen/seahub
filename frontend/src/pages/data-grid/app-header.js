import React from 'react';
import PropTypes from 'prop-types';
import { Button } from 'reactstrap';
import Logo from '../../components/logo.js';

const propTypes = {
  onSave: PropTypes.func.isRequired,
};

class AddHeader extends React.Component {

  render() {
    return (
      <div id="header">
        <Logo></Logo>
        <Button color="primary" onClick={this.props.onSave}>保存</Button>
      </div>
    );
  }
}

AddHeader.propTypes = propTypes;

export default AddHeader;
