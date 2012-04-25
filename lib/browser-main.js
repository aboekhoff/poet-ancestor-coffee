var p;
p = prn;
console.log($PACKAGE());
window.Gandalf = {
  RT: RT,
  load: function(txt, origin) {
    return loadToplevel(Reader.create(txt, origin));
  }
};