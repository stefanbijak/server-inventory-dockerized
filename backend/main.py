import socket
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from prometheus_fastapi_instrumentator import Instrumentator
import service
from models import Group,Server,Interface,Vlan

hostname = socket.gethostname()
local_ip = socket.gethostbyname(hostname)

app = FastAPI()

Instrumentator().instrument(app).expose(app)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"]
)

@app.get("/api/health")
def health():
    return {"status":"ok"}

# ── GROUPS ──────────────────────────────────────────────────

@app.get("/groups")
def get_groups():
    return service.get_all_groups()

@app.post("/group")
def create_group(group:Group):
    return service.create_group(group.name, group.description)

@app.put("/groups/{group_id}")
def update_group(group_id:int,group:Group):
    return service.update_group(group_id,group.name,group.description)

@app.delete("/groups/{group_id}")
def delete_group(group_id:int):
    return service.delete_group(group_id)

# ── SERVERS ──────────────────────────────────────────────────
@app.get('/groups/{group_id}/servers')
def get_servers_from_group(group_id: int):
    return service.get_servers_by_group(group_id)

@app.post('/servers')
def create_server(server: Server):
    return service.create_server(server.hostname, server.group_id)

@app.delete('/servers/{server_id}')
def delete_server(server_id: int):
    return service.remove_server(server_id)

# ── INTERFACES ───────────────────────────────────────────────
@app.get('/servers/{server_id}/interfaces')
def get_interfaces(server_id: int):
    return service.get_interfaces(server_id)

@app.post('/servers/{server_id}/interfaces')
def add_interface(server_id: int, iface: Interface):
    return service.create_interface(server_id, iface.vlan_id, iface.ip_address)

@app.delete('/servers/{server_id}/interfaces/{interface_id}')
def delete_interface(server_id: int, interface_id: int):
    return service.remove_interface(interface_id)

# ── VLANS ────────────────────────────────────────────────────
@app.get('/vlans/')
def get_vlans():
    return service.get_all_vlans()

@app.post('/vlans')
def create_vlan(vlan: Vlan):
    return service.create_vlan(vlan.name, vlan.ip_range, vlan.subnet_mask, vlan.is_mgmt)

@app.put('/vlans/{vlan_id}')
def update_vlan(vlan_id: int, vlan: Vlan):
    return service.edit_vlan(vlan_id, vlan.name, vlan.ip_range, vlan.subnet_mask, vlan.is_mgmt)

@app.delete('/vlans/{vlan_id}')
def delete_vlan(vlan_id: int):
    return service.remove_vlan(vlan_id)

# ── FREE IPs ─────────────────────────────────────────────────
@app.get('/free_ips/{vlan_id}')
def free_ips(vlan_id: int):
    return service.get_free_ips(vlan_id)

# ── INVENTORY ────────────────────────────────────────────────
@app.get('/inventory/')
def get_inventory():
    return service.get_inventory()
