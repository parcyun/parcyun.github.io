FROM python:3.13-slim
WORKDIR /app
COPY server.py ./
USER 10001:10001
ENV PYTHONUNBUFFERED=1
CMD ["python","server.py"]
