import liff from "@line/liff";

const line_init = (next) => {
  // LINE関連の処理
  const profile = {}

  liff.init({
    liffId: "1656696515-Arvm4l2V",
    withLoginOnExternalBrowser: true
  })
    .then(() => {
      if (!liff.isLoggedIn()) {
        liff.login();
      }
    })
    .catch(err => {
      console.log(err.message);
    });
  
  liff.ready.then(() => {
    console.log(liff.getLanguage());
    console.log(liff.getVersion());
    console.log(liff.isInClient());
    console.log(liff.isLoggedIn());
    console.log(liff.getOS());
    console.log(liff.getLineVersion());

    profile.lang = liff.getLanguage();
    profile.version = liff.getVersion();
    profile.inInClient = liff.isInClient();
    profile.isLoggedIn = liff.isLoggedIn();
    profile.os = liff.getOS();
    profile.lineVersion = liff.getLineVersion();
     
    return liff.getProfile();
  })
    .then(_profile => {
      profile.userId = _profile.userId;
      profile.displayName = _profile.displayName;
      profile.pictureUrl = _profile.pictureUrl;
      profile.statusMessage = _profile.statusMessage;

      if (next) next(profile);
      // return profile;
    })
    .catch(err => {
      console.log(err.message);
    });
}

export { line_init };