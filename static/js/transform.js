function rotateImage() {
    const angle = document.getElementById("rotateAngle").value;
    if (!angle) return;
    fetch("/transform/rotate",{
        method:"POST",
        headers:{ "Content-Type":"application/json" },
        body: JSON.stringify({ angle: parseFloat(angle) })
    }).then(()=>reloadImage());
}

function flipHorizontal() {
    fetch("/transform/flip_horizontal",{ method:"POST" }).then(()=>reloadImage());
}

function flipVertical() {
    fetch("/transform/flip_vertical",{ method:"POST" }).then(()=>reloadImage());
}

function flipBoth() {
    fetch("/transform/flip_both",{ method:"POST" }).then(()=>reloadImage());
}

function resizeImage() {
    const width = parseInt(document.getElementById("resizeWidth").value);
    const height = parseInt(document.getElementById("resizeHeight").value);
    if (!width || !height) return;
    fetch("/transform/resize",{
        method:"POST",
        headers:{ "Content-Type":"application/json" },
        body: JSON.stringify({
            width: width,
            height: height,
            interpolation: document.getElementById("interpolation").value
        })
    }).then(()=>reloadImage());
}

function cropImage() {
    const x = parseInt(document.getElementById("cropX").value) || 0;
    const y = parseInt(document.getElementById("cropY").value) || 0;
    const w = parseInt(document.getElementById("cropW").value);
    const h = parseInt(document.getElementById("cropH").value);
    if (!w || !h) return;
    fetch("/transform/crop",{
        method:"POST",
        headers:{ "Content-Type":"application/json" },
        body: JSON.stringify({ x, y, w, h })
    }).then(()=>reloadImage());
}
