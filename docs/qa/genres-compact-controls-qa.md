# Genres and compact controls QA

Date: 2026-08-21

A clean v10 preview was checked in the anime and manga modes. Anime renders the existing genre rail with `Усі жанри` and genre cards. Manga removes the genre rail and renders only the three age controls.

The manga DOM check reported: `mode=manga`, `genres=false`, schedule button `48x48`, and age buttons `18+`, `13+`, `Діти` each `48x48`. The schedule button remains adjacent to the compact age controls in the catalog controls row.

Syntax checks, all three regression fixtures, and `git diff --check` passed before browser verification.

The anime DOM check reported: `mode=anime`, `genres=true`, `ages=false`, and schedule button `48x48`.
