import React from 'react';
import { withTranslation } from 'react-i18next';
import dayjs from 'dayjs';
import EventBus from '../utils/event-bus';

class TipMessage extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      isSaved: false,
      isSaving: false,
      lastSavedAt: '',
    };
    this.saveTimer = null;
  }

  componentDidMount() {
    const eventBus = EventBus.getInstance();
    this.unsubscribeSavingEvent = eventBus.subscribe('is-saving', this.onDocumentSaving);
    this.unsubscribeSavedEvent = eventBus.subscribe('saved', this.onDocumentSaved);
  }

  componentWillUnmount() {
    this.unsubscribeSavingEvent();
    this.unsubscribeSavedEvent();
  }

  onDocumentSaving = () => {
    this.setState({
      isSaving: true,
      isSaved: false
    });
  };

  onDocumentSaved = (lastSavedAt) => {
    if (this.saveTimer) clearTimeout(this.saveTimer);
    if (this.resetTimer) clearTimeout(this.resetTimer);
    this.saveTimer = setTimeout(() => {
      this.setState({
        lastSavedAt,
        isSaving: false,
        isSaved: true
      });
    }, 1000);
    this.resetTimer = setTimeout(() => {
      this.setState({
        isSaving: false,
        isSaved: false
      });
    }, 2000);
  };

  render = () => {
    const { t } = this.props;
    const { isSaved, isSaving, lastSavedAt } = this.state;

    if (isSaving && !isSaved) {
      return <span className="tip-message">{t('Saving')}</span>;
    }

    if (!isSaving && isSaved) {
      return <span className="tip-message">{t('All_changes_saved')}</span>;
    }
    if (lastSavedAt) {
      return (
        <span className='tip-message'>
          <span className='sdocfont sdoc-save-tip mr-2'></span>
          <span className='save-time'>{dayjs(lastSavedAt).format('HH:mm')}</span>
        </span>
      );
    }

    return null;
  };
}

export default withTranslation('sdoc-editor')(TipMessage);
