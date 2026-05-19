let editor;
let editorReady = false;
let editorReadyPromise;

require.config({
    paths: {
        vs: "https://cdnjs.cloudflare.com/ajax/libs/monaco-editor/0.45.0/min/vs"
    }
});

editorReadyPromise = new Promise((resolve) => {

    require(["vs/editor/editor.main"], function () {

        monaco.languages.setMonarchTokensProvider("python", {

            keywords: [
                "def", "async", "await", "if", "else", "elif",
                "for", "while", "with", "class", "lambda",
                "return", "yield", "try", "except", "finally",
                "import", "from", "as", "pass", "break",
                "continue", "del", "global", "nonlocal",
                "assert", "raise", "match", "case", "in"
            ],

            builtins: [
                "abs","all","any","ascii","bin","bool",
                "breakpoint","bytearray","bytes",

                "callable","chr","classmethod","compile","complex",

                "delattr","dict","dir","divmod",

                "enumerate","eval","exec",

                "filter","float","format","frozenset",

                "getattr","globals",

                "hasattr","hash","help","hex",

                "id","input","isinstance","issubclass","iter",

                "len","locals",

                "map","max","memoryview","min",

                "next",

                "object","oct","open","ord",

                "pow","print","property",

                "range","repr","reversed","round",

                "set","setattr","slice","sorted",
                "staticmethod",

                "sum","super","tuple","type",

                "vars","zip"
            ],

            tokenizer: {

                root: [

                    // builtins
                    [
                        /\b(abs|all|any|ascii|bin|bool|breakpoint|bytearray|bytes|callable|chr|classmethod|compile|complex|delattr|dict|dir|divmod|enumerate|eval|exec|filter|float|format|frozenset|getattr|globals|hasattr|hash|help|hex|id|input|isinstance|issubclass|iter|len|locals|map|max|memoryview|min|next|object|oct|open|ord|pow|print|property|range|repr|reversed|round|set|setattr|slice|sorted|staticmethod|sum|super|tuple|type|vars|zip)\b/,
                        "builtin"
                    ],

                    // function definitions
                    [
                        /(def)(\s+)([a-zA-Z_]\w*)/,
                        [
                            "keyword",
                            "white",
                            "function"
                        ]
                    ],

                    // class definitions
                    [
                        /(class)(\s+)([A-Z][\w]*)/,
                        [
                            "keyword",
                            "white",
                            "type.identifier"
                        ]
                    ],

                    // keywords
                    [
                        /\b(def|async|await|if|in|else|elif|for|while|with|class|lambda|return|yield|try|except|finally|import|from|as|pass|break|continue|del)\b/,
                        "keyword"
                    ],

                    // built-in types
                    [
                        /\b(int|float|str|bool|list|dict|tuple|set|bytes|object|None)\b/,
                        "type"
                    ],

                    // numbers
                    [
                        /\d+/,
                        "number"
                    ],

                    // strings
                    [
                        /".*?"/,
                        "string"
                    ],

                    [
                        /'.*?'/,
                        "string"
                    ],

                    // comments
                    [
                        /#.*/,
                        "comment"
                    ],

                    // identifiers
                    [
                        /[a-zA-Z_]\w*/,
                        "identifier"
                    ]
                ]
            }
        });

        monaco.editor.defineTheme("precursor-theme", {

            base: "vs-dark",

            inherit: true,

            rules: [

                {
                    token: "keyword",
                    foreground: "FF6C23"
                },

                {
                    token: "function",
                    foreground: "DCDCAA"
                },

                {
                    token: "type.identifier",
                    foreground: "4EC9B0"
                },

                {
                    token: "type",
                    foreground: "FF93D5"
                },

                {
                    token: "string",
                    foreground: "CE9178"
                },

                {
                    token: "comment",
                    foreground: "7A7E85"
                },

                {
                    token: "number",
                    foreground: "7AD0FF"
                },

                {
                    token: "identifier",
                    foreground: "D4D4D4"
                },

                {
                    token: "builtin",
                    foreground: "3C8FF4"
                },

                {
                    token: "string",
                    foreground: "68A871"
                }
            ],

            colors: {
                "editor.background": "#1E1F22"
            }
        });

        editor = monaco.editor.create(
            document.getElementById("editor"),
            {
                theme: "precursor-theme",
                language: "python",
                automaticLayout: true,
                minimap: {
                    enabled: false
                }
            }
        );

        editorReady = true;

        resolve(editor);

        console.log("Editor ready");
    });
});