from pydantic import BaseModel,Field

class Group(BaseModel):
    name: str=Field(
        max_length=50, 
        description="Name of the server group", 
        examples=["Ateme","Broadpeak"]
    )
    description: str | None=Field(
        default=None, max_length=50, 
        description="Short description of the group"
    )

class Server(BaseModel):
    hostname: str=Field(max_length=20)
    group_id: int

class Interface(BaseModel):
    ip_address: str=Field(max_length=15)
    vlan_id: int

class Vlan(BaseModel):
    name: str=Field(max_length=20)
    ip_range: str=Field(max_length=18, description="Must be in format X.X.X.X/X")
    subnet_mask: str=Field(max_length=15)
    is_mgmt: int=Field(default=0)