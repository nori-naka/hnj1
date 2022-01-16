<template>
  <div>
    <div v-if="!page_singin" class="map_layout">
      <div id="map" />
      <div v-show="ev.value" @click="ev.fn" class="close_btn">
        <img class="arrow_btn" :src="arrow_btn_obj" />
      </div>
    </div>
    <SignIn v-if="page_singin" :profile="profile"></SignIn>
  </div>
  <!-- <script src="./leaflet-routing-machine/dist/leaflet-routing-machine.js"></script> -->
</template>

<script>
import "leaflet/dist/leaflet.css"
import L from "leaflet";
import "leaflet-routing-machine"
import "leaflet-routing-machine/dist/leaflet-routing-machine.css"
import pointInPolygon from "point-in-polygon";

import { wakeupLock } from "./wakeupLock";
import { get_address, get_hinanjyo, distance } from "./jyohouban";
import { line_init, line_sendMsg } from "./LINE";
// import { line_sendMsg } from "./LINE";
// import { get_events, get_address, get_hinanjyo } from "./jyohouban";
// import hw_json from "../assets/N06-20_HighwaySection.json";

import SignIn from "../components/SignIn.vue";

const GEO_URL = "https://lma1.herokuapp.com/geojson";
const GEOJSON_URL = "https://lma1.herokuapp.com";
// const TEST_URL = "https://lma1.herokuapp.com/test";
// const GEO_URL = "http://localhost:3000/geojson";
// const GEOJSON_URL = "http://localhost:3000";
// const TEST_URL = "http://localhost:3000/test";

