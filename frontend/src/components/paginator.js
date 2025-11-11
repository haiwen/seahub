import React, { Component } from 'react';
import PropTypes from 'prop-types';
import className from 'classnames';
import { navigate } from '@gatsbyjs/reach-router';
import { gettext } from '../utils/constants';
import { Button, DropdownMenu, Dropdown, DropdownToggle, DropdownItem } from 'reactstrap';

import '../css/pagination.css';

const propTypes = {
  currentPage: PropTypes.number.isRequired,
  gotoPreviousPage: PropTypes.func.isRequired,
  gotoNextPage: PropTypes.func.isRequired,
  hasNextPage: PropTypes.bool.isRequired,
  resetPerPage: PropTypes.func.isRequired,
  curPerPage: PropTypes.number.isRequired,
  noURLUpdate: PropTypes.bool
};

const PER_PAGES = [25, 50, 100];

class Paginator extends Component {

  constructor(props) {
    super(props);
    this.state = {
      isMenuShow: false
    };
  }

  resetPerPage = (perPage) => {
    this.updateURL(1, perPage);
    this.props.resetPerPage(perPage);
  };

  goToPrevious = () => {
    const { currentPage, curPerPage } = this.props;
    this.updateURL(currentPage - 1, curPerPage);
    this.props.gotoPreviousPage();
  };

  goToNext = () => {
    const { currentPage, curPerPage } = this.props;
    this.updateURL(currentPage + 1, curPerPage);
    this.props.gotoNextPage();
  };

  updateURL = (page, perPage) => {
    const { noURLUpdate = false } = this.props;
    if (noURLUpdate) {
      return;
    }
    let url = new URL(location.href);
    let searchParams = new URLSearchParams(url.search);
    searchParams.set('page', page);
    searchParams.set('per_page', perPage);
    url.search = searchParams.toString();
    navigate(url.toString());
  };

  getPerPageText = (perPage) => {
    return gettext('{number_placeholder} / Page').replace('{number_placeholder}', perPage);
  };

  toggleOperationMenu = (e) => {
    e.stopPropagation();
    this.setState({ isMenuShow: !this.state.isMenuShow });
  };

  renderDropdownItem = (curPerPage, perPage) => {
    return (
      <DropdownItem onClick={() => {this.resetPerPage(perPage);}} key={perPage} className='paginator-dropdown-item'>
        <span className='paginator-dropdown-tick'>
          {curPerPage === perPage && <i className="sf2-icon-tick"></i>}
        </span>
        <span>
          {this.getPerPageText(perPage)}
        </span>
      </DropdownItem>
    );
  };

  render() {
    const { curPerPage, currentPage } = this.props;
    return (
      <div className="my-6 paginator d-flex align-items-center justify-content-center">
        <Button
          disabled={currentPage == 1}
          onClick={this.goToPrevious}
          title={gettext('Previous')}
          aria-label={gettext('Previous')}
        >
          <i className='sf3-font sf3-font-down rotate-90 d-inline-block'></i>
        </Button>
        <span className="btn btn-primary mx-4">{currentPage}</span>
        <Button
          disabled={!this.props.hasNextPage}
          onClick={this.goToNext}
          title={gettext('Next')}
          aria-label={gettext('Next')}
        >
          <i className="sf3-font sf3-font-down rotate-270 d-inline-block"></i>
        </Button>

        <Dropdown isOpen={this.state.isMenuShow} toggle={this.toggleOperationMenu} direction="up" className="paginator-dropdown ml-6">
          <DropdownToggle
            tag="button"
            data-toggle="dropdown"
            className='btn btn-secondary'
            aria-expanded={this.state.isMenuShow}
            onClick={this.toggleOperationMenu}
          >
            <span className='pr-3'>{this.getPerPageText(curPerPage)}</span>
            <span aria-hidden="true" className={className('sf3-font sf3-font-down d-inline-block', { 'rotate-180': this.state.isMenuShow })}></span>
          </DropdownToggle>
          <DropdownMenu className="paginator-dropdown-menu">
            {PER_PAGES.map(perPage => {
              return this.renderDropdownItem(curPerPage, perPage);
            })}
          </DropdownMenu>
        </Dropdown>
      </div>
    );
  }
}

Paginator.propTypes = propTypes;

export default Paginator;
