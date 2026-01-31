import React from 'react';
import PropTypes from 'prop-types';
import { Button } from 'reactstrap';
import QRCodePopover from './qr-code-popover';
import ClickOutside from './click-outside';

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
    this.btn = React.createRef();
  }

  togglePopover = () => {
    this.setState({
      isPopoverOpen: !this.state.isPopoverOpen
    });
  };

  onClickOutside = (e) => {
    if (this.btn.current && !this.btn.current.contains(e.target)) {
      this.setState({ isPopoverOpen: false });
    }
  };

  render() {
    const { link } = this.props;
    const { isPopoverOpen } = this.state;
    return (
      <div className="ml-2" id="qr-code-button" ref={this.btn}>
        <Button
          outline
          color="primary"
          className="btn-icon btn-qr-code-icon sf3-font sf3-font-qr-code" onClick={this.togglePopover}
          type="button"
        >
        </Button>
        {isPopoverOpen && (
          <ClickOutside onClickOutside={this.onClickOutside}>
            <QRCodePopover
              container={this.btn}
              target="qr-code-button"
              value={link}
            />
          </ClickOutside>
        )}
      </div>
    );
  }
}

ButtonQR.propTypes = propTypes;
export default ButtonQR;
