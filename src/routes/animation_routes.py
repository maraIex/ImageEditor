from flask import Blueprint, request, jsonify
import uuid

bp = Blueprint('animations', __name__, url_prefix='/api/animations')


@bp.route('/create', methods=['POST'])
def create_animation():
    #Создание SMIL анимации.
    try:
        data = request.json
        element_id = data.get('element_id')
        animation_type = data.get('type', 'translate')
        duration = data.get('duration', 2)
        values = data.get('values', [])
        repeat = data.get('repeat', 'indefinite')
        animation_id = data.get('id', f'anim_{uuid.uuid4().hex[:8]}')

        if not element_id:
            return jsonify({'success': False, 'error': 'Element ID is required'}), 400

        animation_svg = ""

        if animation_type == 'translate':
            # Формат values: [{'x': 0, 'y': 0}, {'x': 100, 'y': 0}]
            if len(values) >= 2:
                key_times = []
                key_values = []

                for i, val in enumerate(values):
                    key_times.append(str(i / (len(values) - 1)))
                    key_values.append(f"{val.get('x', 0)},{val.get('y', 0)}")

                animation_svg = f'''
                <animateTransform
                    id="{animation_id}"
                    attributeName="transform"
                    type="translate"
                    dur="{duration}s"
                    values="{';'.join(key_values)}"
                    keyTimes="{';'.join(key_times)}"
                    repeatCount="{repeat}"/>
                '''

        elif animation_type == 'rotate':
            # Формат values: {'from': 0, 'to': 360, 'cx': 50, 'cy': 50}
            from_angle = values.get('from', 0)
            to_angle = values.get('to', 360)
            cx = values.get('cx', 0)
            cy = values.get('cy', 0)

            animation_svg = f'''
            <animateTransform
                id="{animation_id}"
                attributeName="transform"
                type="rotate"
                from="{from_angle} {cx} {cy}"
                to="{to_angle} {cx} {cy}"
                dur="{duration}s"
                repeatCount="{repeat}"/>
            '''

        elif animation_type == 'scale':
            # Формат values: {'from': 1, 'to': 2}
            from_scale = values.get('from', 1)
            to_scale = values.get('to', 1.5)

            animation_svg = f'''
            <animateTransform
                id="{animation_id}"
                attributeName="transform"
                type="scale"
                from="{from_scale}"
                to="{to_scale}"
                dur="{duration}s"
                repeatCount="{repeat}"/>
            '''

        elif animation_type == 'color':
            # Формат values: ['#ff0000', '#00ff00', '#0000ff']
            if len(values) >= 2:
                animation_svg = f'''
                <animate
                    id="{animation_id}"
                    attributeName="fill"
                    values="{';'.join(values)}"
                    dur="{duration}s"
                    repeatCount="{repeat}"/>
                '''

        elif animation_type == 'opacity':
            # Формат values: [0, 1, 0]
            if len(values) >= 2:
                key_times = []
                key_values = []

                for i, val in enumerate(values):
                    key_times.append(str(i / (len(values) - 1)))
                    key_values.append(str(val))

                animation_svg = f'''
                <animate
                    id="{animation_id}"
                    attributeName="opacity"
                    values="{';'.join(key_values)}"
                    keyTimes="{';'.join(key_times)}"
                    dur="{duration}s"
                    repeatCount="{repeat}"/>
                '''

        if not animation_svg:
            return jsonify({'success': False, 'error': 'Invalid animation parameters'}), 400

        return jsonify({
            'success': True,
            'animation': animation_svg,
            'id': animation_id,
            'element_id': element_id,
            'type': animation_type
        })
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500


@bp.route('/presets', methods=['GET'])
def get_animation_presets():
    #Получение пресетов анимаций.
    presets = {
        'pulse': {
            'name': 'Пульсация',
            'type': 'scale',
            'values': {'from': 1, 'to': 1.2},
            'duration': 1,
            'repeat': 'indefinite',
            'description': 'Плавное увеличение и уменьшение'
        },
        'rotation': {
            'name': 'Вращение',
            'type': 'rotate',
            'values': {'from': 0, 'to': 360, 'cx': 50, 'cy': 50},
            'duration': 3,
            'repeat': 'indefinite',
            'description': 'Непрерывное вращение'
        },
        'fade': {
            'name': 'Мерцание',
            'type': 'opacity',
            'values': [1, 0.3, 1],
            'duration': 2,
            'repeat': 'indefinite',
            'description': 'Плавное изменение прозрачности'
        },
        'slide': {
            'name': 'Слайд',
            'type': 'translate',
            'values': [
                {'x': 0, 'y': 0},
                {'x': 100, 'y': 0},
                {'x': 100, 'y': 100},
                {'x': 0, 'y': 100},
                {'x': 0, 'y': 0}
            ],
            'duration': 5,
            'repeat': 'indefinite',
            'description': 'Движение по квадрату'
        }
    }

    return jsonify({
        'success': True,
        'presets': presets
    })