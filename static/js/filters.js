function applyBrightnessContrastRGB() {
    fetch("/filter/brightness_contrast_rgb", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            brightness: parseInt(document.getElementById("brightness").value),
            contrast: parseFloat(document.getElementById("contrast").value),
            r: parseInt(document.getElementById("r").value),
            g: parseInt(document.getElementById("g").value),
            b: parseInt(document.getElementById("b").value)
        })
    }).then(() => reloadImage());
}

function applyBrightnessContrast() { applyBrightnessContrastRGB(); }
function applyColorBalance() { applyBrightnessContrastRGB(); }

function addGaussianNoise() {
    fetch("/filter/add_gaussian_noise", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            sigma: parseFloat(document.getElementById("noise").value)
        })
    }).then(() => reloadImage());
}

function applyBlur(type) {
    fetch("/filter/blur", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            type: type,
            ksize: parseInt(document.getElementById("blur").value)
        })
    }).then(() => reloadImage());
}
