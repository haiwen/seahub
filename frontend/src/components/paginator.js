import React, { Component } from 'react';
import PropTypes from 'prop-types';
import className from 'classnames';
import { navigate } from '@gatsbyjs/reach-router';
import { Button } from 'reactstrap';
import { gettext } from '../utils/constants';
import Icon from './icon';
import CustomDropdown from './dropdown';

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
      isMenuOpen: false
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

  handleMenuToggle = () => {
    this.setState({ isMenuOpen: !this.state.isMenuOpen });
  };

  getMenuItems = () => {
    const { curPerPage } = this.props;
    return PER_PAGES.map((perPage) => ({
      key: perPage,
      label: this.getPerPageText(perPage),
      checked: curPerPage === perPage,
      onClick: () => { this.resetPerPage(perPage); },
    }));
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
          <Icon symbol="down" className="rotate-90" />
        </Button>
        <span className="btn btn-primary mx-4">{currentPage}</span>
        <Button
          disabled={!this.props.hasNextPage}
          onClick={this.goToNext}
          title={gettext('Next')}
          aria-label={gettext('Next')}
        >
          <Icon symbol="down" className="rotate-270" />
        </Button>
        <CustomDropdown
          variant="control"
          items={this.getMenuItems()}
          trigger={(
            <>
              <span className='pr-3'>{this.getPerPageText(curPerPage)}</span>
              <span aria-hidden="true" className={className('d-inline-flex align-items-center', { 'rotate-180': this.state.isMenuOpen })}>
                <Icon symbol="down" />
              </span>
            </>
          )}
          triggerClassName="btn btn-secondary"
          menuClassName="paginator-dropdown-menu"
          className="paginator-dropdown ml-6"
          placement="top"
          menuPortal={false}
          onToggle={this.handleMenuToggle}
        />
      </div>
    );
  }
}

Paginator.propTypes = propTypes;

export default Paginator;
