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

async function runFile() {

    document.getElementById("terminal-window")
        .classList.remove("hidden");

    try {

        if (!currentFile) {
            console.warn("No file selected");
            return;
        }

        const res = await api("/run", {
            path: currentFile
        });

        console.log("Run response:", res);

        if (!res) {
            throw new Error("No response from server");
        }

        const output = document.getElementById("terminal");

        output.innerHTML = "";

        if (res.error) {

            const err = document.createElement("div");
            err.className = "stderr";
            err.textContent = res.error;

            output.appendChild(err);
            return;
        }

        // stdout
        if (res.stdout) {

            const out = document.createElement("div");
            out.className = "stdout";
            out.textContent = res.stdout;

            output.appendChild(out);
        }

        // stderr
        if (res.stderr) {

            const lines = res.stderr.split("\n");

            for (const line of lines) {

                if (!line.trim()) continue;

                const div = document.createElement("div");

                if (line.includes("Traceback")) {
                    div.className = "traceback";
                }
                else if (
                    line.includes("Warning") ||
                    line.includes("warning")
                ) {
                    div.className = "warning";
                }
                else {
                    div.className = "stderr";
                }

                div.textContent = line;

                output.appendChild(div);
            }
        }

        // exit code message
        const status = document.createElement("div");

        if (res.code === 0) {
            status.className = "success";
            status.textContent =
                `\nProcess finished successfully`;
        }
        else {
            status.className = "stderr";
            status.textContent =
                `\nProcess exited with code ${res.code}`;
        }

        output.appendChild(status);

    }
    catch (err) {

        console.error("Run failed:", err);

        const output = document.getElementById("terminal");

        output.innerHTML = "";

        const div = document.createElement("div");

        div.className = "stderr";
        div.textContent =
            "Frontend error:\n" + err.message;

        output.appendChild(div);
    }
}

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