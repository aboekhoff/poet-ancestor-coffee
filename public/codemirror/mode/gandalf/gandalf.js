/**
 * Author: Koh Zi Han, based on implementation by Koh Zi Chun
 */
CodeMirror.defineMode("gandalf", function (config, mode) {
    var BUILTIN = "builtin", COMMENT = "comment", STRING = "string",
        ATOM = "atom", NUMBER = "number", BRACKET = "bracket", KEYWORD="keyword";
    var INDENT_WORD_SKIP = 2, KEYWORDS_SKIP = 1;
    
    function makeKeywords(str) {
        var obj = {}, words = str.split(" ");
        for (var i = 0; i < words.length; ++i) obj[words[i]] = true;
        return obj;
    }

    var keywords   = makeKeywords("define define-macro let letrec fn");
    var indentKeys = makeKeywords("define let letrec fn");    

    function stateStack(indent, type, prev) { // represents a state stack object
        this.indent = indent;
        this.type = type;
        this.prev = prev;
    }

    function pushStack(state, indent, type) {
        state.indentStack = new stateStack(indent, type, state.indentStack);
    }

    function popStack(state) {
        state.indentStack = state.indentStack.prev;
    }
    
    /**
     * Scheme numbers are complicated unfortunately.
     * Checks if we're looking at a number, which might be possibly a fraction.
     * Also checks that it is not part of a longer identifier. Returns true/false accordingly.
     */
    function isNumber(ch, stream){ 
        if(/[0-9]/.exec(ch) != null){ 
            stream.eatWhile(/[0-9]/);
            stream.eat(/\//);
            stream.eatWhile(/[0-9]/);
            if (stream.eol() || !(/[a-zA-Z\-\_\/]/.exec(stream.peek()))) return true;
            stream.backUp(stream.current().length - 1); // undo all the eating
        }
        return false;
    }

    return {
        startState: function () {
            return {
                indentStack: null,
                indentation: 0,
                mode: false,
                sExprComment: false
            };
        },

        token: function (stream, state) {
            if (state.indentStack == null && stream.sol()) {
                // update indentation, but only if indentStack is empty
                state.indentation = stream.indentation();
            }

            // skip spaces
            if (stream.eatSpace()) {
                return null;
            }
            var returnType = null;
            
            switch(state.mode){
                case "string": // multi-line string parsing mode
                    var next, escaped = false;
                    while ((next = stream.next()) != null) {
                        if (next == "\"" && !escaped) {
    
                            state.mode = false;
                            break;
                        }
                        escaped = !escaped && next == "\\";
                    }
                    returnType = STRING; // continue on in scheme-string mode
                    break;
                case "comment": // comment parsing mode
                    var next, maybeEnd = false;
                    while ((next = stream.next()) != null) {
                        if (next == "#" && maybeEnd) {
    
                            state.mode = false;
                            break;
                        }
                        maybeEnd = (next == "|");
                    }
                    returnType = COMMENT;
                    break;
                case "s-expr-comment": // s-expr commenting mode
                    state.mode = false;
                    if(stream.peek() == "(" || stream.peek() == "["){
                        // actually start scheme s-expr commenting mode
                        state.sExprComment = 0;
                    }else{
                        // if not we just comment the entire of the next token
                        stream.eatWhile(/[^/s]/); // eat non spaces
                        returnType = COMMENT;
                        break;
                    }
                default: // default parsing mode
                    var ch = stream.next();
        
                    if (ch == "\"") {
                        state.mode = "string";
                        returnType = STRING;
        
                    } else if (ch == "'") {
                        returnType = ATOM;
                    } else if (ch == '#') {
                        if (stream.eat("|")) {					// Multi-line comment
                            state.mode = "comment"; // toggle to comment mode
                            returnType = COMMENT;
                        } else if (stream.eat(/[tf]/)) {			// #t/#f (atom)
                            returnType = ATOM;
                        } else if (stream.eat(';')) {				// S-Expr comment
                            state.mode = "s-expr-comment";
                            returnType = COMMENT;
                        }
        
                    } else if (ch == ";") { // comment
                        stream.skipToEnd(); // rest of the line is a comment
                        returnType = COMMENT;
                    } else if (ch == "-"){
                        
                        if(!isNaN(parseInt(stream.peek()))){
                            stream.eatWhile(/[\/0-9]/);
                            returnType = NUMBER;
                        }else{                            
                            returnType = null;
                        }
                    } else if (isNumber(ch,stream)){
                        returnType = NUMBER;
                    } else if (ch == "(" || ch == "[") {
                        var keyWord = ''; var indentTemp = stream.column();
                        /**
                        Either 
                        (indent-word ..
                        (non-indent-word ..
                        (;something else, bracket, etc.
                        */
        
                        while ((letter = stream.eat(/[^\s\(\[\;\)\]]/)) != null) {
                            keyWord += letter;
                        }
        
                        if (keyWord.length > 0 && indentKeys.propertyIsEnumerable(keyWord)) { // indent-word
        
                            pushStack(state, indentTemp + INDENT_WORD_SKIP, ch);
                        } else { // non-indent word
                            // we continue eating the spaces
                            stream.eatSpace();
                            if (stream.eol() || stream.peek() == ";") {
                                // nothing significant after
                                // we restart indentation 1 space after
                                pushStack(state, indentTemp + 1, ch);
                            } else {
                                pushStack(state, indentTemp + stream.current().length, ch); // else we match
                            }
                        }
                        stream.backUp(stream.current().length - 1); // undo all the eating
                        
                        if(typeof state.sExprComment == "number") state.sExprComment++;
                        
                        returnType = BRACKET;
                    } else if (ch == ")" || ch == "]") {
                        returnType = BRACKET;
                        if (state.indentStack != null && state.indentStack.type == (ch == ")" ? "(" : "[")) {
                            popStack(state);
                            
                            if(typeof state.sExprComment == "number"){
                                if(--state.sExprComment == 0){
                                    returnType = COMMENT; // final closing bracket
                                    state.sExprComment = false; // turn off s-expr commenting mode
                                }
                            }
                        }
                    } else {
                        stream.eatWhile(/[\w\$_\-]/);
        
                        if (keywords && keywords.propertyIsEnumerable(stream.current())) {
                            returnType = BUILTIN;
                        }else returnType = null;
                    }
            }
            return (typeof state.sExprComment == "number") ? COMMENT : returnType;
        },

        indent: function (state, textAfter) {
            if (state.indentStack == null) return state.indentation;
            return state.indentStack.indent;
        }
    };
});

CodeMirror.defineMIME("text/x-scheme", "scheme");