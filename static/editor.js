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

        editor = monaco.editor.create(document.getElementById("editor"), {
            theme: "vs-dark",
            language: "plaintext",
            automaticLayout: true
        });

        editorReady = true;
        resolve(editor);
    });
});