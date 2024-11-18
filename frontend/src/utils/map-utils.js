import { MAP_TYPE } from '../constants';
import { mediaUrl } from './constants';

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
    scriptUrl = `https://api.map.baidu.com/api?type=webgl&v=3.0&ak=${key}&callback=renderBaiduMap`;
  } else if (type === MAP_TYPE.G_MAP) {
    scriptUrl = `https://maps.googleapis.com/maps/api/js?key=${key}&callback=renderGoogleMap&libraries=marker&v=weekly`;
  }
  if (scriptUrl) {
    script.src = scriptUrl;
    document.body.appendChild(script);
  }
  callback && callback();
};

export default function loadBMap(ak) {
  return new Promise((resolve, reject) => {
    asyncLoadBaiduJs(ak)
      .then(() => asyncLoadJs(`${mediaUrl}/js/map/text-icon-overlay.js`))
      .then(() => asyncLoadJs(`${mediaUrl}/js/map/marker-clusterer.js`))
      .then(() => resolve(true))
      .catch((err) => reject(err));
  });
}

export function asyncLoadBaiduJs(ak) {
  return new Promise((resolve, reject) => {
    if (typeof window.BMap !== 'undefined') {
      resolve(window.BMap);
      return;
    }
    window.renderMap = function () {
      resolve(window.BMap);
    };
    let script = document.createElement('script');
    script.type = 'text/javascript';
    script.src = `https://api.map.baidu.com/api?v=3.0&ak=${ak}&callback=renderMap`;
    script.onerror = reject;
    document.body.appendChild(script);
  });
}

export function asyncLoadJs(url) {
  return new Promise((resolve, reject) => {
    let script = document.createElement('script');
    script.type = 'text/javascript';
    script.src = url;
    document.body.appendChild(script);
    script.onload = resolve;
    script.onerror = reject;
  });
}
