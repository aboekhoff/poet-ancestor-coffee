p = prn

dynamic_path = "/gandalf/"

getDir = (path) ->
  segs = path.split("/")
  segs.pop()
  segs.join("/") + "/"

callWithPath = (path, thunk) ->
  tmp = dynamic_path
  try
    dynamic_path = path
    console.log('calling with dyanmic_path: ' + path)
    thunk()
  finally
    dynamic_path = tmp

console.log($PACKAGE())

readFileSyncXHR = (path) ->
  result = null
  xhr    = new XMLHttpRequest()

  callback = () ->
    if xhr.readyState == 4
      if xhr.status == 200
        result = xhr.responseText
      else
        window.alert('unable to load ' + path)

  xhr.onreadystatechange = callback
  xhr.open("GET", path, false)
  xhr.send(null)
  result

loadXHR = (url) ->
  path = dynamic_path + url
  txt = readFileSyncXHR(path)
  console.log("XHR_LOAD: " + txt)

  callWithPath(
    getDir(path)
    () -> loadToplevel(Reader.create(txt, path))
  )

$LOAD(loadXHR)

window.Gandalf =
  RT:   RT
  eval: (txt, origin) ->
    loadToplevel(Reader.create(txt, origin))
