import React from 'react';
import PropTypes from 'prop-types';
import QRCode from 'qrcode.react';
import { Button, Popover, PopoverBody } from 'reactstrap';
import { gettext } from '../utils/constants';

import '../css/btn-qr-code.css';

const propTypes = {
  link: PropTypes.string.isRequired
};

class ButtonQR extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      isPopoverOpen: false
    };

    this.btnID = 'btn-' + Math.random().toString().substr(2,5);
  }

  togglePopover = () => {
    this.setState({
      isPopoverOpen: !this.state.isPopoverOpen
    });
  }

  render() {
    const { link } = this.props;
    const { isPopoverOpen } = this.state;
    return (
      <div className="ml-2">
        <Button outline color="primary" className="btn-icon btn-qr-code-icon sf3-font sf3-font-qr-code" id={this.btnID} onClick={this.togglePopover} type="button"></Button>
        <Popover placement="bottom" isOpen={isPopoverOpen} target={this.btnID} toggle={this.togglePopover}>
          <PopoverBody>
            <QRCode value={link} size={128} />
            <p className="m-0 mt-1 text-center" style={{'maxWidth': '128px'}}>{gettext('Scan the QR code to view the shared content directly')}</p>
          </PopoverBody>
        </Popover>
      </div>
    );
  }
}

ButtonQR.propTypes = propTypes;
export default ButtonQR;
