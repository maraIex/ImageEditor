from flask import Blueprint, request, jsonify
import base64
from ..services.import_service import ImportService
from ..utils.validation_utils import validate_filename, ALLOWED_IMAGE_EXTENSIONS

bp = Blueprint('images', __name__, url_prefix='/api/images')


@bp.route('/upload', methods=['POST'])
def upload_image():
    #Загрузка растрового изображения.
    if 'file' not in request.files:
        return jsonify({'success': False, 'error': 'No file provided'}), 400

    file = request.files['file']

    if file.filename == '':
        return jsonify({'success': False, 'error': 'No file selected'}), 400

    # Валидация файла
    is_valid, error_msg = validate_filename(file.filename, ALLOWED_IMAGE_EXTENSIONS)
    if not is_valid:
        return jsonify({'success': False, 'error': error_msg}), 400

    try:
        file_content = file.read()
        svg_content, info = ImportService.process_uploaded_image(
            file_content, file.filename, trace=False
        )

        return jsonify({
            'success': True,
            'svg': svg_content,
            'info': info,
            'filename': file.filename
        })
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500


@bp.route('/trace', methods=['POST'])
def trace_image():
    #Трассировка изображения в вектор.
    if 'file' not in request.files:
        return jsonify({'success': False, 'error': 'No file provided'}), 400

    file = request.files['file']

    if file.filename == '':
        return jsonify({'success': False, 'error': 'No file selected'}), 400

    # Валидация файла
    is_valid, error_msg = validate_filename(file.filename, ALLOWED_IMAGE_EXTENSIONS)
    if not is_valid:
        return jsonify({'success': False, 'error': error_msg}), 400

    try:
        threshold = request.form.get('threshold', 128, type=int)
        file_content = file.read()

        svg_content, info = ImportService.process_uploaded_image(
            file_content, file.filename, trace=True, threshold=threshold
        )

        return jsonify({
            'success': True,
            'svg': svg_content,
            'info': info,
            'filename': file.filename
        })
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500


@bp.route('/to_base64', methods=['POST'])
def convert_to_base64():
    #Конвертация изображения в base64.
    if 'file' not in request.files:
        return jsonify({'success': False, 'error': 'No file provided'}), 400

    file = request.files['file']

    if file.filename == '':
        return jsonify({'success': False, 'error': 'No file selected'}), 400

    try:
        file_content = file.read()
        base64_data = base64.b64encode(file_content).decode('utf-8')
        mime_type = file.mimetype

        if mime_type == 'image/jpg':
            mime_type = 'image/jpeg'

        svg_image = f'''
        <image href="data:{mime_type};base64,{base64_data}"
               width="100%" height="100%"
               preserveAspectRatio="xMidYMid meet"/>
        '''

        return jsonify({
            'success': True,
            'svg': svg_image,
            'filename': file.filename,
            'mime_type': mime_type,
            'size': len(file_content)
        })
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500