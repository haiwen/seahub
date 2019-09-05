import React, { Component, Fragment } from 'react';
import PropTypes from 'prop-types';
import { Row, Col, Input, Button, Label } from 'reactstrap';
import { gettext } from '../../../utils/constants';

const propTypes = {
  saveSetting: PropTypes.func.isRequired,
  keyText: PropTypes.string.isRequired,
  value: PropTypes.oneOfType([PropTypes.string,PropTypes.number]),
  helpTip: PropTypes.string.isRequired,
  displayName: PropTypes.string.isRequired
};

class WebSettingInput extends Component {

  constructor(props) {
    super(props);
    this.state = {
      isBtnsShown: false,
      value: this.props.value
    };
  }

  showBtns = () => {
    this.setState({isBtnsShown: !this.state.isBtnsShown});
  }

  hideBtns = () => {
    // when turn off btns, and value be changed, 
    // restore value to its origin value
    if (this.state.isBtnsShown && (this.props.value != this.state.temp_value)) {
      this.setState({value: this.props.value});
    }
    this.setState({isBtnsShown: false});
  }

  changeContent = (e) => {
    this.setState({ value: e.target.value });
  }

  saveSetting = (e) => {
    let { value } = this.state;
    // firstly prevent blur, then if not changed, do nothing
    // if value changed, send request, and hide btn
    e.preventDefault();
    if (value == this.props.value) return;
    this.props.saveSetting(this.props.keyText, value);
    this.setState({isBtnsShown: false});
  }

  render() {
    let { isBtnsShown, value } = this.state;
    let { helpTip, displayName } = this.props;
    return (
      <Fragment>
        <Row>
          <Col xs="3">
            <Label className="font-weight-bold">{displayName}</Label>
          </Col>
          <Col xs="4">
            <Input type={'text'} onChange={this.changeContent} onFocus={this.showBtns} onBlur={this.hideBtns} value={value}/>
            <p>{helpTip}</p>
          </Col>
          <Col xs="4">
            {isBtnsShown &&
              <Fragment>
                <Button color="primary" onMouseDown={this.saveSetting}>{gettext('Save')}</Button>
                <Button className="ml-1" color="secondary">{gettext('Cancel')}</Button>
              </Fragment>
            }
          </Col>
        </Row>
      </Fragment>
    );
  }
}

WebSettingInput.propTypes = propTypes;

export default WebSettingInput;