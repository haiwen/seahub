import React from 'react';
import PropTypes from 'prop-types';
import { mediaUrl } from '../utils/constants';

const propTypes = {
  forDialog: PropTypes.bool
};

class EmptyTip extends React.Component {

  render() {
    return (
      <div className={this.props.forDialog ? 'text-center mt-8' : 'empty-tip'}>
        <img src={`${mediaUrl}img/no-items-tip.png`} alt="" width="100" height="100" className="no-items-img-tip" />
        {this.props.children}
      </div>
    );
  }
}

EmptyTip.propTypes = propTypes;

export default EmptyTip;
