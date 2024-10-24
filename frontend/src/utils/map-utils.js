import { MAP_TYPE } from '../constants';

export const initMapInfo = ({ baiduMapKey, googleMapKey, mineMapKey }) => {
  if (baiduMapKey) return { type: MAP_TYPE.B_MAP, key: baiduMapKey };
  if (googleMapKey) return { type: MAP_TYPE.G_MAP, key: googleMapKey };
  return { type: '', key: '' };
};

export const loadMapSource = (type, key, callback) => {
  if (!type || !key) return;
  let scriptUrl = '';
  const sourceId = 'map-source-script';
  if (document.getElementById(sourceId)) return;
  let script = document.createElement('script');
  script.type = 'text/javascript';
  script.id = sourceId;
  if (type === MAP_TYPE.B_MAP) {
    scriptUrl = `https://api.map.baidu.com/api?v=3.0&ak=${key}&callback=renderBaiduMap`;
  } else if (type === MAP_TYPE.G_MAP) {
    scriptUrl = `https://maps.googleapis.com/maps/api/js?key=${key}&callback=renderGoogleMap&libraries=marker&v=weekly`;
  }
  if (scriptUrl) {
    script.src = scriptUrl;
    document.body.appendChild(script);
  }
  callback && callback();
};
