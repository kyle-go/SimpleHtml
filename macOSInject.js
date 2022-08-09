console.log('load macOInject.js')
if (!window.macOsInjectWKWebViewJavascriptBridge && navigator.userAgent.includes('Mac')){
  console.log('iframe init jsBridge')

  const TARGET_ORIGIN = "file://*";
  // 初始化
  window.macOsInjectWKWebViewJavascriptBridge = function(func){
    window.WKWVJBCallbacks = {}
    console.log('WKWVJBCallbacks init done.');
    window.localTimer = 0
    console.log('localTimer init done.');
    window.onmessage = handelMessage;
    window.WKWebViewJavascriptBridge = {
      callHandler: callHandler,
    };
    console.log('WKWebViewJavascriptBridge init done.');
    window.setupWKWebViewJavascriptBridge = func;
  }
  // 处理postmessage回调
  function handelMessage(e){
    // TODO 接收的消息 origin 校验
    if (!e.origin || e.origin.length === 0) {
      clearInterval(window.localTimer);
      alert('Receive Message Origin Is Undefined!');
      return;
    }
    if (e.origin !== "file://") {
      clearInterval(window.localTimer);
      alert('Receive Unknown Origin Message!');
      return ;
    }

    console.log('iframe receive postmessage data: ' + JSON.stringify(e.data));
    const { callbackid, response } = e.data || {}
    const { status } = response || {}

    if (!status) {
      console.log('receive data no status information.');
      clearInterval(window.localTimer);
      console.log('clear local Interval timer, timer_id: ' + window.localTimer.toString());
      alert('error postmessage data receive!');
      return;
    }

    if (!callbackid || callbackid.length === 0) {
      clearInterval(window.localTimer);
      console.log('clear local Interval timer, timer_id: ' + window.localTimer.toString());
    }

    return responseTempOperation(response, callbackid);
  }

  // 回调数据临时存储
  function responseTempOperation(response, callbackid) {
    window.WKWVJBCallbacks[callbackid] = response;
  }

  // getToken、removeToken、closePage 等触发事件
  async function callHandler(methodName, params, callback) {
    console.log('received a post request, trigger callHandler.');
    callback(await postmessage(methodName,params));
  }

  // postmessage
  async function postmessage(methodName, params) {
    // 极端 或 未知异常的情况下 定时器没有清除，这边每次请求 都清一次定时器。
    if (window.localTimer) {
      clearInterval(window.localTimer);
    }

    window.WKWVJBCallbacks = {};
    const callbackid = new Date().getTime().toString();
    const message = {
      params,
      callbackid,
      methodName,
    }

    window.top.postMessage(
      message,
      TARGET_ORIGIN
    );
    console.log('post request data:' + JSON.stringify(message) + ' & targetOrigin:' + TARGET_ORIGIN);

    return new Promise((resolve)=>{
      const timer = setInterval(()=>{
        window.localTimer = timer;
        console.log('into Interval timer,timer_id: ' + timer.toString());
        if (window.WKWVJBCallbacks[callbackid]){
          clearInterval(timer);
          console.log('get postmessage data,clear local interval timer, timer_id : ' + timer.toString());
          resolve(window.WKWVJBCallbacks[callbackid]);
        }
      },100);
    });
  }
}
