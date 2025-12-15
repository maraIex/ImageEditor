// static/js/editor.js
class SVGEditor {
    constructor() {
        this.currentTool = 'select';
        this.selectedElement = null;
        this.layers = [];
        this.currentLayerId = null;
        this.zoom = 1;
        this.history = [];
        this.historyIndex = -1;
        this.isDrawing = false;
        this.currentProject = null;

        this.init();
    }

    async init() {
        this.setupEventListeners();
        await this.loadProject();
        this.setupCanvas();
        this.setupLayers();
        this.setupHotkeys();

        console.log('SVG Editor initialized');
    }

    async loadProject() {
        // Загружаем проект из localStorage или создаем новый
        const projectData = localStorage.getItem('currentProject');
        const importedSVG = localStorage.getItem('importedSVG');

        if (importedSVG) {
            const data = JSON.parse(importedSVG);
            this.currentProject = {
                id: 'imported-' + Date.now(),
                name: 'Импортированный проект',
                width: 800,
                height: 600,
                svg: data.svg,
                layers: data.layers
            };
            localStorage.removeItem('importedSVG');
        } else if (projectData) {
            this.currentProject = JSON.parse(projectData);
        } else {
            // Создаем новый проект через API
            try {
                const response = await fetch('/api/svg/create', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        width: 800,
                        height: 600,
                        unit: 'px'
                    })
                });

