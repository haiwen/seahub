import { MAP_TYPE, MINE_MAP_ONLINE_SERVICE } from '../constants';

export const getMineMapUrl = (mineMapConfig = {}) => {
  const { domain_url = '', data_domain_url = '', server_domain_url = '',
    sprite_url = '', service_url = '' } = mineMapConfig;
  return {
    domainUrl: domain_url || MINE_MAP_ONLINE_SERVICE.DOMAIN_URL,
    dataDomainUrl: data_domain_url || MINE_MAP_ONLINE_SERVICE.DATA_DOMAIN_URL,
    serverDomainUrl: server_domain_url || MINE_MAP_ONLINE_SERVICE.SERVER_DOMAIN_URL,
    spriteUrl: sprite_url || MINE_MAP_ONLINE_SERVICE.SPRITE_URL,
    serviceUrl: service_url || MINE_MAP_ONLINE_SERVICE.SERVICE_URL
  };
};

export const initMapInfo = ({ baiduMapKey, googleMapKey, mineMapKey }) => {
  if (baiduMapKey) return { type: MAP_TYPE.B_MAP, key: baiduMapKey };
  if (googleMapKey) return { type: MAP_TYPE.G_MAP, key: googleMapKey };
  if (mineMapKey) return { type: MAP_TYPE.M_MAP, key: mineMapKey };
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
  } else {
    scriptUrl = 'https://minemap.minedata.cn/minemapapi/v2.1.1/minemap.js';
    let link = document.createElement('link');
    link.rel = 'stylesheet';
    link.type = 'text/css';
    link.href = 'https://minemap.minedata.cn/minemapapi/v2.1.1/minemap.css';
    document.head.appendChild(link);
  }
  script.src = scriptUrl;
  document.body.appendChild(script);
  callback && callback();
};
