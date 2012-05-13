var callWithPath, dynamic_path, getDir, loadXHR, p, readFileSyncXHR;
p = prn;
dynamic_path = "/gandalf/";
getDir = function(path) {
  var segs;
  segs = path.split("/");
  segs.pop();
  return segs.join("/") + "/";
};
callWithPath = function(path, thunk) {
  var tmp;
  tmp = dynamic_path;
  try {
    dynamic_path = path;
    console.log('calling with dyanmic_path: ' + path);
    return thunk();
  } finally {
    dynamic_path = tmp;
  }
};
console.log($PACKAGE());
readFileSyncXHR = function(path) {
  var callback, result, xhr;
  result = null;
  xhr = new XMLHttpRequest();
  callback = function() {
    if (xhr.readyState === 4) {
      if (xhr.status === 200) {
        return result = xhr.responseText;
      } else {
        return window.alert('unable to load ' + path);
      }
    }
  };
  xhr.onreadystatechange = callback;
  xhr.open("GET", path, false);
  xhr.send(null);
  return result;
};
loadXHR = function(url) {
  var path, txt;
  path = dynamic_path + url;
  txt = readFileSyncXHR(path);
  console.log("XHR_LOAD: " + txt);
  return callWithPath(getDir(path), function() {
    return loadToplevel(Reader.create(txt, path));
  });
};
$LOAD(loadXHR);
window.Gandalf = {
  RT: RT,
  eval: function(txt, origin) {
    return loadToplevel(Reader.create(txt, origin));
  }
};