                const result = await response.json();
                this.currentProject = {
                    id: 'new-' + Date.now(),
                    name: 'Новый проект',
                    ...result
                };
            } catch (error) {
                console.error('Ошибка создания проекта:', error);
            }
        }

        // Загружаем слои
        if (this.currentProject?.layers) {
            this.layers = this.currentProject.layers;
        } else {
            this.layers = [{
                id: 'layer-1',
                name: 'Слой 1',
                visible: true,
                locked: false,
                elements: []
            }];
        }

        this.currentLayerId = this.layers[0]?.id;
    }

    setupCanvas() {
        const canvas = document.getElementById('svg-canvas');
        if (!canvas) return;

        if (this.currentProject?.svg) {
            canvas.innerHTML = this.currentProject.svg;
        } else {
            // Создаем пустой SVG
            canvas.innerHTML = `
                <svg id="main-svg" width="100%" height="100%"
                     viewBox="0 0 ${this.currentProject?.width || 800} ${this.currentProject?.height || 600}"
                     xmlns="http://www.w3.org/2000/svg">
                    <defs></defs>
                    <g id="layer-${this.currentLayerId}"></g>
                </svg>
            `;
        }

        // Настраиваем взаимодействие
        this.setupCanvasEvents(canvas);
    }

    setupCanvasEvents(canvas) {
        const svgElement = canvas.querySelector('svg');
        if (!svgElement) return;

        svgElement.addEventListener('mousedown', (e) => this.onCanvasMouseDown(e));
        svgElement.addEventListener('mousemove', (e) => this.onCanvasMouseMove(e));
        svgElement.addEventListener('mouseup', (e) => this.onCanvasMouseUp(e));
        svgElement.addEventListener('click', (e) => this.onCanvasClick(e));

        // Обновляем позицию курсора
        svgElement.addEventListener('mousemove', (e) => {
            const rect = svgElement.getBoundingClientRect();
            const x = (e.clientX - rect.left) / this.zoom;
            const y = (e.clientY - rect.top) / this.zoom;
            document.getElementById('cursor-position').textContent = `X: ${Math.round(x)}, Y: ${Math.round(y)}`;
        });
    }

    setupEventListeners() {
        // Инструменты
        document.querySelectorAll('.tool-btn[data-tool]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.setTool(e.currentTarget.dataset.tool);
            });
        });

        // Действия
        document.querySelectorAll('.tool-btn[data-action]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const action = e.currentTarget.dataset.action;
                this.performAction(action);
            });
        });

        // Примитивы
        document.querySelectorAll('[data-primitive]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const primitive = e.currentTarget.dataset.primitive;
                this.addPrimitive(primitive);
            });
        });

        document.querySelectorAll('[data-filter]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const filter = e.currentTarget.dataset.filter;
                this.applyFilterSimple(filter); // Используем простую версию
            });
        });

        // Градиенты
        document.querySelectorAll('[data-gradient]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const gradient = e.currentTarget.dataset.gradient;
                this.createGradient(gradient);
            });
        });
        // Анимации
        document.querySelectorAll('[data-animation]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const animation = e.currentTarget.dataset.animation;
                this.addAnimation(animation);
            });
        });
        // Свойства
        document.getElementById('fill-color').addEventListener('change', (e) => {
            this.updateSelectedElement({ fill: e.target.value });
        });

        document.getElementById('stroke-color').addEventListener('change', (e) => {
            this.updateSelectedElement({ stroke: e.target.value });
        });

        document.getElementById('stroke-width').addEventListener('change', (e) => {
            this.updateSelectedElement({ 'stroke-width': e.target.value });
        });

        document.getElementById('opacity').addEventListener('input', (e) => {
            this.updateSelectedElement({ opacity: e.target.value });
        });

        // Слои
        document.getElementById('add-layer').addEventListener('click', () => {
            this.addLayer();
        });

        // Зум
        document.getElementById('zoom-in').addEventListener('click', () => {
            this.zoomIn();
        });

        document.getElementById('zoom-out').addEventListener('click', () => {
            this.zoomOut();
        });

        document.getElementById('zoom-reset').addEventListener('click', () => {
            this.zoomReset();
        });

        // Экспорт
        document.querySelectorAll('[data-format]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const format = e.currentTarget.dataset.format;
                this.exportProject(format);
            });
        });

        // Модальные окна
        document.querySelectorAll('.modal .close').forEach(close => {
            close.addEventListener('click', () => {
                close.closest('.modal').style.display = 'none';
            });
        });

        // Глобальные события
        document.addEventListener('keydown', (e) => this.onKeyDown(e));
    }

    setupHotkeys() {
        // Будет обрабатываться в onKeyDown
    }

    setupLayers() {
        const layersList = document.getElementById('layers-list');
        if (!layersList) return;

        layersList.innerHTML = '';

        this.layers.forEach(layer => {
            const layerItem = document.createElement('div');
            layerItem.className = `layer-item ${layer.id === this.currentLayerId ? 'active' : ''}`;
            layerItem.dataset.layerId = layer.id;
            layerItem.innerHTML = `
                <span>${layer.name}</span>
                <div class="layer-controls">
                    <button class="toggle-visibility" title="${layer.visible ? 'Скрыть' : 'Показать'}">
                        <i class="fas fa-eye${layer.visible ? '' : '-slash'}"></i>
                    </button>
                    <button class="delete-layer" title="Удалить">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            `;

            layerItem.addEventListener('click', (e) => {
                if (!e.target.closest('.layer-controls')) {
                    this.selectLayer(layer.id);
                }
            });

            // Управление видимостью
            layerItem.querySelector('.toggle-visibility').addEventListener('click', (e) => {
                e.stopPropagation();
                this.toggleLayerVisibility(layer.id);
            });

            // Удаление слоя
            layerItem.querySelector('.delete-layer').addEventListener('click', (e) => {
                e.stopPropagation();
                this.deleteLayer(layer.id);
            });

            layersList.appendChild(layerItem);
        });
    }

    setTool(tool) {
        this.currentTool = tool;

        // Обновляем UI
        document.querySelectorAll('.tool-btn[data-tool]').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.tool === tool);
        });

        // Меняем курсор
        const canvas = document.getElementById('svg-canvas');
        if (canvas) {
            const cursorMap = {
                select: 'default',
                rectangle: 'crosshair',
                ellipse: 'crosshair',
                line: 'crosshair',
                polygon: 'crosshair',
                text: 'text'
            };
            canvas.style.cursor = cursorMap[tool] || 'default';
        }
    }

    performAction(action) {
        switch (action) {
            case 'undo':
                this.undo();
                break;
            case 'redo':
                this.redo();
                break;
            case 'save':
                this.saveProject();
                break;
            case 'export':
                this.showExportModal();
                break;
        }
    }

    async addPrimitive(primitive) {
        const canvas = document.getElementById('svg-canvas');
        const svg = canvas.querySelector('svg');
        const currentLayer = svg.querySelector(`#layer-${this.currentLayerId}`);

        if (!currentLayer) return;

        let element;
        const id = `element-${Date.now()}`;

        switch (primitive) {
            case 'star':
                // Создаем звезду
                element = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
                const points = this.generateStarPoints(100, 100, 50, 20, 5);
                element.setAttribute('points', points);
                element.setAttribute('fill', '#FFD700');
                element.setAttribute('stroke', '#FFA500');
                element.setAttribute('stroke-width', '2');
                break;

            case 'polyline':
                element = document.createElementNS('http://www.w3.org/2000/svg', 'polyline');
                element.setAttribute('points', '50,50 100,100 150,50 200,100');
                element.setAttribute('fill', 'none');
                element.setAttribute('stroke', '#3498db');
                element.setAttribute('stroke-width', '3');
                break;

            case 'path':
                element = document.createElementNS('http://www.w3.org/2000/svg', 'path');
                element.setAttribute('d', 'M50,100 C75,50 125,150 150,100');
                element.setAttribute('fill', 'none');
                element.setAttribute('stroke', '#e74c3c');
                element.setAttribute('stroke-width', '3');
                break;
        }

        if (element) {
            element.id = id;
            currentLayer.appendChild(element);
            this.selectElement(element);
            this.addToHistory('add_element', { id, primitive });
        }
    }

    generateStarPoints(cx, cy, outerRadius, innerRadius, points) {
        const coords = [];
        for (let i = 0; i < points * 2; i++) {
            const radius = i % 2 === 0 ? outerRadius : innerRadius;
            const angle = (i * Math.PI) / points;
            coords.push(cx + radius * Math.sin(angle));
            coords.push(cy + radius * Math.cos(angle));
        }
        return coords.join(',');
    }

