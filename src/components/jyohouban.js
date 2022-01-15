import "leaflet/dist/leaflet.css"
import L from "leaflet";
import { GSI } from "./muni.js";

// import 'leaflet-routing-machine';
// import 'leaflet-routing-machine/dist/leaflet-routing-machine.css';
// import "./leaflet-routing-machine";
// import "./leaflet-routing-machine/dist/leaflet-routing-machine.css";

import icon from "leaflet/dist/images/marker-icon.png";
import iconRetina from "leaflet/dist/images/marker-icon-2x.png";
import iconShadow from "leaflet/dist/images/marker-shadow.png";
// import locale_ja from "./ja.js";

const FROM_DISTANCE = 5; // 自分から避難所の距離（km）
const HEROKU_URL = "https://lma1.herokuapp.com"

let DefaultIcon = L.icon({
  iconUrl: icon,
  iconRetinaUrl: iconRetina,
  shadowUrl: iconShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  tooltipAnchor: [16, -28],
  shadowSize: [41, 41]
});
L.Marker.prototype.options.icon = DefaultIcon;
// L.Routing.Localization.ja = locale_ja;


const equalObj = (obj_a, obj_b) => {
  if (obj_a === obj_b) return true;
  const key_a = Object.keys(obj_a);
  const key_b = Object.keys(obj_b);
  if (key_a.toString() !== key_b.toString()) return false;
  key_a.forEach(key => {
    if (obj_a[key] !== obj_b[key]) return false;
  });
  return true;
}

// 緯度経度から住所を調べる。
const get_address = async ({ lat, lon }) => {
  const latlng_json = {
    lat: lat,
    lon: lon
  }
  const qs = new URLSearchParams(latlng_json);
  const fetch_url = `https://mreversegeocoder.gsi.go.jp/reverse-geocoder/LonLatToAddress?${qs}`;
  const res = await fetch(fetch_url);

  if (res.ok) {
    const address_data = await res.json();
    if (address_data && address_data.results) {
      const banchi = address_data.results.lv01Nm;
      const muniCd = address_data.results.muniCd;
      const [, ken_name, , city_name] = GSI.MUNI_ARRAY[muniCd].split(",");  
      return {
        ken: ken_name,
        city: city_name,
        banchi: banchi
      }
    }
  }
  return null
}

const R = Math.PI / 180;
const distance = (latlng1, latlng2) => {
  const lat1 = latlng1.lat * R;
  const lng1 = latlng1.lng * R;
  const lat2 = latlng2.lat * R;
  const lng2 = latlng2.lng * R;
  return 6371 * Math.acos(Math.cos(lat1) * Math.cos(lat2) * Math.cos(lng2 - lng1) + Math.sin(lat1) * Math.sin(lat2));
}

