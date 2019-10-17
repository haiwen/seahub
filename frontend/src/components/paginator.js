import React, { Component, Fragment } from 'react';
import PropTypes from 'prop-types';
import { gettext } from '../utils/constants';

const propTypes = {
  gotoPreviousPage: PropTypes.func.isRequired,
  gotoNextPage: PropTypes.func.isRequired,
  currentPage: PropTypes.number.isRequired,
  hasNextPage: PropTypes.bool.isRequired,
  canResetPerPage: PropTypes.bool.isRequired,
  resetPerPage: PropTypes.func,
  curPerPage: PropTypes.number,
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
    let { curPerPage } = this.props;
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
          <div className="text-center">
            {gettext('Per page:')}{' '}
            {curPerPage == 25 ?
              <a className="mr-1" onClick={() => {return this.resetPerPage(25);}}>25</a> :
              <a className="mr-1" href='#' onClick={() => {return this.resetPerPage(25);}}>25</a>
            }
            {curPerPage == 50 ?
              <a className="mr-1" onClick={() => {return this.resetPerPage(50);}}>50</a> :
              <a className="mr-1" href='#' onClick={() => {return this.resetPerPage(50);}}>50</a>
            }
            {curPerPage == 100 ?
              <a onClick={() => {return this.resetPerPage(100);}}>100</a> :
              <a href='#' onClick={() => {return this.resetPerPage(100);}}>100</a>
            }
          </div>
        }
      </Fragment>
    );
  }
}

Paginator.propTypes = propTypes;

export default Paginator;
