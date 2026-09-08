import React from 'react';
import PropTypes from 'prop-types';
import { Row, Col, Label } from 'reactstrap';

const propTypes = {
  displayName: PropTypes.string.isRequired,
  helpTip: PropTypes.string,
  mainContent: PropTypes.object.isRequired,
  extraContent: PropTypes.object
};

function SettingItemBase(props) {
  const { helpTip, displayName, mainContent, extraContent, mainClassName = '' } = props;
  return (
    <Row className="my-4">
      <Col md="3">
        <Label className="web-setting-label">{displayName}</Label>
      </Col>
      <Col md="5" className={mainClassName}>
        {mainContent}
        {helpTip && <p className="small text-secondary mt-1">{helpTip}</p>}
      </Col>
      <Col md="4">
        {extraContent}
      </Col>
    </Row>
  );
}

SettingItemBase.propTypes = propTypes;

export default SettingItemBase;
