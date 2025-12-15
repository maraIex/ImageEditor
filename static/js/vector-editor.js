// Пространство имен для SVG
const SVG_NS = "http://www.w3.org/2000/svg";

// Менеджер истории действий (undo/redo) — реализует паттерн «Memento»:contentReference[oaicite:0]{index=0}.
class HistoryManager {
    constructor() {
        this.stack = [];
        this.index = -1;
    }
    push(entry) {
        let undoFn, redoFn;
        if (Array.isArray(entry)) {
            // Группа команд
            const commands = entry;
            undoFn = () => commands.slice().reverse().forEach(cmd => cmd.undo());
            redoFn = () => commands.forEach(cmd => cmd.redo());
        } else {
            undoFn = entry.undo;
            redoFn = entry.redo;
        }
        // Отсекаем возможный «redo» стек, если есть
        if (this.index < this.stack.length - 1) {
            this.stack = this.stack.slice(0, this.index + 1);
        }
        this.stack.push({ undo: undoFn, redo: redoFn });
        this.index++;
    }
    undo() {
        if (this.canUndo()) {
            this.stack[this.index].undo();
            this.index--;
        }
    }
    redo() {
        if (this.canRedo()) {
            this.index++;
            this.stack[this.index].redo();
        }
    }
    canUndo() { return this.index >= 0; }
    canRedo() { return this.index < this.stack.length - 1; }
}

// Движок трансформаций: применяет SVG-трансформы (translate, rotate, scale)
class TransformEngine {
    // Перемещение (translate) - добавляет к текущему атрибуту transform
    static translate(element, dx, dy) {
        let t = element.getAttribute("transform") || "";
        element.setAttribute("transform", t + ` translate(${dx},${dy})`);
    }
    // Вращение (rotate) вокруг центра элемента:contentReference[oaicite:1]{index=1}
    static rotate(element, angle) {
        let bbox = element.getBBox();
        let cx = bbox.x + bbox.width/2;
        let cy = bbox.y + bbox.height/2;
        let t = element.getAttribute("transform") || "";
        element.setAttribute("transform", t + ` rotate(${angle} ${cx} ${cy})`);
    }
    // Масштабирование (scale) вокруг центра
    static scale(element, sx, sy) {
        let bbox = element.getBBox();
        let cx = bbox.x + bbox.width/2;
        let cy = bbox.y + bbox.height/2;
        let t = element.getAttribute("transform") || "";
        element.setAttribute("transform", t + ` scale(${sx} ${sy})`);
    }
}

// Менеджер инструментов: переключает текущий инструмент и делегирует события
class ToolManager {
    constructor(editor) {
        this.editor = editor;
        this.currentTool = null;
    }
    setTool(tool) {
        this.currentTool = tool;
    }
    onPointerDown(evt) { if (this.currentTool && this.currentTool.onPointerDown) this.currentTool.onPointerDown(evt); }
    onPointerMove(evt) { if (this.currentTool && this.currentTool.onPointerMove) this.currentTool.onPointerMove(evt); }
    onPointerUp(evt) { if (this.currentTool && this.currentTool.onPointerUp) this.currentTool.onPointerUp(evt); }
    onDblClick(evt) { if (this.currentTool && this.currentTool.onDblClick) this.currentTool.onDblClick(evt); }
}

