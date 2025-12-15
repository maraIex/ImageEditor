from flask import Blueprint, request, jsonify, send_file
from io import BytesIO
import base64
from ..services.svg_service import SVGService
from ..services.export_service import ExportService
from ..services.import_service import ImportService
from ..utils.validation_utils import validate_filename, ALLOWED_SVG_EXTENSIONS

bp = Blueprint('import_export', __name__, url_prefix='/api')


@bp.route('/import_svg', methods=['POST'])
def import_svg():
    #Импорт SVG файла.
    if 'file' not in request.files:
        return jsonify({'success': False, 'error': 'No file provided'}), 400

    file = request.files['file']

    if file.filename == '':
        return jsonify({'success': False, 'error': 'No file selected'}), 400

    # Валидация файла
    is_valid, error_msg = validate_filename(file.filename, ALLOWED_SVG_EXTENSIONS)
    if not is_valid:
        return jsonify({'success': False, 'error': error_msg}), 400

    try:
        svg_content = file.read().decode('utf-8')
        cleaned_svg, warnings = SVGService.import_svg(svg_content)

        return jsonify({
            'success': True,
            'svg': cleaned_svg,
            'warnings': warnings,
            'filename': file.filename
        })
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500


@bp.route('/export', methods=['POST'])
def export():
    #Экспорт в различные форматы.
    try:
        data = request.json
        svg_content = data.get('svg', '')
        export_format = data.get('format', 'svg')
        quality = data.get('quality', 90)
        width = data.get('width')
        height = data.get('height')
        filename = data.get('filename', 'export')

        if not svg_content:
            return jsonify({'success': False, 'error': 'No SVG content provided'}), 400

        if export_format.lower() == 'svg':
            # Возвращаем чистый SVG
            output = BytesIO()
            output.write(svg_content.encode('utf-8'))
            output.seek(0)

            return send_file(
                output,
                mimetype='image/svg+xml',
                as_attachment=True,
                download_name=f'{filename}.svg'
            )

        # Экспорт в другие форматы
        output = ExportService.export_to_format(
            svg_content, export_format, width, height, quality
        )

        mimetypes = {
            'png': 'image/png',
            'jpg': 'image/jpeg',
            'jpeg': 'image/jpeg',
            'webp': 'image/webp',
            'pdf': 'application/pdf'
        }

        mimetype = mimetypes.get(export_format.lower(), 'application/octet-stream')

        return send_file(
            output,
            mimetype=mimetype,
            as_attachment=True,
            download_name=f'{filename}.{export_format.lower()}'
        )

    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500


@bp.route('/export/info', methods=['GET'])
def export_info():
    #Получение информации о доступных форматах экспорта.
    try:
        formats = ['svg', 'png', 'jpg', 'webp', 'pdf']
        info = {}

        for fmt in formats:
            info[fmt] = ExportService.get_format_info(fmt)

        return jsonify({
            'success': True,
            'formats': info
        })
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500