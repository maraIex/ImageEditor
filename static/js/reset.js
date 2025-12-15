function undo() {
    fetch("/undo", {
        method: "POST"
    }).then(() => reloadImage());
}

function resetImage() {
    fetch("/reset", {
        method: "POST"
    }).then(() => reloadImage());
}
