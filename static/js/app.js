// Полная инициализация редактора с интеграцией с бэкендом
document.addEventListener('DOMContentLoaded', function() {
    // Инициализация редактора
    const editor = new Editor("svgCanvas");
    
    // Инструменты
    const tools = {
        select: new SelectTool(editor),
        line: new LineTool(editor),
        rect: new RectTool(editor),
        ellipse: new EllipseTool(editor),
        polyline: new PolylineTool(editor),
        polygon: new PolygonTool(editor),
        text: new TextTool(editor),
        star: new StarTool(editor)
    };
    
    // Установка инструмента по умолчанию
    editor.setTool(tools.select);
    
    // Инициализация UI
    initUI(editor, tools);
    
    // Загрузка начального холста
    loadInitialCanvas(editor);
});

function initUI(editor, tools) {
    // Кнопки инструментов
    document.querySelectorAll("[data-tool]").forEach(btn => {
        btn.onclick = () => {
            // Снимаем активность со всех кнопок
            document.querySelectorAll(".tool-btn").forEach(b => b.classList.remove("active"));
            // Активируем текущую
            btn.classList.add("active");
            // Устанавливаем инструмент
            editor.setTool(tools[btn.dataset.tool]);
        };
    });
    
    // Кнопки истории
    document.getElementById("btnUndo").onclick = () => {
        editor.history.undo();
        updateHistoryInfo(editor);
    };
    
    document.getElementById("btnRedo").onclick = () => {
        editor.history.redo();
        updateHistoryInfo(editor);
    };
    
    // Трансформации
    document.getElementById("btnRotateL").onclick = () => {
        editor.selectedElements.forEach(el => TransformEngine.rotate(el, -15));
        saveTransformToHistory(editor);
    };
    
    document.getElementById("btnRotateR").onclick = () => {
        editor.selectedElements.forEach(el => TransformEngine.rotate(el, 15));
        saveTransformToHistory(editor);
    };
    
    document.getElementById("btnFlipH").onclick = () => {
        editor.selectedElements.forEach(el => TransformEngine.scale(el, -1, 1));
        saveTransformToHistory(editor);
    };
    
    document.getElementById("btnFlipV").onclick = () => {
        editor.selectedElements.forEach(el => TransformEngine.scale(el, 1, -1));
        saveTransformToHistory(editor);
    };
    
    // Ввод поворота
    document.getElementById("inputRotate").onchange = () => {
        const angle = Number(document.getElementById("inputRotate").value);
        editor.selectedElements.forEach(el => TransformEngine.rotate(el, angle));
        saveTransformToHistory(editor);
    };
    
    // Масштаб
    document.getElementById("inputScale").onchange = () => {
        const s = Number(document.getElementById("inputScale").value) / 100;
        editor.selectedElements.forEach(el => TransformEngine.scale(el, s, s));
        saveTransformToHistory(editor);
    };
    
    // Изменение размера холста
    document.getElementById("btnResizeCanvas").onclick = () => {
        const width = parseInt(document.getElementById("canvasWidth").value);
        const height = parseInt(document.getElementById("canvasHeight").value);
        const svgCanvas = document.getElementById("svgCanvas");
        
        svgCanvas.setAttribute("width", width);
        svgCanvas.setAttribute("height", height);
        updateCanvasSizeInfo(width, height);
    };
    
    // Сохранение проекта
    document.getElementById("btnSaveProject").onclick = () => {
        saveProject(editor);
    };
    
    // Загрузка проекта
    document.getElementById("btnLoadProject").onclick = () => {
        document.getElementById("projectFileInput").click();
    };
    
    document.getElementById("projectFileInput").onchange = (e) => {
        if (e.target.files.length > 0) {
            loadProjectFromFile(editor, e.target.files[0]);
        }
    };
    
    // Экспорт
    document.getElementById("btnExport").onclick = () => {
        showExportModal(editor);
    };
    
    // Зум
    initZoomControls(editor);
    
    // Обновление информации о холсте при изменении
    updateCanvasSizeInfo(
        parseInt(document.getElementById("svgCanvas").getAttribute("width")),
        parseInt(document.getElementById("svgCanvas").getAttribute("height"))
    );
}

function saveTransformToHistory(editor) {
    const transforms = editor.selectedElements.map(el => ({
        element: el,
        transform: el.getAttribute("transform") || ""
    }));
    
    editor.history.push({
        undo: () => transforms.forEach(t => t.element.setAttribute("transform", t.transform)),
        redo: () => {} // Redo будет применять текущее состояние
    });
}

function updateHistoryInfo(editor) {
    const historyInfo = document.getElementById("historyInfo");
    if (historyInfo) {
        historyInfo.textContent = `${editor.history.index + 1}/${editor.history.stack.length}`;
    }
}

function updateCanvasSizeInfo(width, height) {
    const canvasSize = document.getElementById("canvasSize");
    if (canvasSize) {
        canvasSize.textContent = `${width} × ${height} px`;
    }
}

