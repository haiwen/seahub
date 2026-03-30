import React, { Component } from 'react';
import { getColorScheme, Utils } from '../../utils/utils';
import { gettext, SF_COLOR_MODE } from '../../utils/constants';
import IconBtn from '../icon-btn';

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
      <IconBtn
        symbol={symbol}
        size={32}
        className="sf-icon-color-mode ml-2"
        title={title}
        onClick={this.onColorModeChange}
        tabIndex={0}
        role="button"
        aria-label={title}
        onKeyDown={Utils.onKeyDown}
      />
    );
  }
}

export default ColorMode;
