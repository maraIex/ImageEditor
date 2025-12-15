// static/js/main.js
document.addEventListener('DOMContentLoaded', function() {
    // Элементы модального окна
    const importBtn = document.getElementById('import-btn');
    const importModal = document.getElementById('import-modal');
    const closeBtn = document.querySelector('.close');
    const importForm = document.getElementById('import-form');
    const svgFileInput = document.getElementById('svg-file');

    // Открытие модального окна
    if (importBtn) {
        importBtn.addEventListener('click', function() {
            importModal.style.display = 'block';
        });
    }

    // Закрытие модального окна
    if (closeBtn) {
        closeBtn.addEventListener('click', function() {
            importModal.style.display = 'none';
        });
    }

    // Закрытие по клику вне окна
    window.addEventListener('click', function(event) {
        if (event.target === importModal) {
            importModal.style.display = 'none';
        }
    });

    // Обработка импорта SVG
    if (importForm) {
        importForm.addEventListener('submit', async function(e) {
            e.preventDefault();

            const file = svgFileInput.files[0];
            if (!file) {
                alert('Пожалуйста, выберите файл');
                return;
            }

            const formData = new FormData();
            formData.append('file', file);

            try {
                const response = await fetch('/api/svg/import', {
                    method: 'POST',
                    body: formData
                });

                const result = await response.json();

                if (response.ok) {
                    alert('Файл успешно импортирован!');
                    // Редирект в редактор с данными
                    localStorage.setItem('importedSVG', JSON.stringify(result));
                    window.location.href = '/editor?imported=true';
                } else {
                    alert('Ошибка: ' + result.error);
                }
            } catch (error) {
                alert('Ошибка загрузки файла: ' + error.message);
            }

            importModal.style.display = 'none';
            importForm.reset();
        });
    }

    // Создание нового проекта
    const newProjectBtn = document.querySelector('a[href="/editor"]');
    if (newProjectBtn) {
        newProjectBtn.addEventListener('click', async function(e) {
            e.preventDefault();

            try {
                const response = await fetch('/api/project/create', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        name: 'Новый проект',
                        width: 800,
                        height: 600,
                        unit: 'px'
                    })
                });

                const project = await response.json();
                if (response.ok) {
                    localStorage.setItem('currentProject', JSON.stringify(project));
                    window.location.href = '/editor';
                }
            } catch (error) {
                console.error('Ошибка создания проекта:', error);
            }
        });
    }
});