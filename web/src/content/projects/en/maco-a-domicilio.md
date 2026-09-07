---
name: Maco a Domicilio
client: Maco — Veracruz
year: 2026
tagline: A 1982 lubrication shop launching an at-home service.
summary: Booking platform and operations panel for a mobile car wash and roadside assistance service — customer booking, service zones, job photos and an admin panel for the crew.
stack: ["Next.js", "React", "PostgreSQL", "Docker", "Cloudflare R2"]
liveUrl: https://macoadomicilio.com
screenshot: ../../../assets/shots/maco.png
featured: true
order: 2
---

## The problem

Maco has been a lubrication and car care business since 1982, with a physical location and an
established name. The new idea was to bring the service to the customer's home — a different
business, with different problems.

At-home service is coordination, not counter work. Where is the car, when, which service, which
technician, and did the customer see the state it was in before and after. Run that over WhatsApp
and jobs get lost between messages.

## What I built

A booking platform with two service paths — a wash, or roadside assistance — with the coverage zone
made explicit up front, so nobody books a service that can't reach them. The site is direct about
what an at-home wash requires: it uses the water and electricity at your address.

Behind it, an admin panel for the crew to manage jobs, and photo capture stored on Cloudflare R2 so
the condition of a vehicle is documented rather than argued about.

Next.js and PostgreSQL, containerised with Docker.

## Result

The at-home side of the business launches on this platform instead of on a phone number, with the
booking flow, the service area and the job record built in from day one.
