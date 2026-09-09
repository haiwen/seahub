import React, { Component } from 'react';
import { getColorScheme } from '../../utils/utils';
import { gettext, SF_COLOR_MODE } from '../../utils/constants';
import OpIcon from '../op-icon';

class ColorMode extends Component {
  constructor(props) {
    super(props);
    this.state = {
      colorMode: getColorScheme()
    };
  }

  componentDidMount() {
    const { colorMode } = this.state;
    document.body.setAttribute('data-bs-theme', colorMode);
  }

  onColorModeChange = () => {
    const colorMode = this.state.colorMode === 'light' ? 'dark' : 'light';
    this.setState({ colorMode });
    localStorage.setItem(SF_COLOR_MODE, colorMode);
    document.body.setAttribute('data-bs-theme', colorMode);
  };

  render() {
    const { colorMode } = this.state;
    const symbol = colorMode === 'light' ? 'dark-mode' : 'light-mode';
    const title = colorMode === 'light' ? gettext('Dark mode') : gettext('Light mode');
    return (
      <OpIcon id="color-mode-icon-btn" symbol={symbol} className="sf-icon-color-mode" tooltip={title} style={{ width: 32, height: 32 }} op={this.onColorModeChange} />
    );
  }
}

export default ColorMode;
