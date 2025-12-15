import os
import uuid
from typing import Tuple, Optional, Dict

import trimesh

DEFAULT_EXPORT_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), '..', '..', 'static', '3d', 'scenes')
DEFAULT_EXPORT_DIR = os.path.abspath(DEFAULT_EXPORT_DIR)

def _ensure_export_dir(path):
    os.makedirs(path, exist_ok=True)
    return path

def trimesh_to_open3d(tmesh: trimesh.Trimesh):
    # Оставляем определение, но уже не используем Open3D активно — оно было расширением
    import open3d as o3d
    import numpy as np
    mesh_o3d = o3d.geometry.TriangleMesh()
    mesh_o3d.vertices = o3d.utility.Vector3dVector(tmesh.vertices.astype('float64'))
    mesh_o3d.triangles = o3d.utility.Vector3iVector(tmesh.faces.astype('int32'))
    try:
        mesh_o3d.compute_vertex_normals()
    except Exception:
        pass
    return mesh_o3d

class SceneManager:
    def __init__(self, export_dir: Optional[str] = None):
        self.export_dir = _ensure_export_dir(export_dir or DEFAULT_EXPORT_DIR)
        # scenes: scene_id -> { size, objects: {obj_id: {...}}, counters: {primitive: count}}
        self.scenes: Dict[str, dict] = {}

    def create_scene(self, size: Tuple[float, float, float] = (10.0, 10.0, 10.0)) -> str:
        scene_id = uuid.uuid4().hex
        self.scenes[scene_id] = {
            'size': tuple(size),
            'objects': {},
            'counters': {}  # для именования объектов по типам
        }
        self._export_scene(scene_id)
        return scene_id

    def _next_name(self, scene_id: str, primitive_type: str) -> str:
        ctrs = self.scenes[scene_id].setdefault('counters', {})
        n = ctrs.get(primitive_type, 0) + 1
        ctrs[primitive_type] = n
        # формат: "Box 1"
        return f"{primitive_type.capitalize()} {n}"

    def add_object(self, scene_id: str, mesh: trimesh.Trimesh, position=(0, 0, 0), name: str = None, primitive_type: str = "object") -> (str, str):
        if scene_id not in self.scenes:
            raise KeyError("Scene not found")
        obj_id = uuid.uuid4().hex
        mcopy = mesh.copy()
        try:
            mcopy.apply_translation(tuple(position))
        except Exception:
            pass
        if not name:
            name = self._next_name(scene_id, primitive_type)
        self.scenes[scene_id]['objects'][obj_id] = {
            'mesh': mcopy,
            'name': name,
            'type': primitive_type
        }
        self._export_scene(scene_id)
        return obj_id, name

    def list_scenes(self):
        out = []
        for sid, data in self.scenes.items():
            out.append({
                'id': sid,
                'size': data['size'],
                'objects_count': len(data['objects'])
            })
        return out

    def list_objects(self, scene_id: str):
        if scene_id not in self.scenes:
            raise KeyError("Scene not found")
        objs = self.scenes[scene_id]['objects']
        out = []
        for oid, info in objs.items():
            out.append({
                'id': oid,
                'name': info.get('name'),
                'type': info.get('type')
            })
        return out

    def transform_object(self, scene_id: str, object_id: str, operation: str, params: dict):
        if scene_id not in self.scenes:
            raise KeyError("Scene not found")
        objs = self.scenes[scene_id]['objects']
        if object_id not in objs:
            raise KeyError("Object not found")
        mesh = objs[object_id]['mesh']

        if operation == 'translate':
            dx = float(params.get('x', 0))
            dy = float(params.get('y', 0))
            dz = float(params.get('z', 0))
            mesh.apply_translation((dx, dy, dz))

        elif operation == 'scale':
            sx = float(params.get('sx', params.get('s', 1.0)))
            sy = float(params.get('sy', sx))
            sz = float(params.get('sz', sx))
            if sx == sy == sz:
                mesh.apply_scale(sx)
            else:
                import numpy as np
                mat = np.eye(4, dtype=float)
                mat[0, 0] = sx
                mat[1, 1] = sy
                mat[2, 2] = sz
                mesh.apply_transform(mat)

        elif operation == 'rotate':
            import math
            from trimesh.transformations import rotation_matrix
            axis = params.get('axis', [0, 0, 1])
            angle_deg = float(params.get('angle_deg', params.get('angle', 0)))
            angle = math.radians(angle_deg)
            point = params.get('point', None)
            try:
                mat = rotation_matrix(angle, tuple(axis), point=tuple(point) if point is not None else None)
            except Exception:
                mat = rotation_matrix(angle, tuple(axis))
            mesh.apply_transform(mat)

        else:
            raise ValueError("Unknown operation")

        self._export_scene(scene_id)

    def get_scene_file(self, scene_id: str) -> str:
        fname = f"{scene_id}.glb"
        return os.path.join(self.export_dir, fname)

    def _export_scene(self, scene_id: str):
        if scene_id not in self.scenes:
            raise KeyError("Scene not found")
        objs = self.scenes[scene_id]['objects']
        meshes = [o['mesh'] for o in objs.values() if isinstance(o.get('mesh'), trimesh.Trimesh)]
        if not meshes:
            # пустая сцена => удаляем файл если есть
            path = self.get_scene_file(scene_id)
            try:
                if os.path.exists(path):
                    os.remove(path)
            except Exception:
                pass
            return
        try:
            scene_trimesh = trimesh.util.concatenate(meshes)
            file_bytes = scene_trimesh.export(file_type='glb')
            path = self.get_scene_file(scene_id)
            with open(path, 'wb') as f:
                if isinstance(file_bytes, bytes):
                    f.write(file_bytes)
                else:
                    f.write(file_bytes.encode('utf-8'))
        except Exception:
            # fallback через Scene
            scene_scene = trimesh.Scene()
            for i, m in enumerate(meshes):
                scene_scene.add_geometry(m, node_name=f'obj_{i}')
            file_bytes = scene_scene.export(file_type='glb')
            path = self.get_scene_file(scene_id)
            with open(path, 'wb') as f:
                if isinstance(file_bytes, bytes):
                    f.write(file_bytes)
                else:
                    f.write(file_bytes.encode('utf-8'))
