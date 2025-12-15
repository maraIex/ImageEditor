import base64
import datetime
import glob
import json
import uuid

import svgwrite
from flask import Blueprint, request, jsonify, send_file
import os
from src.models.project import Project
from src.services.svg_service import SVGService
from src.utils.svg_utils import SVGUtils
import tempfile

from src.services.animation_service import AnimationService
from src.services.text_service import TextService

api_bp = Blueprint('api', __name__)


# Проекты
@api_bp.route('/project/create', methods=['POST'])
def create_project():
    data = request.json
    project = Project(
        name=data.get('name', 'Новый проект'),
        width=data.get('width', 800),
        height=data.get('height', 600),
        unit=data.get('unit', 'px')
    )
    project.save()
    return jsonify(project.to_dict())

@api_bp.route('/project/<project_id>/save', methods=['POST'])
def save_project(project_id):
    data = request.json
    filename = f"projects/{project_id}.json"

    if os.path.exists(filename):
        project = Project.load(filename)
        project.layers = data.get('layers', [])
        project.history = data.get('history', [])
        project.modified = datetime.now().isoformat()
        project.save()
        return jsonify({'status': 'success'})

    return jsonify({'error': 'Проект не найден'}), 404


# SVG операции
@api_bp.route('/svg/create', methods=['POST'])
def create_svg():
    data = request.json
    width = data.get('width', 800)
    height = data.get('height', 600)
    unit = data.get('unit', 'px')

    dwg = SVGService.create_canvas(width, height, unit)
    svg_string = dwg.tostring()

    return jsonify({
        'svg': svg_string,
        'width': width,
        'height': height
    })


@api_bp.route('/svg/add-element', methods=['POST'])
def add_element():
    data = request.json
    svg_content = data.get('svg', '')
    element_type = data.get('type')
    params = data.get('params', {})

    # Здесь будет логика добавления элемента к существующему SVG
    # Это упрощенный пример
    dwg = svgwrite.Drawing()
    # Нужно парсить существующий SVG и добавлять элементы

    return jsonify({'svg': svg_content + '<!-- элемент добавлен -->'})


@api_bp.route('/svg/import', methods=['POST'])
def import_svg():
    if 'file' not in request.files:
        return jsonify({'error': 'Файл не загружен'}), 400

    file = request.files['file']
    if file.filename == '':
        return jsonify({'error': 'Файл не выбран'}), 400

    if file and file.filename.endswith('.svg'):
        temp_path = os.path.join('uploads', file.filename)
        file.save(temp_path)

        try:
            svg_content = SVGService.import_svg(temp_path)
            layers = SVGUtils.extract_layers(svg_content)

            return jsonify({
                'svg': svg_content,
                'layers': layers,
                'filename': file.filename
            })
        except Exception as e:
            return jsonify({'error': str(e)}), 500
        finally:
            if os.path.exists(temp_path):
                os.remove(temp_path)

    return jsonify({'error': 'Неверный формат файла'}), 400


@api_bp.route('/svg/export', methods=['POST'])
def export_svg():
    data = request.json
    svg_content = data.get('svg', '')
    format = data.get('format', 'svg')
    filename = data.get('filename', 'export')

    if format == 'svg':
        temp_file = tempfile.NamedTemporaryFile(delete=False, suffix='.svg', mode='w')
        temp_file.write(svg_content)
        temp_file.close()

        return send_file(temp_file.name, as_attachment=True, download_name=f'{filename}.svg')

    # Для PNG нужно добавить конвертацию через Cairo
    return jsonify({'error': 'Формат не поддерживается'}), 400


@api_bp.route('/gradient/linear', methods=['POST'])
def create_linear_gradient():
    try:
        data = request.json
        svg_content = data.get('svg', '')
        grad_id = data.get('id', f'gradient-{datetime.now().timestamp()}')
        start = data.get('start', [0, 0])
        end = data.get('end', [100, 100])
        stops = data.get('stops', [[0, '#FF0000'], [0.5, '#00FF00'], [1, '#0000FF']])

        # Создаем градиент
        dwg = svgwrite.Drawing()
        grad = dwg.defs.add(dwg.linearGradient(
            id=grad_id,
            x1=f'{start[0]}%',
            y1=f'{start[1]}%',
            x2=f'{end[0]}%',
            y2=f'{end[1]}%'
        ))

        for offset, color in stops:
            grad.add_stop_color(offset=offset, color=color)

        return jsonify({
            'status': 'gradient_created',
            'gradient_id': grad_id,
            'gradient_xml': grad.tostring()
        })

    except Exception as e:
        return jsonify({'error': str(e)}), 50


