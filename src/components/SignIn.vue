<template>
  <div class="form-wrapper">
    <h1>利用者登録</h1>
    <!-- <form>
      <div class="form-item">
        <label for="myname"></label>
        <input type="text" name="myname" required="required" placeholder="名前(必須)" />
      </div>
      <div class="form-item">
        <label for="myaddress"></label>
        <input type="text" name="myaddress" required="required" placeholder="住所" />
      </div>
      <div class="button-panel">
        <input type="submit" class="button" title="Sign In" value="登録" />
      </div>
    </form> -->
    <div class="form-item">
      <input type="text" v-model="myname" required="required" placeholder="名前(必須)" />
    </div>
    <div class="form-item">
      <input type="text" v-model="myaddress" required="required" placeholder="住所" />
    </div>
    <div class="button-panel">
      <button @click="on_submit" class="button" title="Sign In">登録</button>
    </div>
    <div class="form-footer">
      <p>これは避難状況を自治体で把握するための目的だけで使用されます</p>
    </div>
  </div>    
</template>

<script>
import { line_close } from "./LINE";
const SUBMIT_URL = "https://lma1.herokuapp.com/regist";
export default {
  props: [ "profile" ],
  data() {
    return {
      myname: "",
      myaddress: ""
    }
  },
  methods: {
    async on_submit() {
      const res = await fetch(SUBMIT_URL, {
        method: "POST",
        headers: {
          "Accept": "application/json",
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          // "profile": this.profile,
          "myname": this.myname,
          "myaddress": this.myaddress
        })
      });
      if (res.ok) {
        alert("登録しました");
        line_close();
      } else {
        console.log(`HTTP ERROR: ${res.status}: ${res.statusText}`);
        alert("登録に失敗しました。ネットワーク環境の接続状態等を確認の上、再度登録をお願いします。")
      }
    }
  }
}
</script>

<style>
/* Fonts */
/* @import url(https://fonts.googleapis.com/css?family=Open+Sans:400); */

/* fontawesome */
/* @import url(http://weloveiconfonts.com/api/?family=fontawesome);
[class*="fontawesome-"]:before {
  font-family: 'FontAwesome', sans-serif;
} */

/* Simple Reset */
* { margin: 0; padding: 0; box-sizing: border-box; }

/* body */
/* body {
  background: #e9e9e9;
  color: #5e5e5e;
  font: 400 87.5%/1.5em 'Open Sans', sans-serif;
} */

/* Form Layout */
.form-wrapper {
  position: absolute;
  background: #fafafa;
  margin: 3em auto;
  padding: 0 1em;
  /* max-width: 370px; */
  width: 100%;
  height: 100%;
}

h1 {
  text-align: center;
  padding: 1em 0;
}

form {
  padding: 0 1.5em;
}

.form-item {
  margin-bottom: 0.75em;
  width: 100%;
}

.form-item input {
  background: #fafafa;
  border: none;
  border-bottom: 2px solid #e9e9e9;
  color: #666;
  font-family: 'Open Sans', sans-serif;
  font-size: 1em;
  height: 50px;
  transition: border-color 0.3s;
  width: 100%;
}

.form-item input:focus {
  border-bottom: 2px solid #c0c0c0;
  outline: none;
}

.button-panel {
  margin: 2em 0 0;
  width: 100%;
}

.button-panel .button {
  background: #f16272;
  border: none;
  color: #fff;
  cursor: pointer;
  height: 50px;
  font-family: 'Open Sans', sans-serif;
  font-size: 1.2em;
  letter-spacing: 0.05em;
  text-align: center;
  text-transform: uppercase;
  transition: background 0.3s ease-in-out;
  width: 100%;
}

.button:hover {
  background: #ee3e52;
}

.form-footer {
  font-size: 1em;
  padding: 2em 0;
  text-align: center;
}

.form-footer a {
  color: #8c8c8c;
  text-decoration: none;
  transition: border-color 0.3s;
}

.form-footer a:hover {
  border-bottom: 1px dotted #8c8c8c;
}
</style>