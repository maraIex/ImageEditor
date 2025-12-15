// static/js/projects.js
class ProjectsManager {
    constructor() {
        this.projects = [];
        this.filteredProjects = [];
        this.currentFilter = 'all';
        this.init();
    }

    async init() {
        this.setupEventListeners();
        await this.loadProjects();
        this.renderProjects();
        this.updateStats();

        console.log('Projects Manager initialized');
    }

    async loadProjects() {
        try {
            const response = await fetch('/api/projects/list');
            if (response.ok) {
                const data = await response.json();
                this.projects = data.projects || [];
                this.filteredProjects = [...this.projects];
            } else {
                console.error('Ошибка загрузки проектов');
                this.projects = [];
                this.filteredProjects = [];
            }
        } catch (error) {
            console.error('Ошибка сети:', error);
            this.projects = [];
            this.filteredProjects = [];
        }
    }

    setupEventListeners() {
        // Кнопка обновления
        document.getElementById('refresh-projects').addEventListener('click', () => {
            this.refreshProjects();
        });

        // Фильтры
        document.querySelectorAll('.filter-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.setFilter(e.currentTarget.dataset.filter);
            });
        });

        // Поиск
        const searchInput = document.getElementById('search-projects');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                this.searchProjects(e.target.value);
            });
        }

        // Создание нового проекта
        const createBtn = document.getElementById('create-new-project');
        if (createBtn) {
            createBtn.addEventListener('click', () => {
                this.showCreateProjectModal();
            });
        }

        // Модальное окно создания проекта
        const createModal = document.getElementById('create-project-modal');
        const closeButtons = document.querySelectorAll('.close, .close-modal');

        closeButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                createModal.style.display = 'none';
                document.getElementById('project-info-modal').style.display = 'none';
                document.getElementById('import-project-modal').style.display = 'none';
            });
        });

        // Форма создания проекта
        const createForm = document.getElementById('create-project-form');
        if (createForm) {
            createForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.createNewProject();
            });
        }

        // Шаблоны проектов
        const templateSelect = document.getElementById('project-template');
        if (templateSelect) {
            templateSelect.addEventListener('change', (e) => {
                this.applyTemplate(e.target.value);
            });
        }

        // Клик вне модального окна
        window.addEventListener('click', (e) => {
            if (e.target.classList.contains('modal')) {
                createModal.style.display = 'none';
                document.getElementById('project-info-modal').style.display = 'none';
                document.getElementById('import-project-modal').style.display = 'none';
            }
        });

        // Импорт SVG
        const importSvgBtn = document.getElementById('btn-import-svg');
        if (importSvgBtn) {
            importSvgBtn.addEventListener('click', () => {
                this.importSVG();
            });
        }

        // Импорт проекта
        const importVdrawBtn = document.getElementById('btn-import-vdraw');
        if (importVdrawBtn) {
            importVdrawBtn.addEventListener('click', () => {
                this.importVdraw();
            });
        }

        // Трассировка изображения
        const traceImageBtn = document.getElementById('btn-trace-image');
        if (traceImageBtn) {
            traceImageBtn.addEventListener('click', () => {
                this.traceImage();
            });
        }

        // Кнопка импорта в шапке
        const importBtn = document.querySelector('button[data-action="import"]');
        if (importBtn) {
            importBtn.addEventListener('click', () => {
                this.showImportModal();
            });
        }

        // Горячие клавиши
        document.addEventListener('keydown', (e) => {
            if (e.ctrlKey && e.key === 'n') {
                e.preventDefault();
                this.showCreateProjectModal();
            }

            if (e.key === 'Escape') {
                createModal.style.display = 'none';
                document.getElementById('project-info-modal').style.display = 'none';
                document.getElementById('import-project-modal').style.display = 'none';
            }
        });
    }

    async refreshProjects() {
        const refreshBtn = document.getElementById('refresh-projects');
        refreshBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
        refreshBtn.disabled = true;

        await this.loadProjects();
        this.renderProjects();
        this.updateStats();

        // Анимация обновления
        setTimeout(() => {
            refreshBtn.innerHTML = '<i class="fas fa-sync-alt"></i>';
            refreshBtn.disabled = false;
        }, 500);
    }

    setFilter(filter) {
        this.currentFilter = filter;

        // Обновляем активную кнопку
        document.querySelectorAll('.filter-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.filter === filter);
        });

        // Применяем фильтр
        this.applyFilter();
    }

    applyFilter() {
        const now = new Date();
        const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

        switch (this.currentFilter) {
            case 'recent':
                this.filteredProjects = this.projects.filter(project => {
                    const modified = new Date(project.modified);
                    return modified > weekAgo;
                });
                break;

            case 'favorites':
                this.filteredProjects = this.projects.filter(project => project.favorite);
                break;

            case 'archived':
                this.filteredProjects = this.projects.filter(project => project.archived);
                break;

            default:
                this.filteredProjects = [...this.projects];
        }

        this.renderProjects();
    }

    searchProjects(query) {
        if (!query.trim()) {
            this.filteredProjects = [...this.projects];
            this.applyFilter();
            return;
        }

        const searchLower = query.toLowerCase();
        this.filteredProjects = this.projects.filter(project =>
            project.name.toLowerCase().includes(searchLower) ||
            (project.tags && project.tags.some(tag => tag.toLowerCase().includes(searchLower)))
        );

        this.renderProjects();
    }

    renderProjects() {
        const container = document.getElementById('projects-container');

        if (!container) return;

        if (this.filteredProjects.length === 0) {
            let message = '';
            let icon = '';

            switch (this.currentFilter) {
                case 'recent':
                    message = 'Нет недавних проектов';
                    icon = 'fa-clock';
                    break;
                case 'favorites':
                    message = 'Нет избранных проектов';
                    icon = 'fa-star';
                    break;
                case 'archived':
                    message = 'Нет архивных проектов';
                    icon = 'fa-archive';
                    break;
                default:
                    if (this.projects.length === 0) {
                        message = 'У вас еще нет проектов';
                        icon = 'fa-file-alt';
                    } else {
                        message = 'Проекты не найдены';
                        icon = 'fa-search';
                    }
            }

            container.innerHTML = `
                <div class="message">
                    <i class="fas ${icon}"></i>
                    <h3>${message}</h3>
                    <p>Создайте новый проект или измените фильтры поиска</p>
                    <button class="btn-primary" style="margin-top: 20px;" onclick="projectsManager.showCreateProjectModal()">
                        <i class="fas fa-plus"></i> Создать проект
                    </button>
                </div>
            `;
            return;
        }

        container.innerHTML = '';

        this.filteredProjects.forEach(project => {
            const card = this.createProjectCard(project);
            container.appendChild(card);
        });
    }

    createProjectCard(project) {
        const card = document.createElement('div');
        card.className = 'project-card';
        card.dataset.projectId = project.id;

        // Форматируем дату
        const modifiedDate = new Date(project.modified);
        const formattedDate = modifiedDate.toLocaleDateString('ru-RU', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
        });

        // Создаем превью (в реальном приложении здесь будет миниатюра)
        const previewColor = this.getColorFromId(project.id);

        card.innerHTML = `
            <div class="project-preview" style="background: ${previewColor}">
                <div class="preview-placeholder">
                    <i class="fas fa-vector-square"></i>
                    <p>${project.width}×${project.height} ${project.unit}</p>
                </div>
            </div>
            <div class="project-info">
                <div class="project-title">
                    <span>${this.escapeHtml(project.name)}</span>
                    <i class="fas fa-star favorite ${project.favorite ? 'fas' : 'far'}"
                       data-project-id="${project.id}"></i>
                </div>
                <div class="project-meta">
                    <span>${formattedDate}</span>
                    <span class="project-size">${project.width}×${project.height}</span>
                </div>
                <div class="project-description">
                    ${project.description || 'Без описания'}
                </div>
            </div>
            <div class="project-actions">
                <button class="action-btn edit" title="Редактировать">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="action-btn info" title="Информация">
                    <i class="fas fa-info-circle"></i>
                </button>
                <button class="action-btn delete" title="Удалить">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        `;

        // Добавляем обработчики событий
        card.addEventListener('click', (e) => {
            if (!e.target.closest('.project-actions') && !e.target.classList.contains('favorite')) {
                this.openProject(project.id);
            }
        });

        // Избранное
        const favoriteBtn = card.querySelector('.favorite');
        if (favoriteBtn) {
            favoriteBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.toggleFavorite(project.id);
            });
        }

        // Кнопки действий
        const editBtn = card.querySelector('.action-btn.edit');
        if (editBtn) {
            editBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.openProject(project.id);
            });
        }

        const infoBtn = card.querySelector('.action-btn.info');
        if (infoBtn) {
            infoBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.showProjectInfo(project);
            });
        }

        const deleteBtn = card.querySelector('.action-btn.delete');
        if (deleteBtn) {
            deleteBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.deleteProject(project.id, project.name);
            });
        }

        return card;
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    getColorFromId(id) {
        // Генерируем цвет на основе ID проекта
        const hash = id.split('').reduce((acc, char) => {
            return char.charCodeAt(0) + ((acc << 5) - acc);
        }, 0);

        const hue = Math.abs(hash % 360);
        return `hsl(${hue}, 70%, 60%)`;
    }

    async toggleFavorite(projectId) {
        try {
            const response = await fetch(`/api/project/${projectId}/favorite`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            if (response.ok) {
                // Обновляем локальные данные
                const project = this.projects.find(p => p.id === projectId);
                if (project) {
                    project.favorite = !project.favorite;
                    this.renderProjects();
                }
            }
        } catch (error) {
            console.error('Ошибка обновления избранного:', error);
        }
    }

    async openProject(projectId) {
        try {
            // Загружаем проект с сервера
            const response = await fetch(`/api/project/${projectId}`);

            if (response.ok) {
                const project = await response.json();

                // Сохраняем в localStorage для редактора
                localStorage.setItem('currentProject', JSON.stringify(project));

                // Перенаправляем в редактор
                window.location.href = '/editor';
            } else {
                alert('Не удалось загрузить проект');
            }
        } catch (error) {
            console.error('Ошибка открытия проекта:', error);
            alert('Ошибка при открытии проекта');
        }
    }

    async deleteProject(projectId, projectName) {
        if (!confirm(`Удалить проект "${projectName}"?`)) {
            return;
        }

        try {
            const response = await fetch(`/api/project/${projectId}`, {
                method: 'DELETE'
            });

            if (response.ok) {
                // Удаляем из локального списка
                this.projects = this.projects.filter(p => p.id !== projectId);
                this.filteredProjects = this.filteredProjects.filter(p => p.id !== projectId);

                this.renderProjects();
                this.updateStats();

                // Показываем уведомление
                this.showNotification(`Проект "${projectName}" удален`, 'success');
            } else {
                alert('Не удалось удалить проект');
            }
        } catch (error) {
            console.error('Ошибка удаления проекта:', error);
            alert('Ошибка при удалении проекта');
        }
    }

    showProjectInfo(project) {
        const modal = document.getElementById('project-info-modal');
        const modalTitle = document.getElementById('modal-project-title');
        const infoSize = document.getElementById('info-size');
        const infoCreated = document.getElementById('info-created');
        const infoModified = document.getElementById('info-modified');
        const infoLayers = document.getElementById('info-layers');
        const infoFilename = document.getElementById('info-filename');
        const infoFilesize = document.getElementById('info-filesize');

        // Заполняем информацию
        modalTitle.textContent = project.name;
        infoSize.textContent = `${project.width}×${project.height} ${project.unit}`;

        const createdDate = new Date(project.created);
        const modifiedDate = new Date(project.modified);

        infoCreated.textContent = createdDate.toLocaleString('ru-RU');
        infoModified.textContent = modifiedDate.toLocaleString('ru-RU');
        infoLayers.textContent = project.layers?.length || 0;
        infoFilename.textContent = `${project.id}.json`;
        infoFilesize.textContent = this.formatFileSize(project.fileSize || 0);

        // Обработчики кнопок
        document.getElementById('btn-open-project').onclick = () => {
            this.openProject(project.id);
        };

        document.getElementById('btn-duplicate-project').onclick = () => {
            this.duplicateProject(project.id);
        };

        document.getElementById('btn-export-project').onclick = () => {
            this.exportProject(project.id);
        };

        document.getElementById('btn-delete-project').onclick = () => {
            modal.style.display = 'none';
            this.deleteProject(project.id, project.name);
        };

        modal.style.display = 'block';
    }

    async duplicateProject(projectId) {
        try {
            const response = await fetch(`/api/project/${projectId}/duplicate`, {
                method: 'POST'
            });

            if (response.ok) {
                const newProject = await response.json();
                this.projects.push(newProject);
                this.filteredProjects.push(newProject);
                this.renderProjects();
                this.updateStats();

                this.showNotification('Проект успешно дублирован', 'success');
                document.getElementById('project-info-modal').style.display = 'none';
            }
        } catch (error) {
            console.error('Ошибка дублирования проекта:', error);
            alert('Ошибка при дублировании проекта');
        }
    }

    async exportProject(projectId) {
        try {
            const response = await fetch(`/api/project/${projectId}/export`);

            if (response.ok) {
                const blob = await response.blob();
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `project-${projectId}.vdraw`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                window.URL.revokeObjectURL(url);
            }
        } catch (error) {
            console.error('Ошибка экспорта проекта:', error);
            alert('Ошибка при экспорте проекта');
        }
    }

    showCreateProjectModal() {
        const modal = document.getElementById('create-project-modal');
        modal.style.display = 'block';

        // Сброс формы
        const form = document.getElementById('create-project-form');
        if (form) {
            form.reset();
            document.getElementById('project-width').value = 800;
            document.getElementById('project-height').value = 600;
        }
    }

    applyTemplate(template) {
        const templates = {
            'web-banner': { width: 728, height: 90, unit: 'px' },
            'social-media': { width: 1200, height: 630, unit: 'px' },
            'mobile-screen': { width: 375, height: 667, unit: 'px' },
            'desktop': { width: 1920, height: 1080, unit: 'px' },
            'print-a4': { width: 210, height: 297, unit: 'mm' },
            'print-card': { width: 85, height: 55, unit: 'mm' }
        };

        if (templates[template]) {
            const t = templates[template];
            document.getElementById('project-width').value = t.width;
            document.getElementById('project-height').value = t.height;
            document.getElementById('width-unit').value = t.unit;
            document.getElementById('height-unit').value = t.unit;
        }
    }

    async createNewProject() {
        const name = document.getElementById('project-name').value;
        const width = document.getElementById('project-width').value;
        const height = document.getElementById('project-height').value;
        const widthUnit = document.getElementById('width-unit').value;
        const heightUnit = document.getElementById('height-unit').value;
        const backgroundColor = document.getElementById('project-color').value;

        if (!name.trim()) {
            alert('Введите название проекта');
            return;
        }

        try {
            const response = await fetch('/api/project/create', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    name: name.trim(),
                    width: parseInt(width),
                    height: parseInt(height),
                    unit: widthUnit,
                    backgroundColor: backgroundColor
                })
            });

            if (response.ok) {
                const project = await response.json();

                // Сохраняем в localStorage для редактора
                localStorage.setItem('currentProject', JSON.stringify(project));

                // Закрываем модальное окно
                document.getElementById('create-project-modal').style.display = 'none';

                // Перенаправляем в редактор
                window.location.href = '/editor';
            } else {
                const error = await response.json();
                alert(`Ошибка создания проекта: ${error.error}`);
            }
        } catch (error) {
            console.error('Ошибка создания проекта:', error);
            alert('Ошибка при создании проекта');
        }
    }

    showImportModal() {
        document.getElementById('import-project-modal').style.display = 'block';
    }

    async importSVG() {
        const fileInput = document.getElementById('import-svg-file');
        const file = fileInput.files[0];

        if (!file) {
            alert('Выберите файл SVG для импорта');
            return;
        }

        if (!file.name.endsWith('.svg')) {
            alert('Выберите файл в формате SVG');
            return;
        }

        const formData = new FormData();
        formData.append('file', file);

        try {
            const response = await fetch('/api/svg/import', {
                method: 'POST',
                body: formData
            });

            if (response.ok) {
                const result = await response.json();

                // Создаем проект на основе импортированного SVG
                const projectResponse = await fetch('/api/project/create', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        name: `Импорт: ${file.name.replace('.svg', '')}`,
                        width: 800,
                        height: 600,
                        unit: 'px',
                        svg: result.svg,
                        layers: result.layers
                    })
                });

                if (projectResponse.ok) {
                    const project = await projectResponse.json();
                    localStorage.setItem('currentProject', JSON.stringify(project));
                    localStorage.setItem('importedSVG', JSON.stringify(result));

                    document.getElementById('import-project-modal').style.display = 'none';
                    window.location.href = '/editor';
                }
            } else {
                const error = await response.json();
                alert(`Ошибка импорта: ${error.error}`);
            }
        } catch (error) {
            console.error('Ошибка импорта SVG:', error);
            alert('Ошибка при импорте SVG файла');
        }
    }

    async importVdraw() {
        const fileInput = document.getElementById('import-vdraw-file');
        const file = fileInput.files[0];

        if (!file) {
            alert('Выберите файл проекта');
            return;
        }

        try {
            const text = await file.text();
            const projectData = JSON.parse(text);

            // Проверяем, что это валидный проект
            if (!projectData.id || !projectData.name) {
                alert('Неверный формат файла проекта');
                return;
            }

            // Загружаем проект
            const response = await fetch('/api/project/import', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: text
            });

            if (response.ok) {
                const project = await response.json();
                this.projects.push(project);
                this.filteredProjects.push(project);
                this.renderProjects();
                this.updateStats();

                this.showNotification('Проект успешно импортирован', 'success');
                document.getElementById('import-project-modal').style.display = 'none';
            }
        } catch (error) {
            console.error('Ошибка импорта проекта:', error);
            alert('Ошибка при импорте проекта');
        }
    }

    async traceImage() {
        const fileInput = document.getElementById('import-image-file');
        const file = fileInput.files[0];

        if (!file) {
            alert('Выберите изображение для трассировки');
            return;
        }

        const formData = new FormData();
        formData.append('file', file);
        formData.append('threshold', '128');

        try {
            const response = await fetch('/api/image/trace', {
                method: 'POST',
                body: formData
            });

            if (response.ok) {
                const result = await response.json();

                // Создаем проект на основе трассированного изображения
                const projectResponse = await fetch('/api/project/create', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        name: `Трассировка: ${file.name}`,
                        width: 800,
                        height: 600,
                        unit: 'px',
                        svg: result.svg
                    })
                });

                if (projectResponse.ok) {
                    const project = await projectResponse.json();
                    localStorage.setItem('currentProject', JSON.stringify(project));

                    document.getElementById('import-project-modal').style.display = 'none';
                    window.location.href = '/editor';
                }
            } else {
                const error = await response.json();
                alert(`Ошибка трассировки: ${error.error}`);
            }
        } catch (error) {
            console.error('Ошибка трассировки:', error);
            alert('Ошибка при трассировке изображения');
        }
    }

    updateStats() {
        const totalProjects = document.getElementById('total-projects');
        const recentProjects = document.getElementById('recent-projects');
        const totalSize = document.getElementById('total-size');

        if (totalProjects) {
            totalProjects.textContent = this.projects.length;
        }

        if (recentProjects) {
            const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
            const recentCount = this.projects.filter(project => {
                const modified = new Date(project.modified);
                return modified > weekAgo;
            }).length;
            recentProjects.textContent = recentCount;
        }

        if (totalSize) {
            const totalFileSize = this.projects.reduce((sum, project) => {
                return sum + (project.fileSize || 0);
            }, 0);
            totalSize.textContent = this.formatFileSize(totalFileSize);
        }
    }

    formatFileSize(bytes) {
        if (bytes === 0) return '0 B';

        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));

        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    showNotification(message, type = 'info') {
        // Создаем уведомление
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.innerHTML = `
            <i class="fas fa-${type === 'success' ? 'check-circle' : 'info-circle'}"></i>
            <span>${message}</span>
        `;

        // Добавляем стили
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: ${type === 'success' ? '#d4edda' : '#d1ecf1'};
            color: ${type === 'success' ? '#155724' : '#0c5460'};
            padding: 15px 25px;
            border-radius: 10px;
            box-shadow: 0 5px 15px rgba(0,0,0,0.1);
            display: flex;
            align-items: center;
            gap: 10px;
            z-index: 10000;
            animation: slideInRight 0.3s ease;
        `;

        document.body.appendChild(notification);

        // Удаляем через 3 секунды
        setTimeout(() => {
            notification.style.animation = 'slideOutRight 0.3s ease';
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 300);
        }, 3000);
    }
}

// Инициализация при загрузке страницы
let projectsManager;

document.addEventListener('DOMContentLoaded', () => {
    projectsManager = new ProjectsManager();
    window.projectsManager = projectsManager;
});