(function() {
var _onload = window.onload;

function Terminal() {
    if (!(this instanceof Terminal)) {
        return new Terminal();
    }
    var T = this;
    T.element      = document.getElementById('Terminal');
    T.line         = null;
    T.lineNumber   = 0;
    T.columnNumber = 0;
    Gandalf.RT['gandalf#*out*'] = function(x) {
        T.write(x);
    };
    T.newline();
    return T;
};

Terminal.prototype = {
    newline: function() {
        var _line = this.line;
        this.line = document.createElement('p');
        this.element.insertBefore(this.line, _line);
        this.lineNumber++;
        this.columnNumber = 0;
    },

    write: function(txt) {
        var DISPLAY = 1;
        var WRITE   = 2;
        var mode = DISPLAY;
        for (var i=0; i<txt.length; i++) {
            var c = txt[i];
            switch(c) {

            case '\n':
            case '\r':
            case '\f':
                switch(mode) {
                case WRITE:
                    this.line.innerHTML += JSON.stringify(c);
                    break;
                case DISPLAY:
                    this.newline();
                    break;
                }
                break;

            case '\t':
            case '\b':
                switch(mode) {
                    case WRITE:
                    this.line.innerHTML += JSON.stringify(c);
                    break;
                    case DISPLAY:
                    this.line.innerHTML += c;
                }
                break;
                
            default:
                this.line.innerHTML += c;
            }
        }
    }

};


window.onload = function () {
    if (typeof _onload == 'function') {
        _onload();
    }

    var options = {
        mode:  'scheme',
        value: '(load "parser.gandalf")',
        theme: 'blackboard',
        extraKeys: {
            'Ctrl-Enter' : function(editor) {                
                console.log(Gandalf);
                Gandalf.eval(editor.getValue());
            }
        }
    };

    window.editor   = CodeMirror(document.body, options);
    window.terminal = Terminal();
};
})();