from database import get_connection

# ── GROUPS ──────────────────────────────────────────────────

def get_all_groups():
    with get_connection() as conn:
        with conn.cursor(dictionary=True) as cursor:
            cursor.execute("SELECT id, name, description FROM server_groups;")
            return cursor.fetchall()
        
def insert_group(name, description):
    conn = get_connection()
    with conn.cursor(dictionary=True) as cursor:
        query="""
            INSERT INTO server_groups(name, description) VALUES (%s,%s);
        """
        cursor.execute(query,(name, description,))
        conn.commit()
        return cursor.lastrowid
    conn.close()

def update_group(group_id, name, description):
    conn = get_connection()
    with conn.cursor(dictionary=True) as cursor:
        query="""
            UPDATE server_groups SET name=%s, description=%s WHERE id=%s;
        """
        cursor.execute(query,(name, description,group_id,))
        conn.commit()
    conn.close()

def delete_group(group_id):
    conn = get_connection()
    with conn.cursor(dictionary=True) as cursor:
        query="""
            DELETE FROM server_ips 
            WHERE server_id IN (SELECT id FROM servers WHERE group_id = %s)
        """
        cursor.execute(query,(group_id,))
        query="""
            DELETE FROM servers WHERE group_id=%s
        """
        cursor.execute(query,(group_id,))
        query="""
            DELETE FROM server_groups WHERE id=%s
        """
        cursor.execute(query,(group_id,))
        conn.commit()
    conn.close()

# ── SERVERS ──────────────────────────────────────────────────

def get_servers_by_group(group_id):
    with get_connection() as conn:
        with conn.cursor(dictionary=True) as cursor:
            query="""
                SELECT id, hostname, group_id
                FROM servers
                WHERE group_id=%s;
            """
            cursor.execute(query,(group_id,))
            return cursor.fetchall()

def insert_server(hostname, group_id):
    conn = get_connection()
    with conn.cursor(dictionary=True) as cursor:
        query = """
            INSERT INTO servers(hostname, group_id) VALUES (%s,%s)
        """ 
        cursor.execute(query,(hostname,group_id,))
        conn.commit()
        return cursor.lastrowid
    conn.close()

#### ADD UPDATE SERVER ####

def delete_server(server_id):
    conn = get_connection()
    with conn.cursor(dictionary=True) as cursor:
        query="""
            DELETE FROM server_ips WHERE server_id = %s
        """
        cursor.execute(query,(server_id,))
        query="""
            DELETE FROM servers WHERE id = %s
        """
        cursor.execute(query,(server_id,))
        conn.commit()
    conn.close()

# ── INTERFACES ───────────────────────────────────────────────

def get_interfaces_by_server(server_id):
    with get_connection() as conn:
        with conn.cursor(dictionary=True) as cursor:
            query = """
                SELECT 
                        ips.id,
                        ips.ip_address  AS ip,
                        v.name          AS vlan,
                        v.ip_range      AS label
                FROM servers AS s
                INNER JOIN server_ips AS ips ON ips.server_id = s.id
                INNER JOIN vlans AS v ON ips.vlan_id = v.id
                WHERE s.id = %s;
            """
            cursor.execute(query,(server_id,))
            return cursor.fetchall()

def get_interface_by_id(interface_id):
    with get_connection() as conn:
        with conn.cursor(dictionary=True) as cursor:
            query = """
                SELECT ips.id, ips.ip_address AS ip,
                       v.name AS vlan, v.ip_range AS label
                FROM server_ips AS ips
                INNER JOIN vlans AS v ON ips.vlan_id = v.id
                WHERE ips.id = %s;
            """
            cursor.execute(query,(interface_id,))
            return cursor.fetchall()

def insert_interface(server_id, vlan_id, ip_address):
    conn = get_connection()
    with conn.cursor(dictionary=True) as cursor:
        query = """
            INSERT INTO server_ips (server_id,vlan_id,ip_address) VALUES (%s,%s,%s)
        """
        cursor.execute(query,(server_id,vlan_id,ip_address,))
        conn.commit()
        return cursor.lastrowid
    conn.close()

def delete_interface(interface_id):
    conn = get_connection()
    with conn.cursor(dictionary=True) as cursor:
        query="""
            DELETE FROM server_ips WHERE id = %s
        """
        cursor.execute(query,(interface_id,))
        conn.commit()
    conn.close()

# ── VLANS ────────────────────────────────────────────────────

def get_all_vlans():
    with get_connection() as conn:
        with conn.cursor(dictionary=True) as cursor:
            cursor.execute("SELECT id, name, ip_range, subnet_mask, is_mgmt FROM vlans;")
            return cursor.fetchall()

def get_vlan_by_id(vlan_id):
    with get_connection() as conn:
        with conn.cursor(dictionary=True) as cursor:
            query="""
                SELECT id, name, ip_range, subnet_mask, is_mgmt FROM vlans WHERE id=%s;
            """
            cursor.execute(
                query,
                (vlan_id,)
            )
            return cursor.fetchone()

def get_used_ips_by_vlan(vlan_id):
    with get_connection() as conn:
        with conn.cursor(dictionary=True) as cursor:
            query="""SELECT ip_address FROM server_ips WHERE vlan_id=%s;"""
            cursor.execute(
                query,
                (vlan_id,)
            )
            return cursor.fetchall()

def insert_vlan(name, ip_range, subnet_mask, is_mgmt):
    conn = get_connection()
    with conn.cursor(dictionary=True) as cursor:
        query="""
            INSERT INTO vlans(name, ip_range, subnet_mask, is_mgmt) VALUES (%s,%s,%s,%s);
        """
        cursor.execute(
            query,
            (name, ip_range, subnet_mask, is_mgmt)
        )
        conn.commit()
        return cursor.lastrowid
    conn.close()

def update_vlan(vlan_id, name, ip_range, subnet_mask, is_mgmt):
    conn = get_connection()
    with conn.cursor() as cursor:
        query="""
            UPDATE vlans SET name=%s, ip_range=%s, subnet_mask=%s, is_mgmt=%s WHERE id=%s;
        """
        cursor.execute(
            query,
            (name, ip_range, subnet_mask, is_mgmt, vlan_id)
        )
        conn.commit()
    conn.close()

def delete_vlan(vlan_id):
    conn = get_connection()
    with conn.cursor() as cursor:
        cursor.execute("DELETE FROM vlans WHERE id=%s;", (vlan_id,))
        affected = cursor.rowcount
        conn.commit()
    conn.close()
    return affected

# ── INVENTORY ────────────────────────────────────────────────

def get_inventory():
    with get_connection() as conn:
        with conn.cursor(dictionary=True) as cursor:
            query = """
                    SELECT s.hostname, 
                            sg.name AS group_name, 
                            ips.ip_address, 
                            v.name AS vlan_name,
                            v.ip_range 
                    FROM servers AS s
                    INNER JOIN server_groups AS sg ON s.group_id=sg.id
                    INNER JOIN server_ips AS ips ON ips.server_id =s.id
                    INNER JOIN vlans AS v ON ips.vlan_id = v.id 
                    ORDER BY sg.name, s.hostname;
            """
            cursor.execute(query)
            return cursor.fetchall()