applyFilterSimple(filter) {
    const selected = this.selectedElement;
    if (!selected) {
        alert('Выберите элемент для применения фильтра');
        return;
    }

    const canvas = document.getElementById('svg-canvas');
    const svg = canvas.querySelector('svg');
    const defs = svg.querySelector('defs') || svg.appendChild(document.createElementNS('http://www.w3.org/2000/svg', 'defs'));

    const filterId = `filter-${filter}-${Date.now()}`;
    let filterElement;

    switch (filter) {
        case 'blur':
            filterElement = this.createBlurFilter(filterId);
            break;
        case 'shadow':
            filterElement = this.createShadowFilter(filterId);
            break;
        case 'glow':
            filterElement = this.createGlowFilter(filterId);
            break;
        case 'invert':
            filterElement = this.createInvertFilter(filterId);
            break;
        default:
            alert('Неизвестный фильтр');
            return;
    }

    defs.appendChild(filterElement);
    selected.setAttribute('filter', `url(#${filterId})`);

    this.addToHistory('apply_filter', {
        elementId: selected.id,
        filterId: filterId
    });

    console.log('Фильтр применен:', filter);
}

// Вспомогательные методы для создания фильтров
createBlurFilter(id) {
    const filter = document.createElementNS('http://www.w3.org/2000/svg', 'filter');
    filter.id = id;
    filter.setAttribute('x', '-50%');
    filter.setAttribute('y', '-50%');
    filter.setAttribute('width', '200%');
    filter.setAttribute('height', '200%');

    const blur = document.createElementNS('http://www.w3.org/2000/svg', 'feGaussianBlur');
    blur.setAttribute('stdDeviation', '2');
    filter.appendChild(blur);

    return filter;
}

createShadowFilter(id) {
    const filter = document.createElementNS('http://www.w3.org/2000/svg', 'filter');
    filter.id = id;
    filter.setAttribute('x', '-50%');
    filter.setAttribute('y', '-50%');
    filter.setAttribute('width', '200%');
    filter.setAttribute('height', '200%');

    const offset = document.createElementNS('http://www.w3.org/2000/svg', 'feOffset');
    offset.setAttribute('dx', '2');
    offset.setAttribute('dy', '2');
    offset.setAttribute('result', 'offset');

    const blur = document.createElementNS('http://www.w3.org/2000/svg', 'feGaussianBlur');
    blur.setAttribute('stdDeviation', '3');
    blur.setAttribute('in', 'offset');
    blur.setAttribute('result', 'blur');

    const flood = document.createElementNS('http://www.w3.org/2000/svg', 'feFlood');
    flood.setAttribute('flood-color', 'black');
    flood.setAttribute('result', 'flood');

    const composite = document.createElementNS('http://www.w3.org/2000/svg', 'feComposite');
    composite.setAttribute('in', 'flood');
    composite.setAttribute('in2', 'blur');
    composite.setAttribute('operator', 'in');
    composite.setAttribute('result', 'comp');

    const merge = document.createElementNS('http://www.w3.org/2000/svg', 'feMerge');
    const mergeNode1 = document.createElementNS('http://www.w3.org/2000/svg', 'feMergeNode');
    mergeNode1.setAttribute('in', 'comp');
    const mergeNode2 = document.createElementNS('http://www.w3.org/2000/svg', 'feMergeNode');
    mergeNode2.setAttribute('in', 'SourceGraphic');

    merge.appendChild(mergeNode1);
    merge.appendChild(mergeNode2);

    filter.appendChild(offset);
    filter.appendChild(blur);
    filter.appendChild(flood);
    filter.appendChild(composite);
    filter.appendChild(merge);

    return filter;
}

