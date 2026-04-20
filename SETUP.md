# Setup rápido — Hair Craft Barbería

## Requisitos
- Python 3.12
- Node.js 18+
- PostgreSQL 15 (o Docker)

## Con Docker (recomendado)

```bash
cp .env.example .env
# editar .env con tus valores
docker-compose up -d
docker-compose exec backend python seed.py
```

## Local

### Backend
```bash
cd backend
cp .env.example .env        # editar DATABASE_URL y SECRET_KEY
python3.12 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
# crear DB primero: createdb barberia_db
python seed.py              # crea tablas + datos iniciales
uvicorn app.main:app --reload --port 8000
```

### Frontend
```bash
cd frontend
cp .env.example .env        # ajustar VITE_API_BASE_URL si es necesario
npm install
npm run dev                 # → http://localhost:5173
```

## Credenciales por defecto
- Usuario: `admin`
- Contraseña: `admin123`

## Docs API
- Swagger: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc

## SECRET_KEY seguro
```bash
openssl rand -hex 32
```
