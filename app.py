# app.py

from flask import Flask, jsonify
import docker
from flask_cors import CORS

app = Flask(__name__)
CORS(app)

client = docker.from_env()


@app.route("/api/docker-stats/<string:container_id>", methods=["GET"])
def docker_stats(container_id):
    try:
        container = client.containers.get(container_id)
        stats = container.stats(stream=False)

        # Calculate CPU usage percentage
        cpu_delta = (
            stats["cpu_stats"]["cpu_usage"]["total_usage"]
            - stats["precpu_stats"]["cpu_usage"]["total_usage"]
        )
        system_delta = (
            stats["cpu_stats"]["system_cpu_usage"]
            - stats["precpu_stats"]["system_cpu_usage"]
        )
        cpu_percent = (
            (cpu_delta / system_delta) * stats["cpu_stats"]["online_cpus"] * 100
        )

        # Memory usage
        memory_usage = stats["memory_stats"]["usage"]
        memory_limit = stats["memory_stats"]["limit"]

        # Network usage
        rx_bytes = sum(network["rx_bytes"] for network in stats["networks"].values())
        tx_bytes = sum(network["tx_bytes"] for network in stats["networks"].values())

        data = {
            "cpu_percent": cpu_percent,
            "memory_usage": memory_usage,
            "memory_limit": memory_limit,
            "rx_bytes": rx_bytes,
            "tx_bytes": tx_bytes,
        }

        return jsonify(data)
    except docker.errors.NotFound:
        return jsonify({"error": "Container not found"}), 404
    # except Exception as e:
    #     return jsonify({"error": str(e)}), 500


if __name__ == "__main__":
    app.run(debug=True)
