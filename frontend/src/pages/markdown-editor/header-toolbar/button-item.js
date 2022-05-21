import React from 'react';
import PropTypes from 'prop-types';
import { Tooltip } from 'reactstrap';

const propTypes = {
  id: PropTypes.string.isRequired,
  isActive: PropTypes.bool,
  disabled: PropTypes.bool,
  isRichEditor: PropTypes.bool,
  className: PropTypes.string,
  icon: PropTypes.string,
  text: PropTypes.string,
};

class ButtonItem extends React.Component {

  static defaultProps = {
    className: '',
    isActive: false,
  }

  constructor(props) {
    super(props);
    this.state = {
      tooltipOpen: false,
      isFreezed: false,
    };
    this.timer = null;
  }

  componentWillUnmount() {
    this.timer && clearTimeout(this.timer);
  }

  toggle = () => {
    const { disabled } = this.props;
    if (disabled) return;

    const { isFreezed, tooltipOpen } = this.state;
    if (isFreezed && !tooltipOpen) return;
    this.setState({tooltipOpen: !tooltipOpen, isFreezed: true});

    setTimeout(() => {
      this.setState({ isFreezed: false });
    }, 100);
  }

  shouldComponentUpdate (nextProps, nextState) {
    const { disabled, isActive } = nextProps;
    const { disabled: oldDisabled, isActive: oldIsActive } = this.props;
    if (disabled !== oldDisabled) {
      this.setState({tooltipOpen: false});
      return true;
    }
    // only render iconButton when the button is active or show show tooltip
    const { tooltipOpen } = nextState;
    const { tooltipOpen: oldTooltipOpen } = this.state;
    if (tooltipOpen === oldTooltipOpen && isActive === oldIsActive) {
      return false;
    }

    return true;
  }

  onClick = (event) => {
    if (!this.props.disabled) {
      this.props.onClick && this.props.onClick(event);
    }
  }
  
  onMouseDown = (event) => {
    if (!this.props.disabled) {
      this.props.onMouseDown(event);
    }
  }

  getClassName = () => {
    const { isRichEditor, className, disabled } = this.props;
    let itemClass = 'btn btn-icon btn-secondary btn-active';
    if (!isRichEditor) return itemClass + ' ' + className;

    itemClass = `rich-icon-btn ${disabled ? 'rich-icon-btn-disabled' : 'rich-icon-btn-hover'}`;
    return itemClass + ' ' + className;
  }

  render() {
    const { tooltipOpen } = this.state;
    const { id, isActive, disabled, icon, text } = this.props;
    const className = this.getClassName();
    const delay = {show: 0, hide: 0};
    return (
      <button 
        type="button"
        id={id} 
        className={className}
        data-active={isActive }
        disabled={disabled}
        onClick ={this.onClick} 
        onMouseDown={this.onMouseDown}
      >
        <i className={icon} />
        <Tooltip target={id} isOpen={tooltipOpen} delay={delay} placement='bottom' toggle={this.toggle}>
          {text}
        </Tooltip>
      </button>
    );
  }
}

ButtonItem.propTypes = propTypes;

export default ButtonItem;
