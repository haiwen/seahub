import React from 'react';
import PropTypes from 'prop-types';
import { Button } from 'reactstrap';

const propTypes = {
  onSave: PropTypes.func.isRequired,
};

const { fileName } = window.app.pageOptions;

class AddHeader extends React.Component {

  render() {
    return (
      <div id="header">
        <div className="sf-font">{fileName}</div>
        <Button color="primary" onClick={this.props.onSave}>保存</Button>
      </div>
    );
  }
}

AddHeader.propTypes = propTypes;

export default AddHeader;
