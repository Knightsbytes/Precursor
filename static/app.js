let currentFile = null;
let selectedPath = null;

let terminalOpen = false;

window.openTabs = window.openTabs || {};
window.models = window.models || {};
window.dirtyFiles = window.dirtyFiles || {};

async function api(route, data = {}) {
    const res = await fetch(route, {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify(data)
    });
    return res.json();
}

function getName(path) {
    return path.split("/").pop();
}

function autoDetectLanguage(path, content) {
    const ext = path.split(".").pop().toLowerCase();

    const map = {
        py: "python",
        pyw: "python",
        js: "javascript",
        ts: "typescript",
        html: "html",
        css: "css",
        json: "json",
        md: "markdown",
        java: "java",
        c: "c",
        cpp: "cpp",
        cs: "csharp",
        xml: "xml",
        yaml: "yaml",
        yml: "yaml",
        txt: "plaintext"
    };

    if (map[ext]) return map[ext];

    if (content.includes("def ") && content.includes("import "))
        return "python";

    if (content.includes("<html"))
        return "html";

    if (content.includes("function") && content.includes("{"))
        return "javascript";

    return "plaintext";
}

async function saveCurrent() {
    if (!currentFile) {
        console.warn("No file selected");
        return;
    }

    const res = await api("/save", {
        path: currentFile,
        content: editor.getValue()
    });

    dirtyFiles[currentFile] = false;
    updateTabTitle(currentFile);

    console.log("Saved:", res);
}

async function deleteFile() {
    if (!selectedPath) {
        console.warn("No item selected");
        return;
    }

    console.log("Deleting:", selectedPath);

    const res = await api("/delete", { path: selectedPath });

    console.log("deleted:", res);

    if (openTabs[selectedPath]) {
        closeTab(selectedPath);
    }

    loadTree();
}

async function openFile(path) {
    if (!editor) {
        console.warn("Editor not ready yet");
        return;
    }

    const res = await api("/open", { path });

    if (!res || res.error) {
        console.error("Open failed:", res);
        return;
    }

    let model = models[path];

    if (!model) {

        const language = autoDetectLanguage(path, res.content);

        model = monaco.editor.createModel(res.content, language);

        model.onDidChangeContent(() => {
            dirtyFiles[path] = true;
            updateTabTitle(path);
        });

        models[path] = model;
    }

    editor.setModel(model);
    currentFile = path;

    if (!(path in dirtyFiles)) {
        dirtyFiles[path] = false;
    }

    createTab(path);
}

function closeTab(path) {
    const tabObj = openTabs[path];
    if (!tabObj) return;

    if (dirtyFiles[path]) {
        api("/save", {
            path: path,
            content: models[path].getValue()
        });
    }

    tabObj.tab.remove();
    delete openTabs[path];
    delete models[path];
    delete dirtyFiles[path];

    if (currentFile === path) {
        const remaining = Object.keys(openTabs);
        if (remaining.length > 0) {
            switchTab(remaining[0]);
        } else {
            currentFile = null;
            editor.setModel(null);
        }
    }
}

function switchTab(path) {
    if (!models[path]) {
        console.warn("No model for:", path);
        return;
    }

    currentFile = path;

    Object.values(openTabs).forEach(t => t.tab.classList.remove("active"));

    openTabs[path].tab.classList.add("active");

    const model = models[path];
    const lang = autoDetectLanguage(path, model.getValue());

    monaco.editor.setModelLanguage(model, lang);

    editor.setModel(model);
}

function showPanel(panel) {
    if (!panel) {return}
    if (panel === "files") {
        loadTree();
        document.getElementById("sidebar-content").classList.remove("hidden")
    }
    else{
        document.getElementById("sidebar-content").classList.add("hidden")
    }

    if (panel === "settings"){
        document.getElementById("options-content").classList.remove("hidden")
    }
    else{
        document.getElementById("options-content").classList.add("hidden")
    }
}

window.onload = () => {
    loadTree();
};

window.addEventListener("keydown", e => {
    if (e.ctrlKey && e.key === "s") {
        e.preventDefault();
        saveCurrent();
    }
});

function updateTabTitle(path) {
    if (!openTabs[path]) return;

    const tab = openTabs[path].tab;

    if (dirtyFiles[path]) {
        tab.classList.add("dirty");
    } else {
        tab.classList.remove("dirty");
    }
}

