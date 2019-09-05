import React, { Component, Fragment } from 'react';
import PropTypes from 'prop-types';
import { Row, Col, Input, Label } from 'reactstrap';

const propTypes = {
  saveSetting: PropTypes.func.isRequired,
  keyText: PropTypes.string.isRequired,
  value: PropTypes.oneOfType([PropTypes.bool, PropTypes.number]),
  helpTip: PropTypes.string.isRequired,
  displayName: PropTypes.string.isRequired
};

class WebSettingCheckbox extends Component {

  constructor(props) {
    super(props);
    this.state = {
      value: this.props.value
    };
  }

  changeContent = () => {
    this.setState({
      value: !this.state.value
    }, () => {
      let { value } = this.state;
      let valueToNum;
      if (value) {
        valueToNum = 1;
      } else {
        valueToNum = 0;
      }
      this.props.saveSetting(this.props.keyText, valueToNum);  
    });
  }

  render() {
    let { value } = this.state;
    let { helpTip, displayName } = this.props;
    return (
      <Fragment>
        <Row>
          <Col xs="3">
            <Label className="font-weight-bold">{displayName}</Label>
          </Col>
          <Col xs="4">
            <Input className="ml-0" checked={value} type='checkbox' onChange={this.changeContent}/>
            <p className="ml-4">{helpTip}</p>
          </Col>
        </Row>
      </Fragment>
    );
  }
}

WebSettingCheckbox.propTypes = propTypes;

export default WebSettingCheckbox;