import React, { Fragment } from 'react';
import PropTypes from 'prop-types';
import { Dropdown, DropdownToggle, DropdownMenu, DropdownItem } from 'reactstrap';
import { gettext, siteRoot } from '../../utils/constants';
import { Utils } from '../../utils/utils';
import Icon from '../../components/icon';
import IconButton from '../icon-button';

const propTypes = {
  toggleDetailsPanel: PropTypes.func.isRequired,
  toggleHeader: PropTypes.func.isRequired
};

const {
  repoID, repoName, parentDir
} = window.app.pageOptions;

class OnlyofficeFileToolbar extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      dropdownOpen: false,
      moreDropdownOpen: false
    };
  }

  toggleMoreOpMenu = () => {
    this.setState({
      moreDropdownOpen: !this.state.moreDropdownOpen
    });
  };

  toggle = () => {
    this.setState({
      dropdownOpen: !this.state.dropdownOpen
    });
  };

  render() {
    const { moreDropdownOpen } = this.state;
    return (
      <Fragment>
        <div className="d-none d-md-flex justify-content-between align-items-center flex-shrink-0 ml-4">
          <IconButton
            id="file-details"
            icon='info'
            text={gettext('Details')}
            onClick={this.props.toggleDetailsPanel}
          />
          <Dropdown isOpen={moreDropdownOpen} toggle={this.toggleMoreOpMenu}>
            <DropdownToggle
              className="file-toolbar-btn"
              aria-label={gettext('More operations')}
              title={gettext('More operations')}
              tag="div"
            >
              <Icon symbol="more-vertical" />
            </DropdownToggle>
            <DropdownMenu right={true}>
              <a href={`${siteRoot}library/${repoID}/${Utils.encodePath(repoName + parentDir)}`} className="dropdown-item">
                {gettext('Open parent folder')}
              </a>
            </DropdownMenu>
          </Dropdown>
          <IconButton
            id="fold-header"
            icon='double-arrow-up'
            text={gettext('Fold')}
            onClick={this.props.toggleHeader}
          />
        </div>

        <Dropdown isOpen={this.state.dropdownOpen} toggle={this.toggle} className="d-block d-md-none flex-shrink-0 ml-4">
          <DropdownToggle className="mx-1" aria-label={gettext('More operations')}>
            <Icon symbol="more-vertical" />
          </DropdownToggle>
          <DropdownMenu right={true}>
            <DropdownItem onClick={this.props.toggleHeader}>{gettext('Fold')}</DropdownItem>
            <DropdownItem onClick={this.props.toggleDetailsPanel}>{gettext('Details')}</DropdownItem>
            <DropdownItem>
              <a href={`${siteRoot}library/${repoID}/${Utils.encodePath(repoName + parentDir)}`} className="text-inherit">
                {gettext('Open parent folder')}
              </a>
            </DropdownItem>
          </DropdownMenu>
        </Dropdown>
      </Fragment>
    );
  }
}

OnlyofficeFileToolbar.propTypes = propTypes;

export default OnlyofficeFileToolbar;
