import React from 'react';
import PropTypes from 'prop-types';
import { Modal, ModalBody } from 'reactstrap';
import dayjs from 'dayjs';
import { gettext } from '../../utils/constants';
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

  render() {
    const { toggleDialog, commitTime } = this.props;
    return (
      <Modal isOpen={true} toggle={toggleDialog}>
        <SeahubModalHeader toggle={toggleDialog}>{gettext('Modification Details')}</SeahubModalHeader>
        <ModalBody>
          <p className="repo-commit-time mb-6 d-flex align-items-center">
            <Icon symbol="time" className="mr-1" />
            {dayjs(commitTime).format('YYYY-MM-DD HH:mm:ss')}
          </p>
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
      return <p>{data.cmt_desc}</p>;
    }

    return (
      <React.Fragment>
        {detailsData.map((item, index) => {
          if (!data[item.type].length) {
            return null;
          }
          return (
            <React.Fragment key={index}>
              <h6 className="mt-4">{item.title}</h6>
              <ul className="list-unstyled">
                {
                  data[item.type].map((item, index) => {
                    return <li key={index} dangerouslySetInnerHTML={{ __html: item }} className="text-truncate"></li>;
                  })
                }
              </ul>
            </React.Fragment>
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
