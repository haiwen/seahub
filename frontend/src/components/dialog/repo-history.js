import React from 'react';
import PropTypes from 'prop-types';
import dayjs from 'dayjs';
import { Modal, ModalBody } from 'reactstrap';
import { Utils } from '../../utils/utils';
import { gettext, siteRoot, enableRepoSnapshotLabel as showLabel } from '../../utils/constants';
import { seafileAPI } from '../../utils/seafile-api';
import Loading from '../loading';
import Paginator from '../../components/paginator';
import ModalPortal from '../../components/modal-portal';
import CommitDetails from '../../components/dialog/commit-details';
import UpdateRepoCommitLabels from '../../components/dialog/edit-repo-commit-labels';
import SeahubModalHeader from '@/components/common/seahub-modal-header';
import { formatWithTimezone } from '../../utils/time';
import Icon from '../icon';

import '../../css/repo-history.css';

const propTypes = {
  repoID: PropTypes.string.isRequired,
  userPerm: PropTypes.string.isRequired,
  currentRepoInfo: PropTypes.object.isRequired,
  toggleDialog: PropTypes.func.isRequired
};

class RepoHistory extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      isLoading: true,
      errorMsg: '',
      currentPage: 1,
      perPage: 100,
      hasNextPage: false,
      items: []
    };
  }

  componentDidMount() {
    this.getItems(this.state.currentPage);
  }

  getItems = (page) => {
    const { repoID } = this.props;
    seafileAPI.getRepoHistory(repoID, page, this.state.perPage).then((res) => {
      this.setState({
        isLoading: false,
        currentPage: page,
        items: res.data.data,
        hasNextPage: res.data.more
      });
    }).catch((error) => {
      this.setState({
        isLoading: false,
        errorMsg: Utils.getErrorMsg(error, true) // true: show login tip if 403
      });
    });
  };

  resetPerPage = (perPage) => {
    this.setState({
      perPage: perPage
    }, () => {
      this.getItems(1);
    });
  };

  render() {
    const { repoID, userPerm, currentRepoInfo, toggleDialog } = this.props;
    const { repo_name: repoName } = currentRepoInfo;

    let title = gettext('{placeholder} Modification History');
    title = title.replace('{placeholder}', '<span class="op-target text-truncate mx-1">' + Utils.HTMLescape(repoName) + '</span>');

    return (
      <Modal isOpen={true} toggle={toggleDialog} size='xl' id="repo-history-dialog">
        <SeahubModalHeader toggle={toggleDialog}>
          <span dangerouslySetInnerHTML={{ __html: title }} className="d-flex mw-100"></span>
        </SeahubModalHeader>
        <ModalBody>
          {userPerm == 'rw' && <p className="repo-snapshot-tip">{gettext('Tip: a snapshot will be generated after modification, which records the library state after the modification.')}</p>}
          <Content
            isLoading={this.state.isLoading}
            errorMsg={this.state.errorMsg}
            items={this.state.items}
            currentPage={this.state.currentPage}
            hasNextPage={this.state.hasNextPage}
            curPerPage={this.state.perPage}
            resetPerPage={this.resetPerPage}
            getListByPage={this.getItems}
            repoID={repoID}
            userPerm={userPerm}
          />
        </ModalBody>
      </Modal>
    );
  }
}

class Content extends React.Component {

  constructor(props) {
    super(props);
    this.theadData = showLabel ? [
      { width: '43%', text: gettext('Description') },
      { width: '12%', text: gettext('Time') },
      { width: '9%', text: gettext('Modifier') },
      { width: '12%', text: `${gettext('Device')} / ${gettext('Version')}` },
      { width: '12%', text: gettext('Labels') },
      { width: '12%', text: '' }
    ] : [
      { width: '43%', text: gettext('Description') },
      { width: '15%', text: gettext('Time') },
      { width: '15%', text: gettext('Modifier') },
      { width: '15%', text: `${gettext('Device')} / ${gettext('Version')}` },
      { width: '12%', text: '' }
    ];
  }

  getPreviousPage = () => {
    this.props.getListByPage(this.props.currentPage - 1);
  };

  getNextPage = () => {
    this.props.getListByPage(this.props.currentPage + 1);
  };

  render() {
    const {
      isLoading, errorMsg, items,
      curPerPage, currentPage, hasNextPage
    } = this.props;

    if (isLoading) {
      return <Loading />;
    }

    if (errorMsg) {
      return <p className="error mt-6 text-center">{errorMsg}</p>;
    }

    return (
      <React.Fragment>
        <table className="table-hover">
          <thead>
            <tr>
              {this.theadData.map((item, index) => {
                return <th key={index} width={item.width}>{item.text}</th>;
              })}
            </tr>
          </thead>
          <tbody>
            {items.map((item, index) => {
              item.isFirstCommit = (currentPage == 1) && (index == 0);
              item.showDetails = hasNextPage || (index != items.length - 1);
              return <Item key={index} item={item} repoID={this.props.repoID} userPerm={this.props.userPerm} />;
            })}
          </tbody>
        </table>
        <Paginator
          gotoPreviousPage={this.getPreviousPage}
          gotoNextPage={this.getNextPage}
          currentPage={currentPage}
          hasNextPage={hasNextPage}
          curPerPage={curPerPage}
          resetPerPage={this.props.resetPerPage}
          noURLUpdate={true}
        />
      </React.Fragment>
    );
  }
}