// Editor: главный класс SVG-редактора
class Editor {
    constructor(svgElementId) {
        this.svg = document.getElementById(svgElementId);
        this.activeLayer = this.svg; // Можно использовать <g> как слой
        this.history = new HistoryManager();
        this.toolManager = new ToolManager(this);
        this.selectedElements = [];
        // Устанавливаем обработчики событий на холст SVG
        this.svg.addEventListener("pointerdown", (evt) => this.toolManager.onPointerDown(evt));
        this.svg.addEventListener("pointermove", (evt) => this.toolManager.onPointerMove(evt));
        this.svg.addEventListener("pointerup", (evt) => this.toolManager.onPointerUp(evt));
        this.svg.addEventListener("dblclick", (evt) => this.toolManager.onDblClick(evt));
    }
    // Преобразование координат события в координаты SVG
    getSVGPoint(evt) {
        const pt = this.svg.createSVGPoint();
        pt.x = evt.clientX; pt.y = evt.clientY;
        return pt.matrixTransform(this.svg.getScreenCTM().inverse());
    }
    // Установить активный инструмент
    setTool(tool) {
        this.toolManager.setTool(tool);
    }
    // Выделение элемента (add=true при множественном выделении)
    selectElement(element, add=false) {
        if (!element || element === this.svg) return;
        if (!add) {
            this.clearSelection();
        }
        if (!this.selectedElements.includes(element)) {
            this.selectedElements.push(element);
            element.setAttribute("stroke", "blue");
            element.setAttribute("stroke-width", "2");
        }
    }
    // Снять выделение со всех
    clearSelection() {
        this.selectedElements.forEach(el => {
            el.removeAttribute("stroke");
            el.removeAttribute("stroke-width");
        });
        this.selectedElements = [];
    }
    // Загрузка SVG с сервера (Fetch API):contentReference[oaicite:2]{index=2}
    async loadSVG(url) {
        try {
            let response = await fetch(url);
            if (!response.ok) throw new Error(response.status);
            let svgText = await response.text();
            this.svg.innerHTML = svgText;
        } catch(e) {
            console.error("Ошибка загрузки SVG:", e);
        }
    }
    // Сохранение SVG на сервер
    async saveSVG(url) {
        try {
            const serializer = new XMLSerializer();
            const svgText = serializer.serializeToString(this.svg);
            await fetch(url, { method: "POST", body: svgText, headers: { "Content-Type": "image/svg+xml" } });
        } catch(e) {
            console.error("Ошибка сохранения SVG:", e);
        }
    }
    // Загрузка изображения и добавление в слой
    async loadImage(url) {
        let img = document.createElementNS(SVG_NS, "image");
        img.setAttribute("href", url);
        img.setAttribute("x", "0");
        img.setAttribute("y", "0");
        img.setAttribute("width", "100");
        img.setAttribute("height", "100");
        this.activeLayer.appendChild(img);
        // Добавляем в историю
        this.history.push({
            undo: () => this.activeLayer.removeChild(img),
            redo: () => this.activeLayer.appendChild(img)
        });
    }
    // Сохранение состояния проекта в JSON (массив объектов с атрибутами)
    saveStateJSON() {
        const items = [];
        this.activeLayer.querySelectorAll("*").forEach(el => {
            let attrs = {};
            for (let attr of el.attributes) {
                attrs[attr.name] = attr.value;
            }
            items.push({ type: el.tagName, attributes: attrs });
        });
        return items;
    }
    // Отправка JSON на сервер
    async saveJSON(url) {
        try {
            const state = this.saveStateJSON();
            await fetch(url, { method: "POST", body: JSON.stringify(state), headers: { "Content-Type": "application/json" } });
        } catch(e) {
            console.error("Ошибка сохранения JSON:", e);
        }
    }
}

// Инструмент выбора: выделение и перемещение элементов
class SelectTool {
    constructor(editor) {
        this.editor = editor;
        this.dragging = false;
        this.startPoint = null;
        this.initialTransforms = null;
    }
    onPointerDown(evt) {
        const editor = this.editor;
        const pt = editor.getSVGPoint(evt);
        const target = evt.target;
        if (target instanceof SVGElement && target.parentNode === editor.activeLayer) {
            // Выделяем элемент (Shift/Ctrl для добавления)
            const add = evt.shiftKey || evt.ctrlKey;
            editor.selectElement(target, add);
            // Начинаем перетаскивание
            this.dragging = true;
            this.startPoint = pt;
            // Запоминаем исходные трансформы для истории
            this.initialTransforms = editor.selectedElements.map(el => {
                return { element: el, transform: el.getAttribute("transform") || "" };
            });
        } else {
            // Клик мимо элементов - очищаем выбор
            editor.clearSelection();
        }
    }
    onPointerMove(evt) {
        if (!this.dragging) return;
        const editor = this.editor;
        const pt = editor.getSVGPoint(evt);
        const dx = pt.x - this.startPoint.x;
        const dy = pt.y - this.startPoint.y;
        editor.selectedElements.forEach(el => {
            TransformEngine.translate(el, dx, dy);
        });
        this.startPoint = pt;
    }
    onPointerUp(evt) {
        if (this.dragging) {
            const editor = this.editor;
            // Фиксируем конечные трансформы и сохраняем в историю
            const finalTransforms = editor.selectedElements.map(el => {
                return { element: el, transform: el.getAttribute("transform") || "" };
            });
            const commands = [];
            this.initialTransforms.forEach(item => {
                const el = item.element;
                const initial = item.transform;
                const fin = finalTransforms.find(f => f.element === el).transform;
                commands.push({
                    undo: () => el.setAttribute("transform", initial),
                    redo: () => el.setAttribute("transform", fin)
                });
            });
            editor.history.push(commands);
            this.dragging = false;
            this.initialTransforms = null;
        }
    }
    onDblClick(evt) {}
}

