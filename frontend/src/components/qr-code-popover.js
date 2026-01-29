import React, { useCallback } from 'react';
import PropTypes from 'prop-types';
import { QRCodeSVG } from 'qrcode.react';
import { Popover, PopoverBody, Button } from 'reactstrap';
import toaster from './toast';
import { gettext } from '../utils/constants';

const QRCodePopover = ({ container, target, value }) => {
  const qrCodeRef = React.useRef(null);

  const downloadQRCode = useCallback(() => {
    const svg = qrCodeRef.current?.querySelector('svg');
    if (!svg) {
      setTimeout(() => downloadQRCode(), 100);
      return;
    }
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();

    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;
      ctx.drawImage(img, 0, 0);

      const pngFile = canvas.toDataURL('image/png');
      const downloadLink = document.createElement('a');
      downloadLink.download = 'qr-code.png';
      downloadLink.href = pngFile;
      downloadLink.click();

      toaster.success(gettext('QR code downloaded successfully'));
    };

    // Convert SVG to image
    const svgData = new XMLSerializer().serializeToString(svg);
    const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
    const svgUrl = URL.createObjectURL(svgBlob);
    img.src = svgUrl;
  }, []);

  const copyQRCode = useCallback(async () => {
    const svg = qrCodeRef.current?.querySelector('svg');
    if (!svg) {
      setTimeout(() => copyQRCode(), 100);
      return;
    }
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();

    img.onload = async () => {
      canvas.width = img.width;
      canvas.height = img.height;
      ctx.drawImage(img, 0, 0);

      canvas.toBlob(async (blob) => {
        try {
          await navigator.clipboard.write([
            new ClipboardItem({ 'image/png': blob })
          ]);
          toaster.success(gettext('QR code copied to clipboard'));
        } catch (err) {
          toaster.danger(gettext('Failed to copy QR code'));
        }
      }, 'image/png');
    };

    // Convert SVG to image
    const svgData = new XMLSerializer().serializeToString(svg);
    const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
    const svgUrl = URL.createObjectURL(svgBlob);
    img.src = svgUrl;
  }, []);

  const onPopoverContentClick = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const onPopoverMouseDown = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const onDownload = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    downloadQRCode();
  }, [downloadQRCode]);

  const onCopy = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    copyQRCode();
  }, [copyQRCode]);

  return (
    <Popover
      placement="bottom"
      isOpen={true}
      fade={true}
      container={container}
      target={target}
      onClick={onPopoverContentClick}
      onMouseDown={onPopoverMouseDown}
    >
      <PopoverBody className="qr-code-popover-body">
        <div ref={qrCodeRef} className="qr-code-container">
          <QRCodeSVG value={value} size={128} />
        </div>
        <div className="qr-code-actions">
          <Button
            size="sm"
            color="primary"
            onClick={onDownload}
            className="qr-code-btn"
          >
            {gettext('Download')}
          </Button>
          <Button
            size="sm"
            color="secondary"
            onClick={onCopy}
            className="qr-code-btn"
          >
            {gettext('Copy')}
          </Button>
        </div>
      </PopoverBody>
    </Popover>
  );
};

QRCodePopover.propTypes = {
  target: PropTypes.object,
  value: PropTypes.string.isRequired,
  container: PropTypes.object
};

export default QRCodePopover;
