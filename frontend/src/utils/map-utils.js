import { MAP_TYPE } from '../constants';
import { lang, mediaUrl } from './constants';

export const initMapInfo = ({ baiduMapKey, googleMapKey, mineMapKey }) => {
  if (baiduMapKey) return { type: MAP_TYPE.B_MAP, key: baiduMapKey };
  if (googleMapKey) return { type: MAP_TYPE.G_MAP, key: googleMapKey };
  return { type: '', key: '' };
};

export const loadMapSource = (type, key, callback) => {
  let scriptUrl = '';
  const sourceId = 'map-source-script';

  if (document.getElementById(sourceId)) return;

  if (type === MAP_TYPE.B_MAP) {
    scriptUrl = `https://api.map.baidu.com/api?type=webgl&v=3.0&ak=${key}&callback=renderBaiduMap`;
  } else if (type === MAP_TYPE.G_MAP) {
    scriptUrl = `https://maps.googleapis.com/maps/api/js?key=${key}&language=${lang}&libraries=marker,geometry,core,places&v=weekly&callback=renderGoogleMap`;
  }

  if (scriptUrl) {
    const script = document.createElement('script');
    script.id = sourceId;
    script.src = scriptUrl;
    script.onload = callback;
    document.body.appendChild(script);
  }
};

export function loadBMap(ak) {
  return new Promise((resolve, reject) => {
    if (typeof window.BMapGL !== 'undefined' && document.querySelector(`script[src*="${mediaUrl}js/map/cluster.js"]`)) {
      resolve(true);
      return;
    }
    asyncLoadBaiduJs(ak)
      .then(() => asyncLoadJs(`${mediaUrl}js/map/cluster.js`))
      .then(() => resolve(true))
      .catch((err) => reject(err));
  });
}

export function asyncLoadBaiduJs(ak) {
  return new Promise((resolve, reject) => {
    if (typeof window.BMapGL !== 'undefined') {
      resolve(window.BMapGL);
      return;
    }
    window.renderMap = function () {
      resolve(window.BMapGL);
    };
    let script = document.createElement('script');
    script.type = 'text/javascript';
    script.src = `https://api.map.baidu.com/api?type=webgl&v=1.0&ak=${ak}&callback=renderMap`;
    script.onerror = reject;
    document.body.appendChild(script);
  });
}

export function loadGMap(ak) {
  return new Promise((resolve, reject) => {
    if (typeof window.google !== 'undefined' && document.querySelector(`script[src*="${mediaUrl}js/map/cluster.js"]`)) {
      resolve(true);
      return;
    }
    asyncLoadGMapJs(ak)
      .then(() => asyncLoadJs('https://unpkg.com/@googlemaps/markerclusterer/dist/index.min.js'))
      .then(() => resolve(true))
      .catch((err) => reject(err));
  });
}

export function asyncLoadGMapJs(key) {
  return new Promise((resolve, reject) => {
    if (typeof window.google !== 'undefined') {
      resolve(window.google);
      return;
    }
    window.renderGoogleMap = function () {
      resolve(window.google);
    };
    let script = document.createElement('script');
    script.type = 'text/javascript';
    script.src = `https://maps.googleapis.com/maps/api/js?key=${key}&libraries=marker,geometry&v=weekly&callback=renderGoogleMap&loading=async`;
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
