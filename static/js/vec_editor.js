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

        this.transformMode = 'select'; // select, move, rotate, scale
        this.isTransforming = false;
        this.transformStartX = 0;
        this.transformStartY = 0;
        this.selectedElementOriginalTransform = null;
        this.transformControls = null;
        this.transformControlSize = 8;

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
                this.createGradientDirectly(gradient); // Используем клиентскую версию
            });
        });
        // Анимации
        document.querySelectorAll('[data-animation]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const animation = e.currentTarget.dataset.animation;
                this.addAnimation(animation);
            });
        });
            // Трансформации
            document.querySelectorAll('[data-action="move"]').forEach(btn => {
                btn.addEventListener('click', () => {
                    this.transformMode = 'move';
                    document.getElementById('selection-info').textContent = 'Режим: перемещение';
                });
            });

            document.querySelectorAll('[data-action="rotate"]').forEach(btn => {
                btn.addEventListener('click', () => {
                    this.transformMode = 'rotate';
                    document.getElementById('selection-info').textContent = 'Режим: вращение';
                });
            });

            document.querySelectorAll('[data-action="scale"]').forEach(btn => {
                btn.addEventListener('click', () => {
                    this.transformMode = 'scale';
                    document.getElementById('selection-info').textContent = 'Режим: масштаб';
                });
            });

            document.querySelectorAll('[data-action="group"]').forEach(btn => {
                btn.addEventListener('click', () => {
                    this.groupSelectedElements();
                });
            });

            document.querySelectorAll('[data-action="ungroup"]').forEach(btn => {
                btn.addEventListener('click', () => {
                    this.ungroupSelectedElements();
                });
            });

            // Обработчики для полей трансформации
            document.getElementById('transform-x')?.addEventListener('change', (e) => {
                this.applyTransformValue('x', parseFloat(e.target.value));
            });

            document.getElementById('transform-y')?.addEventListener('change', (e) => {
                this.applyTransformValue('y', parseFloat(e.target.value));
            });

            document.getElementById('transform-width')?.addEventListener('change', (e) => {
                this.applyTransformValue('width', parseFloat(e.target.value));
            });

            document.getElementById('transform-height')?.addEventListener('change', (e) => {
                this.applyTransformValue('height', parseFloat(e.target.value));
            });

            document.getElementById('transform-rotation')?.addEventListener('change', (e) => {
                this.applyTransformValue('rotation', parseFloat(e.target.value));
            });

            document.getElementById('transform-scale-x')?.addEventListener('change', (e) => {
                this.applyTransformValue('scaleX', parseFloat(e.target.value));
            });

            document.getElementById('transform-scale-y')?.addEventListener('change', (e) => {
                this.applyTransformValue('scaleY', parseFloat(e.target.value));
            });

            document.getElementById('transform-opacity')?.addEventListener('input', (e) => {
                this.updateSelectedElement({ opacity: e.target.value });
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

    applyTransformValue(type, value) {
        if (!this.selectedElement || isNaN(value)) return;

        const element = this.selectedElement;
        const tagName = element.tagName;

        switch (type) {
            case 'x':
                if (tagName === 'rect' || tagName === 'image' || tagName === 'text') {
                    element.setAttribute('x', value);
                } else if (tagName === 'circle' || tagName === 'ellipse') {
                    element.setAttribute('cx', value);
                }
                break;

            case 'y':
                if (tagName === 'rect' || tagName === 'image' || tagName === 'text') {
                    element.setAttribute('y', value);
                } else if (tagName === 'circle' || tagName === 'ellipse') {
                    element.setAttribute('cy', value);
                }
                break;

            case 'width':
                if (tagName === 'rect' || tagName === 'image') {
                    element.setAttribute('width', Math.max(value, 1));
                }
                break;

            case 'height':
                if (tagName === 'rect' || tagName === 'image') {
                    element.setAttribute('height', Math.max(value, 1));
                }
                break;

            case 'rotation':
                const currentTransform = element.getAttribute('transform') || '';
                const newTransform = this.replaceRotation(currentTransform, value);
                element.setAttribute('transform', newTransform);
                break;

            case 'scaleX':
            case 'scaleY':
                const scaleTransform = element.getAttribute('transform') || '';
                const scaleX = type === 'scaleX' ? value : this.extractScale(scaleTransform).x;
                const scaleY = type === 'scaleY' ? value : this.extractScale(scaleTransform).y;
                const newScaleTransform = this.replaceScale(scaleTransform, scaleX, scaleY);
                element.setAttribute('transform', newScaleTransform);
                break;
        }

        this.updateTransformControls();
        this.addToHistory('transform_element', {
            elementId: element.id,
            attribute: type,
            value: value
        });    }

        updatePropertiesPanel() {
            if (!this.selectedElement) return;

            const element = this.selectedElement;
            const tagName = element.tagName;

            // Обновляем стандартные свойства
            const fill = element.getAttribute('fill');
            const stroke = element.getAttribute('stroke');
            const strokeWidth = element.getAttribute('stroke-width') || '1';
            const opacity = element.getAttribute('opacity') || '1';

            if (fill) document.getElementById('fill-color').value = fill;
            if (stroke) document.getElementById('stroke-color').value = stroke;
            document.getElementById('stroke-width').value = strokeWidth;
            document.getElementById('opacity').value = opacity;

            // Обновляем свойства трансформации
            if (tagName === 'rect' || tagName === 'image') {
                document.getElementById('transform-x').value = parseFloat(element.getAttribute('x') || 0);
                document.getElementById('transform-y').value = parseFloat(element.getAttribute('y') || 0);
                document.getElementById('transform-width').value = parseFloat(element.getAttribute('width') || 0);
                document.getElementById('transform-height').value = parseFloat(element.getAttribute('height') || 0);
            } else if (tagName === 'circle') {
                document.getElementById('transform-x').value = parseFloat(element.getAttribute('cx') || 0);
                document.getElementById('transform-y').value = parseFloat(element.getAttribute('cy') || 0);
                document.getElementById('transform-width').value = parseFloat(element.getAttribute('r') || 0) * 2;
                document.getElementById('transform-height').value = parseFloat(element.getAttribute('r') || 0) * 2;
            } else if (tagName === 'ellipse') {
                document.getElementById('transform-x').value = parseFloat(element.getAttribute('cx') || 0);
                document.getElementById('transform-y').value = parseFloat(element.getAttribute('cy') || 0);
                document.getElementById('transform-width').value = parseFloat(element.getAttribute('rx') || 0) * 2;
                document.getElementById('transform-height').value = parseFloat(element.getAttribute('ry') || 0) * 2;
            } else if (tagName === 'text') {
                document.getElementById('transform-x').value = parseFloat(element.getAttribute('x') || 0);
                document.getElementById('transform-y').value = parseFloat(element.getAttribute('y') || 0);
            }

            // Обновляем трансформации
            const transform = element.getAttribute('transform') || '';
            document.getElementById('transform-rotation').value = this.extractRotation(transform);

            const scale = this.extractScale(transform);
            document.getElementById('transform-scale-x').value = scale.x;
            document.getElementById('transform-scale-y').value = scale.y;

            document.getElementById('transform-opacity').value = opacity;
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

        createGradientDirectly(type) {
            const selected = this.selectedElement;
            if (!selected) {
                alert('Выберите элемент для применения градиента');
                return;
            }

            const canvas = document.getElementById('svg-canvas');
            const svg = canvas.querySelector('svg');

            // Создаем или получаем элемент defs
            let defs = svg.querySelector('defs');
            if (!defs) {
                defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
                svg.insertBefore(defs, svg.firstChild);
            }

            // Уникальный ID для градиента
            const gradientId = `gradient-${type}-${Date.now()}`;
            let gradient;

            if (type === 'linear') {
                // Создаем линейный градиент
                gradient = document.createElementNS('http://www.w3.org/2000/svg', 'linearGradient');
                gradient.id = gradientId;
                gradient.setAttribute('x1', '0%');
                gradient.setAttribute('y1', '0%');
                gradient.setAttribute('x2', '100%');
                gradient.setAttribute('y2', '100%');

                // Добавляем цветовые остановки
                const stops = [
                    { offset: '0%', color: '#FF0000' },
                    { offset: '50%', color: '#00FF00' },
                    { offset: '100%', color: '#0000FF' }
                ];

                stops.forEach(stop => {
                    const stopElement = document.createElementNS('http://www.w3.org/2000/svg', 'stop');
                    stopElement.setAttribute('offset', stop.offset);
                    stopElement.setAttribute('stop-color', stop.color);
                    gradient.appendChild(stopElement);
                });

            } else if (type === 'radial') {
                // Создаем радиальный градиент
                gradient = document.createElementNS('http://www.w3.org/2000/svg', 'radialGradient');
                gradient.id = gradientId;
                gradient.setAttribute('cx', '50%');
                gradient.setAttribute('cy', '50%');
                gradient.setAttribute('r', '50%');
                gradient.setAttribute('fx', '50%');
                gradient.setAttribute('fy', '50%');

                // Добавляем цветовые остановки
                const stops = [
                    { offset: '0%', color: '#FF0000', opacity: '1' },
                    { offset: '50%', color: '#00FF00', opacity: '0.8' },
                    { offset: '100%', color: '#0000FF', opacity: '0.6' }
                ];

                stops.forEach(stop => {
                    const stopElement = document.createElementNS('http://www.w3.org/2000/svg', 'stop');
                    stopElement.setAttribute('offset', stop.offset);
                    stopElement.setAttribute('stop-color', stop.color);
                    if (stop.opacity) {
                        stopElement.setAttribute('stop-opacity', stop.opacity);
                    }
                    gradient.appendChild(stopElement);
                });
            } else {
                alert('Неизвестный тип градиента');
                return;
            }

            // Добавляем градиент в defs
            defs.appendChild(gradient);

            // Применяем градиент к выбранному элементу
            selected.setAttribute('fill', `url(#${gradientId})`);

            // Обновляем панель свойств
            document.getElementById('fill-color').value = `url(#${gradientId})`;

            // Сохраняем в историю
            this.addToHistory('add_gradient', {
                elementId: selected.id,
                gradientId: gradientId,
                gradientType: type
            });

            console.log('Градиент создан и применен:', gradientId);
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

            try {
                // Очищаем canvas и устанавливаем SVG
                canvas.innerHTML = snapshot;

                // Удаляем любые старые контролы трансформации из snapshot
                const oldControls = canvas.querySelector('#transform-controls');
                if (oldControls) {
                    oldControls.remove();
                }

                // Снимаем выделение со всех элементов
                canvas.querySelectorAll('.selected').forEach(el => {
                    el.classList.remove('selected');
                });

                // Восстанавливаем обработчики событий
                this.setupCanvasEvents(canvas);

                // Снимаем текущее выделение
                this.deselectElement();

            } catch (error) {
                console.error('Ошибка при восстановлении из истории:', error);
                // Восстанавливаем начальное состояние
                this.setupCanvas();
            }
        } else if (this.historyIndex === -1) {
            // Восстанавливаем начальное состояние
            this.setupCanvas();
        }
    }

    getSVGString() {
        const canvas = document.getElementById('svg-canvas');

        // Клонируем canvas, чтобы не повредить оригинальный DOM
        const clone = canvas.cloneNode(true);

        // Удаляем контролы трансформации из клона
        const transformControls = clone.querySelector('#transform-controls');
        if (transformControls) {
            transformControls.remove();
        }

        // Удаляем класс selected у всех элементов
        clone.querySelectorAll('.selected').forEach(el => {
            el.classList.remove('selected');
        });

        return clone.innerHTML;
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
        } catch (error) {
            this.createAnimationDirectly(animationType);
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
                // Вычисляем центр элемента для вращения
                const bbox = this.getSelectedElementBBox();
                const centerX = bbox.x + bbox.width / 2;
                const centerY = bbox.y + bbox.height / 2;

                anim = document.createElementNS('http://www.w3.org/2000/svg', 'animateTransform');
                anim.setAttribute('attributeName', 'transform');
                anim.setAttribute('type', 'rotate');
                anim.setAttribute('values', `0 ${centerX} ${centerY};360 ${centerX} ${centerY}`);
                anim.setAttribute('dur', '5s');
                anim.setAttribute('repeatCount', 'indefinite');
                anim.setAttribute('additive', 'sum');
                break;

            case 'scale':
                // Масштабирование относительно центра элемента
                const scaleBbox = this.getSelectedElementBBox();
                const scaleCenterX = scaleBbox.x + scaleBbox.width / 2;
                const scaleCenterY = scaleBbox.y + scaleBbox.height / 2;

                anim = document.createElementNS('http://www.w3.org/2000/svg', 'animateTransform');
                anim.setAttribute('attributeName', 'transform');
                anim.setAttribute('type', 'scale');
                anim.setAttribute('values', '1;1.5;1');
                anim.setAttribute('dur', '2s');
                anim.setAttribute('repeatCount', 'indefinite');
                anim.setAttribute('additive', 'sum');

                // Для правильного масштабирования относительно центра нужно использовать transform-origin
                // В SVG это делается через дополнительную трансформацию translate
                const existingTransform = selected.getAttribute('transform') || '';
                const translate = this.extractTranslate(existingTransform);

                // Добавляем трансформацию для масштабирования относительно центра
                if (!existingTransform.includes('scale')) {
                    const scaleTransform = `translate(${scaleCenterX}, ${scaleCenterY}) scale(1) translate(${-scaleCenterX}, ${-scaleCenterY})`;
                    const newTransform = existingTransform ? `${existingTransform} ${scaleTransform}` : scaleTransform;
                    selected.setAttribute('transform', newTransform);
                }
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
            const bbox = this.getSelectedElementBBox();
            const centerX = bbox.x + bbox.width / 2;
            const centerY = bbox.y + bbox.height / 2;

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
                    cx: centerX,
                    cy: centerY,
                    duration: '5s',
                    repeat: 'indefinite'
                },
                scale: {
                    from: 1,
                    to: 1.5,
                    cx: centerX,
                    cy: centerY,
                    duration: '2s',
                    repeat: 'indefinite'
                }
            };
            return params[animationType] || {};
        }


    getSelectedElementBBox() {
        if (!this.selectedElement) return { x: 0, y: 0, width: 0, height: 0 };

        try {
            const bbox = this.selectedElement.getBBox();
            return {
                x: bbox.x || 0,
                y: bbox.y || 0,
                width: bbox.width || 0,
                height: bbox.height || 0
            };
        } catch (e) {
            // Для новых элементов, которые еще не имеют getBBox()
            const tagName = this.selectedElement.tagName;

            switch (tagName) {
                case 'rect':
                    return {
                        x: parseFloat(this.selectedElement.getAttribute('x')) || 0,
                        y: parseFloat(this.selectedElement.getAttribute('y')) || 0,
                        width: parseFloat(this.selectedElement.getAttribute('width')) || 0,
                        height: parseFloat(this.selectedElement.getAttribute('height')) || 0
                    };

                case 'circle':
                    const cx = parseFloat(this.selectedElement.getAttribute('cx')) || 0;
                    const cy = parseFloat(this.selectedElement.getAttribute('cy')) || 0;
                    const r = parseFloat(this.selectedElement.getAttribute('r')) || 0;
                    return {
                        x: cx - r,
                        y: cy - r,
                        width: r * 2,
                        height: r * 2
                    };

                case 'ellipse':
                    const ecx = parseFloat(this.selectedElement.getAttribute('cx')) || 0;
                    const ecy = parseFloat(this.selectedElement.getAttribute('cy')) || 0;
                    const rx = parseFloat(this.selectedElement.getAttribute('rx')) || 0;
                    const ry = parseFloat(this.selectedElement.getAttribute('ry')) || 0;
                    return {
                        x: ecx - rx,
                        y: ecy - ry,
                        width: rx * 2,
                        height: ry * 2
                    };

                case 'text':
                    const tx = parseFloat(this.selectedElement.getAttribute('x')) || 0;
                    const ty = parseFloat(this.selectedElement.getAttribute('y')) || 0;
                    return {
                        x: tx,
                        y: ty - 20, // Примерная высота текста
                        width: this.selectedElement.textContent.length * 10,
                        height: 20
                    };

                default:
                    // Для других элементов используем bounding client rect
                    const rect = this.selectedElement.getBoundingClientRect();
                    const canvas = document.getElementById('svg-canvas');
                    const svg = canvas.querySelector('svg');
                    const svgRect = svg.getBoundingClientRect();

                    return {
                        x: (rect.left - svgRect.left) / this.zoom,
                        y: (rect.top - svgRect.top) / this.zoom,
                        width: rect.width / this.zoom,
                        height: rect.height / this.zoom
                    };
            }
        }
    }

    startMoveTransform(e) {
        this.transformMode = 'move';
        this.isTransforming = true;
        this.transformStartX = e.clientX;
        this.transformStartY = e.clientY;

        // Сохраняем начальные координаты элемента
        this.selectedElementOriginalTransform = {
            x: parseFloat(this.selectedElement.getAttribute('x') || 0),
            y: parseFloat(this.selectedElement.getAttribute('y') || 0),
            cx: parseFloat(this.selectedElement.getAttribute('cx') || 0),
            cy: parseFloat(this.selectedElement.getAttribute('cy') || 0),
            transform: this.selectedElement.getAttribute('transform') || ''
        };

        // Добавляем обработчики для всей страницы
        document.addEventListener('mousemove', this.handleMoveTransform.bind(this));
        document.addEventListener('mouseup', this.finishTransform.bind(this));
    }

    startRotateTransform(e) {
        this.transformMode = 'rotate';
        this.isTransforming = true;

        // Получаем центр элемента в координатах экрана
        const canvas = document.getElementById('svg-canvas');
        const svg = canvas.querySelector('svg');
        const bbox = this.getSelectedElementBBox();

        // Преобразуем координаты центра элемента в координаты экрана
        const point = svg.createSVGPoint();
        point.x = bbox.x + bbox.width / 2;
        point.y = bbox.y + bbox.height / 2;
        const screenPoint = point.matrixTransform(svg.getScreenCTM());

        this.rotateCenterX = screenPoint.x;
        this.rotateCenterY = screenPoint.y;

        // Начальный угол от центра элемента до точки нажатия
        this.rotateStartAngle = Math.atan2(
            e.clientY - this.rotateCenterY,
            e.clientX - this.rotateCenterX
        );

        // Сохраняем начальное вращение
        const currentTransform = this.selectedElement.getAttribute('transform') || '';
        this.selectedElementOriginalTransform = {
            transform: currentTransform,
            rotation: this.extractRotation(currentTransform)
        };

        document.addEventListener('mousemove', this.handleRotateTransform.bind(this));
        document.addEventListener('mouseup', this.finishTransform.bind(this));
    }

    handleRotateTransform(e) {
        if (!this.isTransforming || this.transformMode !== 'rotate') return;

        // Вычисляем текущий угол
        const currentAngle = Math.atan2(
            e.clientY - this.rotateCenterY,
            e.clientX - this.rotateCenterX
        );

        // Разница в углах в градусах
        const angleDelta = (currentAngle - this.rotateStartAngle) * (180 / Math.PI);

        // Новый угол = начальный угол + разница
        const newRotation = this.selectedElementOriginalTransform.rotation + angleDelta;

        // Применяем вращение вокруг центра элемента
        const bbox = this.getSelectedElementBBox();
        const centerX = bbox.x + bbox.width / 2;
        const centerY = bbox.y + bbox.height / 2;

        // Удаляем старое вращение и добавляем новое
        let transform = this.selectedElementOriginalTransform.transform;
        transform = this.replaceRotation(transform, newRotation, centerX, centerY);

        this.selectedElement.setAttribute('transform', transform);

        // Обновляем интерфейс
        document.getElementById('transform-rotation').value = newRotation;
        this.updateTransformControls();
    }

    replaceRotation(transform, angle, centerX, centerY) {
        let newTransform = transform || '';

        // Удаляем существующий rotate
        newTransform = newTransform.replace(/rotate\([^)]*\)/g, '').trim();

        // Добавляем новый rotate с центром вращения
        const newRotate = centerX !== undefined && centerY !== undefined
            ? `rotate(${angle}, ${centerX}, ${centerY})`
            : `rotate(${angle})`;

        newTransform = newTransform ? `${newRotate} ${newTransform}` : newRotate;

        return newTransform;
    }

    // И обновите extractRotation для поддержки центра вращения:
    extractRotation(transform) {
        if (!transform) return 0;

        const rotateMatch = transform.match(/rotate\(([^)]+)\)/);
        if (rotateMatch) {
            const values = rotateMatch[1].split(/[\s,]+/).map(Number);
            return values[0] || 0; // Возвращаем только угол
        }

        return 0;
    }

    handleMoveTransform(e) {
        if (!this.isTransforming || this.transformMode !== 'move') return;

        const dx = (e.clientX - this.transformStartX) / this.zoom;
        const dy = (e.clientY - this.transformStartY) / this.zoom;

        // Обновляем позицию элемента
        this.updateElementPosition(dx, dy);

        // Обновляем контролы трансформации
        this.updateTransformControls();

        this.transformStartX = e.clientX;
        this.transformStartY = e.clientY;
    }

    handleRotateTransform(e) {
        if (!this.isTransforming || this.transformMode !== 'rotate') return;

        // Вычисляем угол
        const currentAngle = Math.atan2(
            e.clientY - this.rotateCenterY,
            e.clientX - this.rotateCenterX
        );

        const angleDelta = currentAngle - this.rotateStartAngle;
        const degrees = angleDelta * (180 / Math.PI);

        const currentTransform = this.selectedElement.getAttribute('transform') || '';
        const rotation = this.extractRotation(currentTransform);
        const newRotation = rotation + degrees;

        const bbox = this.getSelectedElementBBox();

        const cx = bbox.x + bbox.width / 2;
        const cy = bbox.y + bbox.height / 2;


        const newTransform = this.replaceRotation(currentTransform, newRotation, cx, cy);


        this.selectedElement.setAttribute('transform', newTransform);

        this.updateTransformControls();
        this.rotateStartAngle = currentAngle;
    }

    startScaleTransform(type, e) {
    this.transformMode = 'scale';
    this.isTransforming = true;
    this.scaleType = type;

    // Получаем bounding box элемента
    const bbox = this.getSelectedElementBBox();
    this.originalBBox = bbox;

    // Сохраняем начальные атрибуты элемента
    this.selectedElementOriginalTransform = {
        x: parseFloat(this.selectedElement.getAttribute('x') || 0),
        y: parseFloat(this.selectedElement.getAttribute('y') || 0),
        width: parseFloat(this.selectedElement.getAttribute('width') || 0),
        height: parseFloat(this.selectedElement.getAttribute('height') || 0),
        cx: parseFloat(this.selectedElement.getAttribute('cx') || 0),
        cy: parseFloat(this.selectedElement.getAttribute('cy') || 0),
        rx: parseFloat(this.selectedElement.getAttribute('rx') || 0),
        ry: parseFloat(this.selectedElement.getAttribute('ry') || 0),
        r: parseFloat(this.selectedElement.getAttribute('r') || 0),
        transform: this.selectedElement.getAttribute('transform') || ''
    };

    // Начальная точка для расчета масштаба
    this.scaleStartX = e.clientX;
    this.scaleStartY = e.clientY;

    document.addEventListener('mousemove', this.handleScaleTransform.bind(this));
    document.addEventListener('mouseup', this.finishTransform.bind(this));
}

