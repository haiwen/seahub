import React from 'react';
import PropTypes from 'prop-types';
import classNames from 'classnames';
import { Button } from 'reactstrap';
import Icon from './icon';
import Tooltip from './tooltip';

const propTypes = {
  id: PropTypes.string.isRequired,
  icon: PropTypes.string.isRequired,
  text: PropTypes.string.isRequired,
  onClick: PropTypes.func,
  disabled: PropTypes.bool,
  href: PropTypes.string,
  shortcut: PropTypes.arrayOf(PropTypes.string),
};

class IconButton extends React.Component {

  constructor(props) {
    super(props);
  }

  render() {
    const { id, icon, text, onClick, disabled, href, shortcut } = this.props;
    const button = (href ? (
      <a
        id={id}
        className={classNames('file-toolbar-btn', { 'disabled': disabled })}
        aria-label={text}
        href={href}
      >
        <Icon symbol={icon} />
      </a>
    ) : (
      <Button
        id={id}
        className={classNames('border-0 p-0 bg-transparent file-toolbar-btn', { 'disabled': disabled })}
        onClick={disabled ? () => {} : onClick}
        aria-label={text}
        data-active={!disabled}
      >
        <Icon symbol={icon} />
      </Button>
    ));

    return (
      <>
        {button}
        <Tooltip
          target={id}
          placement='bottom'
          shortcut={shortcut}
        >
          {text}
        </Tooltip>
      </>
    );
  }
}
IconButton.propTypes = propTypes;

export default IconButton;