export default {
  components: {
    SignIn: SignIn
  },
  data() {
    return {
      first_flag: true,
      map: null,
      coords: { lat: "", lng: "", time_stamp: 0 },
      last_coords: { lat: "", lng: "", time_stamp: 0 },
      last_address: { ken: "", city: "", banchi: "" },
      hj_json: {},
      profile: {},
      self_marker: null,
      img_close_btn: require("../assets/close05.png"),
      img_arrow_right: require("../assets/arrow_right.png"),
      img_arrow_left: require("../assets/arrow_left.png"),
      ev: { value: null, fn: () => {} },
      page: "map",
      clearId: {},
      regist_area_layers: {},
      last_msg_id: null
    }
  },
  async mounted() {
    const urlParams = new URLSearchParams(window.location.search);
    this.page = urlParams.get("page");

    // 眠気覚まし
    wakeupLock();

    await line_init(p => {
      this.profile = p;
      console.log("----------PROFILE-----------")
      console.log(this.profile);
      if (this.self_marker && this.profile.pictureUrl) {
        this.self_marker.setIcon(L.icon({
          className: "icon_style",
          iconUrl: this.profile.pictureUrl,
          iconSize: [40, 40],
          iconAnchor: [20, 20],
          popupAnchor: [0, -20]
        }))
      }
    });
    this.init_map();
  },
  computed: {
    arrow_btn_obj() {
      if (this.ev.value == "right") {
        return this.img_arrow_right;
      } else {
        return this.img_arrow_left;
      }
    },
    page_singin () {
      return this.page == "signin";
    }
  },
  methods: {
    // 住所（文字列）をMessageAPIで送信して、その後、喋る
    // async speech() {
    //   // const uttr = new SpeechSynthesisUtterance(this.talk);
    //   // uttr.lang = "ja-JP";
    //   // speechSynthesis.speak(uttr);

    //   try {
    //     await this.get_talk();
    //     console.log(this.talk);
    //     await liff.sendMessages([
    //       { 
    //         type: "text",
    //         text: this.talk,
    //       }
    //     ])
    //     console.log("sendMessage");
    //   } catch (err) {()=> console.log(err.message);}

    //   this.sound_on(this.audio_src);
    //   this.self_marker.openPopup();
    // },
    checkedIn() {
      if (this.coords.lat == "" || this.coords.lng == "") return;

      Object.keys(this.regist_area_layers).forEach( async id => {
        if (this.regist_area_layers[id].layer) {
          const [ latlngs ] = this.regist_area_layers[id].layer.getLatLngs();
          const arr_points = latlngs.map(latlng => { return [latlng.lat, latlng.lng] });
          const area_in = pointInPolygon([this.coords.lat, this.coords.lng], arr_points);
          if (area_in) {
            console.log("エリアの中にいます。");
            console.log(this.last_msg_id);
            console.log(this.regist_area_layers);
            console.log(this.regist_area_layers[id].msg_id);

            // await fetch(TEST_URL);
            if (this.last_msg_id != this.regist_area_layers[id].msg_id) {
              line_sendMsg(id);
              this.last_msg_id = this.regist_area_layers[id].msg_id;
            }
          } else {
            console.log("残念。外です。");
          }
        }
      })
    },
    async regist_area() {
      const res = await fetch(GEO_URL);
      const geo_json = await res.json();
      const regist_ids = Object.keys(this.regist_area_layers);

      L.geoJSON(geo_json, {
        // filter: feature => {
        //   feature.properties.id
        // },
        onEachFeature: (feature, layer) => {
          const new_id = feature.properties.id;

          // 既に登録済みのエリアの場合
          if (regist_ids.includes(new_id)) {
            // messageを更新
            if (this.regist_area_layers[new_id].layer) {
              this.regist_area_layers[new_id].layer.getPopup().setContent(feature.properties.message);
              regist_ids.splice(regist_ids.indexOf(new_id), 1);
            }
          // 登録が無い場合
          } else {
            this.regist_area_layers[new_id] = {
              layer: layer,
              msg_id: feature.properties.msg_id
            };
            layer.bindPopup(feature.properties.message);
            this.map.addLayer(layer);
          }
        },
        style: () => {
          return {
            color: "red",
            opacity: 0.1
          };
        }
      });

      regist_ids.forEach(id => {
        this.map.removeLayer(this.regist_area_layers[id].layer);
        delete this.regist_area_layers[id];
      });
    },
    init_map() {
      navigator.geolocation.watchPosition(this.geo_success, this.geo_error);

      const osmLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{
        attribution: '© <a href="http://osm.org/copyright">OpenStreetMap</a> contributors, <a href="http://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>',
        opacity: 0.5
      });
      const kokudoLayer = L.tileLayer('https://cyberjapandata.gsi.go.jp/xyz/ort/{z}/{x}/{y}.jpg',{
        attribution: '© <a href="https://maps.gsi.go.jp/development/ichiran.html">国土地理院</a>',
        opacity: 0.5
      });
      const baseMap = {
        "OpenStreetMap": osmLayer,
        "航空写真": kokudoLayer,
      };

      const kouzuiMap = L.tileLayer('https://disaportaldata.gsi.go.jp/raster/01_flood_l2_shinsuishin_data/{z}/{x}/{y}.png',{
        attribution: '© <a href="https://maps.gsi.go.jp/development/ichiran.html">国土地理院</a>',
      });
      const takashioMap = L.tileLayer('https://disaportaldata.gsi.go.jp/raster/03_hightide_l2_shinsuishin_data/{z}/{x}/{y}.png',{
        attribution: '© <a href="https://maps.gsi.go.jp/development/ichiran.html">国土地理院</a>',
      });
      const overLayer = {
        "洪水浸水想定区域": kouzuiMap,
        "高潮浸水想定区域": takashioMap
      }

      this.map = L.map("map", {
        center: L.latLng( 35.6825, 139.752778), 
        zoom: 15
      }).addLayer(osmLayer);
      L.control.layers(baseMap, overLayer, {
        position: "bottomright"
      }).addTo(this.map);

      this.regist_area();
      this.clearId["regist_area"] = setInterval(this.regist_area, 1000);

      this.checkedIn();
      this.clearId["checkedIn"] = setInterval(this.checkedIn, 1000);
    },
    async geo_success(pos) {
      this.coords = {
        lat: Math.round(pos.coords.latitude * 1000000) / 1000000,
        lng: Math.round(pos.coords.longitude * 1000000) / 1000000,
        time_stamp: Date.now()
      }
      const latlng = L.latLng(this.coords);
      // const popup_content = `<h1>現在の場所は、<br>緯度 ${latlng.lat}<br>経度 ${latlng.lng}</h1>`

      // 初めてgeo_successが実行されるときのみ、実行される
      if (this.first_flag) {
        this.map.panTo(latlng, {animate: true});

        // if (this.self_marker && this.profile.pictureUrl) {
        //   this.self_marker.setIcon(L.icon({
        //     className: "icon_style",
        //     iconUrl: this.profile.pictureUrl,
        //     iconSize: [40, 40],
        //     iconAnchor: [20, 20],
        //     popupAnchor: [0, -20]
        //   }));
        // }
        this.first_flag = false;
      }

      if (this.self_marker) {
        this.self_marker.setLatLng(latlng);
      } else {
        // アイコンを使用する場合
        this.self_marker = L.marker(latlng, {
          icon: L.icon({
            className: "icon_style",
            iconUrl: this.profile.pictureUrl ? this.profile.pictureUrl : require("@/assets/people_marker.png"),
            iconSize: [40, 40],
            iconAnchor: [20, 20],
            popupAnchor: [0, -20]
          })
        })
          .addTo(this.map)
          // .bindPopup(popup_content);
      }
      // if (this.last_coords.lat != this.coords.lat && this.last_coords.lng != this.coords.lng) {
      if (distance(this.coords, this.last_coords) > 0.01) {
        const cur_address = await get_address({ lat: this.coords.lat, lon: this.coords.lng });
        const popup_content = cur_address ? `<h1>現在の場所は<br>${cur_address.ken} ${cur_address.city} ${cur_address.banchi}付近です</h1>` :
                                            `<h1>現在の場所は、<br>緯度 ${latlng.lat}<br>経度 ${latlng.lng}</h1>`;
        const self_popup = this.self_marker.getPopup();
        if (self_popup) {
          self_popup.setContent(popup_content);
        } else {
          this.self_marker.bindPopup(popup_content);
        }

        if (cur_address && cur_address.ken != this.last_address.ken) {
          try {
            const ken_code_json = require("../assets/ken_code.json");
            // this.hj_json = require(`../assets/${ken_code_json[cur_address.ken]}.json`)
            const res = await fetch(GEOJSON_URL + `/${ken_code_json[cur_address.ken]}.geojson`);
            this.hj_json = await res.json();
          } catch (err) {
            console.log(err);
          }
          this.last_address = { ...cur_address };
        }
        // 避難所アプリ
        get_hinanjyo(this.coords, this.hj_json, this.map, this.ev);
      }

      // モバ情の場合
      // if (this.coords.time_stamp - this.last_coords.time_stamp > 10000) {
      //   await get_events({lat: this.coords.lat, lon: this.coords.lng, range: 300}, this.map);
      // }
      this.last_coords = { ...this.coords };
    },
    geo_error(error) {
      console.log(`GEO_ERROR: ${error.message}`);
    }
  },
  beforeDestroy() {
    Object.keys(this.clearId).forEach(id => {
      clearInterval(this.clearId[id]);
    })
  }
}
</script>

