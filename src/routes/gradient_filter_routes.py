from flask import Blueprint, request, jsonify
from ..services.gradient_service import GradientService
from ..services.filter_service import FilterService

bp = Blueprint('gradient_filter', __name__, url_prefix='/api')


@bp.route('/gradient/create', methods=['POST'])
def create_gradient():
    #Создание градиента.
    try:
        data = request.json
        gradient_type = data.get('type', 'linear')
        colors = data.get('colors', [])
        gradient_id = data.get('id')

        if gradient_type == 'linear':
            x1 = data.get('x1', 0)
            y1 = data.get('y1', 0)
            x2 = data.get('x2', 1)
            y2 = data.get('y2', 0)

            gradient_svg, gradient_id = GradientService.create_linear_gradient(
                colors, x1, y1, x2, y2, gradient_id
            )
        else:  # radial
            cx = data.get('cx', 0.5)
            cy = data.get('cy', 0.5)
            r = data.get('r', 0.5)
            fx = data.get('fx', cx)
            fy = data.get('fy', cy)

            gradient_svg, gradient_id = GradientService.create_radial_gradient(
                colors, cx, cy, r, fx, fy, gradient_id
            )

        return jsonify({
            'success': True,
            'gradient': gradient_svg,
            'id': gradient_id,
            'type': gradient_type
        })
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500


@bp.route('/gradient/analyze', methods=['POST'])
def analyze_gradient():
    #Анализ строки градиента.
    try:
        data = request.json
        gradient_svg = data.get('gradient', '')

        if not gradient_svg:
            return jsonify({'success': False, 'error': 'No gradient provided'}), 400

        info = GradientService.parse_gradient_string(gradient_svg)

        return jsonify({
            'success': True,
            'info': info
        })
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500


@bp.route('/filter/create', methods=['POST'])
def create_filter():
    #Создание фильтра.
    try:
        data = request.json
        filter_type = data.get('type', 'blur')
        params = data.get('params', {})
        filter_id = data.get('id')

        filter_svg, filter_id = FilterService.create_filter(filter_type, params, filter_id)

        return jsonify({
            'success': True,
            'filter': filter_svg,
            'id': filter_id,
            'type': filter_type
        })
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500


@bp.route('/filter/info', methods=['GET'])
def get_filter_info():
    #Получение информации о доступных фильтрах.
    try:
        filter_type = request.args.get('type')

        if filter_type:
            info = FilterService.get_filter_info(filter_type)
            return jsonify({
                'success': True,
                'filter': info
            })
        else:
            filters = FilterService.get_filter_info()
            return jsonify({
                'success': True,
                'filters': filters
            })
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500