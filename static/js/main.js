const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");
const image = new Image();

let isDragging = false;       // перемещение картинки
let isResizing = false;       // растяжение картинки
let dragOffsetX = 0;
let dragOffsetY = 0;
let resizeDir = "";           // направление растяжения

let workspaceSize = 100;      // минимальный размер рабочей области

// ===================== ЗАГРУЗКА И ОТОБРАЖЕНИЕ =====================
function loadToCanvas(base64) {
    image.onload = () => {
        canvas.width = Math.max(image.width, workspaceSize);
        canvas.height = Math.max(image.height, workspaceSize);
        drawCanvas();
        updateCanvasInfo();
    };
    image.src = "data:image/png;base64," + base64;
}

function reloadImage() {
    fetch("/current")
        .then(r => r.json())
        .then(data => {
            if (data.image) loadToCanvas(data.image);
        });
}

// ===================== ОТРИСОВКА =====================
function drawCanvas() {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    if (!image.src) return;

    const offsetX = (canvas.width - image.width) / 2;
    const offsetY = (canvas.height - image.height) / 2;

    ctx.drawImage(image, offsetX, offsetY, image.width, image.height);
}

// ===================== КУРСОР И РАСТЯЖЕНИЕ =====================
canvas.addEventListener("mousemove", e => {
    const rect = canvas.getBoundingClientRect();
    const container = document.getElementById('workspace-container');
    const scrollX = container.scrollLeft;
    const scrollY = container.scrollTop;

    const mx = e.clientX - rect.left + scrollX;
    const my = e.clientY - rect.top + scrollY;

    const offsetX = (canvas.width - image.width) / 2;
    const offsetY = (canvas.height - image.height) / 2;
    const margin = 10;

    // ПЕРЕМЕЩЕНИЕ
    if (isDragging) {
        const dx = mx - dragOffsetX;
        const dy = my - dragOffsetY;
        dragOffsetX = mx;
        dragOffsetY = my;

        // Сдвигаем картинку
        drawCanvas();
        ctx.drawImage(image, offsetX + dx, offsetY + dy, image.width, image.height);
        return;
    }

    // РАСТЯЖЕНИЕ
    if (isResizing) {
        const dx = mx - dragOffsetX;
        const dy = my - dragOffsetY;

        if (resizeDir.includes("right")) image.width += dx;
        if (resizeDir.includes("left"))  { image.width -= dx; dragOffsetX += dx; }
        if (resizeDir.includes("bottom")) image.height += dy;
        if (resizeDir.includes("top"))    { image.height -= dy; dragOffsetY += dy; }

        // ограничиваем минимальные размеры
        image.width = Math.max(10, image.width);
        image.height = Math.max(10, image.height);

        // расширяем canvas, если картинка выходит за пределы
        canvas.width = Math.max(canvas.width, image.width + 20);
        canvas.height = Math.max(canvas.height, image.height + 20);

        dragOffsetX = mx;
        dragOffsetY = my;

        drawCanvas();
        return;
    }

    // изменение курсора
    let cursor = "default";
    if (mx >= offsetX - margin && mx <= offsetX + image.width + margin &&
        my >= offsetY - margin && my <= offsetY + image.height + margin) {

        const onLeft = Math.abs(mx - offsetX) < margin;
        const onRight = Math.abs(mx - (offsetX + image.width)) < margin;
        const onTop = Math.abs(my - offsetY) < margin;
        const onBottom = Math.abs(my - (offsetY + image.height)) < margin;

        if ((onLeft && onTop) || (onRight && onBottom)) cursor = "nwse-resize";
        else if ((onRight && onTop) || (onLeft && onBottom)) cursor = "nesw-resize";
        else if (onLeft || onRight) cursor = "ew-resize";
        else if (onTop || onBottom) cursor = "ns-resize";
        else cursor = "move";
    }

    canvas.style.cursor = cursor;
});

// ===================== MOUSE DOWN =====================
canvas.addEventListener("mousedown", e => {
    const rect = canvas.getBoundingClientRect();
    const container = document.getElementById('workspace-container');
    const scrollX = container.scrollLeft;
    const scrollY = container.scrollTop;

    const mx = e.clientX - rect.left + scrollX;
    const my = e.clientY - rect.top + scrollY;

    const offsetX = (canvas.width - image.width) / 2;
    const offsetY = (canvas.height - image.height) / 2;
    const margin = 10;

    const onLeft = Math.abs(mx - offsetX) < margin;
    const onRight = Math.abs(mx - (offsetX + image.width)) < margin;
    const onTop = Math.abs(my - offsetY) < margin;
    const onBottom = Math.abs(my - (offsetY + image.height)) < margin;

    resizeDir = "";
    if (onLeft) resizeDir += "left";
    if (onRight) resizeDir += "right";
    if (onTop) resizeDir += "top";
    if (onBottom) resizeDir += "bottom";

    if (resizeDir) {
        isResizing = true;
        dragOffsetX = mx;
        dragOffsetY = my;
    } else if (mx >= offsetX && mx <= offsetX + image.width &&
               my >= offsetY && my <= offsetY + image.height) {
        isDragging = true;
        dragOffsetX = mx;
        dragOffsetY = my;
    }
});

// ===================== MOUSE UP =====================
document.addEventListener("mouseup", () => {
    if (isResizing) {
        isResizing = false;
        fetch("/canvas/resize", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ width: image.width, height: image.height })
        }).then(() => reloadImage());
    }
    if (isDragging) isDragging = false;
});

// ===================== ЗАГРУЗКА ФАЙЛА =====================
document.getElementById("fileInput").addEventListener("change", e => {
    if (!e.target.files.length) return;
    const formData = new FormData();
    formData.append("image", e.target.files[0]);
    fetch("/upload", { method: "POST", body: formData }).then(() => reloadImage());
});

// ===================== СОХРАНЕНИЕ =====================
function exportImage() { window.location.href = "/export?format=png"; }

// ===================== UI =====================
function toggleUI() { document.body.classList.toggle("minimal"); }

// ===================== ИНФОРМАЦИЯ =====================
function updateCanvasInfo() {
    document.getElementById("canvas-size").textContent = image.width + "×" + image.height + " px";
}

// ===================== UNDO / RESET / CLEAR =====================
function undo() { fetch("/undo", { method: "POST" }).then(() => reloadImage()); }
function resetImage() { fetch("/reset", { method: "POST" }).then(() => reloadImage()); }
function clearCanvas() { fetch("/clear", { method: "POST" }).then(() => reloadImage()); }
