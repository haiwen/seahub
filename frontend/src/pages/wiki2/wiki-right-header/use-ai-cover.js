import { useEffect, useRef, useState } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { seafileAPI } from '@/api/seafile-api';
import wikiAPI from '@/api/wiki-api';
import { gettext, wikiId } from '@/utils/constants';

function useAICover({ page, onUpdatePageConfig, onClose }) {
  const [prompt, setPrompt] = useState('');
  const [image, setImage] = useState(null);
  const [preview, setPreview] = useState('');
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const alive = useRef(true);
  const controller = useRef(null);
  const uploadedPath = useRef(null);
  const busy = useRef(false);

  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
      controller.current?.abort();
    };
  }, []);

  useEffect(() => {
    if (!image) return;
    const url = URL.createObjectURL(image);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [image]);

  const generate = async () => {
    if (busy.current || !prompt.trim()) return;
    busy.current = true;
    setGenerating(true);
    setError('');
    controller.current = new AbortController();
    try {
      const response = await wikiAPI.generateCoverImage(wikiId, page.id, prompt.trim(), controller.current.signal);
      if (!alive.current) return;
      if (response.data.type !== 'image/png' || !response.data.size) throw new Error();
      setImage(response.data);
      uploadedPath.current = null;
    } catch (e) {
      if (alive.current) {
        setError(gettext('Image generation failed or timed out. You can try again.'));
      }
    } finally {
      busy.current = false;
      if (alive.current) setGenerating(false);
    }
  };

  const useCover = async () => {
    if (busy.current || !image) return;
    busy.current = true;
    setSaving(true);
    setError('');
    try {
      if (!uploadedPath.current) {
        const { serviceUrl, accessToken, docUuid } = window.seafile;
        if (docUuid !== page.docUuid) throw new Error();
        const form = new FormData();
        form.append('file', image, `ai-cover-${uuidv4()}.png`);
        const response = await seafileAPI.uploadImage(
          `${serviceUrl}/api/v2.1/seadoc/upload-image/${docUuid}/`, form, accessToken
        );
        if (!alive.current) return;
        const path = response.data.relative_path?.[0];
        if (!path) throw new Error();
        uploadedPath.current = path;
      }
      if (!alive.current) return;
      await onUpdatePageConfig(page.id, { cover_img_url: uploadedPath.current }, { persistFirst: true });
      if (alive.current) {
        setImage(null);
        setPreview('');
        uploadedPath.current = null;
        onClose();
      }
    } catch (e) {
      if (alive.current) setError(gettext('Failed to save cover. Try again without generating a new image.'));
    } finally {
      busy.current = false;
      if (alive.current) setSaving(false);
    }
  };

  return { prompt, setPrompt, image, preview, generating, saving, error, generate, useCover };
}
export default useAICover;
