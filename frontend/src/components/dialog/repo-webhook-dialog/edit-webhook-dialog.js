import React, { useCallback, useMemo, useState } from 'react';
import { Button, Form, FormGroup, Input, Label, Modal, ModalBody, ModalFooter } from 'reactstrap';
import SeahubModalHeader from '@/components/common/seahub-modal-header';
import { gettext } from '../../../utils/constants';
import toaster from '../../toast';

function EditWebHookDialog({ webhook, toggle, updateWebhook, addWebhook }) {
  const [isDisable, setIsDisable] = useState(true);
  const [url, setUrl] = useState(webhook ? webhook.url : '');
  const [secret, setSecret] = useState(webhook ? webhook.secret : '');


  const onUrlChange = useCallback((event) => {
    setUrl(event.target.value);
    setIsDisable(false);
  }, []);

  const onSecretChange = useCallback((event) => {
    setSecret(event.target.value);
    setIsDisable(false);
  }, []);

  const onSubmit = useCallback(() => {
    if (webhook && url === webhook.url && secret === webhook.secret) return;
    if (!url || !url.trim()) {
      toaster.warning(gettext('Url is required'));
      return;
    }
    if (webhook) {
      updateWebhook({ url: url.trim(), secret: secret && secret.trim() });
      return;
    }

    addWebhook({ url: url.trim(), secret: secret && secret.trim() });
  }, [addWebhook, secret, updateWebhook, url, webhook]);

  const title = useMemo(() => {
    return webhook ? gettext('Update webhook') : gettext('Add webhook');
  }, [webhook]);

  return (
    <Modal isOpen={true} toggle={toggle}>
      <SeahubModalHeader toggle={toggle}>{title}</SeahubModalHeader>
      <ModalBody>
        <Form>
          <FormGroup>
            <Label for="webhook-url">{gettext('URL')}</Label>
            <Input id="webhook-url" value={url} onChange={onUrlChange} placeholder="http://test.com" />
            <div className="form-text text-muted">{gettext('URL should start with http(s).')}</div>
          </FormGroup>
          <FormGroup>
            <Label for="webhook-secret">{gettext('Secret')}</Label>
            <Input id="webhook-secret" value={secret} onChange={onSecretChange} />
            <div className="form-text text-muted">
              {gettext('When you set a secret, you will receive the X-Seafile-Signature header in the webhook POST request, which is the SHA256 encryption result of the secret and request.body.')}
            </div>
          </FormGroup>
        </Form>
      </ModalBody>
      <ModalFooter>
        <Button color="secondary" onClick={toggle}>{gettext('Cancel')}</Button>
        <Button color="primary" onClick={onSubmit} disabled={isDisable}>{gettext('Submit')}</Button>
      </ModalFooter>
    </Modal>
  );
}

EditWebHookDialog.propTypes = {};

export default EditWebHookDialog;
