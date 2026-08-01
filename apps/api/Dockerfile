FROM python:3.11-slim

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

RUN apt-get update && apt-get install -y --no-install-recommends \
    tesseract-ocr \
    libglib2.0-0 \
    libsm6 \
    libxrender1 \
    libxext6 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY pyproject.toml /app/pyproject.toml
COPY src /app/src
RUN pip install --no-cache-dir --upgrade pip && pip install --no-cache-dir .

EXPOSE 8000

CMD ["uvicorn", "src.research_copilot.main:app", "--host", "0.0.0.0", "--port", "8000"]
