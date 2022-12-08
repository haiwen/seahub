import React, { Component, Fragment } from 'react';
import { Input, Row, Col, Label } from 'reactstrap';
import PropTypes from 'prop-types';

const propTypes = {
  value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  changeValue: PropTypes.func.isRequired,
  displayName: PropTypes.string.isRequired,
};

class OrgSamlConfigInput extends Component {

  constructor(props) {
    super(props);
  }

  inputValue = (e) => {
    this.props.changeValue(e);
  }

  render() {
    const { value, displayName } = this.props;
    return (
      <Fragment>
        <Row className="my-4">
          <Col md="3">
            <Label className="web-setting-label">{displayName}</Label>
          </Col>
          <Col md="5">
            <Input innerRef={input => {this.newInput = input;}} value={value} onChange={this.inputValue}/>
          </Col>
        </Row>
      </Fragment>
    );
  }
}

OrgSamlConfigInput.propTypes = propTypes;

export default OrgSamlConfigInput;
