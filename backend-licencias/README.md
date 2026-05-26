# Backend de Licencias (Hostinger)

Este backend recibe validaciones de licencia desde la app PVT y ofrece un dashboard
web para activar/desactivar dispositivos.

## Requisitos Hostinger

- PHP 8.1+ (ideal 8.2)
- Apache con `.htaccess` habilitado
- Permiso de escritura en el archivo SQLite (ver sección de despliegue)

## Instalación rápida (SQLite)

1. Sube la carpeta `backend-licencias/` a tu hosting.
2. Edita `config/config.php` y ajusta `db.sqlite_path` a una ruta escribible.
3. Abre `tu-dominio/admin/login` una vez: el backend crea el archivo SQLite y las tablas automáticamente.
4. Entra al dashboard: `/admin/login`

Credenciales iniciales (cámbialas):
- Usuario: `admin`
- Contraseña: `admin123`

## Endpoints

- `POST /api/v1/license/check`
  - Body JSON:
    - `api_key`: string
    - `device_id`: string
    - `device_name`: string|null
    - `username`: string
    - `platform`: string
    - `app_version`: string
    - `ts`: number

Respuesta:

```json
{ "active": true, "message": "ok" }
```

## Nota sobre SQLite

- El backend crea tablas automáticamente (idempotente) en `src/migrate.php`.
- Si `sqlite_path` apunta a un directorio sin permisos de escritura, verás error 500.

## Hostinger (subdominio) cuando NO puedes cambiar el Document Root

Si tu subdominio `tpv.damedominio.xyz` tiene su propio `public_html/` pero Hostinger no te deja apuntarlo a `/public`,
sube los archivos así:

### Lo que va en `public_html/` (raíz)

- Copia `backend-licencias/public/index.php` como `public_html/index.php`
- Copia `backend-licencias/public/.htaccess` como `public_html/.htaccess`

### Lo que va junto a `index.php` en `public_html/`

Sube estas carpetas al mismo nivel:

- `config/`
- `src/`
- `data/`

Queda así:

```
public_html/
  index.php
  .htaccess
  config/
  src/
  data/
```

Luego edita `public_html/config/config.php`:
- `api_key` y `session_secret`
- deja `sqlite_path` como `__DIR__ . '/../data/licensing.sqlite'`

