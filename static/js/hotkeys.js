document.addEventListener("keydown", function (e) {
    if (e.ctrlKey && e.key.toLowerCase() === "z") {
        e.preventDefault();
        undo();
    }
});
