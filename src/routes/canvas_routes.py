# src/routes/canvas_routes.py
from flask import Blueprint, request, jsonify
from ..services.svg_service import SVGService
from ..utils.svg_utils import extract_svg_layers

bp = Blueprint('canvas', __name__, url_prefix='/api/canvas')


@bp.route('/create', methods=['POST'])
def create_canvas():
    #Создание нового холста.
    try:
        data = request.json or {}
        width = data.get('width', 800)
        height = data.get('height', 600)
        units = data.get('units', 'px')

        result = SVGService.create_new_canvas(width, height, units)

        return jsonify({
            'success': True,
            'svg': result['svg'],
            'canvas_info': result['canvas'],
            'layers': result['layers']
        })
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@bp.route('/analyze', methods=['POST'])
def analyze_svg():
    #Анализ структуры SVG.
    try:
        data = request.json
        svg_content = data.get('svg', '')

        if not svg_content:
            return jsonify({
                'success': False,
                'error': 'No SVG content provided'
            }), 400

        structure_info = SVGService.analyze_svg_structure(svg_content)
        layers = extract_svg_layers(svg_content)

        return jsonify({
            'success': True,
            'structure': structure_info,
            'layers': layers
        })
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500