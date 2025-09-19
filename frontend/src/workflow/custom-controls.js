import { memo } from 'react';
import { Controls, ControlButton, useReactFlow, useStore } from '@xyflow/react';
import Icon from '../components/icon';
import { MAX_ZOOM, MIN_ZOOM } from './constants/canvas';

const CustomControls = () => {
  const { zoomIn, zoomOut, fitView } = useReactFlow();
  const zoom = useStore((state) => state.transform[2]); // transform = [x, y, zoom]

  return (
    <Controls
      orientation="horizontal"
      showZoom={false}
      showFitView={false}
      showInteractive={false}
      style={{ gap: 10 }}
    >
      <ControlButton className="workflow-custom-control-button" onClick={() => fitView({ maxZoom: 1, minZoom: 1 })}>
        <Icon symbol="zoom-to-fit" />
      </ControlButton>
      <ControlButton className="workflow-custom-control-button" onClick={zoomIn} disabled={zoom >= MAX_ZOOM}>
        <Icon symbol="zoom-in" />
      </ControlButton>
      <ControlButton className="workflow-custom-control-button" onClick={zoomOut} disabled={zoom <= MIN_ZOOM}>
        <Icon symbol="zoom-out" />
      </ControlButton>
    </Controls>
  );
};

export default memo(CustomControls);
