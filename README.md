# � GTAW Ticket Bot - Sistema de Soporte

![Discord.js](https://img.shields.io/badge/Discord.js-v14-5865F2?style=for-the-badge&logo=discord&logoColor=white)
![Node.js](https://img.shields.io/badge/Node.js-v16.9+-339933?style=for-the-badge&logo=node.js&logoColor=white)
![License](https://img.shields.io/badge/License-MIT-blue?style=for-the-badge)

Un bot de Discord avanzado para la **gestión de tickets de soporte** en **GTA:W Voice ES**. Diseñado para automatizar la creación de tickets, filtrar solicitudes mediante formularios (modales) y generar registros detallados con transcripciones HTML.

---

## ✨ Características Principales

* **📋 Panel Maestro Interactivo:** Menú desplegable visual para seleccionar el tipo de soporte (Soporte General, Bugs, Cuenta, Premium).
* **📝 Formularios Inteligentes:** Uso de **Modales** de Discord para solicitar información específica según la categoría antes de abrir el ticket.
* **🔒 Sistema de Logs Avanzado:** Genera y guarda automáticamente una **transcripción HTML** (réplica visual del chat) al cerrar cada ticket.
* **🚦 Control de Estado:** Comando `/sistema` para abrir o cerrar categorías específicas en tiempo real sin reiniciar el bot.
* **👥 Gestión de Staff:** Asignación automática de roles y permisos según el tipo de ticket abierto, con mención al rol de Soporte.
* **🎯 Sistema de Claims:** Los miembros del staff pueden reclamar tickets para indicar que están atendiéndolos.
* **🛠️ Herramientas de Moderación:** Comandos para añadir/quitar usuarios, renombrar tickets y forzar aperturas manuales.

---

## 📂 Categorías Soportadas

El bot gestiona flujos de trabajo separados para:

1.  **🟢 Soporte General:** Inquietudes técnicas o dudas generales sobre el servidor.
2.  **🔴 Reporte de Bugs:** Reportar errores o bugs encontrados para que puedan ser reparados.
3.  **🔵 Problemas de Cuenta:** Recuperación de cuenta, acceso, correos o bloqueos.
4.  **🟡 Soporte Premium / Donaciones:** Consultas sobre VIP, GTA World Points o donaciones.

---

## 🚀 Instalación y Configuración

### Requisitos Previos
* [Node.js](https://nodejs.org/) (v16.9.0 o superior).
* Un Bot de Discord creado en el [Developer Portal](https://discord.com/developers/applications).

### Pasos

1.  **Clonar el repositorio**
    ```bash
    git clone [https://github.com/MrBrad8989/gtaw-pm-tickets.git](https://github.com/MrBrad8989/gtaw-pm-tickets.git)
    cd gtaw-pm-tickets
    ```

2.  **Instalar dependencias**
    ```bash
    npm install
    ```

3.  **Configurar variables de entorno**
    Renombra el archivo `.env.example` a `.env` (o crea uno nuevo) y configura las IDs de tu servidor:

    ```env
    TOKEN=TU_TOKEN_DEL_BOT
    GUILD_ID=ID_DE_TU_SERVIDOR_DISCORD

    # IDs de Categorías (Donde se crean los canales)
    CAT_SOPORTE=123456789...
    CAT_BUGS=123456789...
    CAT_CUENTA=123456789...
    CAT_PREMIUM=123456789...

    # IDs de Roles (Staff encargado)
    ROL_SOPORTE=123456789...
    ROL_DEV=123456789...
    ROL_ADMIN=123456789...

    # Canales de Logs (Donde se envían los HTML)
    LOG_SOPORTE=123456789...
    LOG_BUGS=123456789...
    LOG_CUENTA=123456789...
    LOG_PREMIUM=123456789...
    ```

4.  **Iniciar el bot**
    ```bash
    node bot.js
    ```
    *Para producción 24/7 se recomienda usar [PM2](https://pm2.keymetrics.io/):* `pm2 start bot.js --name "BotTickets"`

---

## 🛠️ Comandos Disponibles

| Comando | Permiso | Descripción |
| :--- | :--- | :--- |
| `/setup` | Admin | Despliega el panel visual con el menú de tickets. |
| `/sistema` | Admin | Abre o cierra categorías específicas (Ej: Cerrar Bugs temporalmente). |
| `/openticket` | Staff | Abre un ticket manualmente a nombre de otro usuario. |
| `/add @usuario` | Staff | Añade a un usuario a un ticket existente. |
| `/remove @usuario`| Staff | Expulsa a un usuario de un ticket. |
| `/rename <nombre>`| Staff | Cambia el nombre del canal del ticket. |

**Botones en los Tickets:**
- **🙋‍♂️ Atender Ticket:** Permite al staff reclamar el ticket y añadirse automáticamente.
- **🔒 Cerrar:** Solicita el motivo/solución y cierra el ticket generando el log HTML.

---

## 📸 Capturas / Funcionamiento

El bot utiliza el sistema de **Interacciones de Discord v14**, garantizando respuestas rápidas y una interfaz limpia sin comandos de texto antiguos (`!comando`).

* **Panel de Soporte:** Los usuarios seleccionan la categoría que mejor se adapte a su problema desde un menú desplegable.
* **Formularios Modales:** Cada categoría solicita información específica (asunto, descripción, pasos para reproducir, etc.).
* **Logs con Transcripción HTML:** Al cerrar un ticket, se envía un archivo `.html` al canal de logs correspondiente que contiene todo el historial del chat, incluyendo imágenes y embeds.
* **Persistencia:** Si se cierra una categoría mediante `/sistema`, el menú se actualiza automáticamente en tiempo real.
* **Sistema de Claims:** Cuando un staff reclama un ticket, su nombre se añade al embed y el canal se renombra automáticamente.

---

## 📄 Licencia

Este proyecto está bajo la licencia [MIT](LICENSE). Siéntete libre de usarlo y modificarlo para tu comunidad.