<style>
.arrow_btn {
  width: 50%;
  height: 50%;
}
.collapsible_btn {
  display: none;
}
.close_btn {
  position: absolute;
  display: flex;
  justify-content: center;
  align-items: center;
  top: 10px;
  right: 10px;
  width: 50px;
  height: 50px;
  border-radius: 50%;
  background-color: gray;
  z-index: 100;
  padding: 0px;
}
/* .on_disp {
  display: flex;
} */
.icon_style {
  border-radius: 50%;
  border-color: #549fa9;
  border-width: 1px;
}
.icon_style_bg {
  width: 40px;
  height: 40px;
  background-color: "blue";
  border-radius: 20%;
  /* border-color: #549fa9; */
  border-width: 0px
}
.icon_label {
  width: 100px;
  background-color: #000;
  color: white;
  position: relative;
  left: -70%;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
  text-align: center;
}
.map_layout {
  position: relative;
  height: 100vh;
  /* display: flex;
  flex-direction: column; */
}
#map {
  z-index: 1;
  height: 100%;
  width: 100%;
}
#button {
  user-select: none; /* Chrome, Safari, and Opera */
  -webkit-touch-callout: none; /* Disable Android and iOS callouts*/
  z-index: 10;
  position: absolute;
  bottom: 20px;
  left: calc(50% - 36px);
  display: inline-block;
  text-decoration: none;
  background: #5dc3d0;
  color: rgb(82, 142, 150);
  width: 73px;
  font-size: 16px;
  height: 72px;
  line-height: 72px;
  border-radius: 50%;
  text-align: center;
  overflow: hidden;
  box-shadow: inset 0px 3px 0 rgba(255,255,255,0.3), 0 3px 3px rgba(0, 0, 0, 0.3);
  font-weight: bold;
  border-bottom: solid 3px #549fa9;
  text-shadow: 1px 1px 1px rgba(255, 255, 255, 0.65);
  transition: .4s;
}
#button:active {
  -webkit-transform: translateY(1px);
  transform: translateY(1px);
  box-shadow: 0 0 2px rgba(0, 0, 0, 0.35);
  border-bottom: none;
}
.overlay{
  z-index: 20;
  display: block;
  width: 100%;
  height: 100%;
  position: absolute;
  background-color: #000;
  opacity: 0.7;
  top: 0;
  left: 0;
}

</style>