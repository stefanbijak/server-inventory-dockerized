FROM python:3.12-slim

WORKDIR /app

copy requirements.txt .

RUN pip install --no-cache-dir -r requirements.txt

COPY . .

RUN useradd -m backend && chown -R backend:backend /app

USER backend

EXPOSE 6969

CMD ["python3", "-m","uvicorn","main:app","--host","0.0.0.0","--port","6969"]
