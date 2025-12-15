from flask import Blueprint, request, jsonify, send_from_directory
import os

from .scene_manager import SceneManager
from .primitives import create_box, create_sphere, create_cylinder, create_cone

bp = Blueprint('three_d', __name__, url_prefix='/api/3d')

_export_dir = os.path.abspath(os.path.join(os.path.dirname(os.path.dirname(__file__)), '..', 'static', '3d', 'scenes'))
scene_manager = SceneManager(export_dir=_export_dir)

@bp.route('/create', methods=['POST'])
def create_scene():
    data = request.json or {}
    size = data.get('size', [10, 10, 10])
    try:
        scene_id = scene_manager.create_scene(size=tuple(size))
        return jsonify({'success': True, 'scene_id': scene_id, 'scene_url': f'/static/3d/scenes/{scene_id}.glb'})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@bp.route('/add', methods=['POST'])
def add_primitive():
    data = request.json or {}
    scene_id = data.get('scene_id')
    ptype = data.get('type')
    params = data.get('params', {}) or {}
    position = data.get('position', [0, 0, 0])
    name = data.get('name')

    if not scene_id or not ptype:
        return jsonify({'success': False, 'error': 'scene_id and type are required'}), 400

    try:
        if ptype == 'box':
            mesh = create_box(extents=params.get('extents', (1, 1, 1)))
        elif ptype == 'sphere':
            mesh = create_sphere(radius=params.get('radius', 1.0), subdivisions=params.get('subdivisions', 3))
        elif ptype == 'cylinder':
            mesh = create_cylinder(radius=params.get('radius', 0.5), height=params.get('height', 1.0))
        elif ptype == 'cone':
            mesh = create_cone(radius=params.get('radius', 0.5), height=params.get('height', 1.0))
        else:
            return jsonify({'success': False, 'error': f'Unknown primitive type: {ptype}'}), 400

        obj_id, obj_name = scene_manager.add_object(scene_id, mesh, position=tuple(position), name=name, primitive_type=ptype)
        return jsonify({
            'success': True,
            'object_id': obj_id,
            'object_name': obj_name,
            'scene_url': f'/static/3d/scenes/{scene_id}.glb'
        })
    except KeyError as e:
        return jsonify({'success': False, 'error': str(e)}), 404
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500


@bp.route('/delete', methods=['POST'])
def delete_object():
    data = request.json or {}
    scene_id = data.get('scene_id')
    object_id = data.get('object_id')

    if not scene_id or not object_id:
        return jsonify({'success': False, 'error': 'scene_id and object_id required'}), 400

    try:
        scene_manager.remove_object(scene_id, object_id)
        return jsonify({'success': True, 'scene_url': f'/static/3d/scenes/{scene_id}.glb'})
    except KeyError as e:
        return jsonify({'success': False, 'error': str(e)}), 404
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500


@bp.route('/objects/<scene_id>', methods=['GET'])
def list_objects(scene_id):
    try:
        objs = scene_manager.list_objects(scene_id)
        return jsonify({'success': True, 'objects': objs})
    except KeyError as e:
        return jsonify({'success': False, 'error': str(e)}), 404
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@bp.route('/transform', methods=['POST'])
def transform_object():
    data = request.json or {}
    scene_id = data.get('scene_id')
    object_id = data.get('object_id')
    operation = data.get('operation')
    params = data.get('params', {}) or {}

    if not all([scene_id, object_id, operation]):
        return jsonify({'success': False, 'error': 'scene_id, object_id and operation required'}), 400

    try:
        scene_manager.transform_object(scene_id, object_id, operation, params)
        return jsonify({'success': True, 'scene_url': f'/static/3d/scenes/{scene_id}.glb'})
    except KeyError as e:
        return jsonify({'success': False, 'error': str(e)}), 404
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@bp.route('/file/<scene_id>', methods=['GET'])
def get_scene_file(scene_id):
    try:
        path = scene_manager.get_scene_file(scene_id)
        export_dir = os.path.dirname(path)
        fname = os.path.basename(path)
        if not os.path.exists(path):
            return jsonify({'success': False, 'error': 'Scene file not found'}), 404
        return send_from_directory(export_dir, fname, as_attachment=False)
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500
