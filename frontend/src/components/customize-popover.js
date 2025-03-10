import React from 'react';
import { Popover } from 'reactstrap';
import PropTypes from 'prop-types';
import { KeyCodes } from '../constants';
import { getEventClassName } from '../utils/dom';

const propTypes = {
  target: PropTypes.oneOfType([PropTypes.string, PropTypes.object]).isRequired,
  boundariesElement: PropTypes.object,
  innerClassName: PropTypes.string,
  popoverClassName: PropTypes.string,
  children: PropTypes.oneOfType([PropTypes.object, PropTypes.array]),
  hidePopover: PropTypes.func.isRequired,
  hidePopoverWithEsc: PropTypes.func,
  hideArrow: PropTypes.bool,
  canHidePopover: PropTypes.bool,
  placement: PropTypes.string,
  modifiers: PropTypes.object
};

class CustomizePopover extends React.Component {

  popoverRef = null;
  isSelectOpen = false;

  componentDidMount() {
    document.addEventListener('mousedown', this.onMouseDown);
    document.addEventListener('keydown', this.onKeyDown);
  }

  componentWillUnmount() {
    document.removeEventListener('mousedown', this.onMouseDown);
    document.removeEventListener('keydown', this.onKeyDown);
  }

  onKeyDown = (e) => {
    const { canHidePopover = true, hidePopoverWithEsc } = this.props;
    if (e.keyCode === KeyCodes.Escape && typeof hidePopoverWithEsc === 'function' && !this.isSelectOpen) {
      e.preventDefault();
      hidePopoverWithEsc();
    } else if (e.keyCode === KeyCodes.Enter) {
      // Resolve the default behavior of the enter key when entering formulas is blocked
      if (canHidePopover) return;
      e.stopImmediatePropagation();
    }
  };

  onMouseDown = (e) => {
    const { canHidePopover = true } = this.props;
    if (!canHidePopover) return;
    if (this.popoverRef && e && getEventClassName(e).indexOf('popover') === -1 && !this.popoverRef.contains(e.target)) {
      this.props.hidePopover(e);
    }
  };

  onPopoverInsideClick = (e) => {
    e.stopPropagation();
  };

  render() {
    const {
      target, boundariesElement, innerClassName, popoverClassName, hideArrow = true, modifiers,
      placement = 'bottom-start',
    } = this.props;
    let additionalProps = {};
    if (boundariesElement) {
      additionalProps.boundariesElement = boundariesElement;
    }
    return (
      <Popover
        placement={placement}
        isOpen={true}
        target={target}
        fade={false}
        hideArrow={hideArrow}
        innerClassName={innerClassName}
        className={popoverClassName}
        modifiers={modifiers}
        {...additionalProps}
      >
        <div ref={ref => this.popoverRef = ref} onClick={this.onPopoverInsideClick}>
          {this.props.children}
        </div>
      </Popover>
    );
  }
}

CustomizePopover.propTypes = propTypes;

export default CustomizePopover;