function createTab(path) {
    const tabs = document.getElementById("tabs");

    if (openTabs[path]) {
        switchTab(path);
        return;
    }

    const tab = document.createElement("div");
    tab.className = "tab";

    const label = document.createElement("span");
    label.className = "tab-label";
    label.textContent = getName(path);

    const close = document.createElement("span");
    close.className = "tab-close";
    close.textContent = "✕";

    close.addEventListener("click", (e) => {
        e.stopPropagation();
        closeTab(path);
    });

    tab.appendChild(label);
    tab.appendChild(close);

    tab.addEventListener("click", () => switchTab(path));

    tabs.appendChild(tab);

    openTabs[path] = { tab, label };

    switchTab(path);
}

let polling = false;

function appendConsole(text, cls = "stdout") {

    const output = document.getElementById("terminal-output");

    const div = document.createElement("div");

    div.className = cls;
    div.textContent = text;

    output.appendChild(div);

    output.scrollTop = output.scrollHeight;
}

async function startPolling() {

    if (polling) return;

    polling = true;

    while (polling) {

        try {

            const res = await api("/poll");

            if (!res || !res.output) {
                await new Promise(r => setTimeout(r, 50));
                continue;
            }

            for (const msg of res.output) {

                let cls = "stdout";

                if (msg.type === "stderr") {
                    cls = "stderr";
                }

                if (
                    msg.text.includes("Traceback")
                ) {
                    cls = "traceback";
                }

                if (
                    msg.text.includes("Warning") ||
                    msg.text.includes("warning")
                ) {
                    cls = "warning";
                }

                if (msg.type === "system") {
                    cls = "success";
                }

                appendConsole(msg.text, cls);
            }
        }
        catch (err) {

            appendConsole(
                "Polling failed: " + err.message,
                "stderr"
            );

            polling = false;
        }

        await new Promise(r => setTimeout(r, 50));
    }
}

async function runFile() {

    document.getElementById("terminal-window")
        .classList.remove("hidden");

    const output =
        document.getElementById("terminal-output");

    output.innerHTML = "";

    try {

        if (!currentFile) {

            appendConsole(
                "No file selected",
                "warning"
            );

            return;
        }

        polling = false;

        await new Promise(r => setTimeout(r, 60));

        const res = await api("/run", {
            path: currentFile
        });

        console.log("Run response:", res);

        if (!res) {
            throw new Error("No response from server");
        }

        if (res.error) {

            appendConsole(
                res.error,
                "stderr"
            );

            return;
        }

        appendConsole(
            `Running ${currentFile}\n`,
            "system"
        );

        startPolling();
    }
    catch (err) {

        console.error("Run failed:", err);

        appendConsole(
            "Frontend error:\n" + err.message,
            "stderr"
        );
    }
}

document.getElementById("terminal-input")
.addEventListener("keydown", async (e) => {

    if (e.key !== "Enter") return;

    const value = e.target.value;

    if (!value.trim()) return;

    appendConsole("> " + value, "stdin");

    await api("/stdin", {
        input: value
    });

    e.target.value = "";
});


function showOutput(data) {

    const output = document.getElementById("output");

    output.innerHTML = "";

    if (data.stdout) {
        const out = document.createElement("div");
        out.className = "stdout";
        out.textContent = data.stdout;
        output.appendChild(out);
    }

    if (data.stderr) {
        const err = document.createElement("div");
        err.className = "stderr";
        err.textContent = data.stderr;
        output.appendChild(err);
    }

    if (data.code === 0) {
        const ok = document.createElement("div");
        ok.className = "success";
        ok.textContent = "\nProcess finished successfully";
        output.appendChild(ok);
    }
}

function readTextFile(file, callback) {
    var rawFile = new XMLHttpRequest();
    rawFile.overrideMimeType("application/json");
    rawFile.open("GET", file, true);
    rawFile.onreadystatechange = function() {
        if (rawFile.readyState === 4 && rawFile.status == "200") {
            callback(rawFile.responseText);
        }
    }
    rawFile.send(null);
}

readTextFile("themes/default.json", function(text){
    var data = JSON.parse(text);
    console.log(data);
});