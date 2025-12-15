let isResizing = false;
let startX = 0;
let startY = 0;

canvas.addEventListener("mousedown", (e) => {
    const rect = canvas.getBoundingClientRect();
    const margin = 20;

    if (
        e.clientX > rect.right - margin &&
        e.clientY > rect.bottom - margin
    ) {
        isResizing = true;
        startX = e.clientX;
        startY = e.clientY;
    }
});

document.addEventListener("mousemove", (e) => {
    if (!isResizing) return;

    const dx = e.clientX - startX;
    const dy = e.clientY - startY;

    canvas.width = Math.max(50, canvas.width + dx);
    canvas.height = Math.max(50, canvas.height + dy);

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(image, 0, 0, canvas.width, canvas.height);

    startX = e.clientX;
    startY = e.clientY;
});

document.addEventListener("mouseup", () => {
    if (!isResizing) return;
    isResizing = false;

    fetch("/canvas/resize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            width: canvas.width,
            height: canvas.height
        })
    }).then(() => reloadImage());
});