# Фильтры
@api_bp.route('/filter/add', methods=['POST'])
def add_filter():
    try:
        data = request.json
        filter_type = data.get('type')
        params = data.get('params', {})

        # Создаем фильтр SVG
        dwg = svgwrite.Drawing(size=('200px', '200px'))

        # Создаем фильтр в defs
        if filter_type == 'blur':
            filt = dwg.defs.add(dwg.filter(id='blurFilter', x='-50%', y='-50%', width='200%', height='200%'))
            filt.feGaussianBlur(in_='SourceGraphic', stdDeviation=params.get('std_dev', 2))
            filter_xml = filt.tostring()
        elif filter_type == 'shadow':
            filt = dwg.defs.add(dwg.filter(id='shadowFilter', x='-50%', y='-50%', width='200%', height='200%'))
            filt.feOffset(dx=params.get('dx', 2), dy=params.get('dy', 2), result='offset')
            filt.feGaussianBlur(in_='offset', stdDeviation=params.get('blur', 3), result='blur')
            filt.feFlood(flood_color=params.get('color', 'black'), result='flood')
            filt.feComposite(in_='flood', in2='blur', operator='in', result='comp')
            filt.feMerge([filt.feMergeNode(in_='comp'), filt.feMergeNode(in_='SourceGraphic')])
            filter_xml = filt.tostring()
        elif filter_type == 'glow':
            filt = dwg.defs.add(dwg.filter(id='glowFilter', x='-50%', y='-50%', width='200%', height='200%'))
            filt.feFlood(flood_color=params.get('color', '#00ff00'), result='flood')
            filt.feComposite(in_='flood', in2='SourceGraphic', operator='in', result='comp')
            filt.feGaussianBlur(in_='comp', stdDeviation=params.get('blur', 10), result='blur')
            filt.feMerge([filt.feMergeNode(in_='blur'), filt.feMergeNode(in_='SourceGraphic')])
            filter_xml = filt.tostring()
        elif filter_type == 'invert':
            filt = dwg.defs.add(dwg.filter(id='invertFilter'))
            filt.feColorMatrix(type='matrix', values='-1 0 0 0 1 0 -1 0 0 1 0 0 -1 0 1 0 0 0 1 0')
            filter_xml = filt.tostring()
        else:
            return jsonify({'error': f'Неизвестный тип фильтра: {filter_type}'}), 400

        return jsonify({
            'filter': filter_xml,
            'filter_type': filter_type,
            'filter_id': f'{filter_type}Filter_{datetime.now().timestamp()}'
        })

    except Exception as e:
        return jsonify({'error': str(e)}), 500


# Утилиты
@api_bp.route('/utils/convert-base64', methods=['POST'])
def convert_to_base64():
    data = request.json
    svg_content = data.get('svg', '')
    base64_data = SVGUtils.convert_to_base64(svg_content)
    return jsonify({'base64': base64_data})


