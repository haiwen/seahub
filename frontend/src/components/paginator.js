import React, { Component, Fragment } from 'react';
import PropTypes from 'prop-types';
import { gettext } from '../utils/constants';
import { Label } from 'reactstrap';


const propTypes = {
  gotoPreviousPage: PropTypes.func.isRequired,
  gotoNextPage: PropTypes.func.isRequired,
  currentPage: PropTypes.number.isRequired,
  hasNextPage: PropTypes.bool.isRequired,
  canResetPerPage: PropTypes.bool.isRequired,
  resetPerPage: PropTypes.func
};

class Paginator extends Component {

  resetPerPage = (perPage) => {
    this.props.resetPerPage(perPage);
  }

  goToPrevious = (e) => {
    e.preventDefault();
    this.props.gotoPreviousPage();
  } 

  goToNext = (e) => {
    e.preventDefault();
    this.props.gotoNextPage();
  } 

  render() {
    return (
      <Fragment>
        <div className="my-6 text-center">
          {this.props.currentPage != 1 &&
            <a href="#" onClick={this.goToPrevious}>{gettext('Previous')}</a>
          }
          {this.props.hasNextPage &&
            <a href="#" onClick={this.goToNext} className="ml-4">{gettext('Next')}</a>
          }
        </div>
        {this.props.canResetPerPage &&
          <div>
            {gettext('Per page:')}{' '}
            <Label onClick={() => {return this.resetPerPage(25);}}>25</Label>
            <Label onClick={() => {return this.resetPerPage(50);}}>50</Label>
            <Label onClick={() => {return this.resetPerPage(100);}}>100</Label>
          </div>
        }
      </Fragment>
    );
  }
}

Paginator.propTypes = propTypes;

export default Paginator;
