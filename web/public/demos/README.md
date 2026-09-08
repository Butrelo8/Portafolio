Screen recordings for case studies. Referenced from front-matter as `demo: /demos/<file>.mp4`.

Video is the one asset that does NOT live in src/assets — astro:assets cannot optimise video, so
it ships from here as-is. Nothing downsizes it at build time; encode it small before committing:

  ffmpeg -i raw.mp4 -vf "scale=1440:-2" -c:v libx264 -crf 28 -preset slow -an -movflags +faststart out.mp4

Drop the audio track (-an) — these are silent UI demos and the poster frame carries the first
impression. For an NDA'd tool, record against seeded fake data, never a client's database.
