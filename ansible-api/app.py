from flask import Flask, request, jsonify
import subprocess, os, json, tempfile, time

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
    limit = data.get("limit")
    if not playbook:
        return jsonify({"error": "playbook é obrigatório"}), 400

    pb_path = f"{ANSIBLE_DIR}/playbooks/{playbook}"
    if not os.path.exists(pb_path):
        return jsonify({"error": f"playbook não encontrado: {pb_path}"}), 404

    cmd = ["ansible-playbook", pb_path, "-i", INVENTORY, "--extra-vars", json.dumps(extra_vars)]
    if limit:
        cmd += ["-l", str(limit)]
    try:
        env = os.environ.copy()
        env["ANSIBLE_HOST_KEY_CHECKING"] = "False"
        p = subprocess.run(cmd, capture_output=True, text=True, timeout=55, env=env)
        return jsonify({
            "cmd": " ".join(cmd),
            "rc": p.returncode,
            "stdout": p.stdout,
            "stderr": p.stderr
        }), (200 if p.returncode == 0 else 500)
    except subprocess.TimeoutExpired:
        return jsonify({"error": "timeout executando playbook"}), 504

@app.post("/run_yaml")
def run_yaml_playbook():
    data = request.get_json(force=True)
    yaml_content = data.get("yaml")
    extra_vars = data.get("extra_vars", {})
    limit = data.get("limit")
    if not yaml_content or not str(yaml_content).strip():
        return jsonify({"error": "yaml é obrigatório"}), 400

    # Alguns ambientes não suportam stdin ('-'); usa arquivo temporário em /tmp e remove após execução
    tmp_file = None
    try:
        tmp_file = tempfile.NamedTemporaryFile(mode="w", suffix=".yml", delete=False)
        tmp_file.write(yaml_content)
        tmp_file.flush()
        tmp_path = tmp_file.name
        tmp_file.close()

        cmd = ["ansible-playbook", tmp_path, "-i", INVENTORY, "--extra-vars", json.dumps(extra_vars)]
        if limit:
            cmd += ["-l", str(limit)]
        env = os.environ.copy()
        env["ANSIBLE_HOST_KEY_CHECKING"] = "False"
        p = subprocess.run(cmd, capture_output=True, text=True, timeout=55, env=env)
        rc = p.returncode
        return jsonify({
            "cmd": " ".join(cmd),
            "rc": rc,
            "stdout": p.stdout,
            "stderr": p.stderr
        }), (200 if rc == 0 else 500)
    except subprocess.TimeoutExpired:
        return jsonify({"error": "timeout executando playbook"}), 504
    finally:
        if tmp_file is not None:
            try:
                os.remove(tmp_file.name)
            except Exception:
                pass

if __name__ == "__main__":
    # ESSENCIAL: manter o processo vivo ouvindo em 0.0.0.0:5000
    app.run(host="0.0.0.0", port=5000)
