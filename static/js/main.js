function updateImage(data) {
    if (data.error) {
        alert(data.error);
        return;
    }
    const preview = document.getElementById("preview");
    preview.src = data.image_url + "?" + new Date().getTime();
}

function uploadImage() {
    const input = document.getElementById("uploadInput");
    const message = document.getElementById("message");
    const preview = document.getElementById("preview");

    if (!input.files.length) {
        message.textContent = "Выберите файл";
        return;
    }

    const formData = new FormData();
    formData.append("image", input.files[0]);

    fetch("/upload", {
        method: "POST",
        body: formData
    })
    .then(res => res.json())
    .then(data => {
        if (data.error) {
            message.textContent = data.error;
            preview.style.display = "none";
        } else {
            message.textContent = data.message;
            preview.src = data.image_url + "?" + new Date().getTime();
            preview.style.display = "block";
        }
    })
    .catch(() => {
        message.textContent = "Ошибка загрузки";
    });
}

function clearEditor() {
    fetch("/clear", {
        method: "POST"
    })
    .then(res => res.json())
    .then(data => {
        const preview = document.getElementById("preview");

        if (data.error) {
            alert(data.error);
            return;
        }

        // Сброс изображения
        preview.src = "";
        preview.style.display = "none";

        // Очистка input file
        document.getElementById("uploadInput").value = "";

        // Сброс ползунков и полей
        document.querySelectorAll("input[type=range]").forEach(el => {
            el.value = el.defaultValue;
        });

        document.querySelectorAll("input[type=number]").forEach(el => {
            el.value = "";
        });

        document.getElementById("saveMessage").textContent = "";

        alert(data.message);
    });
}


function saveImage() {
    const filename = "current.png";
    const url = `/download/${filename}`;
    const msg = document.getElementById("saveMessage");
    msg.innerHTML = `<a href="${url}" download>Скачать изображение</a>`;
}

function resizeImage() {
    const width = document.getElementById("width").value;
    const height = document.getElementById("height").value;
    const scale = document.getElementById("scale").value;

    fetch("/resize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            width: width ? parseInt(width) : null,
            height: height ? parseInt(height) : null,
            scale: scale ? parseFloat(scale) : null
        })
    })
    .then(res => res.json())
    .then(data => {
        if (data.error) {
            alert(data.error);
        } else {
            document.getElementById("preview").src =
                data.image_url + "?" + new Date().getTime();
        }
    });
}

function cropImage() {
    fetch("/crop", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            x: document.getElementById("cropX").value,
            y: document.getElementById("cropY").value,
            width: document.getElementById("cropW").value,
            height: document.getElementById("cropH").value
        })
    })
    .then(res => res.json())
    .then(data => {
        if (data.error) {
            alert(data.error);
        } else {
            document.getElementById("preview").src =
                data.image_url + "?" + new Date().getTime();
        }
    });
}

function flipImage(mode) {
    fetch("/flip", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: mode })
    })
    .then(res => res.json())
    .then(data => {
        if (data.error) {
            alert(data.error);
        } else {
            document.getElementById("preview").src =
                data.image_url + "?" + new Date().getTime();
        }
    });
}

function rotateImage() {
    fetch("/rotate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            angle: document.getElementById("angle").value,
            center_x: document.getElementById("centerX").value || null,
            center_y: document.getElementById("centerY").value || null
        })
    })
    .then(res => res.json())
    .then(data => {
        if (data.error) {
            alert(data.error);
        } else {
            document.getElementById("preview").src =
                data.image_url + "?" + new Date().getTime();
        }
    });
}

function applyBrightnessContrast() {
    fetch("/brightness_contrast", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            brightness: document.getElementById("brightness").value,
            contrast: document.getElementById("contrast").value
        })
    })
    .then(r => r.json())
    .then(updateImage);
}

function applyColorBalance() {
    fetch("/color_balance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            r: document.getElementById("red").value,
            g: document.getElementById("green").value,
            b: document.getElementById("blue").value
        })
    })
    .then(r => r.json())
    .then(updateImage);
}

function addGaussianNoise() {
    fetch("/noise", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "gaussian", sigma: 25 })
    })
    .then(r => r.json())
    .then(updateImage);
}

function addSPNoise() {
    fetch("/noise", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "sp", amount: 0.01 })
    })
    .then(r => r.json())
    .then(updateImage);
}

function applyBlur(type) {
    fetch("/blur", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: type, kernel: 7 })
    })
    .then(r => r.json())
    .then(updateImage);
}