// Инструмент линии: рисует <line>
class LineTool {
    constructor(editor) {
        this.editor = editor;
        this.line = null;
        this.startPoint = null;
    }
    onPointerDown(evt) {
        const editor = this.editor;
        const pt = editor.getSVGPoint(evt);
        this.startPoint = pt;
        this.line = document.createElementNS(SVG_NS, "line");  // создание SVG-элемента:contentReference[oaicite:3]{index=3}
        this.line.setAttribute("x1", pt.x);
        this.line.setAttribute("y1", pt.y);
        this.line.setAttribute("x2", pt.x);
        this.line.setAttribute("y2", pt.y);
        this.line.setAttribute("stroke", "black");
        editor.activeLayer.appendChild(this.line);
    }
    onPointerMove(evt) {
        if (!this.line) return;
        const editor = this.editor;
        const pt = editor.getSVGPoint(evt);
        this.line.setAttribute("x2", pt.x);
        this.line.setAttribute("y2", pt.y);
    }
    onPointerUp(evt) {
        if (!this.line) return;
        const editor = this.editor;
        const line = this.line;
        editor.history.push({
            undo: () => editor.activeLayer.removeChild(line),
            redo: () => editor.activeLayer.appendChild(line)
        });
        this.line = null;
    }
    onDblClick(evt) {}
}

// Инструмент прямоугольника: рисует <rect>
class RectTool {
    constructor(editor) { this.editor = editor; this.rect = null; this.startPoint = null; }
    onPointerDown(evt) {
        const editor = this.editor;
        const pt = editor.getSVGPoint(evt);
        this.startPoint = pt;
        this.rect = document.createElementNS(SVG_NS, "rect");  // создание SVG-элемента:contentReference[oaicite:4]{index=4}
        this.rect.setAttribute("x", pt.x);
        this.rect.setAttribute("y", pt.y);
        this.rect.setAttribute("width", 0);
        this.rect.setAttribute("height", 0);
        this.rect.setAttribute("stroke", "black");
        this.rect.setAttribute("fill", "transparent");
        editor.activeLayer.appendChild(this.rect);
    }
    onPointerMove(evt) {
        if (!this.rect) return;
        const editor = this.editor;
        const pt = editor.getSVGPoint(evt);
        let x = Math.min(pt.x, this.startPoint.x);
        let y = Math.min(pt.y, this.startPoint.y);
        let width = Math.abs(pt.x - this.startPoint.x);
        let height = Math.abs(pt.y - this.startPoint.y);
        this.rect.setAttribute("x", x);
        this.rect.setAttribute("y", y);
        this.rect.setAttribute("width", width);
        this.rect.setAttribute("height", height);
    }
    onPointerUp(evt) {
        if (!this.rect) return;
        const editor = this.editor;
        const rect = this.rect;
        editor.history.push({
            undo: () => editor.activeLayer.removeChild(rect),
            redo: () => editor.activeLayer.appendChild(rect)
        });
        this.rect = null;
    }
    onDblClick(evt) {}
}

// Инструмент эллипса: рисует <ellipse>
class EllipseTool {
    constructor(editor) { this.editor = editor; this.ellipse = null; this.startPoint = null; }
    onPointerDown(evt) {
        const editor = this.editor;
        const pt = editor.getSVGPoint(evt);
        this.startPoint = pt;
        this.ellipse = document.createElementNS(SVG_NS, "ellipse");  // создание SVG-элемента:contentReference[oaicite:5]{index=5}
        this.ellipse.setAttribute("cx", pt.x);
        this.ellipse.setAttribute("cy", pt.y);
        this.ellipse.setAttribute("rx", 0);
        this.ellipse.setAttribute("ry", 0);
        this.ellipse.setAttribute("stroke", "black");
        this.ellipse.setAttribute("fill", "transparent");
        editor.activeLayer.appendChild(this.ellipse);
    }
    onPointerMove(evt) {
        if (!this.ellipse) return;
        const editor = this.editor;
        const pt = editor.getSVGPoint(evt);
        const cx = (this.startPoint.x + pt.x) / 2;
        const cy = (this.startPoint.y + pt.y) / 2;
        const rx = Math.abs(pt.x - this.startPoint.x) / 2;
        const ry = Math.abs(pt.y - this.startPoint.y) / 2;
        this.ellipse.setAttribute("cx", cx);
        this.ellipse.setAttribute("cy", cy);
        this.ellipse.setAttribute("rx", rx);
        this.ellipse.setAttribute("ry", ry);
    }
    onPointerUp(evt) {
        if (!this.ellipse) return;
        const editor = this.editor;
        const ellipse = this.ellipse;
        editor.history.push({
            undo: () => editor.activeLayer.removeChild(ellipse),
            redo: () => editor.activeLayer.appendChild(ellipse)
        });
        this.ellipse = null;
    }
    onDblClick(evt) {}
}

