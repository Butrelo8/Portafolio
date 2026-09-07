---
name: Maco a Domicilio
client: Maco — Veracruz
year: 2026
tagline: Un taller de lubricación desde 1982 que ahora va a tu casa.
summary: Plataforma de reservas y panel de operación para autolavado y auxilio vial a domicilio — reserva del cliente, zona de cobertura, fotos del servicio y panel para el equipo.
stack: ["Next.js", "React", "PostgreSQL", "Docker", "Cloudflare R2"]
liveUrl: https://macoadomicilio.com
screenshot: ../../../assets/shots/maco.png
featured: true
order: 2
---

## El problema

Maco es un negocio de lubricación y cuidado automotriz desde 1982, con local propio y nombre hecho.
La idea nueva fue llevar el servicio a casa del cliente: otro negocio, con otros problemas.

El servicio a domicilio es coordinación, no mostrador. Dónde está el auto, a qué hora, qué servicio,
qué técnico, y si el cliente vio cómo estaba el vehículo antes y después. Eso por WhatsApp termina
con trabajos perdidos entre mensajes.

## Qué construí

Una plataforma de reservas con dos caminos —lavado o auxilio vial— y la zona de cobertura por
delante, para que nadie reserve un servicio al que no se puede llegar. El sitio es directo con lo que
implica un lavado a domicilio: se usa el agua y la electricidad de tu casa.

Atrás, un panel para que el equipo administre los trabajos, y captura de fotos guardadas en
Cloudflare R2 para que el estado del vehículo quede documentado y no a discusión.

Next.js y PostgreSQL, en contenedor con Docker.

## Resultado

La parte a domicilio del negocio arranca sobre esta plataforma y no sobre un número de teléfono, con
la reserva, el área de servicio y el registro del trabajo desde el primer día.
