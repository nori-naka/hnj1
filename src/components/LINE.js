import liff from "@line/liff";

const line_init = (next) => {
  // LINE関連の処理

  liff.init({
    liffId: "1656778642-nDXxJaOx",
    withLoginOnExternalBrowser: true
  })
    .then(() => {
      if (!liff.isLoggedIn()) {
        liff.login();
      }
    })
    .then(() => {
      console.log(liff.getLanguage());
      console.log(liff.getVersion());
      console.log(liff.isInClient());
      console.log(liff.isLoggedIn());
      console.log(liff.getOS());
      console.log(liff.getLineVersion());
  
      const profile = {}
      profile.lang = liff.getLanguage();
      profile.version = liff.getVersion();
      profile.inInClient = liff.isInClient();
      profile.isLoggedIn = liff.isLoggedIn();
      profile.os = liff.getOS();
      profile.lineVersion = liff.getLineVersion();
        
      if (next) next(profile);

      return liff.ready;
    })
    .catch(err => {
      console.log(err.message);
    });
}

const line_close = () => {
  liff.closeWindow();
}

export { line_init, line_close };