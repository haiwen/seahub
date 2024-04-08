import React, { Component, Fragment } from 'react';
import PropTypes from 'prop-types';
import { Row, Col, Label } from 'reactstrap';

const propTypes = {
  displayName: PropTypes.string.isRequired,
  helpTip: PropTypes.string,
  mainContent: PropTypes.object.isRequired,
  extraContent: PropTypes.object
};

class SettingItemBase extends Component {

  constructor(props) {
    super(props);
  }

  render() {
    const { helpTip, displayName, mainContent, extraContent } = this.props;
    return (
      <Fragment>
        <Row className="my-4">
          <Col md="3">
            <Label className="web-setting-label">{displayName}</Label>
          </Col>
          <Col md="5">
            {mainContent}
            {helpTip && <p className="small text-secondary mt-1">{helpTip}</p>}
          </Col>
          <Col md="4">
            {extraContent}
          </Col>
        </Row>
      </Fragment>
    );
  }
}

SettingItemBase.propTypes = propTypes;

export default SettingItemBase;
