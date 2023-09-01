import React, { Component, Fragment } from 'react';
import { Input, InputGroup, InputGroupAddon, Button, Row, Col, Label } from 'reactstrap';
import PropTypes from 'prop-types';
import { gettext } from '../../utils/constants';

const propTypes = {
  value: PropTypes.string,
  domainVerified: PropTypes.bool,
  changeValue: PropTypes.func.isRequired,
  displayName: PropTypes.string.isRequired,
};

class OrgSamlConfigInput extends Component {

  constructor(props) {
    super(props);
    this.state = {
      isBtnsShown: false,
      value: this.props.value,
    };
  }

  componentWillReceiveProps(nextProps) {
    this.setState({value: nextProps.value,});
  };

  toggleBtns = () => {
    this.setState({isBtnsShown: !this.state.isBtnsShown});
  };

  hideBtns = () => {
    if (!this.state.isBtnsShown) {
      return;
    }
    if (this.props.value != this.state.value) {
      this.setState({value: this.props.value});
    }
    this.toggleBtns();
  };

  onInputChange = (e) => {
    this.setState({ value: e.target.value });
  };

  onSubmit = () => {
    const value = this.state.value.trim();
    if (value != this.props.value) {
      this.props.changeValue(value);
    }
    this.toggleBtns();
  };

  render() {
    const { isBtnsShown, value } = this.state;
    const { displayName } = this.props;
    return (
      <Fragment>
        <Row className="my-4">
          <Col md="3">
            <Label className="web-setting-label">{displayName}</Label>
          </Col>
          <Col md="5">
            <InputGroup>
              <Input type='text' value={value} onChange={this.onInputChange} onFocus={this.toggleBtns} onBlur={this.hideBtns}/>
              {this.props.domainVerified &&
                <InputGroupAddon addonType="append">
                  <Button color="success" className="border-0">{gettext('Verified')}</Button>
                </InputGroupAddon>
              }
            </InputGroup>
          </Col>
          <Col md="4">
            {isBtnsShown &&
              <Fragment>
                <Button className="sf2-icon-tick web-setting-icon-btn web-setting-icon-btn-submit" onMouseDown={this.onSubmit} title={gettext('Submit')}></Button>
                <Button className="ml-1 sf2-icon-x2 web-setting-icon-btn web-setting-icon-btn-cancel" title={gettext('Cancel')}></Button>
              </Fragment>
            }
          </Col>
        </Row>
      </Fragment>
    );
  }
}

OrgSamlConfigInput.propTypes = propTypes;

export default OrgSamlConfigInput;