# Анимации
@api_bp.route('/animation/smil', methods=['POST'])
def create_smil_animation():
    try:
        data = request.json
        element_id = data.get('element_id')
        animation_type = data.get('type')
        params = data.get('params', {})

        # Создаем простую анимацию
        dwg = svgwrite.Drawing(size=('200px', '200px'))

        if not element_id:
            element_id = 'animated-element'
            # Добавляем круг для демонстрации
            circle = dwg.circle(center=(100, 100), r=50, fill='red', id=element_id)
            dwg.add(circle)

        # Создаем анимацию в зависимости от типа
        if animation_type == 'opacity':
            anim = dwg.animate(
                attributeName='opacity',
                values=params.get('values', '1;0.5;1'),
                dur=params.get('duration', '2s'),
                repeatCount='indefinite',
                id=f'anim-{element_id}'
            )
        elif animation_type == 'move':
            anim = dwg.animateTransform(
                attributeName='transform',
                type='translate',
                values=params.get('values', '0,0;100,0;0,0'),
                dur=params.get('duration', '3s'),
                repeatCount='indefinite',
                id=f'anim-{element_id}'
            )
        elif animation_type == 'rotate':
            anim = dwg.animateTransform(
                attributeName='transform',
                type='rotate',
                values=params.get('values', '0 100 100;360 100 100'),
                dur=params.get('duration', '5s'),
                repeatCount='indefinite',
                id=f'anim-{element_id}'
            )
        elif animation_type == 'scale':
            anim = dwg.animateTransform(
                attributeName='transform',
                type='scale',
                values=params.get('values', '1;1.5;1'),
                dur=params.get('duration', '2s'),
                repeatCount='indefinite',
                id=f'anim-{element_id}'
            )
        else:
            return jsonify({'error': f'Неизвестный тип анимации: {animation_type}'}), 400

        # В реальном случае нужно добавить анимацию к элементу
        # Но для простоты возвращаем SVG с анимацией отдельно
        anim_svg = f'<g id="animation-{element_id}">{anim.tostring()}</g>'

        return jsonify({
            'animation': anim_svg,
            'animation_type': animation_type,
            'element_id': element_id
        })

    except Exception as e:
        return jsonify({'error': str(e)}), 500


# Текст по пути
@api_bp.route('/text/path', methods=['POST'])
def create_text_on_path():
    data = request.json
    text = data.get('text', 'Текст')
    path_data = data.get('path', 'M 50,100 C 75,50 125,150 150,100')

    dwg = SVGService.create_canvas(200, 200)

    # Создаем путь
    path = dwg.path(d=path_data, fill='none', stroke='none', id='text-path')
    dwg.defs.add(path)

    # Создаем текст по пути
    text_element = TextService.create_text_on_path(
        dwg, text, 'text-path',
        fill='black',
        font_size='16'
    )
    dwg.add(text_element)

    return jsonify({'svg': dwg.tostring()})


# Круговой текст
@api_bp.route('/text/circular', methods=['POST'])
def create_circular_text():
    data = request.json
    text = data.get('text', 'Круговой текст')
    center_x = data.get('center_x', 100)
    center_y = data.get('center_y', 100)
    radius = data.get('radius', 80)

    dwg = SVGService.create_canvas(200, 200)

    text_element = TextService.create_circular_text(
        dwg, text, center_x, center_y, radius,
        fill='black',
        font_size='16'
    )
    dwg.add(text_element)

    return jsonify({'svg': dwg.tostring()})


# Трансформации
@api_bp.route('/transform/apply', methods=['POST'])
def apply_transform():
    data = request.json
    svg_content = data.get('svg', '')
    element_id = data.get('element_id')
    transform_type = data.get('type')
    params = data.get('params', [])

    # Здесь должен быть парсинг SVG, поиск элемента и применение трансформации
    # Это упрощенный пример

    return jsonify({
        'status': 'transformed',
        'transform': f'{transform_type}({",".join(map(str, params))})'
    })


# Выравнивание
@api_bp.route('/align/elements', methods=['POST'])
def align_elements():
    data = request.json
    element_ids = data.get('element_ids', [])
    alignment = data.get('alignment', 'left')  # left, right, top, bottom, center_horizontal, center_vertical

    # Здесь должна быть логика выравнивания элементов
    # Используйте SVGTransform.align_elements()

    return jsonify({
        'status': 'aligned',
        'alignment': alignment,
        'elements_count': len(element_ids)
    })


