import React from 'react';
import PropTypes from 'prop-types';
import { mediaUrl } from '../utils/constants';

class EmptyTip extends React.Component {

  render() {
    return (
      <div className="empty-tip">
        <img src={`${mediaUrl}img/no-items-tip.png`} alt="" width="140" height="140" className="no-items-img-tip" />
        {this.props.children}
      </div>
    );
  }
}

export default EmptyTip;
