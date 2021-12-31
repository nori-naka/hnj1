// 起きっぱなしにするための処理
// // ----------- WAKE-LOCK ------------------

const wakeupLock = async () => {
  if ('wakeLock' in navigator) {
    let wakeLock = null;
    const requestWakeLock = async () => {
      try {
        wakeLock = await navigator.wakeLock.request('screen');
        console.dir(wakeLock);
        wakeLock.onrelease = ev => { console.log(ev) }
      } catch (err) {
        console.log(`${err.name}, ${err.message}`);
      }
    }
    await requestWakeLock();
    const handleVisibilityChange = async () => {
      if (wakeLock !== null && document.visibilityState === 'visible') {
        await requestWakeLock();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
  }  
}
export { wakeupLock };