# Трассировка изображений (заглушка)
@api_bp.route('/image/trace', methods=['POST'])
def trace_image():
    if 'file' not in request.files:
        return jsonify({'error': 'Файл не загружен'}), 400

    file = request.files['file']
    threshold = request.form.get('threshold', 128, type=int)

    if file:
        # Сохраняем временный файл
        import tempfile
        import os

        with tempfile.NamedTemporaryFile(delete=False, suffix='.png') as tmp:
            file.save(tmp.name)

            try:
                dwg = SVGService.create_canvas(200, 200)
                SVGService.add_rectangle(dwg, 50, 50, 100, 100, fill='#ccc', stroke='#333')

                return jsonify({
                    'svg': dwg.tostring(),
                    'threshold': threshold,
                    'original_filename': file.filename
                })

            finally:
                os.unlink(tmp.name)

    return jsonify({'error': 'Ошибка обработки изображения'}), 500


# Экспорт в растровые форматы (заглушка)
@api_bp.route('/export/raster', methods=['POST'])
def export_raster():
    data = request.json
    svg_content = data.get('svg', '')
    format = data.get('format', 'png')  # png, jpeg, webp
    width = data.get('width', 800)
    height = data.get('height', 600)
    try:
        from PIL import Image, ImageDraw
        import io

        img = Image.new('RGB', (width, height), color='white')
        draw = ImageDraw.Draw(img)
        draw.rectangle([50, 50, width - 50, height - 50], fill='lightblue', outline='darkblue')

        buffer = io.BytesIO()
        if format == 'jpeg':
            img.save(buffer, format='JPEG', quality=95)
            mime_type = 'image/jpeg'
        elif format == 'webp':
            img.save(buffer, format='WEBP', quality=95)
            mime_type = 'image/webp'
        else:
            img.save(buffer, format='PNG')
            mime_type = 'image/png'

        buffer.seek(0)
        img_base64 = base64.b64encode(buffer.read()).decode('utf-8')

        return jsonify({
            'image': f'data:{mime_type};base64,{img_base64}',
            'format': format,
            'width': width,
            'height': height
        })

    except ImportError:
        return jsonify({
            'error': 'Библиотека PIL/Pillow не установлена для экспорта растра',
            'svg': svg_content  # Возвращаем оригинальный SVG как запасной вариант
        }), 500


@api_bp.route('/projects/list', methods=['GET'])
def list_projects():
    """Получение списка всех проектов"""
    projects = []
    project_files = glob.glob('projects/*.json')

    for filepath in project_files:
        try:
            with open(filepath, 'r', encoding='utf-8') as f:
                project_data = json.load(f)

                # Добавляем информацию о размере файла
                file_size = os.path.getsize(filepath)
                project_data['fileSize'] = file_size

                projects.append(project_data)
        except Exception as e:
            print(f"Ошибка загрузки проекта {filepath}: {e}")

    # Сортируем по дате изменения (сначала новые)
    projects.sort(key=lambda x: x.get('modified', ''), reverse=True)

    return jsonify({
        'projects': projects,
        'total': len(projects)
    })


@api_bp.route('/project/<project_id>', methods=['GET'])
def get_project(project_id):
    """Получение проекта по ID"""
    filename = f"projects/{project_id}.json"
    if os.path.exists(filename):
        try:
            project = Project.load(filename)
            return jsonify(project.to_dict())
        except Exception as e:
            return jsonify({'error': f'Ошибка загрузки проекта: {str(e)}'}), 500
    return jsonify({'error': 'Проект не найден'}), 404


@api_bp.route('/project/<project_id>', methods=['DELETE'])
def delete_project(project_id):
    """Удаление проекта"""
    filename = f"projects/{project_id}.json"

    if os.path.exists(filename):
        try:
            os.remove(filename)
            return jsonify({'status': 'success', 'message': 'Проект удален'})
        except Exception as e:
            return jsonify({'error': f'Ошибка удаления проекта: {str(e)}'}), 500

    return jsonify({'error': 'Проект не найден'}), 404


@api_bp.route('/project/<project_id>/favorite', methods=['POST'])
def toggle_favorite(project_id):
    """Добавление/удаление из избранного"""
    filename = f"projects/{project_id}.json"

    if os.path.exists(filename):
        try:
            with open(filename, 'r', encoding='utf-8') as f:
                project_data = json.load(f)

            # Переключаем избранное
            project_data['favorite'] = not project_data.get('favorite', False)
            project_data['modified'] = datetime.now().isoformat()

            with open(filename, 'w', encoding='utf-8') as f:
                json.dump(project_data, f, ensure_ascii=False, indent=2)

            return jsonify({
                'status': 'success',
                'favorite': project_data['favorite']
            })
        except Exception as e:
            return jsonify({'error': f'Ошибка обновления проекта: {str(e)}'}), 500

    return jsonify({'error': 'Проект не найден'}), 404