Content.propTypes = {
  isLoading: PropTypes.bool.isRequired,
  errorMsg: PropTypes.string.isRequired,
  items: PropTypes.array.isRequired,
  currentPage: PropTypes.number.isRequired,
  hasNextPage: PropTypes.bool.isRequired,
  curPerPage: PropTypes.number.isRequired,
  resetPerPage: PropTypes.func.isRequired,
  getListByPage: PropTypes.func.isRequired,
};

class Item extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      labels: this.props.item.tags,
      isIconShown: false,
      isCommitLabelUpdateDialogOpen: false,
      isCommitDetailsDialogOpen: false
    };
  }

  handleMouseOver = () => {
    this.setState({ isIconShown: true });
  };

  handleMouseOut = () => {
    this.setState({ isIconShown: false });
  };

  showCommitDetails = (e) => {
    e.preventDefault();
    this.setState({
      isCommitDetailsDialogOpen: !this.state.isCommitDetailsDialogOpen
    });
  };

  toggleCommitDetailsDialog = () => {
    this.setState({
      isCommitDetailsDialogOpen: !this.state.isCommitDetailsDialogOpen
    });
  };

  editLabel = () => {
    this.setState({
      isCommitLabelUpdateDialogOpen: !this.state.isCommitLabelUpdateDialogOpen
    });
  };

  toggleLabelEditDialog = () => {
    this.setState({
      isCommitLabelUpdateDialogOpen: !this.state.isCommitLabelUpdateDialogOpen
    });
  };

  updateLabels = (labels) => {
    this.setState({
      labels: labels
    });
  };

  render() {
    const { item, repoID, userPerm } = this.props;
    const { isIconShown, isCommitLabelUpdateDialogOpen, isCommitDetailsDialogOpen, labels } = this.state;

    let name = '';
    if (item.email) {
      if (!item.second_parent_id) {
        name = <a href={`${siteRoot}profile/${encodeURIComponent(item.email)}/`}>{item.name}</a>;
      } else {
        name = gettext('None');
      }
    } else {
      name = gettext('Unknown');
    }

    return (
      <React.Fragment>
        <tr onMouseOver={this.handleMouseOver} onMouseOut={this.handleMouseOut} onFocus={this.handleMouseOver}>
          <td>
            {item.description}
            {item.showDetails &&
            <a href="#" className="details" onClick={this.showCommitDetails} role="button">{gettext('Details')}</a>
            }
          </td>
          <td title={formatWithTimezone(item.time)}>{dayjs(item.time).format('YYYY-MM-DD')}</td>
          <td>{name}</td>
          <td>
            {item.client_version ? `${item.device_name} / ${item.client_version}` : 'API / --'}
          </td>
          {showLabel &&
          <td>
            {labels.map((item, index) => {
              return <span key={index} className="commit-label">{item}</span>;
            })}
            {userPerm == 'rw' &&
            <span
              role="button"
              className={`op-icon op-icon-bg-light ${isIconShown ? '' : 'invisible'}`}
              title={gettext('Edit')}
              aria-label={gettext('Edit')}
              onClick={this.editLabel}
            >
              <Icon symbol="rename" />
            </span>
            }
          </td>
          }
          <td>
            {userPerm == 'rw' && (
              item.isFirstCommit ?
                <span className={isIconShown ? '' : 'invisible'}>{gettext('Current Version')}</span> :
                <a href={`${siteRoot}repo/${repoID}/snapshot/?commit_id=${item.commit_id}`} className={isIconShown ? '' : 'invisible'}>{gettext('View Snapshot')}</a>
            )}
          </td>
        </tr>
        {isCommitDetailsDialogOpen &&
          <ModalPortal>
            <CommitDetails
              repoID={repoID}
              commitID={item.commit_id}
              commitTime={item.time}
              toggleDialog={this.toggleCommitDetailsDialog}
            />
          </ModalPortal>
        }
        {isCommitLabelUpdateDialogOpen &&
          <ModalPortal>
            <UpdateRepoCommitLabels
              repoID={repoID}
              commitID={item.commit_id}
              commitLabels={labels}
              updateCommitLabels={this.updateLabels}
              toggleDialog={this.toggleLabelEditDialog}
            />
          </ModalPortal>
        }
      </React.Fragment>
    );
  }
}

Item.propTypes = {
  item: PropTypes.object.isRequired,
};

RepoHistory.propTypes = propTypes;

export default RepoHistory;
