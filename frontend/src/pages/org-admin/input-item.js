import React, { Component, Fragment } from 'react';
import { Input, InputGroup, Button, Row, Col, Label } from 'reactstrap';
import PropTypes from 'prop-types';
import Icon from '../../components/icon';
import { gettext } from '../../utils/constants';

const propTypes = {
  value: PropTypes.string,
  domainVerified: PropTypes.bool,
  isCertificate: PropTypes.bool,
  changeType: PropTypes.string.isRequired,
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

  UNSAFE_componentWillReceiveProps(nextProps) {
    this.setState({ value: nextProps.value, });
  }

  toggleBtns = () => {
    this.setState({ isBtnsShown: !this.state.isBtnsShown });
  };

  hideBtns = () => {
    if (!this.state.isBtnsShown) {
      return;
    }
    if (this.props.value != this.state.value) {
      this.setState({ value: this.props.value });
    }
    this.toggleBtns();
  };

  onInputChange = (e) => {
    this.setState({ value: e.target.value });
  };

  onSubmit = () => {
    const changeType = this.props.changeType;
    const value = this.state.value.trim();
    if (value != this.props.value) {
      this.props.changeValue(changeType, value);
    }
    this.toggleBtns();
  };

  render() {
    const { isBtnsShown, value } = this.state;
    const { displayName } = this.props;
    let inputType = this.props.isCertificate ? 'textarea' : 'text';

    return (
      <Fragment>
        <Row className="my-4">
          <Col md="3">
            <Label className="web-setting-label">{displayName}</Label>
          </Col>
          <Col md="5">
            <InputGroup>
              <Input type={inputType} value={value} onChange={this.onInputChange} onFocus={this.toggleBtns} onBlur={this.hideBtns}/>
              {this.props.domainVerified && (
                <Button color="success" className="border-0">{gettext('Verified')}</Button>
              )}
            </InputGroup>
            {this.props.isCertificate &&
              <p className="small text-secondary mt-1">
                {gettext('Copy the IdP\'s certificate and paste it here. The certificate format is as follows:')}
                <br/>
                -----BEGIN CERTIFICATE-----
                <br/>
                xxxxxxxxxxxxxxxxxxxx
                <br/>
                -----END CERTIFICATE-----
              </p>
            }
          </Col>
          <Col md="4">
            {isBtnsShown &&
              <Fragment>
                <Button color="primary" className="web-setting-icon-btn web-setting-icon-btn-submit" onMouseDown={this.onSubmit} title={gettext('Submit')}>
                  <Icon symbol="check" />
                </Button>
                <Button className="ml-1 web-setting-icon-btn web-setting-icon-btn-cancel" title={gettext('Cancel')}>
                  <Icon symbol="close" />
                </Button>
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
