import React from 'react';
import { Popover } from 'reactstrap';
import PropTypes from 'prop-types';
import { KeyCodes } from '../../constants';

const propTypes = {
  target: PropTypes.oneOfType([PropTypes.string, PropTypes.object]).isRequired,
  boundariesElement: PropTypes.object,
  innerClassName: PropTypes.string,
  popoverClassName: PropTypes.string,
  children: PropTypes.oneOfType([PropTypes.object, PropTypes.array]),
  hideSeahubPopover: PropTypes.func.isRequired,
  hideSeahubPopoverWithEsc: PropTypes.func,
  hideArrow: PropTypes.bool,
  canHideSeahubPopover: PropTypes.bool,
  placement: PropTypes.string,
  modifiers: PropTypes.object
};

class SeahubPopover extends React.Component {

  SeahubPopoverRef = null;
  isSelectOpen = false;

  componentDidMount() {
    document.addEventListener('mousedown', this.onMouseDown, true);
    document.addEventListener('keydown', this.onKeyDown);
  }

  componentWillUnmount() {
    document.removeEventListener('mousedown', this.onMouseDown, true);
    document.removeEventListener('keydown', this.onKeyDown);
  }

  getEventClassName = (e) => {
    // svg mouseEvent event.target.className is an object
    if (!e || !e.target) return '';
    return e.target.getAttribute('class') || '';
  };

  onKeyDown = (e) => {
    const { canHideSeahubPopover, hideSeahubPopoverWithEsc } = this.props;
    if (e.keyCode === KeyCodes.Escape && typeof hideSeahubPopoverWithEsc === 'function' && !this.isSelectOpen) {
      e.preventDefault();
      hideSeahubPopoverWithEsc();
    } else if (e.keyCode === KeyCodes.Enter) {
      // Resolve the default behavior of the enter key when entering formulas is blocked
      if (canHideSeahubPopover) return;
      e.stopImmediatePropagation();
    }
  };

  onMouseDown = (e) => {
    if (!this.props.canHideSeahubPopover) return;
    if (this.SeahubPopoverRef && e && this.getEventClassName(e).indexOf('popover') === -1 && !this.SeahubPopoverRef.contains(e.target)) {
      this.props.hideSeahubPopover(e);
    }
  };

  onPopoverInsideClick = (e) => {
    e.stopPropagation();
  };

  render() {
    const {
      target, boundariesElement, innerClassName, popoverClassName, hideArrow, modifiers,
      placement,
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
        <div ref={ref => this.SeahubPopoverRef = ref} onClick={this.onPopoverInsideClick}>
          {this.props.children}
        </div>
      </Popover>
    );
  }
}

SeahubPopover.defaultProps = {
  placement: 'bottom-start',
  hideArrow: true,
  canHideSeahubPopover: true
};

SeahubPopover.propTypes = propTypes;

export default SeahubPopover;
