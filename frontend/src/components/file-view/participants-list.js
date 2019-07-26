import React from 'react';
import PropTypes from 'prop-types';
import { Tooltip } from 'reactstrap';
import ModalPortal from '../modal-portal';
import FileParticipantDialog from '../dialog/file-participant-dialog';
import { gettext } from '../../utils/constants';
import '../../css/participants-list.css';

const propTypes = {
  onParticipantsChange: PropTypes.func.isRequired,
  participants: PropTypes.array.isRequired,
  repoID: PropTypes.string.isRequired,
  filePath: PropTypes.string.isRequired,
  showIconTip: PropTypes.bool.isRequired,
};

class ParticipantsList extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      showDialog : false,
      tooltipOpen: false,
    };
    this.targetID = 'add-participant-icon';
  }

  toggleDialog = () => {
    this.setState({ showDialog: !this.state.showDialog });
  }

  tooltipToggle = () => {
    this.setState({ tooltipOpen: !this.state.tooltipOpen });
  }

  componentWillMount() {
    this.targetID = this.targetID + Math.floor(Math.random() * 1000);
  }

  render() {
    const { participants, repoID, filePath, showIconTip } = this.props;
    return (
      <div className="participants mb-2 position-relative">
        {participants.map((item, index) => {
          return <Participant item={item} index={index} key={index}/>;
        })}
        <span className="add-participants" onClick={this.toggleDialog} id={this.targetID}>
          <i className="fas fa-plus-circle"></i>
        </span>
        {showIconTip &&
          <Tooltip toggle={this.tooltipToggle} delay={{show: 0, hide: 0}} target={this.targetID} placement='bottom' isOpen={this.state.tooltipOpen}>
            {gettext('Add participants')}
          </Tooltip>
        }
        {this.state.showDialog &&
          <ModalPortal>
            <FileParticipantDialog
              repoID={repoID}
              filePath={filePath}
              toggleFileParticipantDialog={this.toggleDialog}
              fileParticipantList={participants}
              onParticipantsChange={this.props.onParticipantsChange}
            />
          </ModalPortal>
        }
      </div>
    );
  }
}

ParticipantsList.propTypes = propTypes;

const ParticipantPropTypes = {
  index: PropTypes.number.isRequired,
  item: PropTypes.object.isRequired,
};

class Participant extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      showAvatarTooltip: false,
    };
    this.targetID = 'participant-avatar-';
  }

  toggleAvatarTooltip = () => {
    this.setState({ showAvatarTooltip: !this.state.showAvatarTooltip });
  }

  componentWillMount() {
    this.targetID = this.targetID + this.props.index + Math.floor(Math.random() * 1000);
  }

  render() {
    const { item, index } = this.props;
    return (
      <span className="participant-avatar">
        <img src={item.avatar_url} className="avatar" id={this.targetID} alt="avatar" key={index}/>
        <Tooltip toggle={this.toggleAvatarTooltip} delay={{show: 0, hide: 0}} target={this.targetID} placement='bottom' isOpen={this.state.showAvatarTooltip}>
          {item.name}
        </Tooltip>
      </span>
    );
  }
}

Participant.propTypes = ParticipantPropTypes;

export default ParticipantsList;
