import repository
from netaddr import IPAddress,IPNetwork, AddrFormatError
from fastapi import HTTPException
from mysql.connector import errorcode
import mysql.connector

# ── GROUPS ──────────────────────────────────────────────────

def get_all_groups():
    groups = repository.get_all_groups()
    for group in groups:
        group['servers']=[]
    return groups

def create_group(name,description):
    try:
        new_id=repository.insert_group(name,description)
        return {"id":new_id,"name":name,"description":description,"servers":[]}
    except mysql.connector.Error as err:
        if err.errno == errorcode.ER_DUP_ENTRY:
            raise HTTPException(status_code=400,detail=f"Group '{name}' already exist!")
        raise HTTPException(status_code=500,detail=f"[ERROR] Database error: {err}")

def update_group(group_id,name,description):
    try:
        repository.update_group(group_id,name,description)
        return {"message":f"Group updated to '{name}'"}
    except mysql.connector.Error as err:
        if err.errno == errorcode.ER_DUP_ENTRY:
            raise HTTPException(status_code=400, detail=f"Group '{name}' already exists")
        raise HTTPException(status_code=500, detail=f"Database error: {err.msg}")

def delete_group(group_id):
    try:
        repository.delete_group(group_id)
        return { "message": "Group deleted" }
    except mysql.connector.Error as err:
        raise HTTPException(status_code=500, detail=f"Database error: {err}")
    
# ── SERVERS ──────────────────────────────────────────────────
def get_servers_by_group(group_id):
    servers = repository.get_servers_by_group(group_id)
    for server in servers:
        server['networking'] = []   # JS expects this field
    return servers

def create_server(hostname, group_id):
    try:
        new_id = repository.insert_server(hostname, group_id)
        return { "id": new_id, "hostname": hostname, "networking": [] }
    except mysql.connector.Error as err:
        if err.errno == errorcode.ER_DUP_ENTRY:
            raise HTTPException(status_code=400, detail=f"Hostname '{hostname}' already exists")
        raise HTTPException(status_code=500, detail=f"Database error: {err.msg}")

def remove_server(server_id):
    try:
        repository.delete_server(server_id)
        return { "message": f"Server {server_id} deleted" }
    except mysql.connector.Error as err:
        raise HTTPException(status_code=500, detail=f"Database error: {err}")


# ── INTERFACES ───────────────────────────────────────────────
def get_interfaces(server_id):
    try:
        return repository.get_interfaces_by_server(server_id)
    except mysql.connector.Error as err:
        raise HTTPException(status_code=400, detail=f"[ERROR] {err}")

def create_interface(server_id, vlan_id, ip_address):
    # Business logic: validate IP belongs to VLAN subnet
    vlan = repository.get_vlan_by_id(vlan_id)
    if not vlan:
        raise HTTPException(status_code=404, detail="VLAN not found")

    try:
        network = IPNetwork(vlan['ip_range'])
        ip      = IPAddress(ip_address)
        if ip not in network:
            raise HTTPException(
                status_code=400,
                detail=f"IP {ip_address} does not belong to VLAN {vlan['ip_range']}"
            )
    except AddrFormatError:
        raise HTTPException(status_code=400, detail="Invalid IP address format")

    try:
        new_id = repository.insert_interface(server_id, vlan_id, ip_address)
        return repository.get_interface_by_id(new_id)
    except mysql.connector.Error as err:
        raise HTTPException(status_code=500, detail=f"Database error: {err.msg}")

def remove_interface(interface_id):
    try:
        repository.delete_interface(interface_id)
        return { "message": "Interface deleted" }
    except mysql.connector.Error as err:
        raise HTTPException(status_code=500, detail=f"Database error: {err.msg}")


# ── VLANS ────────────────────────────────────────────────────
def get_all_vlans():
    return repository.get_all_vlans()

def create_vlan(name, ip_range, subnet_mask, is_mgmt):
    try:
        new_id = repository.insert_vlan(name, ip_range, subnet_mask, is_mgmt)
        return { "id": new_id, "name": name, "ip_range": ip_range,
                 "subnet_mask": subnet_mask, "is_mgmt": is_mgmt }
    except mysql.connector.Error as err:
        if err.errno == errorcode.ER_DUP_ENTRY:
            raise HTTPException(status_code=400, detail=f"VLAN '{name}' already exists")
        raise HTTPException(status_code=500, detail=f"Database error: {err.msg}")

def edit_vlan(vlan_id, name, ip_range, subnet_mask, is_mgmt):
    try:
        repository.update_vlan(vlan_id, name, ip_range, subnet_mask, is_mgmt)
        return { "id": vlan_id, "name": name, "ip_range": ip_range,
                 "subnet_mask": subnet_mask, "is_mgmt": is_mgmt }
    except mysql.connector.Error as err:
        if err.errno == errorcode.ER_DUP_ENTRY:
            raise HTTPException(status_code=400, detail=f"VLAN '{name}' already exists")
        raise HTTPException(status_code=500, detail=f"Database error: {err.msg}")

def remove_vlan(vlan_id):
    try:
        affected = repository.delete_vlan(vlan_id)
        if affected == 0:
            raise HTTPException(status_code=404, detail="VLAN not found")
        return { "message": "VLAN deleted" }
    except mysql.connector.Error as err:
        raise HTTPException(status_code=500, detail=f"Database error: {err.msg}")

def get_free_ips(vlan_id):
    vlan = repository.get_vlan_by_id(vlan_id)
    if not vlan:
        raise HTTPException(status_code=404, detail="VLAN not found")

    used_rows = repository.get_used_ips_by_vlan(vlan_id)
    used_ips  = {IPAddress(row['ip_address']) for row in used_rows}

    try:
        network  = IPNetwork(vlan['ip_range'])
        free_ips = [str(ip) for ip in network.iter_hosts() if ip not in used_ips]
    except AddrFormatError:
        raise HTTPException(status_code=400, detail="Invalid IP range format in database")

    return {
        "vlan_name":  vlan['name'],
        "ip_range":   vlan['ip_range'],
        "total_used": len(used_ips),
        "total_free": len(free_ips),
        "free_ips":   free_ips
    }

# ── INVENTORY ────────────────────────────────────────────────
def get_inventory():
    results = repository.get_inventory()

    inventory={}

    for result in results:
        gname=result["group_name"]
        hname=result["hostname"]

        if gname not in inventory:
            inventory[gname]={'group_name':gname,'servers':{}}
        
        if hname not in inventory[gname]['servers']:
            inventory[gname]['servers'][hname]={
                "hostname":hname,
                "interfaces":[]
            }
        inventory[gname]['servers'][hname]["interfaces"].append({
                        "ip_address":result["ip_address"],
                        "vlan_name":result["vlan_name"],
                        "ip_range":   result["ip_range"]
                    })
    return [
            {
                'group_name':g['group_name'],
                'servers': list(g['servers'].values())
            }
            for g in inventory.values()
    ]