function initZoomControls(editor) {
    const svgCanvas = document.getElementById("svgCanvas");
    const container = document.getElementById("canvasContainer");
    const zoomSelect = document.getElementById("zoomSelect");
    const btnZoomIn = document.getElementById("btnZoomIn");
    const btnZoomOut = document.getElementById("btnZoomOut");
    const btnZoomFit = document.getElementById("btnZoomFit");
    
    let zoomLevel = 1;
    
    function updateZoom() {
        svgCanvas.style.transform = `scale(${zoomLevel})`;
        svgCanvas.style.transformOrigin = 'center center';
        zoomSelect.value = zoomLevel;
    }
    
    zoomSelect.onchange = () => {
        zoomLevel = parseFloat(zoomSelect.value);
        updateZoom();
    };
    
    btnZoomIn.onclick = () => {
        zoomLevel = Math.min(zoomLevel * 1.2, 4);
        updateZoom();
    };
    
    btnZoomOut.onclick = () => {
        zoomLevel = Math.max(zoomLevel / 1.2, 0.1);
        updateZoom();
    };
    
    btnZoomFit.onclick = () => {
        const containerRect = container.getBoundingClientRect();
        const svgRect = svgCanvas.getBoundingClientRect();
        
        zoomLevel = Math.min(
            containerRect.width / svgRect.width,
            containerRect.height / svgRect.height
        ) * 0.9;
        
        updateZoom();
    };
}

async function saveProject(editor) {
    try {
        const svgCanvas = document.getElementById("svgCanvas");
        const serializer = new XMLSerializer();
        const svgContent = serializer.serializeToString(svgCanvas);
        
        const projectData = {
            name: document.getElementById("projectName").textContent || "Новый проект",
            canvas: {
                width: parseInt(svgCanvas.getAttribute("width")),
                height: parseInt(svgCanvas.getAttribute("height"))
            }
        };
        
        const response = await fetch('/api/projects/save', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                svg: svgContent,
                project_data: projectData
            })
        });
        
        const result = await response.json();
        
        if (result.success) {
            alert(`Проект сохранен: ${result.filename}`);
        } else {
            alert(`Ошибка сохранения: ${result.error}`);
        }
    } catch (error) {
        alert(`Ошибка: ${error.message}`);
    }
}

async function loadProjectFromFile(editor, file) {
    try {
        const formData = new FormData();
        formData.append('file', file);
        
        const response = await fetch('/api/projects/upload', {
            method: 'POST',
            body: formData
        });
        
        const result = await response.json();
        
        if (result.success) {
            const svgCanvas = document.getElementById("svgCanvas");
            svgCanvas.innerHTML = result.svg;
            editor.clearSelection();
            alert('Проект загружен');
        } else {
            alert(`Ошибка загрузки: ${result.error}`);
        }
    } catch (error) {
        alert(`Ошибка: ${error.message}`);
    }
}

function showExportModal(editor) {
    const modal = document.getElementById("exportModal");
    const overlay = document.getElementById("modalOverlay");
    
    modal.style.display = "block";
    overlay.style.display = "block";
    
    // Обработчики закрытия
    document.getElementById("closeExportModal").onclick = () => {
        modal.style.display = "none";
        overlay.style.display = "none";
    };
    
    document.getElementById("cancelExport").onclick = () => {
        modal.style.display = "none";
        overlay.style.display = "none";
    };
    
    // Обработчик экспорта
    document.getElementById("confirmExport").onclick = async () => {
        const format = document.getElementById("exportFormat").value;
        const quality = parseInt(document.getElementById("exportQuality").value);
        const width = parseInt(document.getElementById("exportWidth").value);
        const height = parseInt(document.getElementById("exportHeight").value);
        const filename = document.getElementById("exportFilename").value;
        
        const svgCanvas = document.getElementById("svgCanvas");
        const serializer = new XMLSerializer();
        const svgContent = serializer.serializeToString(svgCanvas);
        
        try {
            const response = await fetch('/api/export', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    svg: svgContent,
                    format: format,
                    quality: quality,
                    width: width,
                    height: height,
                    filename: filename
                })
            });
            
            if (response.ok) {
                const blob = await response.blob();
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `${filename}.${format}`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                window.URL.revokeObjectURL(url);
                
                modal.style.display = "none";
                overlay.style.display = "none";
            } else {
                const error = await response.json();
                alert(`Ошибка экспорта: ${error.error}`);
            }
        } catch (error) {
            alert(`Ошибка: ${error.message}`);
        }
    };
}

async function loadInitialCanvas(editor) {
    try {
        const response = await fetch('/api/canvas/create', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                width: 800,
                height: 600,
                units: 'px'
            })
        });
        
        const result = await response.json();
        
        if (result.success) {
            const svgCanvas = document.getElementById("svgCanvas");
            svgCanvas.innerHTML = result.svg;
            updateCanvasSizeInfo(result.canvas_info.width, result.canvas_info.height);
        }
    } catch (error) {
        console.error('Ошибка загрузки начального холста:', error);
    }
}