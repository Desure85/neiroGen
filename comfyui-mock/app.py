from flask import Flask, request, jsonify
import uuid

app = Flask(__name__)

@app.get('/')
def root():
    return jsonify({'ok': True, 'service': 'comfyui-mock'}), 200

@app.post('/prompt')
def prompt():
    try:
        payload = request.get_json(force=True, silent=True) or {}
        prompt_id = str(uuid.uuid4())
        return jsonify({'ok': True, 'prompt_id': prompt_id, 'received': payload}), 200
    except Exception as e:
        return jsonify({'ok': False, 'error': str(e)}), 400

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=8188)