createGlowFilter(id) {
    const filter = document.createElementNS('http://www.w3.org/2000/svg', 'filter');
    filter.id = id;
    filter.setAttribute('x', '-50%');
    filter.setAttribute('y', '-50%');
    filter.setAttribute('width', '200%');
    filter.setAttribute('height', '200%');

    const flood = document.createElementNS('http://www.w3.org/2000/svg', 'feFlood');
    flood.setAttribute('flood-color', '#00ff00');
    flood.setAttribute('result', 'flood');

    const composite = document.createElementNS('http://www.w3.org/2000/svg', 'feComposite');
    composite.setAttribute('in', 'flood');
    composite.setAttribute('in2', 'SourceGraphic');
    composite.setAttribute('operator', 'in');
    composite.setAttribute('result', 'comp');

    const blur = document.createElementNS('http://www.w3.org/2000/svg', 'feGaussianBlur');
    blur.setAttribute('stdDeviation', '10');
    blur.setAttribute('in', 'comp');
    blur.setAttribute('result', 'blur');

    const merge = document.createElementNS('http://www.w3.org/2000/svg', 'feMerge');
    const mergeNode1 = document.createElementNS('http://www.w3.org/2000/svg', 'feMergeNode');
    mergeNode1.setAttribute('in', 'blur');
    const mergeNode2 = document.createElementNS('http://www.w3.org/2000/svg', 'feMergeNode');
    mergeNode2.setAttribute('in', 'SourceGraphic');

    merge.appendChild(mergeNode1);
    merge.appendChild(mergeNode2);

    filter.appendChild(flood);
    filter.appendChild(composite);
    filter.appendChild(blur);
    filter.appendChild(merge);

    return filter;
}

