# 🎯 Visión General del Proyecto

## Nombre del Proyecto
**Integral Cosméticos** — Sistema Integral de Gestión para Cadena de Venta de Cosméticos

## Descripción
Sistema de software empresarial diseñado para gestionar de forma integral todas las operaciones de una cadena de tiendas de cosméticos. Incluye punto de venta (POS), gestión de inventario multi-sede, catálogo de productos, CRM de clientes, reportes y análisis, con arquitectura **local-first** y backup automático en la nube.

---

## Objetivos del Sistema

### Objetivo General
Desarrollar un sistema integral que centralice y automatice todas las operaciones comerciales de una cadena de cosméticos, operando de forma local con sincronización automática a la nube.

### Objetivos Específicos
- Gestionar el inventario en tiempo real por cada sede/tienda
- Agilizar el proceso de venta mediante un POS intuitivo
- Centralizar la información de clientes con historial de compras
- Proveer reportes y analytics para toma de decisiones
- Garantizar continuidad operativa sin dependencia de internet
- Facilitar la escalabilidad a múltiples sedes

---

## Alcance

### ✅ Incluido en el Sistema

| Módulo | Descripción |
|--------|-------------|
| Autenticación | Login, roles y permisos por usuario |
| Usuarios | Gestión de empleados y administradores |
| Sedes | Administración de tiendas/bodegas |
| Catálogo | Productos, categorías, marcas, variantes |
| Inventario | Stock multi-sede, movimientos, alertas |
| Proveedores | Gestión de proveedores y órdenes de compra |
| POS / Ventas | Punto de venta, carrito, métodos de pago |
| Caja | Apertura, cierre y arqueo de caja |
| Clientes / CRM | Historial, puntos de fidelidad |
| Reportes | Dashboards, ventas, inventario, márgenes |
| Sincronización | Backup automático a Supabase cloud |

### ❌ Fuera del Alcance Inicial
- Tienda online / E-commerce público
- App móvil nativa
- Integración con pasarelas de pago online
- Facturación electrónica (DIAN) — fase futura

---

## Usuarios del Sistema

| Rol | Permisos |
|-----|----------|
| **ADMIN** | Acceso total al sistema |
| **SUPERVISOR** | Reportes, usuarios, inventario |
| **CAJERO** | POS, ventas, clientes |
| **BODEGUERO** | Inventario, movimientos, proveedores |

---

## Contexto de Negocio

- **Tipo de negocio:** Cadena de tiendas de cosméticos (retail)
- **Ubicación inicial:** Colombia
- **Moneda:** Peso colombiano (COP)
- **Operación:** Local con backup cloud
- **Escalabilidad:** Preparado para migración total a la nube
