import React, { Fragment } from 'react';
import PropTypes from 'prop-types';
import { Button, Input, InputGroup, InputGroupAddon } from 'reactstrap';
import { gettext } from '../utils/constants';
import ButtonQR from './btn-qr-code';

const propTypes = {
  link: PropTypes.string.isRequired,
  linkExpired: PropTypes.bool.isRequired,
  copyLink: PropTypes.func.isRequired
};

// for 'share link' & 'upload link'
class SharedLink extends React.Component {

  render() {
    const { link, linkExpired, copyLink } = this.props;
    return (
      <Fragment>
        <div className="d-flex">
          <InputGroup>
            <Input type="text" readOnly={true} value={link} />
            <InputGroupAddon addonType="append">
              <Button color="primary" onClick={copyLink} className="border-0">{gettext('Copy')}</Button>
            </InputGroupAddon>
          </InputGroup>
          <ButtonQR link={link} />
        </div>
        {linkExpired && <p className="err-message mt-1">({gettext('Expired')})</p>}
      </Fragment>
    );
  }
}

SharedLink.propTypes = propTypes;
export default SharedLink;
