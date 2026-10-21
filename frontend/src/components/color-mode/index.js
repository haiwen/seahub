import React, { Component, useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import OpIcon from '@/components/op-icon';
import { gettext } from '@/utils/constants';
import { getEffectiveColorMode, setColorMode, subscribeColorMode } from './theme';

import './index.css';

export { subscribeColorMode } from './theme';

export const useColorMode = (enabled = true) => {
  const [mode, setMode] = useState(() => enabled ? getEffectiveColorMode() : 'light');
  useEffect(() => {
    if (enabled) return subscribeColorMode(setMode);
  }, [enabled]);
  return mode;
};

class ColorMode extends Component {
  constructor(props) {
    super(props);
    this.state = {
      colorMode: getEffectiveColorMode()
    };
  }

  componentDidMount() {
    this.unsubscribe = subscribeColorMode(colorMode => this.setState({ colorMode }));
  }

  componentWillUnmount() {
    this.unsubscribe();
  }

  onColorModeChange = () => {
    const colorMode = this.state.colorMode === 'light' ? 'dark' : 'light';
    setColorMode(colorMode);
  };

  render() {
    const { colorMode } = this.state;
    const symbol = colorMode === 'light' ? 'dark-mode' : 'light-mode';
    const title = colorMode === 'light' ? gettext('Dark mode') : gettext('Light mode');
    const compact = this.props.variant === 'icon';
    return (
      <OpIcon id="color-mode-icon-btn" symbol={symbol} className={`sf-icon-color-mode${compact ? ' sf-icon-color-mode--icon' : ''}`} tooltip={title} style={{ width: compact ? 24 : 32, height: compact ? 24 : 32 }} op={this.onColorModeChange} />
    );
  }
}

ColorMode.propTypes = {
  variant: PropTypes.oneOf(['default', 'icon']),
};

export default ColorMode;
