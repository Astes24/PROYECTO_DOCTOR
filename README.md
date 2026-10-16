# Clínica Salud Admin - Panel de Control

![React](https://img.shields.io/badge/React-19-blue.svg)
![Vite](https://img.shields.io/badge/Vite-Latest-646CFF.svg)
![MUI](https://img.shields.io/badge/MUI-v6-D4AF37.svg)
![Supabase](https://img.shields.io/badge/Supabase-DB%20%26%20Auth-3ECF8E.svg)
![Tailwind](https://img.shields.io/badge/Tailwind-v4-38B2AC.svg)

**Clínica Salud Admin** es el centro de control operativo para la gestión clínica inteligente. Este panel permite al personal médico y administrativo supervisar pacientes, citas y configuraciones del bot de IA con una interfaz premium y moderna.

---

## 🎨 Sistema de Diseño (Color Palette)

El proyecto utiliza una paleta de colores **Dorado Premium** diseñada para transmitir elegancia y confianza:

### Colores Principales (Gold Theme)
-   **Primary (Dorado):** `#D4AF37` (Base Gold)
-   **Primary Light:** `#FFD700`
-   **Primary Dark:** `#B8860B`
-   **Acents:** `#E5D5B0` (Beige/Cream)

### Fondos y Superficies
-   **Light Mode:** 
    -   Background: `#FFFDF5`
    -   Surface: `#FCF9F2`
-   **Dark Mode:**
    -   Background: `#0F0E0A`
    -   Surface: `#1A1812`

### Tipografía y Texto
-   **Main Text (Light/Dark):** `#1A1A1A` / `#EDE6D8`
-   **Secondary Text:** `#5D546B` / `#A39E8F`

---

## 🏗 Arquitectura del Sistema

El proyecto sigue una arquitectura monorepo distribuida donde el Admin actúa como el cerebro visual:

1.  **Frontend (Este Repo):** Single Page Application (SPA) reactiva.
2.  **Backend Logic:** Integrado mediante Edge Functions de Supabase y una API REST externa para el procesamiento del Bot (Gemini).
3.  **Real-time Layer:** Supabase Realtime para actualizaciones instantáneas de notificaciones y citas sin recargar la página.

---

## 🛠 Stack Tecnológico

Seleccionado para escalabilidad y mantenibilidad por desarrolladores Senior:

-   **Core:** React 19 + Vite (HMR ultra-rápido).
-   **State & Routing:** Hooks nativos + React Router DOM v7.
-   **Backend-as-a-Service:** Supabase (PostgreSQL, Auth, Storage).
-   **UI Engine:** 
    -   **Material UI v6:** Para componentes complejos como Diálogos, DatePickers y Menús.
    -   **Tailwind CSS v4:** Para layouts rápidos, spacing y micro-ajustes estéticos.
-   **Data Ops:** Axios (API REST) + Supabase JS SDK (DB Ops).
-   **Date Handling:** `date-fns` para gestión de TZ y formateo localizado.

---

## 🔑 Características Principales

### 1. Gestión de Citas (Calendar Engine)
-   Visualización semanal dinámica con lógica de conflictos.
-   Flujos de **Confirmación, Cancelación y Reprogramación** integrales.
-   Detección de origen de cita (Bot vs Manual).

### 2. CRM de Pacientes
-   Fichas detalladas con historial clínico de citas y alertas.
-   Edición inline de datos sensibles (DNI, Teléfono) con guardias de seguridad.
-   Resumen de actividad con métricas de rendimiento (Dashboard).

### 3. Centro de Notificaciones & Urgencias
-   Sistema de **SplitView** para triaje de alertas de bot.
-   Detección automática de palabras clave ("urgencia", "emergencia") para priorización visual coral.
-   Atención directa vía WhatsApp Business API integrado.

### 4. Seguridad y Roles
-   Autenticación vía Supabase Auth (JWT).
-   RBAC (Role-Based Access Control) ocultando módulos sensibles como `Configuración` o `User Management` para asistentes.

---

## 📂 Estructura de Directorios

```text
src/
├── components/          # Presentational & Container components
│   ├── notifications/   # Lógica compartida de SplitView y Detail
│   ├── MainLayout.jsx   # Shell principal con Sidebar y Topbar
│   └── PatientDetailsPanel.jsx # Hub central de información de paciente
├── pages/               # Vistas de nivel de ruta (Smart Components)
│   ├── Appointments.jsx # Motor de gestión de calendario (Complejo)
│   ├── Patients.jsx     # Gestión de tabla y búsqueda avanzada
│   └── Notifications.jsx# Centro de triaje global
├── services/            # Layer de datos (Separación de preocupaciones)
│   ├── api.js           # Centralización de llamadas REST
│   └── appointmentService.js # Lógica de negocio para citas
├── theme/               # Design System (Tokens de MUI y colores)
└── supabaseClient.js    # Singleton del cliente Supabase
```

---

## 🚀 Guía de Inicio Rápido

### Requisitos
-   Node.js 18+
-   Una cuenta de Supabase con las tablas: `pacientes`, `citas`, `notificaciones`, `usuarios_panel`.

### Instalación
1.  Clonar y entrar:
    ```bash
    git clone ...
    cd MedSchedulerBOT-ADMIN
    ```
2.  Instalar dependencias:
    ```bash
    npm install
    ```
3.  Variables de Entorno (`.env`):
    ```env
    VITE_SUPABASE_URL=tu_url_supabase
    VITE_SUPABASE_ANON_KEY=tu_anon_key
    VITE_API_URL=endpoint_para_el_bot_gemini
    ```
4.  Levantar:
    ```bash
    npm run dev
    ```

---

## 🛠 Workflow de Desarrollo (Senior Tips)

-   **MUI + Tailwind:** Usamos MUI para la estructura lógica del componente y Tailwind para el "polishing" visual. Evita sobrecargar el archivo `.css` global.
-   **Realtime Subscriptions:** Si añades una nueva tabla que requiere actualización inmediata, suscríbete en el `useEffect` del componente `MainLayout` para notificaciones globales o en el componente específico de la vista.
-   **Business Logic:** No pongas llamadas directas a Supabase en los componentes de UI. Usa `services/` para encapsular la lógica y devolver promesas limpias.

---
© 2026 Clínica Salud - Advanced AI Medical Solutions.
