from slowapi import Limiter
from slowapi.util import get_remote_address

# Istanza unica condivisa tra main.py (che la registra sull'app) e i router
# (che la usano per decorare gli endpoint con @limiter.limit(...))
limiter = Limiter(key_func=get_remote_address)
