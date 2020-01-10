import React, { Component, Fragment } from 'react';
import PropTypes from 'prop-types';
import { navigate } from '@reach/router';
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
    this.updateURL(1, perPage);
    this.props.resetPerPage(perPage);
  }

  goToPrevious = (e) => {
    e.preventDefault();
    const { currentPage, curPerPage } = this.props;
    this.updateURL(currentPage - 1, curPerPage);
    this.props.gotoPreviousPage();
  } 

  goToNext = (e) => {
    e.preventDefault();
    const { currentPage, curPerPage } = this.props;
    this.updateURL(currentPage + 1, curPerPage);
    this.props.gotoNextPage();
  } 

  updateURL = (page, perPage) => {
    let url = new URL(location.href);
    let searchParams = new URLSearchParams(url.search);
    searchParams.set('page', page);
    searchParams.set('per_page', perPage);
    url.search = searchParams.toString();
    navigate(url.toString());
  }

  render() {
    let { curPerPage, currentPage } = this.props;
    return (
      <Fragment>
        <div className="my-6 text-center">
          {this.props.currentPage != 1 &&
            <a href="#" onClick={this.goToPrevious}>{gettext('Previous')}</a>
          }
          <span className="mx-4">{currentPage}</span>
          {this.props.hasNextPage &&
            <a href="#" onClick={this.goToNext}>{gettext('Next')}</a>
          }
          {(this.props.currentPage != 1 || this.props.hasNextPage) &&
            <span className="d-inline-block mx-2">|</span>
          }
          {this.props.canResetPerPage &&
          <Fragment>
            {gettext('Per page:')}
            <span className={`${curPerPage === 25 ? '' : 'a-simulate '} mx-1`} onClick={() => {return this.resetPerPage(25);}}>25</span>
            <span className={`${curPerPage === 50 ? '' : 'a-simulate '} mr-1`} onClick={() => {return this.resetPerPage(50);}}>50</span>
            <span className={`${curPerPage === 100 ? '' : 'a-simulate '}`} onClick={() => {return this.resetPerPage(100);}}>100</span>
          </Fragment>
          }
        </div>
      </Fragment>
    );
  }
}

Paginator.propTypes = propTypes;

export default Paginator;
