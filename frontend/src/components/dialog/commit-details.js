import React from 'react';
import PropTypes from 'prop-types';
import { Modal, ModalBody } from 'reactstrap';
import dayjs from 'dayjs';
import { gettext, siteRoot } from '../../utils/constants';
import { seafileAPI } from '../../utils/seafile-api';
import { Utils } from '../../utils/utils';
import Loading from '../loading';
import Icon from '../icon';
import SeahubModalHeader from '@/components/common/seahub-modal-header';

import '../../css/commit-details.css';

const propTypes = {
  repoID: PropTypes.string.isRequired,
  commitID: PropTypes.string.isRequired,
  commitTime: PropTypes.string.isRequired,
  toggleDialog: PropTypes.func.isRequired
};

class CommitDetails extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      isLoading: true,
      errorMsg: '',
    };
  }

  componentDidMount() {
    const { repoID, commitID } = this.props;
    seafileAPI.getCommitDetails(repoID, commitID).then((res) => {
      this.setState({
        isLoading: false,
        errorMsg: '',
        commitDetails: res.data
      });
    }).catch((error) => {
      let errorMsg = Utils.getErrorMsg(error);
      this.setState({
        isLoading: false,
        errorMsg: errorMsg
      });
    });
  }

  viewSnapshot = () => {
    const { repoID, commitID } = this.props;
    window.open(`${siteRoot}repo/${repoID}/snapshot/?commit_id=${commitID}`, '_blank', 'noopener,noreferrer');
  };

  render() {
    const { toggleDialog, commitTime } = this.props;
    return (
      <Modal isOpen={true} toggle={toggleDialog} centered={true} modalClassName="commit-details-dialog">
        <SeahubModalHeader toggle={toggleDialog}>{gettext('Modification Details')}</SeahubModalHeader>
        <ModalBody>
          <div className="repo-commit-time-row">
            <p className="repo-commit-time mb-0 d-flex align-items-center">
              <Icon symbol="time" className="repo-commit-time-icon" />
              {dayjs(commitTime).format('YYYY-MM-DD HH:mm:ss')}
            </p>
            <button type="button" className="repo-commit-view-snapshot-btn" onClick={this.viewSnapshot}>
              {gettext('View snapshot')}
            </button>
          </div>
          <Content data={this.state} />
        </ModalBody>
      </Modal>
    );
  }
}

class Content extends React.Component {

  renderDetails = (data) => {
    const detailsData = [
      { type: 'new', title: gettext('New files') },
      { type: 'removed', title: gettext('Deleted files') },
      { type: 'renamed', title: gettext('Renamed or Moved files') },
      { type: 'modified', title: gettext('Modified files') },
      { type: 'newdir', title: gettext('New directories') },
      { type: 'deldir', title: gettext('Deleted directories') }
    ];

    let showDesc = true;
    for (let i = 0, len = detailsData.length; i < len; i++) {
      if (data[detailsData[i].type].length) {
        showDesc = false;
        break;
      }
    }
    if (showDesc) {
      return <p className="repo-commit-details-description mb-0">{data.cmt_desc}</p>;
    }

    return (
      <React.Fragment>
        {detailsData.map((item, index) => {
          if (!data[item.type].length) {
            return null;
          }
          return (
            <section className="repo-commit-details-section" key={index}>
              <h6 className="repo-commit-details-title mb-0">{item.title}</h6>
              <ul className="repo-commit-details-list list-unstyled mb-0">
                {
                  data[item.type].map((item, index) => {
                    return <li key={index} dangerouslySetInnerHTML={{ __html: item }} className="repo-commit-details-item"></li>;
                  })
                }
              </ul>
            </section>
          );
        })}
      </React.Fragment>
    );
  };

  render() {
    const { isLoading, errorMsg, commitDetails } = this.props.data;

    if (isLoading) {
      return <Loading />;
    }

    if (errorMsg) {
      return <p className="error mt-4 text-center">{errorMsg}</p>;
    }

    return this.renderDetails(commitDetails);
  }
}

Content.propTypes = {
  data: PropTypes.object.isRequired,
};

CommitDetails.propTypes = propTypes;

export default CommitDetails;
