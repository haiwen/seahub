import React, { Component } from 'react';
import { gettext } from '@/utils/constants';
import Icon from '../../icon';

import './index.css';

class GoBack extends Component {

  onBackClick = (event) => {
    event.preventDefault();
    window.history.back();
  };

  render() {
    return (
      <div className="go-back" onClick={this.onBackClick} role="button" aria-label={gettext('Go back')} tabIndex={0}>
        <span className="rotate-90 d-inline-block" aria-hidden="true">
          <Icon symbol="down" />
        </span>
      </div>
    );
  }
}

export default GoBack;