// Инструмент polyline: рисует ломаную линию (точки добавляются по клику; двойной клик завершает фигуру)
class PolylineTool {
    constructor(editor) { this.editor = editor; this.polyline = null; }
    onPointerDown(evt) {
        const editor = this.editor;
        const pt = editor.getSVGPoint(evt);
        if (!this.polyline) {
            this.polyline = document.createElementNS(SVG_NS, "polyline");  // SVG-элемент:contentReference[oaicite:6]{index=6}
            this.polyline.setAttribute("points", `${pt.x},${pt.y}`);
            this.polyline.setAttribute("stroke", "black");
            this.polyline.setAttribute("fill", "none");
            editor.activeLayer.appendChild(this.polyline);
        } else {
            let pts = this.polyline.getAttribute("points");
            pts += ` ${pt.x},${pt.y}`;
            this.polyline.setAttribute("points", pts);
        }
    }
    onPointerMove(evt) {}
    onPointerUp(evt) {}
    onDblClick(evt) {
        if (!this.polyline) return;
        const editor = this.editor;
        const polyline = this.polyline;
        editor.history.push({
            undo: () => editor.activeLayer.removeChild(polyline),
            redo: () => editor.activeLayer.appendChild(polyline)
        });
        this.polyline = null;
    }
}

// Инструмент polygon: рисует многоугольник (замкнутая ломаная; двойной клик завершает фигуру)
class PolygonTool {
    constructor(editor) { this.editor = editor; this.polygon = null; }
    onPointerDown(evt) {
        const editor = this.editor;
        const pt = editor.getSVGPoint(evt);
        if (!this.polygon) {
            this.polygon = document.createElementNS(SVG_NS, "polygon");  // SVG-элемент:contentReference[oaicite:7]{index=7}
            this.polygon.setAttribute("points", `${pt.x},${pt.y}`);
            this.polygon.setAttribute("stroke", "black");
            this.polygon.setAttribute("fill", "transparent");
            editor.activeLayer.appendChild(this.polygon);
        } else {
            let pts = this.polygon.getAttribute("points");
            pts += ` ${pt.x},${pt.y}`;
            this.polygon.setAttribute("points", pts);
        }
    }
    onPointerMove(evt) {}
    onPointerUp(evt) {}
    onDblClick(evt) {
        if (!this.polygon) return;
        const editor = this.editor;
        const polygon = this.polygon;
        editor.history.push({
            undo: () => editor.activeLayer.removeChild(polygon),
            redo: () => editor.activeLayer.appendChild(polygon)
        });
        this.polygon = null;
    }
}

// Инструмент текста: по клику создаёт <text>
class TextTool {
    constructor(editor) { this.editor = editor; }
    onPointerDown(evt) {
        const editor = this.editor;
        const pt = editor.getSVGPoint(evt);
        const content = prompt("Введите текст:");
        if (!content) return;
        const textEl = document.createElementNS(SVG_NS, "text");  // SVG-элемент:contentReference[oaicite:8]{index=8}
        textEl.setAttribute("x", pt.x);
        textEl.setAttribute("y", pt.y);
        textEl.setAttribute("fill", "black");
        textEl.textContent = content;
        editor.activeLayer.appendChild(textEl);
        editor.history.push({
            undo: () => editor.activeLayer.removeChild(textEl),
            redo: () => editor.activeLayer.appendChild(textEl)
        });
    }
    onPointerMove(evt) {}
    onPointerUp(evt) {}
    onDblClick(evt) {}
}

// Инструмент звезда: рассчитывает вершины звезды по формуле (тригонометрия):contentReference[oaicite:9]{index=9}:contentReference[oaicite:10]{index=10}
class StarTool {
    constructor(editor) {
        this.editor = editor;
        this.star = null;
        this.center = null;
    }
    onPointerDown(evt) {
        const editor = this.editor;
        const pt = editor.getSVGPoint(evt);
        this.center = pt;
        this.star = document.createElementNS(SVG_NS, "polygon");
        this.star.setAttribute("stroke", "black");
        this.star.setAttribute("fill", "transparent");
        editor.activeLayer.appendChild(this.star);
    }
    onPointerMove(evt) {
        if (!this.star) return;
        const editor = this.editor;
        const pt = editor.getSVGPoint(evt);
        const cx = this.center.x;
        const cy = this.center.y;
        const outerRadius = Math.hypot(pt.x - cx, pt.y - cy);
        const innerRadius = outerRadius / 2;
        const arms = 5;
        let points = "";
        const angleStep = Math.PI / arms;
        for (let i = 0; i < 2 * arms; i++) {
            const r = (i % 2 === 0) ? outerRadius : innerRadius;
            const theta = i * angleStep;
            const x = cx + Math.cos(theta) * r;
            const y = cy + Math.sin(theta) * r;
            points += (i === 0 ? "" : " ") + x + "," + y;
        }
        this.star.setAttribute("points", points);
    }
    onPointerUp(evt) {
        if (!this.star) return;
        const editor = this.editor;
        const star = this.star;
        editor.history.push({
            undo: () => editor.activeLayer.removeChild(star),
            redo: () => editor.activeLayer.appendChild(star)
        });
        this.star = null;
        this.center = null;
    }
    onDblClick(evt) {}
}

