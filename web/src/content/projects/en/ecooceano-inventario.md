---
name: Inventario Lite
client: EcoOcéano — Ecología y Monitoreo Marino
year: 2026
tagline: I was told to track 181 assets in a spreadsheet. I built software instead.
summary: Asset tracking for a marine ecology and monitoring company — 181 items across 13 categories, assignment to responsible staff, compliance, reporting and full history.
stack: ["React", "Vite", "TypeScript", "Express", "PostgreSQL", "Drizzle ORM", "Tailwind CSS"]
repoUrl: https://github.com/Butrelo8/Inv.-Lite-A
screenshot: ../../../assets/shots/inv.png
featured: false
order: 3
---

## The problem

EcoOcéano runs marine ecology and monitoring work: diving equipment, scientific instruments, cameras,
drones, water sampling gear, safety equipment. Expensive things that leave the office, go in a boat,
and come back — or don't.

I was asked to keep track of it in a spreadsheet. A spreadsheet has no answer for the questions that
actually matter: who has this right now, when did they take it, has it come back, and who had it the
last three times. One person edits it, everyone else works from a copy that is already wrong.

## What I built

A dedicated asset system. 181 items across 13 categories — diving equipment, electronics, safety
gear, scientific monitoring, cameras, field tools — each assignable to one of the responsible staff,
so at any moment it's clear what is out and who has it.

Beyond the inventory: compliance tracking, reporting, multi-company support, an operations view and a
full history, so the record of an asset survives the person who last touched it.

React and Vite on the front, Express with PostgreSQL and Drizzle behind it.

## Result

The equipment register moved from a file someone maintains by hand to a system that answers "who has
the underwater camera" without asking anyone. Built for one company, and general enough to run for
another.
