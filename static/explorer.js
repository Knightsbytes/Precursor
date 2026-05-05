console.log("explorer loaded");

function loadTree() {
    fetch("/tree")
        .then(r => r.json())
        .then(tree => {
            const el = document.getElementById("sidebar-content");
            el.innerHTML = "";
            render(tree, el);
        });
}

function render(nodes, parent) {
    nodes.forEach(n => {

        const div = document.createElement("div");
        div.className = "file-item";

        const icon = document.createElement("img");
        icon.className = "icon";

        if (n.type === "folder") {
            icon.src = "icons/folder.png";
        } else {
            const ext = n.name.split(".").pop();

            if (ext === "py") icon.src = "icons/python_file.png";
            else if (ext === "pyw") icon.src = "icons/python_file.png";
            else if (ext === "pyc") icon.src = "icons/alternative_python_file.png";
            else if (ext === "js") icon.src = "icons/js_file.png";
            else if (ext === "html") icon.src = "icons/html_file.png";
            else if (ext === "png") icon.src = "icons/png_file.png";
            else if (ext === "zip") icon.src = "icons/zip_file.png";
            else if (ext === "css") icon.src = "icons/css_file.png";
            else icon.src = "icons/file.png";
        }

        const label = document.createElement("span");
        label.textContent = n.name;

        div.appendChild(icon);
        div.appendChild(label);

        div.onclick = () => {
            selectedPath = n.path;

            console.log("SELECTED:", selectedPath);

            if (n.type === "file") {
                openFile(n.path);
            }
        };

        parent.appendChild(div);

        if (n.children) {
            const child = document.createElement("div");
            child.style.marginLeft = "12px";
            parent.appendChild(child);
            render(n.children, child);
        }


    });
}

function newFile() {
    document.getElementById("create-file-overlay")
        .classList.remove("hidden");
}

function closeAddFile() {
    document.getElementById("create-file-overlay")
        .classList.add("hidden");
}

async function confirmAddFile() {
    const name = document.getElementById("create-file-input").value.trim();

    if (!name) {
        alert("Enter a file name");
        return;
    }

    await api("/save", {
        path: name,
        content: ""
    });

    document.getElementById("create-file-overlay")
        .classList.add("hidden");

    loadTree();
    openFile(name);
}

function deleteCurrent() {
    if (document.getElementById("delete-permanent-conformation").checked){
        deleteFile()
        return
    }
    document.getElementById("delete-file-overlay")
        .classList.remove("hidden")
}

async function confirmDeleteFile() {
    document.getElementById("delete-file-overlay")
        .classList.add("hidden")

    await deleteFile()
}

async function closeDeleteFile() {
    document.getElementById("delete-file-overlay")
        .classList.add("hidden")
}

window.addEventListener("DOMContentLoaded", () => {
    document.getElementById("create-file-confirm").onclick = () => {
        confirmAddFile()
    };
    document.getElementById("create-file-cancel").onclick = () => {
        closeAddFile()
        console.log("CLICK!")
    };

    document.getElementById("create-file-input").addEventListener("keydown", (e) => {
        if (e.key === "Enter") confirmAddFile();
    });

    document.getElementById("delete-file-confirm").onclick = () => {
        confirmDeleteFile()
    }

    document.getElementById("delete-file-cancel").onclick = () => {
        closeDeleteFile()
    }

    document.addEventListener("keydown", (e) => {
        if (e.key === "Escape") {terminalOpen = false; document.getElementById("terminal").classList.add("hidden")}

        if (e.key === "F5") {
            e.preventDefault()
            runFile(selectedPath)
            console.log("F5 Pressed")
        }
    })
});
