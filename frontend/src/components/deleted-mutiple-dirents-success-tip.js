import React, { Fragment } from 'react';
import PropTypes from 'prop-types';
import { gettext } from '../utils/constants';

const propTypes = {
  msg: PropTypes.string.isRequired,
  undo: PropTypes.func.isRequired,
};

class DeletedMutipleDirentsSuccessTip extends React.Component {

  constructor(props) {
    super(props);
    this.undo = this.undo.bind(this);
  }

  undo(e) {
    e.preventDefault();
    this.props.undo();
  }

  render() {
    return (
      <Fragment>
        <span>{this.props.msg} </span>
        <a className="action-link p-0" href="#" onClick={this.undo}>{gettext('Undo')}</a>
      </Fragment>
    );
  }
}

DeletedMutipleDirentsSuccessTip.propTypes = propTypes;

export default DeletedMutipleDirentsSuccessTip;
