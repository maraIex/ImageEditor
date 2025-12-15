let currentDataURL = null;
const canvas = document.getElementById("preview");
const ctx = canvas.getContext("2d");
const info = document.getElementById("info");


function draw(dataURL) {
    const img = new Image();
    img.onload = () => {
        canvas.width = img.width;
        canvas.height = img.height;
        ctx.drawImage(img, 0, 0);
        info.textContent = `Размер: ${img.width}×${img.height}`;
    };
    img.src = dataURL;
    currentDataURL = dataURL;
}


async function sendProcess(formData) {
    let r = await fetch("/process", { method: "POST", body: formData });
    let j = await r.json();
    if (j.error) {
        alert(j.error);
        return;
    }
    if (j.result) draw(j.result);
    if (j.saved_path) {
        document.getElementById("saveLink").innerHTML =
            `<a href="${j.saved_path}" target="_blank">${j.saved_name}</a>`;
    }
}


// --- upload ---
document.getElementById("inputFile").onchange = e => {
    const file = e.target.files[0];
    if (!file) return;
    let fd = new FormData();
    fd.append("action", "upload");
    fd.append("image", file);
    sendProcess(fd);
};


// --- resize ---
document.getElementById("btnResize").onclick = () => {
    let fd = new FormData();
    fd.append("action", "resize");
    fd.append("image_b64", currentDataURL);
    fd.append("w", document.getElementById("resizeW").value);
    fd.append("h", document.getElementById("resizeH").value);
    fd.append("interp", document.getElementById("interpolation").value);
    sendProcess(fd);
};


// crop
document.getElementById("btnCrop").onclick = () => {
    let fd = new FormData();
    fd.append("action", "crop");
    fd.append("image_b64", currentDataURL);
    fd.append("x", cropX.value);
    fd.append("y", cropY.value);
    fd.append("w", cropW.value);
    fd.append("h", cropH.value);
    sendProcess(fd);
};


// rotate
document.getElementById("btnRotate").onclick = () => {
    let fd = new FormData();
    fd.append("action", "rotate");
    fd.append("image_b64", currentDataURL);
    fd.append("angle", angle.value);
    fd.append("cx", centerX.value);
    fd.append("cy", centerY.value);
    sendProcess(fd);
};


// flip buttons
flipH.onclick = () => sendFlip("h");
flipV.onclick = () => sendFlip("v");
flipBoth.onclick = () => sendFlip("both");

function sendFlip(mode) {
    let fd = new FormData();
    fd.append("action", "flip");
    fd.append("image_b64", currentDataURL);
    fd.append("mode", mode);
    sendProcess(fd);
}


// Brightness / Contrast
btnBC.onclick = () => {
    let fd = new FormData();
    fd.append("action", "bc");
    fd.append("image_b64", currentDataURL);
    fd.append("alpha", contrast.value);
    fd.append("beta", brightness.value);
    sendProcess(fd);
};


// Color balance
btnColor.onclick = () => {
    let fd = new FormData();
    fd.append("action", "color");
    fd.append("image_b64", currentDataURL);
    fd.append("r", mulR.value);
    fd.append("g", mulG.value);
    fd.append("b", mulB.value);
    sendProcess(fd);
};


// noise
btnNoise.onclick = () => {
    let fd = new FormData();
    fd.append("action", "noise");
    fd.append("image_b64", currentDataURL);
    fd.append("type", noiseType.value);
    fd.append("amount", noiseAmount.value);
    sendProcess(fd);
};


// blur
btnBlur.onclick = () => {
    let fd = new FormData();
    fd.append("action", "blur");
    fd.append("image_b64", currentDataURL);
    fd.append("type", blurType.value);
    fd.append("ksize", blurK.value);
    sendProcess(fd);
};


// save
btnSave.onclick = () => {
    const base64Data = currentDataURL;
    const a = document.createElement("a");
    a.href = base64Data;
    a.download = saveName.value + "." + saveFormat.value;
    a.click();
};

