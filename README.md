<div align="center">
  <img src="https://img.shields.io/badge/Barber%C3%ADa-Hair%20Craft-black?style=for-the-badge&logo=codeigniter&logoColor=white" alt="Barbería Hair Craft Logo" />
  
  # ✂️ Sistema de Gestión Barbería Hair Craft ✂️
  
  **La solución definitiva para la gestión integral de barberías modernas**
  
  <p align="center">
    <a href="#-sobre-el-proyecto">Sobre el Proyecto</a> •
    <a href="#-características-principales">Características</a> •
    <a href="#-tecnologías">Tecnologías</a> •
    <a href="#-instalación-rápida">Instalación</a> •
    <a href="#-módulos">Módulos</a>
  </p>

  ![Python](https://img.shields.io/badge/Python-3.12-blue?style=for-the-badge&logo=python&logoColor=white)
  ![FastAPI](https://img.shields.io/badge/FastAPI-0.104-009688?style=for-the-badge&logo=fastapi&logoColor=white)
  ![React](https://img.shields.io/badge/React-18.2-61DAFB?style=for-the-badge&logo=react&logoColor=black)
  ![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)
  ![PostgreSQL](https://img.shields.io/badge/PostgreSQL-15-316192?style=for-the-badge&logo=postgresql&logoColor=white)
  ![Docker](https://img.shields.io/badge/Docker-2496ED?style=for-the-badge&logo=docker&logoColor=white)
</div>

---

## 📖 Sobre el Proyecto

El **Sistema de Gestión Barbería Hair Craft** es una aplicación *Fullstack* diseñada específicamente para facilitar y digitalizar todas las operaciones de una barbería profesional. Desde la facturación y el manejo de comisiones de los barberos, hasta el control de inventarios, reportes contables y transferencias financieras, el sistema centraliza la información en un formato intuitivo y amigable.

---

## ✨ Características Principales

Nuestro sistema cubre los **8 pilares** de la administración de tu salón:

- 💈 **Control de Ventas:** Registro detallado de clientes, servicios, propinas y transferencias bancarias. Exportable a Excel y PDF.
- 🧑‍🎨 **Gestión de Barberos:** Administración de colaboradores, seguimiento a comisiones automatizadas y anticipos.
- 🧴 **Inventario y Productos:** Control de stock e insumos, desde ceras y minoxidil hasta bebidas con alertas de inventario bajo.
- 💼 **Contabilidad en Tiempo Real:** Dashboard con resumen de caja, transferencias, gastos operativos (agua, luz, arriendo) y utilidad neta.
- 💳 **Transferencias Bancarias:** Registro categorizado por bancos para facilitar la conciliación bancaria y evitar cuadres erróneos.
- 📒 **Libro de Deudas:** Control exacto de créditos otorgados a clientes, abonos y deudas pendientes.
- 🛠️ **Catálogo Dinámico:** Gestión flexible de servicios, productos y precios personalizables.
- 🔐 **Seguridad Integrada:** Roles de usuario (Admin, Manager, Barbero) y autenticación segura por JWT.

---

## 💻 Tecnologías Recomendadas

<div align="center">
  <table>
    <tr>
      <td align="center"><b>Backend</b></td>
      <td align="center"><b>Frontend</b></td>
      <td align="center"><b>Base de Datos & Infra</b></td>
    </tr>
    <tr>
      <td>
        <ul>
          <li><b>FastAPI</b> (Python)</li>
          <li><b>SQLAlchemy</b> (ORM)</li>
          <li><b>Alembic</b> (Migraciones)</li>
          <li><b>Pydantic</b> (Schemas)</li>
        </ul>
      </td>
      <td>
        <ul>
          <li><b>React 18</b> + <b>TypeScript</b></li>
          <li><b>Vite</b> (Bundler)</li>
          <li><b>Tailwind CSS</b> (Diseño)</li>
          <li><b>Recharts</b> (Gráficos)</li>
        </ul>
      </td>
      <td>
        <ul>
          <li><b>PostgreSQL 15</b></li>
          <li><b>Docker</b> & <b>Docker Compose</b></li>
          <li><b>JWT</b> (Seguridad)</li>
        </ul>
      </td>
    </tr>
  </table>
</div>

---

## 🚀 Instalación Rápida

La forma más rápida y recomendada de desplegar el sistema es a través de **Docker**.

### 1. Clonar el repositorio
```bash
git clone https://github.com/tu-usuario/barbery_system.git
cd barbery_system
```

### 2. Configurar Variables de Entorno
Copia los archivos de ejemplo en las respectivas carpetas (raíz, backend, frontend):
```bash
# Copia el .env global y el de los servicios si aplica
cp .env.example .env
```
👉 *Asegúrate de editar el archivo `.env` configurando credenciales fuertes, especialmente `SECRET_KEY`.*

### 3. Levantar los Servicios (Docker)
```bash
# Construir y levantar contenedores
docker-compose up -d --build

# Correr migraciones y seed de la Base de Datos
docker-compose exec backend python seed.py
```

### 4. Acceder al Sistema
> **Frontend / Panel de Control:** [http://localhost:5173](http://localhost:5173)\
> **Backend API Docs (Swagger):** [http://localhost:8000/docs](http://localhost:8000/docs)\
> **Redoc Docs:** [http://localhost:8000/redoc](http://localhost:8000/redoc)

#### 🔐 *Credenciales por Defecto*
- **Usuario:** `admin`
- **Contraseña:** `admin123`

*(Cambiar inmediatamente tras el primer inicio de sesión)*

---

## 📂 Organización del Proyecto

```markdown
barbery_system/
├── backend/            # Servidor FastAPI
│   ├── app/            # Código estructurado en (api, core, crud, models, schemas)
│   ├── tests/          # Suite de Pruebas Unitarias
│   └── seed.py         # Script inicial de Base de Datos
├── frontend/           # Aplicación Web React (Vite + TS)
│   ├── src/            # Componentes, hooks, views, contexts, etc.
│   └── public/         # Recursos estáticos
├── docker-compose.yml  # Orquestación de infraestructura
├── SETUP.md            # Documentación detallada de instalación
└── INSTRUCTIONS.md     # Instrucciones arquitectónicas del sistema
```

---

<p align="center">
  <i>Construido con ❤️ para hacer crecer la comunidad del Barbering.</i>
</p>
