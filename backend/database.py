import os
import mysql.connector
from mysql.connector import pooling
from dotenv import load_dotenv

load_dotenv()

db_pool = mysql.connector.pooling.MySQLConnectionPool(
    pool_name="backend_pool",
    pool_size=20,
    database=os.getenv('database'),
    host=os.getenv('host'),
    user=os.getenv('user'),
    password=os.getenv('password')
)

def get_connection():
    return db_pool.get_connection()