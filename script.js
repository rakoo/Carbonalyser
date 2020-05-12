extractHostname = (url) => {
  let hostname = url.indexOf("//") > -1 ? url.split('/')[2] : url.split('/')[0];

  // find & remove port number
  hostname = hostname.split(':')[0];
  // find & remove "?"
  hostname = hostname.split('?')[0];

  return hostname;
};

extractType = (contentType) => {
  let type = contentType.indexOf(';') > -1 ? contentType.split(';')[0] : contentType;
  return type;
};

setByteLengthPerOrigin = (origin, byteLength) => {
  const stats = localStorage.getItem('statsByOrigin');
  const statsJson = null === stats ? {} : JSON.parse(stats);

  let bytePerOrigin = undefined === statsJson[origin] ? 0 : parseInt(statsJson[origin]);
  statsJson[origin] = bytePerOrigin + byteLength;

  localStorage.setItem('statsByOrigin', JSON.stringify(statsJson));
};

setByteLengthPerType = (type, byteLength) => {
  const stats = localStorage.getItem('statsByType');
  const statsJson = null === stats ? {} : JSON.parse(stats);

  let bytePerType = undefined === statsJson[type] ? 0 : parseInt(statsJson[type]);
  statsJson[type] = bytePerType + byteLength;

  localStorage.setItem('statsByType', JSON.stringify(statsJson));
}

isChrome = () => {
  return (typeof(browser) === 'undefined');
};

headersReceivedListener = (responseDetails) => {
  const responseHeadersContentType = responseDetails.responseHeaders.find(element => element.name.toLowerCase() === "content-type");
  const contentType = undefined === responseHeadersContentType ? {value: "unspecified"}
   : responseHeadersContentType;
  const type = extractType(contentType.value);

  if (isChrome()) {
     const origin = extractHostname(!responseDetails.initiator ? responseDetails.url : responseDetails.initiator);
     const responseHeadersContentLength = responseDetails.responseHeaders.find(element => element.name.toLowerCase() === "content-length");
     const contentLength = undefined === responseHeadersContentLength ? {value: 0}
      : responseHeadersContentLength;
     const requestSize = parseInt(contentLength.value, 10);
     setByteLengthPerOrigin(origin, requestSize);

     setByteLengthPerType(type, requestSize);

     return {};
  }

  let filter = browser.webRequest.filterResponseData(responseDetails.requestId);

  filter.ondata = event => {
    const origin = extractHostname(!responseDetails.originUrl ? responseDetails.url : responseDetails.originUrl);
    setByteLengthPerOrigin(origin, event.data.byteLength);

    setByteLengthPerType(type, event.data.byteLength);

    filter.write(event.data);
  };

  filter.onstop = () => {
    filter.disconnect();
  };

  return {};
};

setBrowserIcon = (type) => {
  chrome.browserAction.setIcon({path: `icons/icon-${type}-48.png`});
};

addOneMinute = () => {
  let duration = localStorage.getItem('duration');
  duration = null === duration ? 1 : 1 * duration + 1;
  localStorage.setItem('duration', duration);
};

let addOneMinuteInterval;

handleMessage = (request, sender, sendResponse) => {
  if ('start' === request.action) {
    setBrowserIcon('on');

    chrome.webRequest.onHeadersReceived.addListener(
      headersReceivedListener,
      {urls: ["<all_urls>"]},
      ["blocking", "responseHeaders"]
    );

    if (!addOneMinuteInterval) {
      addOneMinuteInterval = setInterval(addOneMinute, 60000);
    }

    return;
  }

  if ('stop' === request.action) {
    setBrowserIcon('off');
    chrome.webRequest.onHeadersReceived.removeListener(headersReceivedListener);

    if (addOneMinuteInterval) {
      clearInterval(addOneMinuteInterval);
      addOneMinuteInterval = null;
    }
  }
};

chrome.runtime.onMessage.addListener(handleMessage);
