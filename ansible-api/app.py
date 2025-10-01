from flask import Flask, request, jsonify
import subprocess, os, json

app = Flask(__name__)
ANSIBLE_DIR = "/ansible"
INVENTORY = os.getenv("ANSIBLE_INVENTORY", f"{ANSIBLE_DIR}/inventories/dev/hosts.ini")

@app.get("/health")
def health():
    return {"ok": True}

@app.post("/run")
def run_playbook():
    data = request.get_json(force=True)
    playbook = data.get("playbook")
    extra_vars = data.get("extra_vars", {})
    if not playbook:
        return jsonify({"error": "playbook é obrigatório"}), 400

    pb_path = f"{ANSIBLE_DIR}/playbooks/{playbook}"
    if not os.path.exists(pb_path):
        return jsonify({"error": f"playbook não encontrado: {pb_path}"}), 404

    cmd = ["ansible-playbook", pb_path, "-i", INVENTORY, "--extra-vars", json.dumps(extra_vars)]
    try:
        p = subprocess.run(cmd, capture_output=True, text=True, timeout=55)
        return jsonify({
            "cmd": " ".join(cmd),
            "rc": p.returncode,
            "stdout": p.stdout,
            "stderr": p.stderr
        }), (200 if p.returncode == 0 else 500)
    except subprocess.TimeoutExpired:
        return jsonify({"error": "timeout executando playbook"}), 504

if __name__ == "__main__":
    # ESSENCIAL: manter o processo vivo ouvindo em 0.0.0.0:5000
    app.run(host="0.0.0.0", port=5000)
