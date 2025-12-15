import trimesh

def create_box(extents=(1.0, 1.0, 1.0)):
    return trimesh.creation.box(extents=tuple(extents))

def create_sphere(radius=1.0, subdivisions=3):
    # icosphere даёт хороший круглый шар
    return trimesh.creation.icosphere(subdivisions=int(subdivisions), radius=float(radius))

def create_cylinder(radius=0.5, height=1.0, sections=32):
    return trimesh.creation.cylinder(radius=float(radius), height=float(height), sections=int(sections))

def create_cone(radius=0.5, height=1.0, sections=32):
    return trimesh.creation.cone(radius=float(radius), height=float(height), sections=int(sections))