@api_bp.route('/project/<project_id>/duplicate', methods=['POST'])
def duplicate_project(project_id):
    """Дублирование проекта"""
    source_file = f"projects/{project_id}.json"

    if not os.path.exists(source_file):
        return jsonify({'error': 'Проект не найден'}), 404

    try:
        # Загружаем исходный проект
        with open(source_file, 'r', encoding='utf-8') as f:
            source_data = json.load(f)

        # Создаем новый проект на основе исходного
        new_project = Project(
            name=f"{source_data.get('name', 'Проект')} (копия)",
            width=source_data.get('width', 800),
            height=source_data.get('height', 600),
            unit=source_data.get('unit', 'px')
        )

        # Копируем слои и другие данные
        new_project.layers = source_data.get('layers', [])

        # Сохраняем
        new_project.save()

        return jsonify(new_project.to_dict())
    except Exception as e:
        return jsonify({'error': f'Ошибка дублирования проекта: {str(e)}'}), 500


@api_bp.route('/project/<project_id>/export', methods=['GET'])
def export_project(project_id, os=None):
    """Экспорт проекта в файл .vdraw"""
    filename = f"projects/{project_id}.json"

    if os.path.exists(filename):
        try:
            # Загружаем проект
            with open(filename, 'r', encoding='utf-8') as f:
                project_data = json.load(f)

            # Создаем временный файл
            import tempfile
            temp_file = tempfile.NamedTemporaryFile(delete=False, suffix='.vdraw', mode='w')
            json.dump(project_data, temp_file, ensure_ascii=False, indent=2)
            temp_file.close()

            return send_file(
                temp_file.name,
                as_attachment=True,
                download_name=f"{project_data.get('name', 'project')}.vdraw"
            )
        except Exception as e:
            return jsonify({'error': f'Ошибка экспорта проекта: {str(e)}'}), 500
        finally:
            # Удаляем временный файл после отправки
            import atexit
            import os
            atexit.register(lambda: os.unlink(temp_file.name) if os.path.exists(temp_file.name) else None)

    return jsonify({'error': 'Проект не найден'}), 404


@api_bp.route('/project/import', methods=['POST'])
def import_project():
    """Импорт проекта из файла .vdraw"""
    try:
        data = request.json
        if not data:
            return jsonify({'error': 'Данные проекта отсутствуют'}), 400

        # Проверяем обязательные поля
        if 'id' not in data:
            data['id'] = str(uuid.uuid4())

        if 'name' not in data:
            data['name'] = 'Импортированный проект'

        # Обновляем даты
        now = datetime.now().isoformat()
        data['modified'] = now
        if 'created' not in data:
            data['created'] = now

        # Сохраняем проект
        filename = f"projects/{data['id']}.json"
        with open(filename, 'w', encoding='utf-8') as f:
            json.dump(data, f, ensure_ascii=False, indent=2)

        return jsonify(data)
    except Exception as e:
        return jsonify({'error': f'Ошибка импорта проекта: {str(e)}'}), 500


@api_bp.route('/project/stats', methods=['GET'])
def get_project_stats():
    """Получение статистики по проектам"""
    project_files = glob.glob('projects/*.json')

    total_size = 0
    recent_count = 0
    week_ago = datetime.now().timestamp() - 7 * 24 * 60 * 60

    for filepath in project_files:
        try:
            # Размер файла
            total_size += os.path.getsize(filepath)

            # Последние изменения
            mtime = os.path.getmtime(filepath)
            if mtime > week_ago:
                recent_count += 1
        except:
            pass

    return jsonify({
        'total_projects': len(project_files),
        'recent_projects': recent_count,
        'total_size_bytes': total_size,
        'total_size_mb': round(total_size / (1024 * 1024), 2)
    })