// 避難所
// cur_latlng : 自位置のLatLng
// hj_json    : 避難所のGeoJSON
// map        : mapオブジェクト
// ev         : {value, fn} valueは表示状態 fnはclickイベントハンドラ
let cur_routing = null;
let last_hj_features = [];
const get_hinanjyo = (cur_latlng, hj_json, map, ev) => {

  L.geoJSON(hj_json, {
    pointToLayer: (pt, latlng) => {

      // 既に表示済みか
      const dispalyed = last_hj_features.includes(pt);

      // 距離による表示制限
      const pt_name = pt.properties["指定緊急避難場所"] || pt.properties["指定緊急避"];
      const from_dist = distance(cur_latlng, latlng);
      if (from_dist < FROM_DISTANCE && !dispalyed) {
        last_hj_features.push(pt);

        console.log(pt);
        // console.dir(pt);
        return L.marker(latlng, {
          icon: L.divIcon({
            html: `
              <div>
                <img class="icon_style_bg" src="${require("../assets/避難所.png")}" />
                <div class="icon_label">${pt_name}</div>
              </div>`,
            // iconUrl: require("../assets/避難所.png"),
            // className: "icon_style_bg",
            iconSize: [40, 40],
            iconAnchor: [20, 20],
            popupAnchor: [0, -20],
            shadowSize: [41, 41]
          })
        })
          .bindPopup(`
            <h1>${pt_name}</h1>
            <h3>${pt.properties["所在地"]}</h3>
            <hr>
            <div id="info_${pt_name}"></div>
          `)
          .on("click", () => {
            const remove_cur_routing = () => {
              if (cur_routing._container.classList.contains("leaflet-routing-container-hide")) {
                ev.value = "right";
                cur_routing.show();
              } else {
                ev.value = "left";
                cur_routing.hide();
              }
            }
            // まず、cur_routingが残っていたなら、一旦消す
            if (cur_routing) {
              map.removeControl(cur_routing);
              cur_routing = null;
              ev.value = null;
            }
            // で、初めてcur_routingを作ってaddTo(map)する
            cur_routing = L.Routing.control({
              waypoints: [
                L.latLng(cur_latlng.lat, cur_latlng.lng),
                latlng
              ],
              routeWhileDragging: true,
              language: 'en',
              collapsible: true,
              collapseBtnClass: "collapsible_btn"
            })
              // 避難所の詳細情報の取得
              .on("routesfound", async ()=> {
                const _api_url = `${HEROKU_URL}/info?name=${pt_name}`;
                try {
                  const res = await fetch(_api_url);
                  const info = await res.json();
                  document.getElementById(`info_${pt_name}`).innerText = JSON.parse(info).info;
                } catch(err) {
                  console.log(err);
                }
              })
              .addTo(map);
            ev.value = "right";
            ev.fn = remove_cur_routing;
          });
      }
    },
    // onEachFeature: (feature, layer) => {
    //   console.log(feature);
    //   console.log(layer);
    //   layer.bindPopup(
    //     `<h1>${feature.properties.N06_007}</h1>
    //     <h3>${hw_type[feature.properties.N06_008]} / ${feature.properties.N06_010}車線</h3>`
    //   );
    // }
  }).addTo(map);
}


const MAIN_URL = "https://mobileinfogroupappservice.azurewebsites.net"
const API_EVENTS = "/api/FixedEvents"
const API_AREA = "/api/AreaPoints"
const get_events = async ({lat, lon, range}, map) => {

  const url_event = MAIN_URL + API_EVENTS + `?lat=${lat}&lon=${lon}&range=${range}`;
  const mj = {};
  // const area_ids = [];

  const res_event = await fetch(url_event);
  if (res_event.ok) {
    const json_event = await res_event.json();

    // 一旦全部消す
    Object.keys(mj).forEach(id => {
      map.removeLayer(mj[id]);
    })

    json_event.forEach( async ({ payload }) => {
      if (
        payload && payload.nodeID && payload.node && payload.node.p2 && payload.locationTypeID &&
        payload.actions && payload.actions.length > 0 && payload.actions[0].action.voices
      ) {

        const content = `<H1>${payload.eventTitle}</H1>
        <audio controls src=${payload.actions[0].action.voices[0].url}> </audio>`

        if (payload.locationTypeID == 2) {
          // area_ids.push(payload.nodeID); 
          const url_area = MAIN_URL + API_AREA + `?id=${payload.nodeID}`;
          const res_area = await fetch(url_area);
          if (res_area.ok) {
            const json_area = await res_area.json();
            const latlngs = json_area.map(point => {
              return [point.latitude, point.longitude]
            });
            console.log(latlngs);
            mj[payload.nodeID] = L.polygon(latlngs, {color: "red"})
              .addTo(map)
              .bindPopup(content);  
          }
        } else {
          const latlng = L.latLng({lat: payload.node.p2.latitude, lng: payload.node.p2.longitude});
          mj[payload.nodeId] = L.marker(latlng, {
            icon: L.icon({
              iconUrl: require("@/assets/Icon-76.png"),
              iconSize: [40, 40],
              iconAnchor: [20, 20],
              popupAnchor: [0, -20]
            })
          })
            .addTo(map)
            .bindPopup(content);  
        }
      }
    });
  }

  // area_ids.forEach(async id => {
  //   const url_area = MAIN_URL + API_AREA + `?id=${id}`;
  //   const res_area = await fetch(url_area);
  //   if (res_area.ok) {
  //     const json_area = await res_area.json();
  //     const latlngs = json_area.map(point => {
  //       return [point.latitude, point.longitude]
  //     });
  //     console.log(latlngs);
  //   }  
  // })
}

export { get_events, equalObj, get_address, get_hinanjyo, distance };