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
    this.btn = null;
  }

  togglePopover = () => {
    this.setState({
      isPopoverOpen: !this.state.isPopoverOpen
    });
  };

  render() {
    const { link } = this.props;
    const { isPopoverOpen } = this.state;
    return (
      <div className="ml-2" ref={ref => this.btn = ref}>
        <Button outline color="primary" className="btn-icon btn-qr-code-icon sf3-font sf3-font-qr-code" onClick={this.togglePopover} type="button"></Button>
        {this.btn && (
          <ClickOutside onClickOutside={() => this.setState({ isPopoverOpen: false })}>
            <QRCodePopover
              isOpen={isPopoverOpen}
              target={this.btn}
              onToggle={this.togglePopover}
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
