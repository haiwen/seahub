import React from 'react';
import { Button } from 'reactstrap';
import PropTypes from 'prop-types';
import Loading from '@/components/loading';
import { gettext } from '@/utils/constants';

import './ai-cover-panel.css';

function AICoverPanel({ page, cover, onClose }) {
  const { prompt, setPrompt, image, preview, generating, saving, error, generate, useCover } = cover;
  return (
    <div className="wiki-ai-cover-panel">
      <label htmlFor="wiki-ai-cover-prompt">{gettext('Describe your cover')}</label>
      <textarea id="wiki-ai-cover-prompt" className="form-control" rows="3" maxLength={2000}
        value={prompt} onChange={event => setPrompt(event.target.value)} disabled={generating || saving} />
      <div className="wiki-ai-cover-actions">
        <Button color="link" className="p-0" disabled={generating || saving}
          onClick={() => setPrompt((page.name || '').slice(0, 2000))}>
          {gettext('Use page title')}
        </Button>
        <Button color="secondary" disabled={!prompt.trim() || generating || saving} onClick={generate}>
          {image ? gettext('Generate again') : gettext('Generate')}
        </Button>
      </div>
      {generating && <div role="status" className="d-flex align-items-center"><Loading />{gettext('Generating image…')}</div>}
      {preview && <div className="wiki-ai-cover-preview"><img src={preview} alt={gettext('Cover preview')} /></div>}
      {error && <p role="alert" className="text-danger mt-3 mb-0">{error}</p>}
      <div className="wiki-ai-cover-footer">
        <Button color="secondary" onClick={onClose} disabled={saving}>{gettext('Close')}</Button>
        <Button color="primary" onClick={useCover} disabled={!image || generating || saving}>
          {saving ? gettext('Saving…') : gettext('Use cover')}
        </Button>
      </div>
    </div>
  );
}

AICoverPanel.propTypes = {
  page: PropTypes.object.isRequired,
  cover: PropTypes.object.isRequired,
  onClose: PropTypes.func.isRequired,
};

export default AICoverPanel;
