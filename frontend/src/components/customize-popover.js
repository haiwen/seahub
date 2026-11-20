import React from 'react';
import { Popover } from 'reactstrap';
import PropTypes from 'prop-types';
import { KeyCodes } from '@/constants';

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

  isFocusInsidePopover = () => {
    const activeElement = document.activeElement;
    if (this.popoverRef?.contains(activeElement)) return true;

    let target = this.props.target?.current || this.props.target;
    if (typeof target === 'string') {
      target = document.getElementById(target) || document.querySelector(target);
    }
    const targetElements = target && typeof target.length === 'number' && !target.nodeType
      ? Array.from(target)
      : [target];
    return targetElements.some(element => element?.contains?.(activeElement));
  };

  onKeyDown = (e) => {
    const { canHidePopover = true, hidePopoverWithEsc } = this.props;
    if (e.keyCode === KeyCodes.Escape && typeof hidePopoverWithEsc === 'function' && !this.isSelectOpen) {
      if (!this.isFocusInsidePopover()) return;
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

    const clickOutside = this.popoverRef && !this.popoverRef.contains(e.target);
    if (clickOutside) {
      this.props.hidePopover(e);
    }
  };

  onPopoverInsideClick = (e) => {
    e.stopPropagation();
  };

  onPopoverInsideMouseDown = (e) => {
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
        <div
          ref={ref => this.popoverRef = ref}
          onClick={this.onPopoverInsideClick}
          onMouseDown={this.onPopoverInsideMouseDown}
        >
          {this.props.children}
        </div>
      </Popover>
    );
  }
}

CustomizePopover.propTypes = propTypes;

export default CustomizePopover;
