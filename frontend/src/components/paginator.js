import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { navigate } from '@reach/router';
import { gettext } from '../utils/constants';

import '../css/pagination.css';

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

  resetPerPage = (e) => {
    const perPage = e.target.value;
    this.updateURL(1, perPage);
    this.props.resetPerPage(perPage);
  }

  goToPrevious = () => {
    const { currentPage, curPerPage } = this.props;
    this.updateURL(currentPage - 1, curPerPage);
    this.props.gotoPreviousPage();
  } 

  goToNext = () => {
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

  getPerPageText = (perPage) => {
    return gettext('{number_placeholder} / Page').replace('{number_placeholder}', perPage);
  }

  render() {
    const { curPerPage, currentPage } = this.props;
    return (
      <div className="my-6 paginator d-flex align-items-center justify-content-center">
        <button
          className="btn btn-secondary"
          disabled={currentPage == 1}
          onClick={this.goToPrevious}
        >
          <span className="fas fa-chevron-left"></span>
        </button>
        <span className="btn btn-primary mx-4">{currentPage}</span>
        <button
          className="btn btn-secondary"
          disabled={!this.props.hasNextPage}
          onClick={this.goToNext}
        >
          <span className="fas fa-chevron-right"></span>
        </button>

        <select
          className="form-control d-inline-block w-auto ml-6"
          value={curPerPage}
          onChange={this.resetPerPage}
        >
          <option value="25">{this.getPerPageText(25)}</option>
          <option value="50">{this.getPerPageText(50)}</option>
          <option value="100">{this.getPerPageText(100)}</option>
        </select>
      </div>
    );
  }
}

Paginator.propTypes = propTypes;

export default Paginator;