createInvertFilter(id) {
    const filter = document.createElementNS('http://www.w3.org/2000/svg', 'filter');
    filter.id = id;

    const colorMatrix = document.createElementNS('http://www.w3.org/2000/svg', 'feColorMatrix');
    colorMatrix.setAttribute('type', 'matrix');
    colorMatrix.setAttribute('values', '-1 0 0 0 1 0 -1 0 0 1 0 0 -1 0 1 0 0 0 1 0');

    filter.appendChild(colorMatrix);

    return filter;
}

    getFilterParams(filter) {
        const params = {
            blur: { std_dev: 2 },
            shadow: { dx: 2, dy: 2, blur: 3, color: 'black' },
            glow: { dx: 0, dy: 0, blur: 10, color: '#00ff00' },
            invert: {}
        };
        return params[filter] || {};
    }

    async createGradient(type) {
        try {
            const response = await fetch('/api/gradient/linear', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    svg: this.getSVGString(),
                    id: `gradient-${type}-${Date.now()}`,
                    start: [0, 0],
                    end: [100, 100],
                    stops: [
                        [0, '#FF0000'],
                        [0.5, '#00FF00'],
                        [1, '#0000FF']
                    ]
                })
            });

            const result = await response.json();
            console.log('Градиент создан:', result);

            // Здесь нужно добавить градиент в defs и применить к выбранному элементу
            if (this.selectedElement) {
                this.selectedElement.setAttribute('fill', `url(#gradient-${type}-${Date.now()})`);
            }
        } catch (error) {
            console.error('Ошибка создания градиента:', error);
        }
    }

    updateSelectedElement(attributes) {
        if (!this.selectedElement) return;

        // Сохраняем старое состояние для истории
        const oldAttributes = {};
        Object.keys(attributes).forEach(key => {
            oldAttributes[key] = this.selectedElement.getAttribute(key);
        });

        // Применяем новые атрибуты
        Object.entries(attributes).forEach(([key, value]) => {
            if (value !== null && value !== undefined) {
                this.selectedElement.setAttribute(key, value);
            }
        });

        this.addToHistory('update_element', {
            elementId: this.selectedElement.id,
            oldAttributes,
            newAttributes: attributes
        });
    }

    onCanvasMouseDown(e) {
        if (e.target.tagName === 'svg' && this.currentTool !== 'select') {
            e.preventDefault();
            this.isDrawing = true;

            const rect = e.target.getBoundingClientRect();
            this.startX = (e.clientX - rect.left) / this.zoom;
            this.startY = (e.clientY - rect.top) / this.zoom;

            // Создаем элемент в зависимости от выбранного инструмента
            this.createDrawingElement();
        }
    }

    onCanvasMouseMove(e) {
        if (!this.isDrawing || !this.drawingElement) return;

        e.preventDefault();
        const rect = e.target.getBoundingClientRect();
        const currentX = (e.clientX - rect.left) / this.zoom;
        const currentY = (e.clientY - rect.top) / this.zoom;

        this.updateDrawingElement(currentX, currentY);
    }

    onCanvasMouseUp(e) {
        if (this.isDrawing && this.drawingElement) {
            this.isDrawing = false;

            // Финализируем рисование
            this.finalizeDrawingElement();
            this.drawingElement = null;
        }
    }

    onCanvasClick(e) {
        if (this.currentTool === 'select') {
            // Выбираем элемент
            if (e.target.tagName !== 'svg') {
                this.selectElement(e.target);
            } else {
                this.deselectElement();
            }
        } else if (this.currentTool === 'text') {
            // Добавляем текст
            this.addTextAtPosition(e.offsetX / this.zoom, e.offsetY / this.zoom);
        }
    }

    createDrawingElement() {
        const canvas = document.getElementById('svg-canvas');
        const svg = canvas.querySelector('svg');
        const currentLayer = svg.querySelector(`#layer-${this.currentLayerId}`);

        if (!currentLayer) return;

        const id = `element-${Date.now()}`;
        let element;

        switch (this.currentTool) {
            case 'rectangle':
                element = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
                element.setAttribute('x', this.startX);
                element.setAttribute('y', this.startY);
                element.setAttribute('width', '0');
                element.setAttribute('height', '0');
                break;

            case 'ellipse':
                element = document.createElementNS('http://www.w3.org/2000/svg', 'ellipse');
                element.setAttribute('cx', this.startX);
                element.setAttribute('cy', this.startY);
                element.setAttribute('rx', '0');
                element.setAttribute('ry', '0');
                break;

            case 'line':
                element = document.createElementNS('http://www.w3.org/2000/svg', 'line');
                element.setAttribute('x1', this.startX);
                element.setAttribute('y1', this.startY);
                element.setAttribute('x2', this.startX);
                element.setAttribute('y2', this.startY);
                break;

            case 'polygon':
                element = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
                element.setAttribute('points', `${this.startX},${this.startY}`);
                break;
        }

        if (element) {
            // Применяем текущие свойства
            element.id = id;
            element.setAttribute('fill', document.getElementById('fill-color').value);
            element.setAttribute('stroke', document.getElementById('stroke-color').value);
            element.setAttribute('stroke-width', document.getElementById('stroke-width').value);
            element.setAttribute('opacity', document.getElementById('opacity').value);

            currentLayer.appendChild(element);
            this.drawingElement = element;
        }
    }

    updateDrawingElement(currentX, currentY) {
        if (!this.drawingElement) return;

        const width = Math.abs(currentX - this.startX);
        const height = Math.abs(currentY - this.startY);
        const x = Math.min(currentX, this.startX);
        const y = Math.min(currentY, this.startY);

        switch (this.currentTool) {
            case 'rectangle':
                this.drawingElement.setAttribute('x', x);
                this.drawingElement.setAttribute('y', y);
                this.drawingElement.setAttribute('width', width);
                this.drawingElement.setAttribute('height', height);
                break;

            case 'ellipse':
                this.drawingElement.setAttribute('cx', this.startX + (currentX - this.startX) / 2);
                this.drawingElement.setAttribute('cy', this.startY + (currentY - this.startY) / 2);
                this.drawingElement.setAttribute('rx', width / 2);
                this.drawingElement.setAttribute('ry', height / 2);
                break;

            case 'line':
                this.drawingElement.setAttribute('x2', currentX);
                this.drawingElement.setAttribute('y2', currentY);
                break;

            case 'polygon':
                const points = this.drawingElement.getAttribute('points');
                this.drawingElement.setAttribute('points', `${points} ${currentX},${currentY}`);
                break;
        }
    }

    finalizeDrawingElement() {
        if (this.drawingElement) {
            this.selectElement(this.drawingElement);
            this.addToHistory('draw_element', { elementId: this.drawingElement.id });
        }
    }

    addTextAtPosition(x, y) {
        const canvas = document.getElementById('svg-canvas');
        const svg = canvas.querySelector('svg');
        const currentLayer = svg.querySelector(`#layer-${this.currentLayerId}`);

        if (!currentLayer) return;

        const text = prompt('Введите текст:', 'Текст');
        if (!text) return;

        const id = `text-${Date.now()}`;
        const element = document.createElementNS('http://www.w3.org/2000/svg', 'text');

        element.id = id;
        element.setAttribute('x', x);
        element.setAttribute('y', y);
        element.setAttribute('fill', document.getElementById('fill-color').value);
        element.textContent = text;

        // Применяем стиль
        element.setAttribute('font-family', 'Arial');
        element.setAttribute('font-size', '20');

        currentLayer.appendChild(element);
        this.selectElement(element);
        this.addToHistory('add_text', { elementId: id, text, x, y });
    }

    selectElement(element) {
        this.deselectElement();

        this.selectedElement = element;
        element.classList.add('selected');

        // Обновляем панель свойств
        this.updatePropertiesPanel();

        // Показываем информацию о выборе
        document.getElementById('selection-info').textContent =
            `Выбрано: ${element.tagName} (${element.id})`;
    }

    deselectElement() {
        if (this.selectedElement) {
            this.selectedElement.classList.remove('selected');
            this.selectedElement = null;
        }

        document.getElementById('selection-info').textContent = 'Не выбрано';
    }

    updatePropertiesPanel() {
        if (!this.selectedElement) return;

        const fill = this.selectedElement.getAttribute('fill');
        const stroke = this.selectedElement.getAttribute('stroke');
        const strokeWidth = this.selectedElement.getAttribute('stroke-width') || '1';
        const opacity = this.selectedElement.getAttribute('opacity') || '1';

        if (fill) document.getElementById('fill-color').value = fill;
        if (stroke) document.getElementById('stroke-color').value = stroke;
        document.getElementById('stroke-width').value = strokeWidth;
        document.getElementById('opacity').value = opacity;
    }

    selectLayer(layerId) {
        this.currentLayerId = layerId;

        // Обновляем UI
        document.querySelectorAll('.layer-item').forEach(item => {
            item.classList.toggle('active', item.dataset.layerId === layerId);
        });
    }

    addLayer() {
        const layerId = `layer-${Date.now()}`;
        const newLayer = {
            id: layerId,
            name: `Слой ${this.layers.length + 1}`,
            visible: true,
            locked: false,
            elements: []
        };

        this.layers.push(newLayer);

        // Добавляем группу в SVG
        const canvas = document.getElementById('svg-canvas');
        const svg = canvas.querySelector('svg');
        const layerGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        layerGroup.id = `layer-${layerId}`;
        svg.appendChild(layerGroup);

        this.selectLayer(layerId);
        this.setupLayers();
        this.addToHistory('add_layer', { layer: newLayer });
    }

    toggleLayerVisibility(layerId) {
        const layer = this.layers.find(l => l.id === layerId);
        if (!layer) return;

        layer.visible = !layer.visible;

        // Обновляем SVG
        const canvas = document.getElementById('svg-canvas');
        const layerGroup = canvas.querySelector(`#layer-${layerId}`);
        if (layerGroup) {
            layerGroup.style.display = layer.visible ? '' : 'none';
        }

        this.setupLayers();
        this.addToHistory('toggle_layer_visibility', { layerId, visible: layer.visible });
    }

    deleteLayer(layerId) {
        if (this.layers.length <= 1) {
            alert('Нельзя удалить последний слой');
            return;
        }

        if (confirm('Удалить слой?')) {
            const index = this.layers.findIndex(l => l.id === layerId);
            if (index !== -1) {
                const deletedLayer = this.layers.splice(index, 1)[0];

                // Удаляем группу из SVG
                const canvas = document.getElementById('svg-canvas');
                const layerGroup = canvas.querySelector(`#layer-${layerId}`);
                if (layerGroup) {
                    layerGroup.remove();
                }

                // Выбираем другой слой
                this.currentLayerId = this.layers[0]?.id;
                this.setupLayers();
                this.addToHistory('delete_layer', { layer: deletedLayer });
            }
        }
    }

    zoomIn() {
        this.zoom = Math.min(this.zoom * 1.2, 5);
        this.updateZoom();
    }

    zoomOut() {
        this.zoom = Math.max(this.zoom / 1.2, 0.1);
        this.updateZoom();
    }

    zoomReset() {
        this.zoom = 1;
        this.updateZoom();
    }

    updateZoom() {
        const canvas = document.getElementById('svg-canvas');
        const svg = canvas.querySelector('svg');

        if (svg) {
            const originalWidth = this.currentProject?.width || 800;
            const originalHeight = this.currentProject?.height || 600;

            svg.style.width = `${originalWidth * this.zoom}px`;
            svg.style.height = `${originalHeight * this.zoom}px`;

            document.getElementById('zoom-level').textContent = `${Math.round(this.zoom * 100)}%`;
        }
    }

    showExportModal() {
        document.getElementById('export-modal').style.display = 'block';
    }

    async exportProject(format) {
        const svgString = this.getSVGString();

        try {
            const response = await fetch('/api/svg/export', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    svg: svgString,
                    format: format,
                    filename: this.currentProject?.name || 'export'
                })
            });

            if (format === 'svg') {
                // Для SVG скачиваем файл
                const blob = await response.blob();
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `${this.currentProject?.name || 'export'}.svg`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                window.URL.revokeObjectURL(url);
            } else {
                const result = await response.json();
                if (response.ok) {
                    alert('Экспорт завершен!');
                } else {
                    alert('Ошибка экспорта: ' + result.error);
                }
            }

            document.getElementById('export-modal').style.display = 'none';
        } catch (error) {
            console.error('Ошибка экспорта:', error);
            alert('Ошибка экспорта: ' + error.message);
        }
    }

    async saveProject() {
        if (!this.currentProject) return;

        // Обновляем данные проекта
        this.currentProject.svg = this.getSVGString();
        this.currentProject.layers = this.layers;

        try {
            const response = await fetch('/api/project/save', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(this.currentProject)
            });

            const result = await response.json();
            if (response.ok) {
                console.log('Проект сохранен:', result);
                alert('Проект сохранен!');
            } else {
                alert('Ошибка сохранения: ' + result.error);
            }
        } catch (error) {
            console.error('Ошибка сохранения:', error);
            alert('Ошибка сохранения: ' + error.message);
        }
    }

    addToHistory(action, data) {
        // Удаляем все действия после текущего индекса (если мы отменили и сделали новое действие)
        this.history = this.history.slice(0, this.historyIndex + 1);

        this.history.push({
            action,
            data,
            timestamp: Date.now(),
            snapshot: this.getSVGString()
        });

        // Ограничиваем размер истории
        if (this.history.length > 10) {
            this.history.shift();
        }

        this.historyIndex = this.history.length - 1;

        console.log('История обновлена:', this.history.length, 'действий');
    }

    undo() {
        if (this.historyIndex >= 0) {
            this.historyIndex--;
            this.restoreFromHistory();
        }
    }

    redo() {
        if (this.historyIndex < this.history.length - 1) {
            this.historyIndex++;
            this.restoreFromHistory();
        }
    }

    restoreFromHistory() {
        if (this.historyIndex >= 0 && this.history[this.historyIndex]) {
            const snapshot = this.history[this.historyIndex].snapshot;
            const canvas = document.getElementById('svg-canvas');
            canvas.innerHTML = snapshot;

            // Восстанавливаем обработчики событий
            this.setupCanvasEvents(canvas);
        } else if (this.historyIndex === -1) {
            // Восстанавливаем начальное состояние
            this.setupCanvas();
        }
    }

    getSVGString() {
        const canvas = document.getElementById('svg-canvas');
        return canvas.innerHTML;
    }

    onKeyDown(e) {
        // Горячие клавиши
        if (e.ctrlKey || e.metaKey) {
            switch (e.key.toLowerCase()) {
                case 'z':
                    e.preventDefault();
                    if (e.shiftKey) {
                        this.redo();
                    } else {
                        this.undo();
                    }
                    break;
                case 'y':
                    e.preventDefault();
                    this.redo();
                    break;
                case 's':
                    e.preventDefault();
                    this.saveProject();
                    break;
            }
        } else {
            switch (e.key.toLowerCase()) {
                case 'v':
                    e.preventDefault();
                    this.setTool('select');
                    break;
                case 'r':
                    e.preventDefault();
                    this.setTool('rectangle');
                    break;
                case 'e':
                    e.preventDefault();
                    this.setTool('ellipse');
                    break;
                case 'l':
                    e.preventDefault();
                    this.setTool('line');
                    break;
                case 't':
                    e.preventDefault();
                    this.setTool('text');
                    break;
                case 'p':
                    e.preventDefault();
                    this.setTool('polygon');
                    break;
                case 'delete':
                case 'backspace':
                    if (this.selectedElement) {
                        const elementId = this.selectedElement.id;
                        this.selectedElement.remove();
                        this.deselectElement();
                        this.addToHistory('delete_element', { elementId });
                    }
                    break;
            }
        }
    }
    async addAnimation(animationType) {
        if (!this.selectedElement) {
            alert('Выберите элемент для анимации');
            return;
        }

        try {
            const response = await fetch('/api/animation/smil', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    element_id: this.selectedElement.id,
                    type: animationType,
                    params: this.getAnimationParams(animationType)
                })
            });

            if (!response.ok) {
                const errorText = await response.text();
                console.error('Ошибка сервера:', errorText);
                throw new Error(`HTTP ${response.status}: ${errorText.substring(0, 100)}`);
            }

            const result = await response.json();

            if (result.error) {
                alert(`Ошибка: ${result.error}`);
                return;
            }

            // Создаем анимацию на клиенте (без сервера)
            this.createAnimationDirectly(animationType);

        } catch (error) {
            console.error('Ошибка создания анимации:', error);
            alert(`Ошибка создания анимации: ${error.message}`);
        }
    }

    createAnimationDirectly(animationType) {
        const selected = this.selectedElement;
        if (!selected) return;

        const animId = `anim-${selected.id}-${Date.now()}`;
        let anim;

        switch (animationType) {
            case 'opacity':
                anim = document.createElementNS('http://www.w3.org/2000/svg', 'animate');
                anim.setAttribute('attributeName', 'opacity');
                anim.setAttribute('values', '1;0.5;1');
                anim.setAttribute('dur', '2s');
                anim.setAttribute('repeatCount', 'indefinite');
                break;

            case 'move':
                anim = document.createElementNS('http://www.w3.org/2000/svg', 'animateTransform');
                anim.setAttribute('attributeName', 'transform');
                anim.setAttribute('type', 'translate');
                anim.setAttribute('values', '0,0;50,50;0,0');
                anim.setAttribute('dur', '3s');
                anim.setAttribute('repeatCount', 'indefinite');
                break;

            case 'rotate':
                anim = document.createElementNS('http://www.w3.org/2000/svg', 'animateTransform');
                anim.setAttribute('attributeName', 'transform');
                anim.setAttribute('type', 'rotate');
                anim.setAttribute('values', '0 50 50;360 50 50');
                anim.setAttribute('dur', '5s');
                anim.setAttribute('repeatCount', 'indefinite');
                break;

            case 'scale':
                anim = document.createElementNS('http://www.w3.org/2000/svg', 'animateTransform');
                anim.setAttribute('attributeName', 'transform');
                anim.setAttribute('type', 'scale');
                anim.setAttribute('values', '1;1.5;1');
                anim.setAttribute('dur', '2s');
                anim.setAttribute('repeatCount', 'indefinite');
                break;

            default:
                alert('Неизвестный тип анимации');
                return;
        }

        anim.id = animId;
        selected.appendChild(anim);

        // Запускаем анимацию
        anim.beginElement();

        this.addToHistory('add_animation', {
            elementId: selected.id,
            animationType: animationType,
            animationId: animId
        });

        console.log('Анимация добавлена:', animationType);
    }
        getAnimationParams(animationType) {
        const params = {
            opacity: {
                values: '1;0.5;1',
                dur: '2s',
                repeatCount: 'indefinite'
            },
            move: {
                from: [100, 100],
                to: [200, 200],
                duration: '3s',
                repeat: 'indefinite'
            },
            rotate: {
                from: 0,
                to: 360,
                duration: '5s',
                repeat: 'indefinite'
            },
            scale: {
                from: 1,
                to: 1.5,
                duration: '2s',
                repeat: 'indefinite'
            }
        };
        return params[animationType] || {};
    }
}

// Инициализация редактора при загрузке страницы
document.addEventListener('DOMContentLoaded', () => {
    window.svgEditor = new SVGEditor();
});