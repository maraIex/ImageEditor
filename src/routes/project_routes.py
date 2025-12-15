from flask import Blueprint, request, jsonify, send_from_directory, current_app
import os
import uuid
from datetime import datetime
from ..models.project_model import Project, CanvasSettings, Layer
from ..utils.file_utils import save_project_file, load_project_file
from ..utils.svg_utils import extract_svg_layers
from ..utils.validation_utils import validate_filename, ALLOWED_PROJECT_EXTENSIONS, sanitize_filename

bp = Blueprint('projects', __name__, url_prefix='/api/projects')


@bp.route('/save', methods=['POST'])
def save_project():
    #Сохранение проекта в формате .vdraw.
    try:
        data = request.json
        svg_content = data.get('svg', '')
        project_data = data.get('project_data', {})

        # Создаем модель проекта
        project_name = project_data.get('name', 'Безымянный проект')
        project_id = project_data.get('id', str(uuid.uuid4()))

        layers_data = extract_svg_layers(svg_content) or []
        layers = []
        for ld in layers_data:
            # ожидаемые ключи: id, name, elements, visible, locked
            lid = ld.get('id') or str(uuid.uuid4())
            lname = ld.get('name') or ld.get('data-name') or f'Layer_{lid}'
            lelements = ld.get('elements') or ld.get('children') or []
            lvisible = ld.get('visible', True)
            llocked = ld.get('locked', False)

            try:
                layer = Layer(id=lid, name=lname, elements=lelements, visible=lvisible, locked=llocked)
            except TypeError:
                # если конструктор Layer другой, попытаемся создать через kwargs безопасно
                try:
                    layer = Layer(**{k: v for k, v in
                                     {'id': lid, 'name': lname, 'elements': lelements, 'visible': lvisible,
                                      'locked': llocked}.items() if k in Layer.__init__.__code__.co_varnames})
                except Exception:
                    # fallback: минимальный объект
                    layer = Layer(id=lid, name=lname)
            layers.append(layer)

        # Настройки холста
        canvas_data = project_data.get('canvas', {})
        canvas = CanvasSettings(**canvas_data)

        # Создаем проект
        project = Project(
            id=project_id,
            name=project_name,
            svg_content=svg_content,
            layers=layers,
            canvas=canvas
        )

        # Сохраняем файл
        filename = save_project_file(project, current_app.config['PROJECTS_FOLDER'])

        return jsonify({
            'success': True,
            'project_id': project_id,
            'filename': filename,
            'project_name': project_name,
            'download_url': f'/api/projects/download/{filename}',
            'created_at': project.created_at,
            'updated_at': project.updated_at
        })
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500


@bp.route('/load/<filename>', methods=['GET'])
def load_project(filename):
    #Загрузка проекта из .vdraw файла.
    try:
        # Валидация имени файла
        is_valid, error_msg = validate_filename(filename, ALLOWED_PROJECT_EXTENSIONS)
        if not is_valid:
            return jsonify({'success': False, 'error': error_msg}), 400

        project = load_project_file(filename, current_app.config['PROJECTS_FOLDER'])

        if not project:
            return jsonify({'success': False, 'error': 'Project not found'}), 404

        return jsonify({
            'success': True,
            'project': project.to_dict()
        })
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500


@bp.route('/download/<filename>', methods=['GET'])
def download_project(filename):
    #Скачивание проекта.
    try:
        is_valid, error_msg = validate_filename(filename, ALLOWED_PROJECT_EXTENSIONS)
        if not is_valid:
            return jsonify({'success': False, 'error': error_msg}), 400

        return send_from_directory(
            current_app.config['PROJECTS_FOLDER'],
            filename,
            as_attachment=True
        )
    except FileNotFoundError:
        return jsonify({'success': False, 'error': 'File not found'}), 404
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500


@bp.route('/list', methods=['GET'])
def list_projects():
   # Получение списка сохраненных проектов.
    try:
        projects_folder = current_app.config['PROJECTS_FOLDER']
        projects = []

        for filename in os.listdir(projects_folder):
            if filename.endswith('.vdraw'):
                project_path = os.path.join(projects_folder, filename)
                project = load_project_file(filename, projects_folder)

                if project:
                    project_info = project.to_dict()
                    project_info['filename'] = filename
                    project_info['file_size'] = os.path.getsize(project_path)

                    projects.append(project_info)

        return jsonify({
            'success': True,
            'projects': projects,
            'count': len(projects)
        })
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500


@bp.route('/delete/<filename>', methods=['DELETE'])
def delete_project(filename):
    #Удаление проекта.
    try:
        is_valid, error_msg = validate_filename(filename, ALLOWED_PROJECT_EXTENSIONS)
        if not is_valid:
            return jsonify({'success': False, 'error': error_msg}), 400

        filepath = os.path.join(current_app.config['PROJECTS_FOLDER'], filename)

        if not os.path.exists(filepath):
            return jsonify({'success': False, 'error': 'Project not found'}), 404

        os.remove(filepath)

        return jsonify({
            'success': True,
            'message': f'Project {filename} deleted successfully'
        })
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500