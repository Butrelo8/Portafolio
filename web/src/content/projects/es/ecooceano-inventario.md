---
name: Inventario Lite
client: EcoOcéano — Ecología y Monitoreo Marino
year: 2026
tagline: Me pidieron llevar 181 activos en una hoja de cálculo. Hice software.
summary: Control de activos para una empresa de ecología y monitoreo marino — 181 artículos en 13 categorías, asignación por responsable, cumplimiento, informes e historial completo.
stack: ["React", "Vite", "TypeScript", "Express", "PostgreSQL", "Drizzle ORM", "Tailwind CSS"]
repoUrl: https://github.com/Butrelo8/Inv.-Lite-A
screenshot: ../../../assets/shots/inv.png
featured: false
order: 3
---

## El problema

EcoOcéano hace ecología y monitoreo marino: equipo de buceo, instrumentos científicos, cámaras,
drones, muestreo de agua, equipo de seguridad. Cosas caras que salen de la oficina, se suben a una
lancha y regresan. O no.

Me pidieron llevar el control en una hoja de cálculo. Una hoja no responde lo que de verdad importa:
quién tiene esto ahora, desde cuándo, si ya volvió y quién lo tuvo las últimas tres veces. Una
persona la edita y el resto trabaja sobre una copia que ya está mal.

## Qué construí

Un sistema de activos. 181 artículos en 13 categorías —buceo, electrónica, seguridad, monitoreo
científico, cámaras, herramientas de campo— cada uno asignable a un responsable, para que en
cualquier momento se sepa qué está fuera y con quién.

Además del inventario: cumplimiento, informes, soporte para varias empresas, una vista de operación e
historial completo, para que el registro de un activo sobreviva a quien lo tocó al final.

React y Vite al frente, Express con PostgreSQL y Drizzle atrás.

## Resultado

El registro de equipo pasó de un archivo que alguien mantiene a mano a un sistema que responde "quién
tiene la cámara submarina" sin preguntarle a nadie. Hecho para una empresa, y lo bastante general
para operar en otra.
