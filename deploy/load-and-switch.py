"""Load an already-built image and replace only the existing website service."""
import json
import os
from pathlib import Path
import re
import shlex
import subprocess
import sys
import time


def run(*args, **kwargs):
    return subprocess.run(args, check=True, text=True, **kwargs)


def inspect(name):
    return json.loads(subprocess.check_output(["docker", "inspect", name]))[0]


release = Path(sys.argv[1]).resolve()
if release.parent != Path("/home/ubuntu/bojian-releases") or not re.fullmatch(
    r"[a-z0-9][a-z0-9.-]*", release.name
):
    raise SystemExit("Invalid release directory")
image = f"bojian-website:{release.name}"
current = inspect("bojian-website-1")
caddy = inspect("bojian-caddy-1")
if "DOMAIN=bojian.kelance.cn" not in caddy["Config"]["Env"]:
    raise SystemExit("Unexpected production domain")
labels = current["Config"]["Labels"]
working_dir = labels["com.docker.compose.project.working_dir"]
environment = dict(os.environ)
environment["CADDY_IP"] = caddy["NetworkSettings"]["Networks"]["bojian_frontend"]["IPAddress"]
environment_files = [name for name in labels["com.docker.compose.project.environment_file"].split(",") if name]
if not environment_files:
    raise SystemExit("Missing production environment file")
environment["ENV_FILE"] = environment_files[0]
compose = ["docker", "compose", "-p", labels["com.docker.compose.project"]]
for filename in environment_files:
    compose += ["--env-file", filename]
for filename in labels["com.docker.compose.project.config_files"].split(","):
    compose += ["-f", filename]

run("sha256sum", "-c", "image.sha256", cwd=release)
run("docker", "load", "-i", str(release / "image.tar.gz"))
loaded = inspect(image)
if loaded["Id"] != (release / "image.id").read_text().strip():
    raise SystemExit("Loaded image ID differs from the local build")
if (loaded["Os"], loaded["Architecture"]) != ("linux", "amd64"):
    raise SystemExit("Expected linux/amd64 image")

snapshot = subprocess.check_output([
    "docker", "ps", "--format", "{{.Names}} {{.ID}} {{.Image}}"
], text=True)
(release / "containers-before.txt").write_text(snapshot)
(release / "previous-image.txt").write_text(current["Image"] + "\n")
rollback = compose + ["up", "-d", "--no-deps", "--no-build", "--wait", "--wait-timeout", "90", "website"]
(release / "rollback.sh").write_text(
    "#!/bin/sh\nset -eu\ncd " + shlex.quote(working_dir) + "\n"
    + "export CADDY_IP=" + shlex.quote(environment["CADDY_IP"]) + "\n"
    + "export ENV_FILE=" + shlex.quote(environment["ENV_FILE"]) + "\n"
    + shlex.join(rollback) + "\n"
)
template = (release / "compose.website.yaml").read_text()
(release / "compose.override.yaml").write_text(template.replace(
    "${WEBSITE_IMAGE:?Set WEBSITE_IMAGE to the release image}", image
))
deploy = compose + ["-f", str(release / "compose.override.yaml")]
run(*deploy, "config", "--quiet", cwd=working_dir, env=environment)

preflight = f"bojian-website-preflight-{release.name}"
try:
    run(
        "docker", "run", "-d", "--name", preflight,
        "--network", "bojian_frontend", "--read-only", "--init",
        "--security-opt", "no-new-privileges:true",
        "--tmpfs", "/tmp:size=64m,mode=1777",
        "--tmpfs", "/app/.next/cache:size=128m,uid=1001,gid=1001,mode=0700",
        "-e", "BOJIAN_APP_AUTH_ORIGIN=https://bojian.kelance.cn",
        "-e", "BOJIAN_WEBSITE_ORIGIN=https://bojian.kelance.cn", image,
    )
    for _ in range(45):
        if inspect(preflight)["State"]["Health"]["Status"] == "healthy":
            break
        time.sleep(1)
    else:
        raise RuntimeError("Preflight container did not become healthy")
    run("docker", "exec", preflight, "node", "-e", """
      (async()=>{
        for(const path of ['/', '/login', '/console', '/console/template-guide', '/opengraph-image']) {
          const response=await fetch('http://127.0.0.1:3000'+path);
          if(response.status!==200) throw Error(path+': '+response.status);
          await response.arrayBuffer();
        }
      })().catch(error=>{console.error(error);process.exit(1)});
    """)
    try:
        run(*deploy, "up", "-d", "--no-deps", "--no-build", "--wait", "--wait-timeout", "90", "website", cwd=working_dir, env=environment)
    except subprocess.CalledProcessError:
        run(*rollback, cwd=working_dir, env=environment)
        raise
finally:
    subprocess.run(["docker", "rm", "-f", preflight], check=False)

after = subprocess.check_output([
    "docker", "ps", "--format", "{{.Names}} {{.ID}} {{.Image}}"
], text=True)
(release / "containers-after.txt").write_text(after)
after_by_name = {line.split()[0]: line for line in after.splitlines()}
for line in snapshot.splitlines():
    name = line.split()[0]
    if name != "bojian-website-1" and after_by_name.get(name) != line:
        raise RuntimeError(f"Unexpected change to another container: {name}")
print(f"Deployed {image} to https://bojian.kelance.cn; other containers unchanged")
