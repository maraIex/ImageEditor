from flask import current_app

def get_upload_folder():
    return current_app.config['UPLOAD_FOLDER']

def get_projects_folder():
    return current_app.config['PROJECTS_FOLDER']