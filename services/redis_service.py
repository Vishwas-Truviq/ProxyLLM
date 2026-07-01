# Backend/services/redis_service.py
import os
import redis
import json

REDIS_URL = os.getenv("REDIS_URL")
REDIS_HOST = os.getenv("REDIS_HOST")
REDIS_PORT = int(os.getenv("REDIS_PORT", 6379))
REDIS_PASSWORD = os.getenv("REDIS_PASSWORD", None)

redis_client = None

# Determine if we should attempt connection
# Check if REDIS_URL is set, or if REDIS_HOST is set. 
# In local development where neither is configured, we bypass connection entirely to avoid delay.
if REDIS_URL or REDIS_HOST:
    try:
        if REDIS_URL:
            print(f"Connecting to Redis via REDIS_URL...")
            redis_client = redis.Redis.from_url(
                REDIS_URL,
                decode_responses=True,
                socket_timeout=1.5,
                socket_connect_timeout=1.5
            )
        else:
            print(f"Connecting to Redis via host {REDIS_HOST}:{REDIS_PORT}...")
            redis_client = redis.Redis(
                host=REDIS_HOST,
                port=REDIS_PORT,
                password=REDIS_PASSWORD,
                decode_responses=True,
                socket_timeout=1.5,
                socket_connect_timeout=1.5
            )
        
        # Test connection
        redis_client.ping()
        print("Redis connection test successful. Caching is ENABLED.")
    except Exception as e:
        print(f"Redis connection failed: {e}. Caching is DISABLED.")
        redis_client = None
else:
    print("No Redis configuration found in environment. Caching is DISABLED.")
    redis_client = None


def cache_get(key: str) -> str | None:
    """
    Retrieve value from cache. Returns None on cache miss or connection error.
    """
    if not redis_client:
        return None
    try:
        return redis_client.get(key)
    except Exception as e:
        print(f"Redis GET error: {e}")
        return None


def cache_set(key: str, value: str, ex_seconds: int = None) -> bool:
    """
    Store value in cache. Set TTL in seconds using ex_seconds.
    """
    if not redis_client:
        return False
    try:
        if ex_seconds:
            redis_client.setex(key, ex_seconds, value)
        else:
            redis_client.set(key, value)
        return True
    except Exception as e:
        print(f"Redis SET error: {e}")
        return False


def cache_delete(key: str) -> bool:
    """
    Delete key from cache.
    """
    if not redis_client:
        return False
    try:
        redis_client.delete(key)
        return True
    except Exception as e:
        print(f"Redis DELETE error: {e}")
        return False