handleScaleTransform(e) {
    if (!this.isTransforming || this.transformMode !== 'scale') return;

    const element = this.selectedElement;
    const tagName = element.tagName;
    const original = this.selectedElementOriginalTransform;
    const bbox = this.originalBBox;

    // Вычисляем дельту перемещения мыши
    const dx = (e.clientX - this.scaleStartX) / this.zoom;
    const dy = (e.clientY - this.scaleStartY) / this.zoom;

    // В зависимости от типа контрола вычисляем масштаб
    let scaleX = 1;
    let scaleY = 1;
    let offsetX = 0;
    let offsetY = 0;

    const minSize = 5; // Минимальный размер

    switch (this.scaleType) {
        case 'scale-nw': // Левый верхний угол
            scaleX = 1 - dx / bbox.width;
            scaleY = 1 - dy / bbox.height;
            offsetX = dx;
            offsetY = dy;
            break;

        case 'scale-ne': // Правый верхний угол
            scaleX = 1 + dx / bbox.width;
            scaleY = 1 - dy / bbox.height;
            offsetY = dy;
            break;

        case 'scale-sw': // Левый нижний угол
            scaleX = 1 - dx / bbox.width;
            scaleY = 1 + dy / bbox.height;
            offsetX = dx;
            break;

        case 'scale-se': // Правый нижний угол
            scaleX = 1 + dx / bbox.width;
            scaleY = 1 + dy / bbox.height;
            break;

        case 'scale-n': // Верхняя сторона
            scaleY = 1 - dy / bbox.height;
            offsetY = dy;
            break;

        case 'scale-s': // Нижняя сторона
            scaleY = 1 + dy / bbox.height;
            break;

        case 'scale-w': // Левая сторона
            scaleX = 1 - dx / bbox.width;
            offsetX = dx;
            break;

        case 'scale-e': // Правая сторона
            scaleX = 1 + dx / bbox.width;
            break;
    }

    // Ограничиваем минимальный масштаб
    scaleX = Math.max(scaleX, minSize / bbox.width);
    scaleY = Math.max(scaleY, minSize / bbox.height);

    // Применяем масштабирование в зависимости от типа элемента
    switch (tagName) {
        case 'rect':
        case 'image':
            const newWidth = Math.max(original.width * scaleX, minSize);
            const newHeight = Math.max(original.height * scaleY, minSize);

            // Для элементов с x/y также корректируем позицию
            if (original.x !== undefined && offsetX !== 0) {
                element.setAttribute('x', original.x + offsetX);
            }
            if (original.y !== undefined && offsetY !== 0) {
                element.setAttribute('y', original.y + offsetY);
            }

            element.setAttribute('width', newWidth);
            element.setAttribute('height', newHeight);
            break;

        case 'circle':
            const newRadius = Math.max(original.r * scaleX, minSize/2);
            element.setAttribute('r', newRadius);
            // Круг масштабируется от центра, поэтому смещения нет
            break;

        case 'ellipse':
            const newRx = Math.max(original.rx * scaleX, minSize/2);
            const newRy = Math.max(original.ry * scaleY, minSize/2);
            element.setAttribute('rx', newRx);
            element.setAttribute('ry', newRy);
            break;

        default:
            // Для других элементов применяем transform scale
            // Вычисляем центр элемента для масштабирования относительно центра
            const centerX = bbox.x + bbox.width / 2;
            const centerY = bbox.y + bbox.height / 2;

            // Создаем трансформацию: сдвиг к центру -> масштабирование -> обратный сдвиг
            const scaleTransform =
                `translate(${centerX}, ${centerY}) ` +
                `scale(${scaleX}, ${scaleY}) ` +
                `translate(${-centerX}, ${-centerY})`;

            // Удаляем старые scale трансформации
            let currentTransform = element.getAttribute('transform') || '';
            currentTransform = currentTransform.replace(/scale\([^)]*\)/g, '')
                                             .replace(/translate\([^)]*\)/g, '')
                                             .trim();

            // Добавляем новую трансформацию масштабирования
            const newTransform = currentTransform
                ? `${currentTransform} ${scaleTransform}`
                : scaleTransform;

            element.setAttribute('transform', newTransform);
            break;
    }

    this.updateTransformControls();
}

    applyScaling(scaleX, scaleY) {
        const element = this.selectedElement;
        const tagName = element.tagName;

        // Ограничиваем минимальный размер
        const minSize = 5;

        switch (tagName) {
            case 'rect':
                const newWidth = Math.max(this.scaleStartWidth * scaleX, minSize);
                const newHeight = Math.max(this.scaleStartHeight * scaleY, minSize);
                element.setAttribute('width', newWidth);
                element.setAttribute('height', newHeight);
                break;

            case 'circle':
                const newRadius = Math.max(this.selectedElementOriginalTransform.r * scaleX, minSize/2);
                element.setAttribute('r', newRadius);
                break;

            case 'ellipse':
                const newRx = Math.max(this.selectedElementOriginalTransform.rx * scaleX, minSize/2);
                const newRy = Math.max(this.selectedElementOriginalTransform.ry * scaleY, minSize/2);
                element.setAttribute('rx', newRx);
                element.setAttribute('ry', newRy);
                break;

            default:
                // Для других элементов применяем transform scale
                const currentTransform = element.getAttribute('transform') || '';
                const scale = this.extractScale(currentTransform);

                const newScaleX = scale.x * scaleX;
                const newScaleY = scale.y * scaleY;

                const newTransform = this.replaceScale(currentTransform, newScaleX, newScaleY);
                element.setAttribute('transform', newTransform);
                break;
        }
    }

    updateElementPosition(dx, dy) {
        const element = this.selectedElement;
        const tagName = element.tagName;

        switch (tagName) {
            case 'rect':
            case 'image':
                const x = parseFloat(element.getAttribute('x') || 0) + dx;
                const y = parseFloat(element.getAttribute('y') || 0) + dy;
                element.setAttribute('x', x);
                element.setAttribute('y', y);
                break;

            case 'circle':
            case 'ellipse':
                const cx = parseFloat(element.getAttribute('cx') || 0) + dx;
                const cy = parseFloat(element.getAttribute('cy') || 0) + dy;
                element.setAttribute('cx', cx);
                element.setAttribute('cy', cy);
                break;

            case 'text':
                const textX = parseFloat(element.getAttribute('x') || 0) + dx;
                const textY = parseFloat(element.getAttribute('y') || 0) + dy;
                element.setAttribute('x', textX);
                element.setAttribute('y', textY);
                break;

            case 'line':
                const x1 = parseFloat(element.getAttribute('x1') || 0) + dx;
                const y1 = parseFloat(element.getAttribute('y1') || 0) + dy;
                const x2 = parseFloat(element.getAttribute('x2') || 0) + dx;
                const y2 = parseFloat(element.getAttribute('y2') || 0) + dy;
                element.setAttribute('x1', x1);
                element.setAttribute('y1', y1);
                element.setAttribute('x2', x2);
                element.setAttribute('y2', y2);
                break;

            case 'polygon':
            case 'polyline':
                const points = element.getAttribute('points');
                const newPoints = points.split(' ').map(point => {
                    const [px, py] = point.split(',').map(Number);
                    return `${px + dx},${py + dy}`;
                }).join(' ');
                element.setAttribute('points', newPoints);
                break;

            case 'path':
                // Для path сложнее - нужно парсить команды
                this.transformPath(element, dx, dy);
                break;

            default:
                // Для других элементов применяем transform translate
                const currentTransform = element.getAttribute('transform') || '';
                const translate = this.extractTranslate(currentTransform);

                const newTranslateX = translate.x + dx;
                const newTranslateY = translate.y + dy;

                const newTransform = this.replaceTranslate(currentTransform, newTranslateX, newTranslateY);
                element.setAttribute('transform', newTransform);
                break;
        }
    }

    transformPath(element, dx, dy) {
        const d = element.getAttribute('d');
        if (!d) return;

        // Простой парсинг path - преобразуем все координаты
        const commands = d.split(/(?=[A-Za-z])/);
        const transformedCommands = commands.map(cmd => {
            const type = cmd[0];
            const coords = cmd.slice(1).trim().split(/[\s,]+/).map(Number);

            if (type === 'M' || type === 'L' || type === 'T') {
                // Абсолютные координаты
                for (let i = 0; i < coords.length; i += 2) {
                    coords[i] += dx;
                    if (i + 1 < coords.length) coords[i + 1] += dy;
                }
            } else if (type === 'm' || type === 'l' || type === 't') {
                // Относительные координаты - не меняем
            } else if (type === 'C' || type === 'S' || type === 'Q') {
                // Кривые Безье с абсолютными координатами
                for (let i = 0; i < coords.length; i += 2) {
                    coords[i] += dx;
                    if (i + 1 < coords.length) coords[i + 1] += dy;
                }
            } else if (type === 'c' || type === 's' || type === 'q') {
                // Относительные координаты кривых - не меняем
            } else if (type === 'A') {
                // Дуга - меняем только центральные координаты
                coords[5] += dx;
                coords[6] += dy;
            } else if (type === 'a') {
                // Относительная дуга - не меняем
            }

            return type + coords.join(' ');
        });

        element.setAttribute('d', transformedCommands.join(' '));
    }

    extractTranslate(transform) {
        if (!transform) return { x: 0, y: 0 };

        const translateMatch = transform.match(/translate\(([^)]+)\)/);
        if (translateMatch) {
            const [x, y = x] = translateMatch[1].split(/[\s,]+/).map(Number);
            return { x: x || 0, y: y || 0 };
        }

        return { x: 0, y: 0 };
    }


    extractScale(transform) {
        if (!transform) return { x: 1, y: 1 };

        const scaleMatch = transform.match(/scale\(([^)]+)\)/);
        if (scaleMatch) {
            const [x, y = x] = scaleMatch[1].split(/[\s,]+/).map(Number);
            return { x: x || 1, y: y || 1 };
        }

        return { x: 1, y: 1 };
    }

    replaceTranslate(transform, x, y) {
        let newTransform = transform || '';

        // Удаляем существующий translate
        newTransform = newTransform.replace(/translate\([^)]*\)/g, '').trim();

        // Добавляем новый translate
        const newTranslate = `translate(${x}, ${y})`;
        newTransform = newTransform ? `${newTranslate} ${newTransform}` : newTranslate;

        return newTransform;
    }


    replaceScale(transform, x, y) {
        let newTransform = transform || '';

        // Удаляем существующий scale
        newTransform = newTransform.replace(/scale\([^)]*\)/g, '').trim();

        // Добавляем новый scale
        const newScale = `scale(${x}, ${y})`;
        newTransform = newTransform ? `${newScale} ${newTransform}` : newScale;

        return newTransform;
    }

    updateTransformControls() {
        if (!this.transformControls || !this.selectedElement) return;

        const bbox = this.getSelectedElementBBox();
        const controls = this.transformControls.querySelectorAll('.transform-control');

        controls.forEach(control => {
            const type = control.dataset.type;

            switch (type) {
                case 'selection':
                    control.setAttribute('x', bbox.x);
                    control.setAttribute('y', bbox.y);
                    control.setAttribute('width', bbox.width);
                    control.setAttribute('height', bbox.height);
                    break;

                case 'move':
                    control.setAttribute('x', bbox.x);
                    control.setAttribute('y', bbox.y);
                    control.setAttribute('width', bbox.width);
                    control.setAttribute('height', bbox.height);
                    break;

                case 'scale-nw':
                    control.setAttribute('cx', bbox.x);
                    control.setAttribute('cy', bbox.y);
                    break;

                case 'scale-ne':
                    control.setAttribute('cx', bbox.x + bbox.width);
                    control.setAttribute('cy', bbox.y);
                    break;

                case 'scale-sw':
                    control.setAttribute('cx', bbox.x);
                    control.setAttribute('cy', bbox.y + bbox.height);
                    break;

                case 'scale-se':
                    control.setAttribute('cx', bbox.x + bbox.width);
                    control.setAttribute('cy', bbox.y + bbox.height);
                    break;

                case 'scale-n':
                    control.setAttribute('cx', bbox.x + bbox.width/2);
                    control.setAttribute('cy', bbox.y);
                    break;

                case 'scale-w':
                    control.setAttribute('cx', bbox.x);
                    control.setAttribute('cy', bbox.y + bbox.height/2);
                    break;

                case 'scale-e':
                    control.setAttribute('cx', bbox.x + bbox.width);
                    control.setAttribute('cy', bbox.y + bbox.height/2);
                    break;

                case 'scale-s':
                    control.setAttribute('cx', bbox.x + bbox.width/2);
                    control.setAttribute('cy', bbox.y + bbox.height);
                    break;

                case 'rotate':
                    control.setAttribute('cx', bbox.x + bbox.width/2);
                    control.setAttribute('cy', bbox.y - 30);
                    break;
            }
        });
    }

    finishTransform() {
        if (!this.isTransforming) return;

        this.isTransforming = false;
        this.transformMode = 'select';

        // Удаляем обработчики
        document.removeEventListener('mousemove', this.handleMoveTransform.bind(this));
        document.removeEventListener('mousemove', this.handleRotateTransform.bind(this));
        document.removeEventListener('mousemove', this.handleScaleTransform.bind(this));
        document.removeEventListener('mouseup', this.finishTransform.bind(this));

        // Сохраняем в историю
        if (this.selectedElement) {
            this.addToHistory('transform_element', {
                elementId: this.selectedElement.id,
                transform: this.selectedElement.getAttribute('transform') || ''
            });
        }
    }

    removeTransformControls() {
        if (this.transformControls && this.transformControls.parentNode) {
            this.transformControls.parentNode.removeChild(this.transformControls);
        }
        this.transformControls = null;
    }

    selectElement(element) {
        this.deselectElement();

        this.selectedElement = element;
        element.classList.add('selected');

        // Устанавливаем фокус для клавиатурных событий
        element.setAttribute('tabindex', '0');
        element.focus();

        // Обновляем панель свойств
        this.updatePropertiesPanel();

        // Показываем контролы трансформации
        this.setupTransformControls();

        // Показываем информацию о выборе
        document.getElementById('selection-info').textContent =
            `Выбрано: ${element.tagName} (${element.id})`;
    }
    setupTransformControls() {
        this.removeTransformControls(); // Удаляем старые контролы

        if (!this.selectedElement || this.selectedElement.tagName === 'svg') return;

        const canvas = document.getElementById('svg-canvas');
        const svg = canvas.querySelector('svg');

        // Получаем bounding box элемента
        const bbox = this.getSelectedElementBBox();

        // Проверяем, что bounding box валиден
        if (isNaN(bbox.x) || isNaN(bbox.y) || isNaN(bbox.width) || isNaN(bbox.height)) {
            console.warn('Invalid bounding box:', bbox);
            return;
        }

        // Создаем группу для контролов
        this.transformControls = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        this.transformControls.id = 'transform-controls';

        // Создаем рамку выделения
        const selectionRect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
        selectionRect.setAttribute('x', bbox.x);
        selectionRect.setAttribute('y', bbox.y);
        selectionRect.setAttribute('width', Math.max(bbox.width, 1));
        selectionRect.setAttribute('height', Math.max(bbox.height, 1));
        selectionRect.setAttribute('fill', 'none');
        selectionRect.setAttribute('stroke', '#3498db');
        selectionRect.setAttribute('stroke-width', '1');
        selectionRect.setAttribute('stroke-dasharray', '5,5');
        selectionRect.classList.add('transform-control');
        selectionRect.dataset.type = 'selection';

        // Создаем контролы для масштабирования (только если элемент имеет размер)
        if (bbox.width > 0 && bbox.height > 0) {
            const scaleControls = [
                { x: bbox.x, y: bbox.y, cursor: 'nwse-resize', type: 'scale-nw' },
                { x: bbox.x + bbox.width, y: bbox.y, cursor: 'nesw-resize', type: 'scale-ne' },
                { x: bbox.x, y: bbox.y + bbox.height, cursor: 'nesw-resize', type: 'scale-sw' },
                { x: bbox.x + bbox.width, y: bbox.y + bbox.height, cursor: 'nwse-resize', type: 'scale-se' },
                { x: bbox.x + bbox.width/2, y: bbox.y, cursor: 'ns-resize', type: 'scale-n' },
                { x: bbox.x, y: bbox.y + bbox.height/2, cursor: 'ew-resize', type: 'scale-w' },
                { x: bbox.x + bbox.width, y: bbox.y + bbox.height/2, cursor: 'ew-resize', type: 'scale-e' },
                { x: bbox.x + bbox.width/2, y: bbox.y + bbox.height, cursor: 'ns-resize', type: 'scale-s' }
            ];

            scaleControls.forEach(control => {
                const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
                circle.setAttribute('cx', control.x);
                circle.setAttribute('cy', control.y);
                circle.setAttribute('r', this.transformControlSize);
                circle.setAttribute('fill', 'white');
                circle.setAttribute('stroke', '#3498db');
                circle.setAttribute('stroke-width', '2');
                circle.classList.add('transform-control');
                circle.dataset.type = control.type;
                circle.style.cursor = control.cursor;

                circle.addEventListener('mousedown', (e) => {
                    e.stopPropagation();
                    this.startScaleTransform(control.type, e);
                });

                this.transformControls.appendChild(circle);
            });

            // Контрол для вращения (только для элементов с размером)
            const rotateControl = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
            rotateControl.setAttribute('cx', bbox.x + bbox.width/2);
            rotateControl.setAttribute('cy', bbox.y - 30);
            rotateControl.setAttribute('r', this.transformControlSize);
            rotateControl.setAttribute('fill', 'white');
            rotateControl.setAttribute('stroke', '#3498db');
            rotateControl.setAttribute('stroke-width', '2');
            rotateControl.classList.add('transform-control');
            rotateControl.dataset.type = 'rotate';
            rotateControl.style.cursor = 'grab';

            // Линия от элемента до контрола вращения
            const rotateLine = document.createElementNS('http://www.w3.org/2000/svg', 'line');
            rotateLine.setAttribute('x1', bbox.x + bbox.width/2);
            rotateLine.setAttribute('y1', bbox.y);
            rotateLine.setAttribute('x2', bbox.x + bbox.width/2);
            rotateLine.setAttribute('y2', bbox.y - 30);
            rotateLine.setAttribute('stroke', '#3498db');
            rotateLine.setAttribute('stroke-width', '1');
            rotateLine.setAttribute('stroke-dasharray', '3,3');
            rotateLine.classList.add('transform-control');

            rotateControl.addEventListener('mousedown', (e) => {
                e.stopPropagation();
                this.startRotateTransform(e);
            });

            this.transformControls.appendChild(rotateLine);
            this.transformControls.appendChild(rotateControl);
        }

        this.transformControls.appendChild(selectionRect);

        // Контрол для перемещения (прозрачный прямоугольник над элементом)
        const moveControl = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
        moveControl.setAttribute('x', bbox.x);
        moveControl.setAttribute('y', bbox.y);
        moveControl.setAttribute('width', Math.max(bbox.width, 1));
        moveControl.setAttribute('height', Math.max(bbox.height, 1));
        moveControl.setAttribute('fill', 'transparent');
        moveControl.style.cursor = 'move';
        moveControl.classList.add('transform-control');
        moveControl.dataset.type = 'move';

        moveControl.addEventListener('mousedown', (e) => {
            e.stopPropagation();
            this.startMoveTransform(e);
        });

        this.transformControls.appendChild(moveControl);

        // Добавляем контролы в самый верхний слой
        const allLayers = svg.querySelectorAll('g');
        if (allLayers.length > 0) {
            svg.insertBefore(this.transformControls, allLayers[0]);
        } else {
            svg.appendChild(this.transformControls);
        }
    }
    deselectElement() {
        if (this.selectedElement) {
            this.selectedElement.classList.remove('selected');
            this.selectedElement.removeAttribute('tabindex');
            this.selectedElement = null;
        }

        this.removeTransformControls();
        document.getElementById('selection-info').textContent = 'Не выбрано';
    }

    // Обновите onKeyDown для поддержки трансформаций клавишами
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
                case 'g':
                    e.preventDefault();
                    this.groupSelectedElements();
                    break;
                case 'shift+g':
                    e.preventDefault();
                    this.ungroupSelectedElements();
                    break;
                case 'd':
                    e.preventDefault();
                    this.duplicateSelectedElement();
                    break;
            }
        } else if (e.altKey) {
            switch (e.key.toLowerCase()) {
                case 'arrowup':
                    e.preventDefault();
                    this.moveElement(0, -1);
                    break;
                case 'arrowdown':
                    e.preventDefault();
                    this.moveElement(0, 1);
                    break;
                case 'arrowleft':
                    e.preventDefault();
                    this.moveElement(-1, 0);
                    break;
                case 'arrowright':
                    e.preventDefault();
                    this.moveElement(1, 0);
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
                case 'm':
                    e.preventDefault();
                    this.transformMode = 'move';
                    break;
                case 's':
                    e.preventDefault();
                    this.transformMode = 'scale';
                    break;
                case 'r':
                    if (e.shiftKey) {
                        e.preventDefault();
                        this.transformMode = 'rotate';
                    }
                    break;
                case 'arrowup':
                    e.preventDefault();
                    this.moveElement(0, -10);
                    break;
                case 'arrowdown':
                    e.preventDefault();
                    this.moveElement(0, 10);
                    break;
                case 'arrowleft':
                    e.preventDefault();
                    this.moveElement(-10, 0);
                    break;
                case 'arrowright':
                    e.preventDefault();
                    this.moveElement(10, 0);
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
                case 'escape':
                    this.deselectElement();
                    break;
                case '[':
                    e.preventDefault();
                    this.changeZIndex(-1);
                    break;
                case ']':
                    e.preventDefault();
                    this.changeZIndex(1);
                    break;
            }
        }
    }

    moveElement(dx, dy) {
        if (!this.selectedElement) return;

        this.updateElementPosition(dx, dy);
        this.updateTransformControls();
        this.addToHistory('move_element', {
            elementId: this.selectedElement.id,
            dx,
            dy
        });
    }

    changeZIndex(direction) {
        if (!this.selectedElement || !this.selectedElement.parentNode) return;

        const parent = this.selectedElement.parentNode;
        const children = Array.from(parent.children);
        const currentIndex = children.indexOf(this.selectedElement);

        if (direction > 0 && currentIndex < children.length - 1) {
            // Поднять
            parent.insertBefore(this.selectedElement, children[currentIndex + 2]);
        } else if (direction < 0 && currentIndex > 0) {
            // Опустить
            parent.insertBefore(this.selectedElement, children[currentIndex - 1]);
        }

        this.addToHistory('change_zindex', {
            elementId: this.selectedElement.id,
            direction
        });
    }

    groupSelectedElements() {
        // Собираем все выделенные элементы (в будущем можно сделать множественный выбор)
        if (!this.selectedElement) return;

        const canvas = document.getElementById('svg-canvas');
        const svg = canvas.querySelector('svg');
        const currentLayer = svg.querySelector(`#layer-${this.currentLayerId}`);

        if (!currentLayer) return;

        // Создаем группу
        const group = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        group.id = `group-${Date.now()}`;

        // Перемещаем выбранный элемент в группу
        const element = this.selectedElement;
        const parent = element.parentNode;

        // Сохраняем позицию элемента
        const transform = element.getAttribute('transform') || '';
        const bbox = this.getSelectedElementBBox();

        parent.removeChild(element);
        group.appendChild(element);
        currentLayer.appendChild(group);

        // Применяем трансформацию группы для сохранения позиции
        if (bbox.x !== 0 || bbox.y !== 0) {
            group.setAttribute('transform', `translate(${bbox.x}, ${bbox.y})`);
            element.setAttribute('transform', transform.replace(/translate\([^)]*\)/g, '').trim());
        }

        this.selectElement(group);
        this.addToHistory('group_elements', { groupId: group.id });
    }

    ungroupSelectedElements() {
        if (!this.selectedElement || this.selectedElement.tagName !== 'g') return;

        const group = this.selectedElement;
        const parent = group.parentNode;
        const children = Array.from(group.children);
        const groupTransform = group.getAttribute('transform') || '';

        // Извлекаем трансформацию группы
        const groupTranslate = this.extractTranslate(groupTransform);

        children.forEach(child => {
            // Применяем трансформацию группы к детям
            const childTransform = child.getAttribute('transform') || '';
            const newTransform = this.combineTransforms(groupTranslate, childTransform);

            if (newTransform) {
                child.setAttribute('transform', newTransform);
            }

            parent.insertBefore(child, group);
        });

        parent.removeChild(group);
        this.deselectElement();
        this.addToHistory('ungroup_elements', { groupId: group.id });
    }

    combineTransforms(translate, transform) {
        if (!translate.x && !translate.y) return transform;

        const newTranslate = `translate(${translate.x}, ${translate.y})`;
        return transform ? `${newTranslate} ${transform}` : newTranslate;
    }

    duplicateSelectedElement() {
        if (!this.selectedElement) return;

        const clone = this.selectedElement.cloneNode(true);
        clone.id = `${this.selectedElement.id}-copy-${Date.now()}`;

        // Сдвигаем копию
        const transform = this.extractTranslate(clone.getAttribute('transform') || '');
        const newTransform = this.replaceTranslate(
            clone.getAttribute('transform') || '',
            transform.x + 10,
            transform.y + 10
        );

        clone.setAttribute('transform', newTransform);

        const parent = this.selectedElement.parentNode;
        parent.appendChild(clone);

        this.selectElement(clone);
        this.addToHistory('duplicate_element', {
            originalId: this.selectedElement.id,
            cloneId: clone.id
        });
    }
    getElementCenter(element) {
        if (!element) return { x: 0, y: 0 };

        try {
            const bbox = element.getBBox();
            return {
                x: bbox.x + bbox.width / 2,
                y: bbox.y + bbox.height / 2
            };
        } catch (e) {
            // Если getBBox не работает, используем атрибуты
            const tagName = element.tagName;

            switch (tagName) {
                case 'rect':
                    return {
                        x: parseFloat(element.getAttribute('x') || 0) +
                           parseFloat(element.getAttribute('width') || 0) / 2,
                        y: parseFloat(element.getAttribute('y') || 0) +
                           parseFloat(element.getAttribute('height') || 0) / 2
                    };

                case 'circle':
                    return {
                        x: parseFloat(element.getAttribute('cx') || 0),
                        y: parseFloat(element.getAttribute('cy') || 0)
                    };

                case 'ellipse':
                    return {
                        x: parseFloat(element.getAttribute('cx') || 0),
                        y: parseFloat(element.getAttribute('cy') || 0)
                    };

                default:
                    // Для других элементов используем bounding client rect
                    const rect = element.getBoundingClientRect();
                    const canvas = document.getElementById('svg-canvas');
                    const svg = canvas.querySelector('svg');
                    const svgRect = svg.getBoundingClientRect();

                    return {
                        x: (rect.left + rect.width/2 - svgRect.left) / this.zoom,
                        y: (rect.top + rect.height/2 - svgRect.top) / this.zoom
                    };
            }
        }
    }
}

// Инициализация редактора при загрузке страницы
document.addEventListener('DOMContentLoaded', () => {
    window.svgEditor = new SVGEditor();
});